import QRCode from 'qrcode';

/**
 * Generates a compact deterministic identity code for Account Statements
 * so scanning the QR code directly reveals a unique statement identity number.
 */
export function getStatementIdentityNumber(memberId: string, periodLabel: string): string {
  const cleanMemberId = (memberId || 'MEMBER').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const cleanPeriod = (periodLabel || 'ALL').trim();

  if (cleanPeriod === 'ALL' || cleanPeriod === 'সমগ্র সময়কাল') {
    return `BF-STMT-${cleanMemberId}-ALL`;
  }
  if (/^[A-Za-z0-9-]+$/.test(cleanPeriod)) {
    return `BF-STMT-${cleanMemberId}-${cleanPeriod.toUpperCase()}`;
  }

  // Deterministic ASCII code for Bengali/Unicode period labels
  let hash = 2166136261;
  for (let i = 0; i < cleanPeriod.length; i++) {
    hash ^= cleanPeriod.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = (hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `BF-STMT-${cleanMemberId}-${suffix}`;
}

/**
 * Generates a crisp PNG Data URL QR code encoding ONLY the unique identity number
 * so any QR scanner displays the identity number directly.
 */
export async function generateIdentityQrDataUrl(identityNumber: string, sizePx: number = 180): Promise<string> {
  const value = (identityNumber || '').trim();
  if (!value) return '';
  try {
    return await QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: sizePx,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.warn('QR generation error:', err);
    return '';
  }
}
