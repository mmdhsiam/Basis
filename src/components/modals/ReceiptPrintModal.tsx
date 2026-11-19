import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, ShieldCheck, CheckCircle2, Award } from 'lucide-react';
import { ElectronicReceipt, AppConfiguration } from '../../types';
import { formatCurrencyBengali } from '../../utils/calculations';
import { generateReceiptPdf } from '../../utils/pdfGenerator';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';
import { registerBackHandler } from '../../utils/backNavigation';
import { generateIdentityQrDataUrl } from '../../utils/qrCode';

interface ReceiptPrintModalProps {
  receipt: ElectronicReceipt | null;
  config: AppConfiguration;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  receipt,
  config,
  onClose,
}) => {
  const { triggerSuccess } = useApp();
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const cleanLogo = extractDirectImageUrl(config.logoUrl) || '/logo.svg';
  const cleanWatermark = extractDirectImageUrl(config.receiptWatermarkImageUrl);
  const cleanModeratorSig = extractDirectImageUrl(config.moderatorPanelSignatureImageUrl);

  useEffect(() => {
    let active = true;
    if (!receipt?.receiptNumber) {
      setQrDataUrl('');
      return;
    }
    generateIdentityQrDataUrl(receipt.receiptNumber, 160).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [receipt?.receiptNumber]);

  useEffect(() => {
    if (!receipt) return;
    const unregisterBack = registerBackHandler(onClose);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      unregisterBack();
      document.body.style.overflow = prevOverflow;
    };
  }, [receipt, onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receipt || isDownloading) return;
    setIsDownloading(true);
    try {
      await generateReceiptPdf(receipt, config);
      triggerSuccess('ই-রসিদ PDF ফোনের ডাউনলোড স্টোরেজে সংরক্ষিত হয়েছে');
    } finally {
      setIsDownloading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {receipt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, delay: 0, ease: SMOOTH_EASE }}
          onClick={onClose}
          className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-hidden print:p-0 print:bg-white print:overflow-visible"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.28, delay: 0, ease: SMOOTH_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="my-auto bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[86dvh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:bg-white print:text-black"
          >
            {/* Fixed Top Header Bar (matching MemberDetailsModal) */}
            <div className="p-4 sm:p-5 shrink-0 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 print:hidden">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <SpringIcon activeKey={receipt.receiptNumber}>
                    <ShieldCheck className="w-5 h-5" />
                  </SpringIcon>
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-ink truncate">
                    অফিসিয়াল ডিজিটাল রসিদ প্রিভিউ
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    ১০০% স্পষ্ট বাংলা ফন্ট ও ভেরিফাইড নিরাপত্তা কোড
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2 px-2.5 sm:px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-ink font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm cursor-pointer"
                  title="প্রিন্টার দিয়ে প্রিন্ট করুন"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">প্রিন্ট</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="py-2 px-3 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? 'ডাউনলোড হচ্ছে...' : 'ফোনে ডাউনলোড'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="বন্ধ করুন"
                  className="p-2 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Inner Body (matching MemberDetailsModal) */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 print:p-0 print:overflow-visible">
              <div
                id="printable-receipt"
                className="paper bg-white text-slate-900 rounded-2xl p-5 sm:p-7 border-2 border-emerald-600/40 shadow-inner relative overflow-hidden select-text font-sans"
              >
                {/* Watermark Overlay */}
                {cleanWatermark ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07] p-8 z-0">
                    <img
                      src={cleanWatermark}
                      alt="Watermark"
                      className="max-w-[260px] max-h-[260px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-0 rotate-[-25deg]">
                    <span className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-widest text-center uppercase">
                      {config.receiptWatermarkText || 'BASIS FOUNDATION'}
                    </span>
                  </div>
                )}

                <div className="relative z-10 space-y-5">
                  {/* Top Official Header with Logo & Title */}
                  <div className="border-b-2 border-emerald-600 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-emerald-600/20 shadow shrink-0 flex items-center justify-center">
                        <img
                          src={cleanLogo}
                          alt="Logo"
                          width={56}
                          height={56}
                          onError={(e) => {
                            if (!e.currentTarget.dataset.fallbackApplied) {
                              e.currentTarget.dataset.fallbackApplied = '1';
                              e.currentTarget.src = '/logo.svg';
                            }
                          }}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                          {config.foundationName}
                        </h1>
                        <p className="text-xs text-emerald-800 font-bold">{config.foundationSlogan}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          ডিজিটাল সমবায় সঞ্চয় ও কল্যাণ তহবিল • অফিসিয়াল রসিদ
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center sm:justify-end gap-3">
                      <div className="text-center sm:text-right space-y-1">
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
                          অনুমোদিত ই-রসিদ
                        </span>
                        <p className="text-xs font-mono font-bold text-slate-700">
                          নং: <span className="text-emerald-700">{receipt.receiptNumber}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          ইস্যু তারিখ: {new Date(receipt.generatedAt).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      {qrDataUrl && (
                        <div
                          className="shrink-0 p-1 bg-white rounded-xl border border-emerald-600/35 shadow-sm flex flex-col items-center"
                          title={`QR ID: ${receipt.receiptNumber}`}
                        >
                          <img
                            src={qrDataUrl}
                            alt={`QR ${receipt.receiptNumber}`}
                            className="w-[72px] h-[72px] block"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Member & Payment Information Table */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500 font-bold">সদস্যের নাম:</span>
                        <strong className="text-emerald-700 text-sm font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                          <span>{receipt.memberName}</span>
                        </strong>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500 font-bold">সদস্য আইডি (Member ID):</span>
                        <span className="font-mono font-bold text-slate-800">{receipt.memberId}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500 font-bold">সঞ্চয়ের মাস:</span>
                        <strong className="text-emerald-800 font-bold">{receipt.savingsMonth}</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500 font-bold">পেমেন্ট মাধ্যম:</span>
                        <span className="font-bold text-slate-800">{receipt.paymentMethod}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500 font-bold">ট্রানজেকশন রেফ:</span>
                        <span className="font-mono text-slate-700 font-semibold">
                          {receipt.transactionRef || 'সরাসরি জমা / ক্যাশ'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500 font-bold">ভেরিফিকেশন স্ট্যাটাস:</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ভেরিফাইড ও সংরক্ষিত</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Received Highlight Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                        মোট গৃহীত সঞ্চয়ের পরিমাণ
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        কথায়: {formatCurrencyBengali(receipt.amount)}
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono">
                      BDT {receipt.amount.toLocaleString()} /-
                    </div>
                  </div>

                  {/* Approval Authority & Hash */}
                  <div className="text-[11px] text-slate-600 space-y-1 bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 flex-wrap">
                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>অনুমোদনকারী কর্তৃপক্ষ:</span>
                      <span>
                        {receipt.approvingModeratorNames.join(', ') ||
                          'বেসিস ফাউন্ডেশন মডারেটর প্যানেল'}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-500 truncate">
                      ডিজিটাল নিরাপত্তা হ্যাশ: {receipt.verificationHash}
                    </p>
                  </div>

                  {/* Signatures */}
                  <div className="pt-6 flex items-end justify-between text-xs text-slate-600">
                    <div className="text-center w-36">
                      <div className="h-8 flex items-end justify-center pb-1">
                        <span className="font-serif italic text-emerald-800 font-bold text-xs">
                          {receipt.memberName}
                        </span>
                      </div>
                      <div className="border-t border-slate-400 pt-1.5 font-bold">
                        জমাকারীর স্বাক্ষর
                      </div>
                    </div>
                    <div className="text-center w-44">
                      <div className="h-8 flex items-end justify-center pb-1">
                        {cleanModeratorSig ? (
                          <img
                            src={cleanModeratorSig}
                            alt="Authority Signature"
                            className="max-h-8 object-contain mx-auto"
                          />
                        ) : (
                          <span className="font-serif italic text-emerald-800 font-bold text-xs">
                            মডারেটর প্যানেল
                          </span>
                        )}
                      </div>
                      <div className="border-t border-slate-400 pt-1.5 font-bold">
                        কর্তৃপক্ষের স্বাক্ষর ও সিল
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200">
                    {config.footerText} • {config.developerAttribution}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
