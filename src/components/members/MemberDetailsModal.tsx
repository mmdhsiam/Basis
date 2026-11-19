import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  Download,
  Receipt,
  CheckCircle2,
  Clock,
  User,
  CreditCard,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { UserProfile, SavingsTransaction } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  formatCurrencyBengali,
  toBengaliNumerals,
  calculateMemberSavings,
  getUserDesignationList,
} from '../../utils/calculations';
import { getMaskedPhone } from '../../utils/privacyUtils';
import { generateStatementPdf } from '../../utils/pdfGenerator';
import { StatementPrintModal } from '../modals/StatementPrintModal';
import { Avatar } from '../common/Avatar';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedNumber, SMOOTH_EASE } from '../common/MotionPrimitives';
import { registerBackHandler } from '../../utils/backNavigation';

interface MemberDetailsModalProps {
  member: UserProfile | null;
  onClose: () => void;
  onOpenReceipt: (txId: string) => void;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  member,
  onClose,
  onOpenReceipt,
}) => {
  const { savings, currentUser, isGuestMode, triggerGuestWarning, config, executiveMembers } = useApp();
  const [statementPeriod, setStatementPeriod] = useState<string>('ALL');
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  const memberSavingsData = member
    ? calculateMemberSavings(member.memberId, savings)
    : { approvedTotal: 0, approvedCount: 0, pendingTotal: 0, history: [] };

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  useEffect(() => {
    if (!member) return;
    const unregisterBack = registerBackHandler(onClose);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      unregisterBack();
      document.body.style.overflow = prevOverflow;
    };
  }, [member, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
    {member && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, delay: 0, ease: SMOOTH_EASE }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.28, delay: 0, ease: SMOOTH_EASE }}
        onClick={(e) => e.stopPropagation()}
        className="my-auto bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[86dvh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header (Fixed at top of centered modal) */}
        <div className="p-4 sm:p-5 shrink-0 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={member.avatarUrl}
              name={member.name}
              size="lg"
              expandable
              ringColor={member.role !== 'MEMBER' ? 'ring-amber-500' : 'ring-emerald-500'}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-ink text-base sm:text-lg truncate">{member.name}</h3>
                {(() => {
                  const designations = getUserDesignationList(member, executiveMembers);
                  if (designations.length === 0) return null;
                  return (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 shrink-0 whitespace-normal">
                      <Shield className="w-3 h-3 shrink-0" />
                      <span>{designations.join(', ')}</span>
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-slate-400 truncate">
                সদস্য আইডি: <span className="text-slate-200 font-mono font-bold">{member.memberId}</span> • যোগদানের তারিখ: {member.joinDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-ink transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Unified Scrollable Body */}
        <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 text-sm">
          {/* Member Quick Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">মোট অনুমোদিত সঞ্চয়</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                <AnimatedNumber
                  value={memberSavingsData.approvedTotal}
                  formatter={(v) => formatCurrencyBengali(Math.round(v))}
                />
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">অনুমোদিত কিস্তি সংখ্যা</span>
              <p className="text-lg font-bold text-slate-200 mt-0.5">
                <AnimatedNumber
                  value={memberSavingsData.approvedCount}
                  formatter={(v) => `${toBengaliNumerals(Math.round(v))} টি`}
                />
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400">অপেক্ষমান জমা (Pending)</span>
              <p className="text-lg font-bold text-amber-400 mt-0.5">
                <AnimatedNumber
                  value={memberSavingsData.pendingTotal}
                  formatter={(v) => formatCurrencyBengali(Math.round(v))}
                />
              </p>
            </div>
          </div>

          {/* Contact & Personal Information */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>সদস্য প্রোফাইল ও যোগাযোগের তথ্য</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>মোবাইল নম্বর:</span>
                </span>
                {(() => {
                  const phoneInfo = getMaskedPhone(member, currentUser);
                  return phoneInfo.canCall ? (
                    <a
                      href={`tel:${phoneInfo.rawPhone}`}
                      className="font-mono text-emerald-400 hover:underline font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded"
                      title="ডায়াল করতে ক্লিক করুন"
                    >
                      <span>{phoneInfo.displayText}</span>
                    </a>
                  ) : (
                    <span
                      className="font-mono text-slate-400 font-medium flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded"
                      title="নারী সদস্যদের নম্বর সাধারণ সদস্যদের জন্য গোপনীয়"
                    >
                      <Lock className="w-3 h-3 text-slate-500 inline" />
                      <span>{phoneInfo.displayText}</span>
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>ইমেইল:</span>
                </span>
                <span className="text-slate-200 truncate max-w-[160px]">{member.email}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>ঠিকানা:</span>
                </span>
                <span className="text-slate-200 truncate max-w-[180px]">{member.address || 'তথ্য নেই'}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  <span>জাতীয় পরিচয়পত্র:</span>
                </span>
                <span className="font-mono text-slate-300">
                  {isModeratorOrAppMod ? member.nidNumber || 'যাচাইকৃত' : '••••••••••••'}
                </span>
              </div>
            </div>

            {/* Nominee details */}
            <div className="pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-medium">নিবন্ধিত নমিনি: </span>
              <span className="text-slate-200 font-semibold">{member.nomineeName || 'নির্ধারিত হয়নি'}</span>
              {member.nomineeRelation && (
                <span className="text-slate-400"> ({member.nomineeRelation})</span>
              )}
              {isModeratorOrAppMod && member.nomineePhone && (
                <span className="text-emerald-400 ml-2 font-mono">({member.nomineePhone})</span>
              )}
            </div>
          </div>

          {/* Statement Generation Action Bar (Requirement 5: Unicode Safe Full Statement View & PDF Download) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <h4 className="font-bold text-ink text-xs flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>ব্যাংক-স্টাইল স্টেটমেন্ট ও পিডিএফ ভিউয়ার</span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                ইউনিকোড বাংলা ফন্ট অক্ষুন্ন রেখে ফুল স্টেটমেন্ট ভিউ, প্রিন্ট ও সেভ করুন
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                aria-label="স্টেটমেন্ট সময়সীমা নির্বাচন করুন"
                value={statementPeriod}
                onChange={(e) => setStatementPeriod(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 font-bold focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">সকল লেনদেন (All Time)</option>
                <option value="2026-10">অক্টোবর ২০২৬</option>
                <option value="2026-09">সেপ্টেম্বর ২০২৬</option>
                <option value="2026-08">আগস্ট ২০২৬</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  if (isGuestMode) {
                    triggerGuestWarning('হিসাব স্টেটমেন্ট ভিউ ও ডাউনলোড');
                    return;
                  }
                  setIsStatementModalOpen(true);
                }}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isGuestMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isGuestMode ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>স্টেটমেন্ট লকড</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>স্টেটমেন্ট ভিউ ও ডাউনলোড</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Savings History Table (Requirement 5: Responsive without cutoff) */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 text-xs flex items-center justify-between">
              <span>সঞ্চয় লেনদেন ইতিহাস ({toBengaliNumerals(memberSavingsData.history.length)})</span>
              <span className="text-[11px] text-slate-400">সর্বশেষ জমা অনুসারে সাজানো</span>
            </h4>

            {memberSavingsData.history.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">এখনো কোনো সঞ্চয় এন্ট্রি পাওয়া যায়নি।</p>
            ) : (
              <div className="space-y-2">
                {memberSavingsData.history.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-ink text-sm">
                          {formatCurrencyBengali(tx.amount)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tx.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {tx.status === 'APPROVED' ? 'অনুমোদিত' : tx.status === 'PENDING' ? 'অপেক্ষমান' : 'বাতিল'}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {tx.savingsMonth}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>মাধ্যম: <strong className="text-slate-300">{tx.paymentMethod}</strong></span>
                        <span>•</span>
                        <span>তারিখ: <strong className="text-slate-300">{new Date(tx.transactionDate).toLocaleDateString('en-GB')}</strong></span>
                        {tx.transactionRef && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px]">রেফারেন্স: {tx.transactionRef}</span>
                          </>
                        )}
                      </div>
                      {isModeratorOrAppMod && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          এন্ট্রি কারক: {tx.entryCreatorName} • অনুমোদন: {(tx.approvingModerators || []).length} জন মডারেটর
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {tx.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isGuestMode) {
                              triggerGuestWarning('রসিদ ভিউ ও ডাউনলোড');
                              return;
                            }
                            onOpenReceipt(tx.id);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isGuestMode ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Receipt className="w-3.5 h-3.5" />}
                          <span>{isGuestMode ? 'লকড' : 'রসিদ'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 shrink-0 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </motion.div>

      {/* Requirement 5: Unicode-Safe Full Bank-Style Printable Statement Modal */}
      <StatementPrintModal
        isOpen={isStatementModalOpen}
        member={member}
        transactions={memberSavingsData.history}
        periodLabel={statementPeriod}
        config={config}
        onClose={() => setIsStatementModalOpen(false)}
      />
    </motion.div>
    )}
    </AnimatePresence>,
    document.body
  );
};
