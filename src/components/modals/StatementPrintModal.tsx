import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { UserProfile, SavingsTransaction, AppConfiguration } from '../../types';
import { formatCurrencyBengali, toBengaliNumerals } from '../../utils/calculations';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { generateStatementPdf } from '../../utils/pdfGenerator';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';
import { registerBackHandler } from '../../utils/backNavigation';
import { getStatementIdentityNumber, generateIdentityQrDataUrl } from '../../utils/qrCode';

interface StatementPrintModalProps {
  isOpen: boolean;
  member: UserProfile | null;
  transactions: SavingsTransaction[];
  periodLabel: string;
  config: AppConfiguration;
  onClose: () => void;
}

export const StatementPrintModal: React.FC<StatementPrintModalProps> = ({
  isOpen,
  member,
  transactions,
  periodLabel,
  config,
  onClose,
}) => {
  const { triggerSuccess } = useApp();
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const showModal = isOpen && Boolean(member);
  const statementIdentity = member ? getStatementIdentityNumber(member.memberId, periodLabel) : '';

  useEffect(() => {
    let active = true;
    if (!showModal || !statementIdentity) {
      setQrDataUrl('');
      return;
    }
    generateIdentityQrDataUrl(statementIdentity, 160).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [showModal, statementIdentity]);

  useEffect(() => {
    if (!showModal) return;
    const unregisterBack = registerBackHandler(onClose);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      unregisterBack();
      document.body.style.overflow = prevOverflow;
    };
  }, [showModal, onClose]);

  const filteredTxs = showModal
    ? transactions
        .filter((t) => {
          if (periodLabel === 'ALL') return true;
          if (periodLabel === '2026') return t.savingsYear === 2026;
          return t.savingsMonth === periodLabel;
        })
        .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime())
    : [];

  const totalDeposited = filteredTxs
    .filter((t) => t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.amount, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!member || isDownloading) return;
    setIsDownloading(true);
    try {
      await generateStatementPdf(member, filteredTxs, periodLabel, config);
      triggerSuccess('স্টেটমেন্ট PDF ফোনের ডাউনলোড স্টোরেজে সংরক্ষিত হয়েছে');
    } finally {
      setIsDownloading(false);
    }
  };

  const watermarkImg = extractDirectImageUrl(config.statementWatermarkImageUrl);
  const cleanLogo = extractDirectImageUrl(config.logoUrl) || '/logo.svg';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && member && (
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
            {/* Fixed Top Control Bar (matching MemberDetailsModal) */}
            <div className="p-4 sm:p-5 shrink-0 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 print:hidden">
              <div className="flex items-center gap-2.5 text-ink font-bold text-xs sm:text-sm min-w-0">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <SpringIcon activeKey={periodLabel}>
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  </SpringIcon>
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-ink truncate">
                    অফিসিয়াল একাউন্ট স্টেটমেন্ট
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate font-medium">
                    {member.name} ({member.memberId})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2 px-2.5 sm:px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-ink font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="প্রিন্টার দিয়ে প্রিন্ট করুন"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">প্রিন্ট</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="py-2 px-3 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? 'ডাউনলোড হচ্ছে...' : 'ফোনে PDF'}</span>
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
                id="printable-statement"
                className="paper p-5 sm:p-7 bg-white text-slate-900 rounded-2xl border border-slate-200 space-y-5 relative font-sans print:p-6 print:border-none print:rounded-none break-words"
              >
                {/* Watermark Overlay */}
                {watermarkImg ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] p-10 z-0">
                    <img
                      src={watermarkImg}
                      alt="Watermark"
                      className="max-w-[300px] max-h-[300px] object-contain"
                    />
                  </div>
                ) : config.statementWatermarkText ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0 select-none">
                    <span className="text-5xl font-bold text-slate-900 rotate-[-25deg] tracking-widest uppercase text-center">
                      {config.statementWatermarkText}
                    </span>
                  </div>
                ) : null}

                {/* Statement Header */}
                <div className="relative z-10 border-b-2 border-slate-900 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-md">
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
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-tight">
                          {config.foundationName}
                        </h1>
                        <p className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase mt-0.5">
                          BASIS FOUNDATION • DIGITAL COOPERATIVE SYSTEM
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{config.foundationSlogan}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right text-xs space-y-1">
                        <span className="inline-block px-3 py-1 bg-slate-950 text-white font-bold rounded-lg text-[11px] tracking-wider">
                          অফিসিয়াল একাউন্ট স্টেটমেন্ট
                        </span>
                        <p className="text-slate-600 font-bold">
                          তৈরির তারিখ:{' '}
                          <strong className="text-slate-900">
                            {new Date().toLocaleDateString('en-GB')}
                          </strong>
                        </p>
                        <p className="text-slate-600 font-bold">
                          সময়কাল:{' '}
                          <strong className="text-emerald-700 font-bold">
                            {periodLabel === 'ALL' ? 'সমগ্র সময়কাল' : periodLabel}
                          </strong>
                        </p>
                      </div>
                      {qrDataUrl && (
                        <div
                          className="shrink-0 p-1 bg-white rounded-xl border border-slate-300 shadow-sm flex flex-col items-center"
                          title={`QR ID: ${statementIdentity}`}
                        >
                          <img
                            src={qrDataUrl}
                            alt={`QR ${statementIdentity}`}
                            className="w-[72px] h-[72px] block"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Member Profile & Account Summary Details */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold w-24 shrink-0">হিসাবধারীর নাম:</span>
                      <strong className="text-emerald-700 text-sm font-bold flex items-center gap-1.5 min-w-0 truncate">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block" />
                        <span className="truncate">{member.name}</span>
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold w-24 shrink-0">সদস্য আইডি:</span>
                      <strong className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-bold">
                        {member.memberId}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold w-24 shrink-0">মোবাইল:</span>
                      <span className="font-mono text-slate-800 font-bold">
                        {member.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold w-24 shrink-0">ইমেইল:</span>
                      <span className="text-slate-700 truncate">{member.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold w-24 shrink-0">যোগদানের তারিখ:</span>
                      <span className="font-bold text-slate-800">{member.joinDate || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold w-24 shrink-0">মনোনীত ব্যক্তি:</span>
                      <span className="font-bold text-slate-900 truncate">
                        {member.nomineeName || 'N/A'} ({member.nomineeRelation || 'নমিনী'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold w-24 shrink-0">নমিনী যোগাযোগ:</span>
                      <span className="font-mono text-slate-800">
                        {member.nomineePhone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold w-24 shrink-0">অনুমোদিত জমা:</span>
                      <strong className="text-emerald-800 text-sm font-bold">
                        {formatCurrencyBengali(totalDeposited)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Transactions Ledger Table */}
                <div className="relative z-10 space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center justify-between flex-wrap gap-1">
                    <span>
                      লেনদেন ও জমার বিবরণী ({toBengaliNumerals(filteredTxs.length)} টি এন্ট্রি):
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold">
                      সকল পরিমাণ বাংলাদেশি টাকায় (BDT)
                    </span>
                  </h3>

                  <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-sm">
                    <table className="w-full text-left text-[11px] sm:text-xs border-collapse min-w-[480px]">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="py-2 px-2.5 text-center w-10">নং</th>
                          <th className="py-2 px-2.5">তারিখ</th>
                          <th className="py-2 px-2.5">সঞ্চয়ের মাস</th>
                          <th className="py-2 px-2.5">মাধ্যম</th>
                          <th className="py-2 px-2.5">রেফারেন্স</th>
                          <th className="py-2 px-2.5 text-center">স্ট্যাটাস</th>
                          <th className="py-2 px-2.5 text-right">পরিমাণ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredTxs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-500">
                              নির্বাচিত সময়কালে কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          filteredTxs.map((tx, idx) => (
                            <tr
                              key={tx.id}
                              className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                            >
                              <td className="py-2 px-2.5 text-center font-bold text-slate-500">
                                {toBengaliNumerals(idx + 1)}
                              </td>
                              <td className="py-2 px-2.5 font-mono font-bold text-slate-800">
                                {new Date(tx.transactionDate).toLocaleDateString('en-GB')}
                              </td>
                              <td className="py-2 px-2.5 font-bold text-slate-900">
                                {tx.savingsMonth}
                              </td>
                              <td className="py-2 px-2.5 font-medium text-slate-700">
                                {tx.paymentMethod}
                              </td>
                              <td className="py-2 px-2.5 font-mono text-[10px] text-slate-600 truncate max-w-[110px]">
                                {tx.transactionRef || 'N/A'}
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    tx.status === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : tx.status === 'PENDING'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {tx.status === 'APPROVED'
                                    ? 'অনুমোদিত'
                                    : tx.status === 'PENDING'
                                    ? 'অপেক্ষমান'
                                    : 'প্রত্যাখ্যাত'}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                                {formatCurrencyBengali(tx.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-950">
                          <td colSpan={6} className="py-2.5 px-2.5 text-right text-xs">
                            সর্বমোট অনুমোদিত জমা:
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-sm text-emerald-800 font-bold">
                            {formatCurrencyBengali(totalDeposited)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Official Seals and Authorization Signatures */}
                <div className="relative z-10 pt-5 border-t border-slate-300">
                  <div className="grid grid-cols-3 gap-4 text-center text-xs">
                    <div className="space-y-3">
                      <div className="h-10 flex items-end justify-center">
                        {config.moderatorPanelSignatureImageUrl ? (
                          <img
                            src={extractDirectImageUrl(config.moderatorPanelSignatureImageUrl)}
                            alt="Moderator Panel Signature"
                            className="max-h-10 object-contain mx-auto"
                          />
                        ) : (
                          <span className="font-serif italic text-emerald-800 font-bold border-b border-slate-400 pb-1 px-3 text-xs sm:text-sm">
                            মডারেটর প্যানেল
                          </span>
                        )}
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <strong className="block text-slate-900 font-bold text-[11px] sm:text-xs">
                          মডারেটর প্যানেল
                        </strong>
                        <span className="text-[10px] text-slate-500">বেসিস ফাউন্ডেশন</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-emerald-600 flex flex-col items-center justify-center text-emerald-700 text-[8px] sm:text-[9px] font-bold leading-tight select-none p-1">
                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mb-0.5" />
                        <span>ভেরিফাইড</span>
                        <span>অফিসিয়াল সিল</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="h-10 flex items-end justify-center">
                        {config.generalSecretarySignatureImageUrl ? (
                          <img
                            src={extractDirectImageUrl(config.generalSecretarySignatureImageUrl)}
                            alt="General Secretary Signature"
                            className="max-h-10 object-contain mx-auto"
                          />
                        ) : (
                          <span className="font-serif italic text-emerald-800 font-bold border-b border-slate-400 pb-1 px-3 text-xs sm:text-sm">
                            সাবরিনা আক্তার
                          </span>
                        )}
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <strong className="block text-slate-900 font-bold text-[11px] sm:text-xs">
                          সাধারণ সম্পাদক / অডিটর
                        </strong>
                        <span className="text-[10px] text-slate-500">বেসিস ফাউন্ডেশন</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="relative z-10 pt-3 text-center text-[10px] text-slate-500 border-t border-slate-200">
                  <p>
                    এই স্টেটমেন্টটি বেসিস ফাউন্ডেশন ডিজিটাল কোর ব্যাংকিং ও সমবায় সঞ্চয় প্ল্যাটফর্ম থেকে স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত একটি বৈধ ডিজিটাল রেকর্ড।
                  </p>
                  <p className="mt-0.5 font-mono">
                    ভেরিফিকেশন কোড: {statementIdentity}
                  </p>
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
