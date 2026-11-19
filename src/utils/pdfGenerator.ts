import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ElectronicReceipt, SavingsTransaction, UserProfile, AppConfiguration } from '../types';
import { formatCurrencyBengali, toBengaliNumerals } from './calculations';
import { extractDirectImageUrl } from './imageUtils';
import { getStatementIdentityNumber, generateIdentityQrDataUrl } from './qrCode';

const rasterizeSvgTextToPngDataUrl = (svgText: string, size = 256): Promise<string> =>
  new Promise((resolve) => {
    try {
      let normalized = svgText.trim();
      if (!/\bwidth\s*=/.test(normalized)) {
        normalized = normalized.replace('<svg', `<svg width="${size}" height="${size}"`);
      }
      const blob = new Blob([normalized], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, size, size);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        } catch {
          resolve('');
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        resolve('');
      };
      img.src = blobUrl;
    } catch {
      resolve('');
    }
  });

const rasterizeUrlToPngDataUrl = (url: string, size = 256): Promise<string> =>
  new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const w = img.naturalWidth || size;
          const h = img.naturalHeight || size;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = url;
    } catch {
      resolve('');
    }
  });

async function resolvePdfSafeImageUrl(rawUrl?: string, fallbackUrl?: string): Promise<string> {
  const candidates = [rawUrl, fallbackUrl].filter((v): v is string => Boolean(v && v.trim()));
  for (const candidate of candidates) {
    if (candidate.startsWith('data:image/png') || candidate.startsWith('data:image/jpeg') || candidate.startsWith('data:image/webp')) {
      return candidate;
    }
    if (candidate.startsWith('data:image/svg+xml')) {
      try {
        const commaIdx = candidate.indexOf(',');
        if (commaIdx !== -1) {
          const meta = candidate.slice(0, commaIdx);
          const body = candidate.slice(commaIdx + 1);
          const svgText = meta.includes(';base64') ? atob(body) : decodeURIComponent(body);
          const png = await rasterizeSvgTextToPngDataUrl(svgText);
          if (png) return png;
        }
      } catch {
        // try next candidate
      }
      continue;
    }
    const isSvgPath = /\.svg(\?|#|$)/i.test(candidate);
    if (isSvgPath || candidate.startsWith('/')) {
      try {
        const resp = await fetch(candidate);
        if (resp.ok) {
          const text = await resp.text();
          if (text.includes('<svg')) {
            const png = await rasterizeSvgTextToPngDataUrl(text);
            if (png) return png;
          }
        }
      } catch {
        // ignore fetch failure and try canvas rasterization
      }
    }
    const rasterized = await rasterizeUrlToPngDataUrl(candidate);
    if (rasterized) return rasterized;
  }
  return '';
}

async function prepareDomImagesForPdf(
  container: HTMLElement,
  fallbackLogoUrl: string
): Promise<() => void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  const restores: Array<() => void> = [];

  await Promise.all(
    imgs.map(async (img) => {
      const origSrc = img.getAttribute('src') || img.src || '';
      const isLogoImg = (img.getAttribute('alt') || '').toLowerCase() === 'logo';
      const safeSrc = await resolvePdfSafeImageUrl(
        origSrc,
        isLogoImg ? fallbackLogoUrl : undefined
      );
      if (safeSrc && safeSrc !== origSrc) {
        img.setAttribute('src', safeSrc);
        restores.push(() => {
          if (origSrc) img.setAttribute('src', origSrc);
        });
      }
      if (!img.complete) {
        await new Promise<void>((res) => {
          const done = () => res();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 2500);
        });
      }
      if (typeof img.decode === 'function') {
        try {
          await img.decode();
        } catch {
          // ignore decode error
        }
      }
    })
  );

  return () => {
    restores.forEach((fn) => fn());
  };
}

/**
 * Generates and downloads an unbreakable, high-resolution Electronic Receipt PDF in A4 format.
 * Fixes Helvetica-Bold corruption by using native high-DPI canvas rendering with Hind Siliguri Bengali fonts.
 */
