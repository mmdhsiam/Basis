import React, { useState, useMemo } from 'react';
import {
  Wallet,
  PlusCircle,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SavingsTransaction } from '../../types';
import {
  formatCurrencyBengali,
  toBengaliNumerals,
} from '../../utils/calculations';
import { Avatar } from '../common/Avatar';
import { motion, AnimatePresence } from 'motion/react';
import {
  AnimatedNumber,
  StaggerList,
  StaggerItem,
  SpringIcon,
  SMOOTH_EASE,
} from '../common/MotionPrimitives';

interface SavingsViewProps {
  onOpenNewSavingsModal: () => void;
  onOpenReceipt: (txId: string) => void;
  onOpenApprovalReview?: (txId: string) => void;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  onOpenNewSavingsModal,
  onOpenReceipt,
}) => {
  const {
    savings,
    currentUser,
    users,
    isOnline,
    financialTotals,
    reverseTransaction,
    approvals,
    voteOnApproval,
    eligibleModeratorsCount,
    isGuestMode,
    triggerGuestWarning,
    triggerWarning,
    checkPendingRequestWarning,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');

  // Correction state
  const [correctionTargetTx, setCorrectionTargetTx] = useState<SavingsTransaction | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return savings.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        tx.memberName.toLowerCase().includes(q) ||
        tx.memberId.toLowerCase().includes(q) ||
        (tx.transactionRef && tx.transactionRef.toLowerCase().includes(q)) ||
        (tx.receiptId && tx.receiptId.toLowerCase().includes(q));

      const matchesMonth = monthFilter === 'ALL' || tx.savingsMonth === monthFilter;
      const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
      const matchesPayment = paymentMethodFilter === 'ALL' || tx.paymentMethod === paymentMethodFilter;

      return matchesQuery && matchesMonth && matchesStatus && matchesPayment;
    });
  }, [savings, searchQuery, monthFilter, statusFilter, paymentMethodFilter]);

  const handleConfirmReversal = () => {
    if (!correctionTargetTx || !correctionReason.trim()) {
      triggerWarning('কারণ উল্লেখ আবশ্যক', 'সংশোধন বা রিভার্সালের সুস্পষ্ট কারণ উল্লেখ করা বাধ্যতামূলক।', false);
      return;
    }
    const ok = reverseTransaction(correctionTargetTx.id, correctionReason.trim());
    if (ok) {
      setCorrectionTargetTx(null);
      setCorrectionReason('');
    }
  };

  // Check if a pending transaction has an approval request
  const getApprovalForTx = (txId: string) => {
    return approvals.find((a) => a.targetRecordId === txId);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Header & Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <SpringIcon activeKey={filteredTransactions.length}>
                <Wallet className="w-5 h-5 text-emerald-400" />
              </SpringIcon>
              <span>ডিজিটাল সঞ্চয় খাতা ও ট্রানজেকশন রেকর্ড</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              অনুমোদিত লেনদেনসমূহ স্বয়ংক্রিয়ভাবে মূল তহবিলে যুক্ত হয় এবং প্রতিটি লেনদেনের জন্য ডিজিটাল রসিদ ইস্যু হয়।
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (isGuestMode) {
                triggerGuestWarning('নতুন সঞ্চয় জমা এন্ট্রি');
                return;
              }
              onOpenNewSavingsModal();
            }}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer shadow-sm"
          >
            <SpringIcon>
              <PlusCircle className="w-4 h-4" />
            </SpringIcon>
            <span>নতুন জমা এন্ট্রি করুন</span>
          </motion.button>
        </div>

        {/* Financial Stat Summary Strip (Section 9.1: Pending isolated from Approved) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 card-interactive">
            <span className="text-[11px] text-slate-400">মোট অনুমোদিত সঞ্চয় তহবিল</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">
              <AnimatedNumber
                value={financialTotals.totalApproved}
                formatter={(v) => formatCurrencyBengali(Math.round(v))}
              />
            </p>
            <span className="text-[10px] text-slate-500 font-bold">
              <AnimatedNumber
                value={financialTotals.approvedCount}
                formatter={(v) => toBengaliNumerals(Math.round(v))}
              />{' '}
              টি অনুমোদিত
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 card-interactive">
            <span className="text-[11px] text-slate-400">অনুমোদনের অপেক্ষায় (Pending)</span>
            <p className="text-lg font-bold text-amber-400 mt-0.5">
              <AnimatedNumber
                value={financialTotals.totalPending}
                formatter={(v) => formatCurrencyBengali(Math.round(v))}
              />
            </p>
            <span className="text-[10px] text-amber-400/80 font-bold">
              <AnimatedNumber
                value={financialTotals.pendingCount}
                formatter={(v) => toBengaliNumerals(Math.round(v))}
              />{' '}
              টি লেনদেন (মূল তহবিলে যোগ হয়নি)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400">অনুমোদন নীতি (Policy)</span>
            <p className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>২/৩ মডারেটর সিলিং নীতি</span>
            </p>
            <span className="text-[10px] text-slate-400">
              <AnimatedNumber
                value={eligibleModeratorsCount}
                formatter={(v) => toBengaliNumerals(Math.round(v))}
              />{' '}
              জনের মধ্যে নূন্যতম{' '}
              <AnimatedNumber
                value={Math.ceil((eligibleModeratorsCount * 2) / 3)}
                formatter={(v) => toBengaliNumerals(Math.round(v))}
              />{' '}
              ভোট আবশ্যক
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-800">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="সদস্যের নাম, আইডি, রেফারেন্স বা রসিদ নং..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              aria-label="মাস ফিল্টার করুন"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">সকল মাস (All Months)</option>
              <option value="2026-11">নভেম্বর ২০২৬</option>
              <option value="2026-10">অক্টোবর ২০২৬</option>
              <option value="2026-09">সেপ্টেম্বর ২০২৬</option>
              <option value="2026-08">আগস্ট ২০২৬</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              aria-label="স্ট্যাটাস ফিল্টার করুন"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">সকল স্ট্যাটাস</option>
              <option value="APPROVED">অনুমোদিত</option>
              <option value="PENDING">অপেক্ষমান</option>
              <option value="REJECTED">বাতিল</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              aria-label="পেমেন্ট মাধ্যম ফিল্টার করুন"
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">সকল মাধ্যম</option>
              <option value="BANK">ব্যাংক ট্রান্সফার / ডিপোজিট</option>
              <option value="BKASH">বিকাশ</option>
              <option value="ROCKET">রকেট</option>
              <option value="CASH">ক্যাশ</option>
              <option value="NAGAD">নগদ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List / Cards */}
      <StaggerList
        key={`${monthFilter}-${statusFilter}-${paymentMethodFilter}`}
        className="space-y-3"
        stagger={0}
      >
        {filteredTransactions.map((tx) => {
          const isApproved = tx.status === 'APPROVED';
          const isPending = tx.status === 'PENDING';
          const isCorrection = tx.isCorrection;
          const approvalObj = getApprovalForTx(tx.id);
          const hasVoted = Boolean(
            approvalObj &&
              currentUser &&
              ((approvalObj.approvalVotes || []).includes(currentUser.id) ||
                (approvalObj.rejectionVotes || []).includes(currentUser.id))
          );

          return (
            <StaggerItem
              key={tx.id}
              hoverLift
              className={`p-4 rounded-2xl border transition-all card-interactive ${
                isCorrection
                  ? 'bg-amber-950/20 border-amber-800/40'
                  : isApproved
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-blue-950/20 border-blue-800/40'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Requirement 9: Show profile picture alongside user name */}
                    {(() => {
                      const memberUser = users.find((u) => u.memberId === tx.memberId || u.id === tx.memberId);
                      return (
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={memberUser?.avatarUrl}
                            name={tx.memberName}
                            size="sm"
                            ringColor={memberUser?.role !== 'MEMBER' ? 'ring-amber-500' : 'ring-emerald-500'}
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ink text-base">{tx.memberName}</span>
                            {/* Requirement 7: Green dot if online, red dot if offline */}
                            <span
                              className={`w-2 h-2 rounded-full inline-block shrink-0 shadow-xs ${
                                isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-rose-500 ring-2 ring-rose-500/20'
                              }`}
                              title={isOnline ? 'অনলাইনে সক্রিয় (Online)' : 'অফলাইন (Offline)'}
                            />
                          </div>
                        </div>
                      );
                    })()}
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-xl bg-slate-950 text-slate-300 border border-slate-800">
                      {tx.memberId}
                    </span>

                    {/* Status Badge with blue checkmark */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                      {isPending && <Clock className="w-3 h-3" />}
                      {tx.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                      <span>
                        {isApproved ? 'অনুমোদিত ও ভেরিফাইড' : isPending ? 'অনুমোদনের অপেক্ষায়' : 'বাতিলকৃত'}
                      </span>
                    </span>

                    {isCorrection && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        সংশোধন এন্ট্রি
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>সঞ্চয় মাস: <strong className="text-slate-200">{tx.savingsMonth}</strong></span>
                    <span>•</span>
                    <span>মাধ্যম: {tx.paymentMethod}</span>
                    {tx.transactionRef && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-300">রেফ: {tx.transactionRef}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>তারিখ: {new Date(tx.transactionDate).toLocaleDateString('en-GB')}</span>
                  </div>

                  {tx.notes && (
                    <p className="text-xs text-slate-400 italic">নোট: {tx.notes}</p>
                  )}

                  {/* Moderator Approval details */}
                  {isModeratorOrAppMod && (
                    <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-2">
                      <span>এন্ট্রি কারক: {tx.entryCreatorName}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">
                        ভোট প্রদান: {(tx.approvingModerators || []).length} জন মডারেটর
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="md:text-right">
                    <span
                      className={`text-xl font-bold ${
                        tx.amount < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatCurrencyBengali(tx.amount)}
                    </span>
                    {tx.receiptId && (
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {tx.receiptId}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View/Download Receipt Button */}
                    {isApproved && (
                      <button
                        onClick={() => {
                          if (isGuestMode) {
                            triggerGuestWarning('ডিজিটাল রসিদ ভিউ ও ডাউনলোড');
                            return;
                          }
                          onOpenReceipt(tx.id);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-medium text-xs flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
                        title="রসিদ দেখুন বা পিডিএফ ডাউনলোড করুন"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>ডিজিটাল রসিদ</span>
                      </button>
                    )}

                    {/* Pending Approval Vote shortcut for eligible moderators */}
                    {isPending && isModeratorOrAppMod && approvalObj && (
                      <div className="flex items-center gap-1.5">
                        {!hasVoted ? (
                          <>
                            <button
                              onClick={() => voteOnApproval(approvalObj.id, 'APPROVE')}
                              className="py-1 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition-colors cursor-pointer"
                            >
                              অনুমোদন
                            </button>
                            <button
                              onClick={() => voteOnApproval(approvalObj.id, 'REJECT', 'তথ্য অমিল')}
                              className="py-1 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow transition-colors cursor-pointer"
                            >
                              বাতিল
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-semibold px-2.5 py-0.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            আপনি ভোট দিয়েছেন
                          </span>
                        )}
                      </div>
                    )}

                    {/* Financial Reversal/Correction Button (Section 9.1) */}
                    {isApproved && !isCorrection && isModeratorOrAppMod && (
                      <button
                        onClick={() => {
                          if (
                            checkPendingRequestWarning(
                              { requestTypes: ['FINANCIAL_CORRECTION'], targetRecordId: tx.id },
                              'লেনদেন রিভার্সাল ও সংশোধন'
                            )
                          ) {
                            return;
                          }
                          setCorrectionTargetTx(tx);
                        }}
                        title="লেনদেন সংশোধন বা রিভার্সাল"
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-amber-900/60 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </StaggerItem>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400">ফিল্টার অনুযায়ী কোনো সঞ্চয় লেনদেন পাওয়া যায়নি।</p>
          </div>
        )}
      </StaggerList>

      {/* Financial Reversal / Correction Modal (Section 9.1) */}
      <AnimatePresence>
        {correctionTargetTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.26, ease: SMOOTH_EASE }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-amber-400">
                <SpringIcon>
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                </SpringIcon>
                <h3 className="font-bold text-ink text-base">আর্থিক সংশোধন ও রিভার্সাল এন্ট্রি</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                অনুচ্ছেদ ৯.১ নীতি অনুযায়ী, চূড়ান্ত অনুমোদিত কোনো লেনদেন ডাটাবেজ থেকে মুছে ফেলা যাবে না। এর পরিবর্তে একটি বিপরীতধর্মী ঋণাত্মক সংশোধন রেকর্ড যুক্ত হবে এবং অডিট ট্রেইলে সংরক্ষিত থাকবে।
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <p className="text-slate-400">
                  সদস্য: <strong className="text-ink">{correctionTargetTx.memberName}</strong> ({correctionTargetTx.memberId})
                </p>
                <p className="text-slate-400">
                  পরিমাণ: <strong className="text-emerald-400">{formatCurrencyBengali(correctionTargetTx.amount)}</strong>
                </p>
                <p className="text-slate-400">মাস: {correctionTargetTx.savingsMonth}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  সংশোধনের সুস্পষ্ট কারণ লিখুন (বাধ্যতামূলক):
                </label>
                <textarea
                  rows={3}
                  placeholder="যেমন: ভুলবশত দ্বৈত এন্ট্রি করা হয়েছিল..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setCorrectionTargetTx(null)}
                  className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleConfirmReversal}
                  className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>রিভার্সাল নিশ্চিত করুন</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