export async function generateReceiptPdf(
  receipt: ElectronicReceipt,
  config: AppConfiguration
): Promise<void> {
  // 1. Check if the receipt container is currently rendered in the DOM
  let sourceElement: HTMLElement | null = document.getElementById('printable-receipt');
  let temporaryContainer: HTMLElement | null = null;

  if (!sourceElement) {
    // Create an off-screen A4 container styled with Bengali typography
    temporaryContainer = document.createElement('div');
    temporaryContainer.style.position = 'fixed';
    temporaryContainer.style.left = '-9999px';
    temporaryContainer.style.top = '0';
    temporaryContainer.style.width = '794px'; // ~210mm at 96 DPI
    temporaryContainer.style.background = '#ffffff';
    temporaryContainer.style.color = '#0f172a';
    temporaryContainer.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif";
    temporaryContainer.style.padding = '36px';
    temporaryContainer.style.boxSizing = 'border-box';
    temporaryContainer.style.zIndex = '-100';

    const cleanWatermark = await resolvePdfSafeImageUrl(
      extractDirectImageUrl(config.receiptWatermarkImageUrl)
    );
    const cleanLogo = await resolvePdfSafeImageUrl(
      extractDirectImageUrl(config.logoUrl),
      '/logo.svg'
    );
    const cleanModeratorSig = await resolvePdfSafeImageUrl(
      extractDirectImageUrl(config.moderatorPanelSignatureImageUrl)
    );
    const qrDataUrl = await generateIdentityQrDataUrl(receipt.receiptNumber, 160);

    temporaryContainer.innerHTML = `
      <div style="position: relative; border: 2px solid #059669; border-radius: 16px; padding: 28px; background: #ffffff; overflow: hidden;">
        ${
          cleanWatermark
            ? `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.07; pointer-events: none;">
                <img src="${cleanWatermark}" style="max-width: 280px; max-height: 280px; object-fit: contain;" />
              </div>`
            : `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.05; pointer-events: none; transform: rotate(-25deg);">
                <span style="font-size: 52px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${config.receiptWatermarkText || 'BASIS FOUNDATION'}</span>
              </div>`
        }
        <div style="position: relative; z-index: 10;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${cleanLogo}" style="width: 56px; height: 56px; object-fit: contain; border-radius: 12px;" />
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a;">${config.foundationName}</h1>
                <p style="margin: 2px 0 0; font-size: 13px; font-weight: 700; color: #047857;">${config.foundationSlogan}</p>
                <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">ডিজিটাল সমবায় সঞ্চয় ও কল্যাণ তহবিল • অফিসিয়াল রসিদ</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="text-align: right;">
                <span style="display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; font-size: 12px; font-weight: 900; border-radius: 9999px;">অনুমোদিত ই-রসিদ</span>
                <p style="margin: 4px 0 0; font-size: 13px; font-family: monospace; font-weight: 800; color: #047857;">নং: ${receipt.receiptNumber}</p>
                <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">ইস্যু তারিখ: ${new Date(receipt.generatedAt).toLocaleDateString('en-GB')}</p>
              </div>
              ${
                qrDataUrl
                  ? `<div style="padding: 4px; background: #ffffff; border: 1px solid rgba(5, 150, 105, 0.35); border-radius: 10px; flex-shrink: 0;">
                      <img src="${qrDataUrl}" style="width: 72px; height: 72px; display: block;" />
                    </div>`
                  : ''
              }
            </div>
          </div>

          <!-- Meta Table -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 20px; font-size: 13px;">
            <div>
              <p style="margin: 4px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;"><span style="color: #64748b; font-weight: 700;">সদস্যের নাম:</span> <strong style="color: #047857; font-weight: 900; font-size: 15px; margin-left: 8px;">${receipt.memberName}</strong></p>
              <p style="margin: 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;"><span style="color: #64748b; font-weight: 700;">সদস্য আইডি:</span> <strong style="color: #0f172a; font-family: monospace; margin-left: 8px;">${receipt.memberId}</strong></p>
              <p style="margin: 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;"><span style="color: #64748b; font-weight: 700;">সঞ্চয়ের মাস:</span> <strong style="color: #047857; font-weight: 900; margin-left: 8px;">${receipt.savingsMonth}</strong></p>
            </div>
            <div>
              <p style="margin: 4px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;"><span style="color: #64748b; font-weight: 700;">পেমেন্ট মাধ্যম:</span> <strong style="color: #0f172a; margin-left: 8px;">${receipt.paymentMethod}</strong></p>
              <p style="margin: 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;"><span style="color: #64748b; font-weight: 700;">ট্রানজেকশন রেফ:</span> <strong style="color: #475569; font-family: monospace; margin-left: 8px;">${receipt.transactionRef || 'সরাসরি জমা / ক্যাশ'}</strong></p>
              <p style="margin: 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;"><span style="color: #64748b; font-weight: 700;">ভেরিফিকেশন:</span> <strong style="color: #059669; font-weight: 900; margin-left: 8px;">✓ ভেরিফাইড ও সংরক্ষিত</strong></p>
            </div>
          </div>

          <!-- Total Amount Box -->
          <div style="margin-top: 20px; padding: 18px; background: linear-gradient(to right, #ecfdf5, #f0fdf4); border: 2px solid #10b981; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 13px; font-weight: 800; color: #065f46; text-transform: uppercase;">মোট গৃহীত সঞ্চয়ের পরিমাণ</span>
              <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">কথায়: ${formatCurrencyBengali(receipt.amount)}</p>
            </div>
            <div style="font-size: 26px; font-weight: 900; color: #047857; font-family: monospace;">
              BDT ${receipt.amount.toLocaleString()} /-
            </div>
          </div>

          <!-- Authority & Hash -->
          <div style="margin-top: 18px; padding: 12px; background: #f1f5f9; border-radius: 10px; font-size: 11px; color: #475569;">
            <p style="margin: 0; font-weight: 800; color: #1e293b;">অনুমোদনকারী কর্তৃপক্ষ: ${receipt.approvingModeratorNames.join(', ') || 'বেসিস ফাউন্ডেশন মডারেটর প্যানেল'}</p>
            <p style="margin: 4px 0 0; font-family: monospace; color: #64748b;">ডিজিটাল নিরাপত্তা হ্যাশ: ${receipt.verificationHash}</p>
          </div>

          <!-- Signatures Section -->
          <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #475569;">
            <div style="text-align: center; width: 170px;">
              <div style="height: 32px; font-style: italic; font-weight: 700; color: #047857; display: flex; align-items: flex-end; justify-content: center;">${receipt.memberName}</div>
              <div style="border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 800;">জমাকারীর স্বাক্ষর</div>
            </div>
            <div style="text-align: center; width: 190px;">
              ${
                cleanModeratorSig
                  ? `<img src="${cleanModeratorSig}" style="height: 38px; object-fit: contain; margin: 0 auto 4px;" />`
                  : `<div style="height: 32px; font-style: italic; font-weight: 700; color: #047857; display: flex; align-items: flex-end; justify-content: center;">মডারেটর প্যানেল</div>`
              }
              <div style="border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 800;">কর্তৃপক্ষের স্বাক্ষর ও সিল</div>
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            ${config.footerText || 'BASIS FOUNDATION'} • ${config.developerAttribution || 'Created & Developed by Mahmudul Siam'}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(temporaryContainer);
    sourceElement = temporaryContainer;
  }

  let restoreImages: (() => void) | null = null;
  try {
    restoreImages = await prepareDomImagesForPdf(sourceElement, '/logo.svg');
    const canvas = await html2canvas(sourceElement, {
      scale: 1.75,
      useCORS: true,
      imageTimeout: 5000,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, Math.min(pageHeight, imgHeight), undefined, 'FAST');

    // Direct device storage download (Android Native APK Storage Bridge + Browser Downloads)
    downloadPdfToDevice(doc, `${receipt.receiptNumber}.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
    if (!window.AndroidBridge) {
      window.print();
    }
  } finally {
    if (restoreImages) restoreImages();
    if (temporaryContainer && temporaryContainer.parentNode) {
      document.body.removeChild(temporaryContainer);
    }
  }
}

/**
 * Downloads PDF directly to phone storage (Android APK MediaStore/Downloads via AndroidBridge,
 * or standard browser Downloads folder on web).
 */
export function downloadPdfToDevice(doc: jsPDF, filename: string) {
  try {
    // 1. Native Android Studio APK Bridge (saves directly into phone's Download folder)
    if (typeof window !== 'undefined' && window.AndroidBridge?.saveBase64Pdf) {
      const dataUri = doc.output('datauristring');
      const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
      try {
        (window.AndroidBridge as any).saveBase64Pdf(base64, filename, 'application/pdf');
      } catch {
        (window.AndroidBridge as any).saveBase64Pdf(base64, filename);
      }
      return;
    }

    // 2. Web Browser & DownloadListener-enabled WebView fallback
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 2500);
  } catch (err) {
    doc.save(filename);
  }
}

/**
 * Generates and downloads an official Bank-Style Statement PDF in A4 format.
 * Fixes Helvetica-Bold corruption by using native high-DPI canvas rendering with Hind Siliguri Bengali fonts.
 */
export async function generateStatementPdf(
  member: UserProfile,
  transactions: SavingsTransaction[],
  periodLabel: string,
  config: AppConfiguration
): Promise<void> {
  let sourceElement: HTMLElement | null = document.getElementById('printable-statement');
  let temporaryContainer: HTMLElement | null = null;

  const approvedTxs = transactions
    .filter((t) => {
      if (t.status !== 'APPROVED') return false;
      if (periodLabel === 'ALL') return true;
      if (periodLabel === '2026') return t.savingsYear === 2026;
      return t.savingsMonth === periodLabel;
    })
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

  const totalAmount = approvedTxs.reduce((sum, t) => sum + t.amount, 0);

  if (!sourceElement) {
    // Create an off-screen A4 container styled with Bengali typography
    temporaryContainer = document.createElement('div');
    temporaryContainer.style.position = 'fixed';
    temporaryContainer.style.left = '-9999px';
    temporaryContainer.style.top = '0';
    temporaryContainer.style.width = '794px'; // ~210mm at 96 DPI
    temporaryContainer.style.background = '#ffffff';
    temporaryContainer.style.color = '#0f172a';
    temporaryContainer.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif";
    temporaryContainer.style.padding = '32px';
    temporaryContainer.style.boxSizing = 'border-box';
    temporaryContainer.style.zIndex = '-100';

    const cleanWatermark = await resolvePdfSafeImageUrl(
      extractDirectImageUrl(config.statementWatermarkImageUrl)
    );
    const cleanLogo = await resolvePdfSafeImageUrl(
      extractDirectImageUrl(config.logoUrl),
      '/logo.svg'
    );
    const cleanModeratorSig = await resolvePdfSafeImageUrl(
      extractDirectImageUrl(config.moderatorPanelSignatureImageUrl)
    );
    const cleanGsSig = await resolvePdfSafeImageUrl(
      extractDirectImageUrl(config.generalSecretarySignatureImageUrl)
    );
    const statementIdentity = getStatementIdentityNumber(member.memberId, periodLabel);
    const qrDataUrl = await generateIdentityQrDataUrl(statementIdentity, 160);

    const tableRows = approvedTxs
      .map(
        (tx, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 10px; text-align: center; font-weight: 700; color: #64748b;">${toBengaliNumerals(idx + 1)}</td>
          <td style="padding: 6px 10px; font-family: monospace; font-weight: 800; color: #1e293b;">${new Date(tx.transactionDate).toLocaleDateString('en-GB')}</td>
          <td style="padding: 6px 10px; font-weight: 800; color: #047857;">${tx.savingsMonth}</td>
          <td style="padding: 6px 10px; font-weight: 700; color: #334155;">${tx.paymentMethod}</td>
          <td style="padding: 6px 10px; font-family: monospace; font-size: 11px; color: #64748b;">${tx.transactionRef || '-'}</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 900; color: #0f172a;">${formatCurrencyBengali(tx.amount)}</td>
        </tr>
      `
      )
      .join('');

    temporaryContainer.innerHTML = `
      <div style="position: relative; border: 2px solid #0f172a; border-radius: 14px; padding: 24px; background: #ffffff; overflow: hidden;">
        ${
          cleanWatermark
            ? `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.05; pointer-events: none;">
                <img src="${cleanWatermark}" style="max-width: 380px; max-height: 380px; object-fit: contain;" />
              </div>`
            : `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.04; pointer-events: none; transform: rotate(-25deg);">
                <span style="font-size: 64px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${config.statementWatermarkText || 'BASIS FOUNDATION'}</span>
              </div>`
        }
        <div style="position: relative; z-index: 10;">
          <!-- Top Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${cleanLogo}" style="width: 52px; height: 52px; object-fit: contain; border-radius: 10px;" />
              <div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a;">${config.foundationName}</h1>
                <p style="margin: 2px 0 0; font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase;">BASIS FOUNDATION • DIGITAL COOPERATIVE SYSTEM</p>
                <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">${config.foundationSlogan}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="text-align: right;">
                <span style="display: inline-block; padding: 4px 10px; background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 6px;">অফিসিয়াল একাউন্ট স্টেটমেন্ট</span>
                <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">তৈরির তারিখ: <strong style="color: #0f172a;">${new Date().toLocaleDateString('en-GB')}</strong></p>
                <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">সময়কাল: <strong style="color: #047857;">${periodLabel === 'ALL' ? 'সমগ্র সময়কাল' : periodLabel}</strong></p>
              </div>
              ${
                qrDataUrl
                  ? `<div style="padding: 4px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; flex-shrink: 0;">
                      <img src="${qrDataUrl}" style="width: 72px; height: 72px; display: block;" />
                    </div>`
                  : ''
              }
            </div>
          </div>

          <!-- Member Profile Meta -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 14px; font-size: 12px;">
            <div>
              <p style="margin: 3px 0;"><span style="color: #64748b; font-weight: 700;">হিসাবধারীর নাম:</span> <strong style="color: #047857; font-weight: 900; font-size: 14px; margin-left: 6px;">${member.name}</strong></p>
              <p style="margin: 3px 0;"><span style="color: #64748b; font-weight: 700;">সদস্য আইডি:</span> <strong style="color: #0f172a; font-family: monospace; background: #e2e8f0; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">${member.memberId}</strong></p>
              <p style="margin: 3px 0;"><span style="color: #64748b; font-weight: 700;">মোবাইল:</span> <span style="font-family: monospace; font-weight: 800; color: #1e293b; margin-left: 6px;">${member.phone || 'N/A'}</span></p>
            </div>
            <div>
              <p style="margin: 3px 0;"><span style="color: #64748b; font-weight: 700;">যোগদানের তারিখ:</span> <strong style="color: #1e293b; margin-left: 6px;">${member.joinDate || 'N/A'}</strong></p>
              <p style="margin: 3px 0;"><span style="color: #64748b; font-weight: 700;">মনোনীত ব্যক্তি:</span> <strong style="color: #1e293b; margin-left: 6px;">${member.nomineeName || 'N/A'} (${member.nomineeRelation || 'নমিনী'})</strong></p>
              <p style="margin: 3px 0;"><span style="color: #64748b; font-weight: 700;">মোট অনুমোদিত জমা:</span> <strong style="color: #047857; font-size: 14px; font-weight: 900; margin-left: 6px;">${formatCurrencyBengali(totalAmount)}</strong></p>
            </div>
          </div>

          <!-- Ledger Table -->
          <div style="margin-top: 16px; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
              <thead>
                <tr style="background: #0f172a; color: #ffffff; font-weight: 900;">
                  <th style="padding: 7px 10px; text-align: center; width: 36px;">নং</th>
                  <th style="padding: 7px 10px;">তারিখ</th>
                  <th style="padding: 7px 10px;">সঞ্চয়ের মাস</th>
                  <th style="padding: 7px 10px;">পেমেন্ট মাধ্যম</th>
                  <th style="padding: 7px 10px;">রেফারেন্স</th>
                  <th style="padding: 7px 10px; text-align: right;">পরিমাণ (টাকা)</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows || '<tr><td colspan="6" style="padding: 16px; text-align: center; color: #64748b;">কোনো অনুমোদিত লেনদেন পাওয়া যায়নি।</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 900;">
                  <td colspan="5" style="padding: 8px 10px; text-align: right; font-size: 11px; color: #0f172a;">সর্বমোট অনুমোদিত জমা (Net Total Approved):</td>
                  <td style="padding: 8px 10px; text-align: right; font-size: 13px; color: #047857; font-weight: 900;">${formatCurrencyBengali(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Official Signatures -->
          <div style="margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center; font-size: 11px;">
            <div>
              <div style="height: 38px; display: flex; align-items: flex-end; justify-content: center;">
                ${
                  cleanModeratorSig
                    ? `<img src="${cleanModeratorSig}" style="max-height: 34px; object-fit: contain;" />`
                    : `<span style="font-style: italic; font-weight: 800; color: #047857; border-bottom: 1px solid #94a3b8; padding-bottom: 2px;">মডারেটর প্যানেল</span>`
                }
              </div>
              <div style="border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 900; color: #0f172a; margin-top: 2px;">মডারেটর প্যানেল</div>
              <span style="font-size: 9px; color: #64748b;">বেসিস ফাউন্ডেশন</span>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="width: 56px; height: 56px; border-radius: 9999px; border: 2px dashed #059669; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #047857; font-size: 8px; font-weight: 900; line-height: 1.1;">
                <span>ভেরিফাইড</span>
                <span>অফিসিয়াল সিল</span>
              </div>
            </div>

            <div>
              <div style="height: 38px; display: flex; align-items: flex-end; justify-content: center;">
                ${
                  cleanGsSig
                    ? `<img src="${cleanGsSig}" style="max-height: 34px; object-fit: contain;" />`
                    : `<span style="font-style: italic; font-weight: 800; color: #047857; border-bottom: 1px solid #94a3b8; padding-bottom: 2px;">সাবরিনা আক্তার</span>`
                }
              </div>
              <div style="border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 900; color: #0f172a; margin-top: 2px;">সাধারণ সম্পাদক / নিরীক্ষক</div>
              <span style="font-size: 9px; color: #64748b;">বেসিস ফাউন্ডেশন</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 18px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            এই স্টেটমেন্টটি বেসিস ফাউন্ডেশন ডিজিটাল কোর ব্যাংকিং প্ল্যাটফর্ম থেকে প্রস্তুতকৃত একটি বৈধ ডিজিটাল রেকর্ড • ভেরিফিকেশন কোড: ${statementIdentity}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(temporaryContainer);
    sourceElement = temporaryContainer;
  }

  let restoreImages: (() => void) | null = null;
  try {
    restoreImages = await prepareDomImagesForPdf(sourceElement, '/logo.svg');
    const canvas = await html2canvas(sourceElement, {
      scale: 1.75,
      useCORS: true,
      imageTimeout: 5000,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, Math.min(pageHeight, imgHeight), undefined, 'FAST');

    const safeMonth = periodLabel.replace(/[^0-9a-zA-Z-]/g, '_') || 'ALL';
    const filename = `BF_${member.memberId}_${safeMonth}_Statement.pdf`;

    // Direct device storage download (Android Native APK Storage Bridge + Browser Downloads)
    downloadPdfToDevice(doc, filename);
  } catch (err) {
    console.error('Statement PDF export failed:', err);
    if (!window.AndroidBridge) {
      window.print();
    }
  } finally {
    if (restoreImages) restoreImages();
    if (temporaryContainer && temporaryContainer.parentNode) {
      document.body.removeChild(temporaryContainer);
    }
  }
}
