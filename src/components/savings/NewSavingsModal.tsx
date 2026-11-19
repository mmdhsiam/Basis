import React, { useState, useEffect } from 'react';
import { PlusCircle, AlertCircle, ShieldCheck, Building2, CreditCard, Calendar, ChevronLeft, CheckCircle2, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
import { toBengaliNumerals, formatCurrencyBengali } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { SpringIcon, AnimatedNumber, SMOOTH_EASE } from '../common/MotionPrimitives';

interface NewSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const MIN_DEPOSIT_MONTH_ID = '2026-11';

function getDhakaTodayInfo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value || '2026';
  const m = parts.find((p) => p.type === 'month')?.value || '11';
  const d = parts.find((p) => p.type === 'day')?.value || '01';
  const liveMonthId = `${y}-${m}`;
  return {
    dateStr: `${y}-${m}-${d}`,
    liveMonthId,
  };
}

function addMonthsToId(monthId: string, delta: number): string {
  const [yStr, mStr] = monthId.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10) + delta;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function buildDepositMonthOptions(liveMonthId: string) {
  const startMonthId = MIN_DEPOSIT_MONTH_ID;
  const effectiveCurrentMonthId = liveMonthId >= MIN_DEPOSIT_MONTH_ID ? liveMonthId : MIN_DEPOSIT_MONTH_ID;
  const endMonthId = addMonthsToId(effectiveCurrentMonthId, 1);

  const options: { id: string; label: string }[] = [];
  let cursor = startMonthId;
  let guard = 0;
  while (cursor <= endMonthId && guard < 120) {
    const [yStr, mStr] = cursor.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const baseLabel = `${BENGALI_MONTHS[month - 1]} ${toBengaliNumerals(year)}`;
    let suffix = '';
    if (cursor === liveMonthId) {
      suffix = ' (চলতি মাস)';
    } else if (cursor > effectiveCurrentMonthId) {
      suffix = ' (অগ্রিম)';
    }
    options.push({ id: cursor, label: `${baseLabel}${suffix}` });
    cursor = addMonthsToId(cursor, 1);
    guard += 1;
  }
  return { options, effectiveCurrentMonthId };
}

export const NewSavingsModal: React.FC<NewSavingsModalProps> = ({ isOpen, onClose }) => {
  const {
    users,
    savings,
    createSavingsEntry,
    currentUser,
    config,
    triggerSuccess,
    triggerWarning,
  } = useApp();

  const isModerator =
    currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR';

  const selectableMembers = users.filter(
    (u) => u.id !== '__guest__' && u.memberId !== 'GUEST' && u.status === 'APPROVED'
  );

  const [memberId, setMemberId] = useState<string>(
    currentUser?.memberId || selectableMembers[0]?.memberId || 'BF-001'
  );
  const [duplicatePopupInfo, setDuplicatePopupInfo] = useState<{
    status: 'APPROVED' | 'PENDING';
    memberName: string;
    monthLabel: string;
    amount: number;
  } | null>(null);
  const [amount, setAmount] = useState<number>(config.defaultMonthlyAmount || 1500);
  const initialDhaka = getDhakaTodayInfo();
  const initialMonths = buildDepositMonthOptions(initialDhaka.liveMonthId);
  const [transactionDate, setTransactionDate] = useState<string>(initialDhaka.dateStr);
  const [savingsMonth, setSavingsMonth] = useState<string>(initialMonths.effectiveCurrentMonthId);

  // Dynamic month options starting from November 2026 with ONLY real current calendar month labeled (চলতি মাস)
  const [monthOptions, setMonthOptions] = useState<{ id: string; label: string }[]>(
    initialMonths.options
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BKASH');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [bankName, setBankName] = useState<string>('ইসলামী ব্যাংক বাংলাদেশ পিএলসি');
  const [bankBranch, setBankBranch] = useState<string>('ধানমন্ডি শাখা');
  const [notes, setNotes] = useState<string>('');

  // Always default to logged-in user's own profile & today's live Dhaka date/month when modal opens
  useEffect(() => {
    if (isOpen) {
      const ownMemberId =
        currentUser?.memberId && currentUser.memberId !== 'GUEST'
          ? currentUser.memberId
          : selectableMembers[0]?.memberId || 'BF-001';
      const today = getDhakaTodayInfo();
      const built = buildDepositMonthOptions(today.liveMonthId);
      setMemberId(ownMemberId);
      setTransactionDate(today.dateStr);
      setMonthOptions(built.options);
      setSavingsMonth(built.effectiveCurrentMonthId);
      setDuplicatePopupInfo(null);
    }
  }, [isOpen, currentUser?.memberId]);

  const getMonthLabel = (monthId: string, opts = monthOptions) => {
    const found = opts.find((m) => m.id === monthId);
    if (found) return found.label.replace(/\s*\(.*?\)\s*/g, '').trim();
    return monthId;
  };

  const findExistingMonthDeposit = (targetMemberId: string, targetMonth: string) =>
    savings.find(
      (s) =>
        !s.isCorrection &&
        s.amount > 0 &&
        s.memberId === targetMemberId &&
        s.savingsMonth === targetMonth &&
        (s.status === 'APPROVED' || s.status === 'PENDING')
    );

  const openDuplicateWarningIfAny = (
    targetMemberId: string,
    targetMonth: string,
    opts = monthOptions
  ): boolean => {
    const existing = findExistingMonthDeposit(targetMemberId, targetMonth);
    if (!existing) return false;
    const memberObj = users.find((u) => u.memberId === targetMemberId);
    setDuplicatePopupInfo({
      status: existing.status as 'APPROVED' | 'PENDING',
      memberName: memberObj?.name || existing.memberName || targetMemberId,
      monthLabel: getMonthLabel(targetMonth, opts),
      amount: existing.amount,
    });
    return true;
  };

  const handleMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenMemberId = e.target.value;
    setMemberId(chosenMemberId);
    openDuplicateWarningIfAny(chosenMemberId, savingsMonth);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenVal = e.target.value;
    setSavingsMonth(chosenVal);

    let nextOpts = monthOptions;
    // Requirement 14: When last month is chosen, dynamically generate next month
    const lastItem = monthOptions[monthOptions.length - 1];
    if (lastItem && lastItem.id === chosenVal) {
      const nextMonthId = addMonthsToId(chosenVal, 1);
      const [nyStr, nmStr] = nextMonthId.split('-');
      const nextYear = parseInt(nyStr, 10);
      const nextMonthNum = parseInt(nmStr, 10);
      const liveNow = getDhakaTodayInfo().liveMonthId;
      const suffix = nextMonthId === liveNow ? ' (চলতি মাস)' : ' (অগ্রিম)';
      const nextMonthLabel = `${BENGALI_MONTHS[nextMonthNum - 1]} ${toBengaliNumerals(nextYear)}${suffix}`;

      if (!monthOptions.some((m) => m.id === nextMonthId)) {
        nextOpts = [...monthOptions, { id: nextMonthId, label: nextMonthLabel }];
        setMonthOptions(nextOpts);
        triggerSuccess(`পরবর্তী মাস "${nextMonthLabel}" সফলভাবে ড্রপডাউনে যুক্ত করা হয়েছে!`);
      }
    }

    openDuplicateWarningIfAny(memberId, chosenVal, nextOpts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      triggerWarning('অবৈধ পরিমাণ', 'সঞ্চয়ের পরিমাণ অবশ্যই ধনাত্মক হতে হবে।', false);
      return;
    }

    const effectiveMemberId = isModerator
      ? memberId
      : currentUser?.memberId || memberId;

    // Duplicate submission check for APPROVED or PENDING deposit in the selected month
    if (openDuplicateWarningIfAny(effectiveMemberId, savingsMonth)) {
      return;
    }

    let finalRef = transactionRef.trim();
    if (paymentMethod === 'BANK' || paymentMethod === 'BANK_TRANSFER') {
      const bankDetails = `${bankName} (${bankBranch})`;
      finalRef = finalRef ? `${bankDetails} - ভাউচার: ${finalRef}` : bankDetails;
    }

    const ok = createSavingsEntry({
      memberId: effectiveMemberId,
      amount: Number(amount),
      savingsMonth,
      savingsYear: Number(savingsMonth.split('-')[0]),
      paymentMethod,
      transactionRef: finalRef || undefined,
      notes: notes.trim() || undefined,
    });

    if (ok) {
      onClose();
    }
  };

  const activeMemberId = isModerator ? memberId : (currentUser?.memberId || memberId);
  const selectedMember = users.find((u) => u.memberId === activeMemberId);
  const existingMonthDeposit = findExistingMonthDeposit(activeMemberId, savingsMonth);

  const inputCls =
    'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 min-h-12 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500';
  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <AnimatePresence>
    {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: SMOOTH_EASE }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 sm:bg-slate-950/80 sm:backdrop-blur-sm"
    >
      <div className="mx-auto max-w-lg min-h-full sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.28, ease: SMOOTH_EASE }}
          className="bg-slate-950 sm:bg-slate-900 sm:border sm:border-slate-800 rounded-3xl sm:rounded-[28px] p-4 sm:p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="ফিরে যান"
              className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 text-ink flex items-center justify-center cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h3 className="text-[22px] font-bold text-ink leading-tight">টাকা জমা</h3>
              <p className="text-[11px] text-slate-400 truncate">২/৩ মডারেটর সিলিং অনুমোদন প্রক্রিয়ার আওতাধীন</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Member Selection — Visible ONLY for Moderators */}
            {isModerator && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 block">সদস্য নির্বাচন করুন</label>
                  <select
                    value={memberId}
                    onChange={handleMemberChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[13px] font-bold text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer truncate"
                  >
                    {selectableMembers.map((u) => (
                      <option key={u.id} value={u.memberId} className="bg-slate-900 text-slate-100">
                        {u.memberId} — {u.name} ({u.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Inline Status Banner if Selected Member Already Paid or Has Pending Deposit for Chosen Month */}
            {existingMonthDeposit && (
              <div
                className={`p-3 rounded-[18px] border flex items-start gap-2.5 text-xs ${
                  existingMonthDeposit.status === 'APPROVED'
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/35 text-amber-200'
                }`}
              >
                {existingMonthDeposit.status === 'APPROVED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  {existingMonthDeposit.status === 'APPROVED' ? (
                    <span>
                      <strong>{selectedMember?.name || activeMemberId}</strong>-এর{' '}
                      <strong>{getMonthLabel(savingsMonth)}</strong> মাসের সঞ্চয় (
                      {formatCurrencyBengali(existingMonthDeposit.amount)}) ইতোমধ্যে{' '}
                      <strong>জমা ও অনুমোদিত হয়েছে</strong>।
                    </span>
                  ) : (
                    <span>
                      <strong>{selectedMember?.name || activeMemberId}</strong>-এর{' '}
                      <strong>{getMonthLabel(savingsMonth)}</strong> মাসের জমার আবেদন (
                      {formatCurrencyBengali(existingMonthDeposit.amount)}) বর্তমানে{' '}
                      <strong>মডারেটর প্যানেলের অনুমোদনের অপেক্ষায় (পেন্ডিং)</strong> রয়েছে।
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Amount hero */}
            <div className="relative overflow-hidden rounded-3xl bg-hero text-white p-4">
              <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full border-[30px] border-white/[0.06]" />
              <label htmlFor="deposit-amount" className="relative text-[12px] font-bold text-white/85 block">জমার পরিমাণ (টাকা)</label>
              <div className="relative flex items-center gap-2 mt-1.5 px-3.5 py-2 rounded-2xl bg-white/10 border border-white/25 focus-within:border-white/60 focus-within:bg-white/15 transition-colors">
                <span className="text-[30px] sm:text-[34px] font-bold leading-none select-none">৳</span>
                <input
                  id="deposit-amount"
                  type="number"
                  min="100"
                  step="50"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-transparent rounded-xl px-1 text-[30px] sm:text-[34px] font-bold text-white focus:outline-none placeholder-white/40"
                  required
                />
              </div>
              <span className="relative text-[11px] text-white/80 block mt-1.5">কথায়: {formatCurrencyBengali(amount)}</span>
              <div className="relative grid grid-cols-4 gap-2 mt-3">
                {quickAmounts.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setAmount(q)}
                    className={`min-h-11 rounded-xl text-[13px] font-bold border transition-colors cursor-pointer ${
                      Number(amount) === q
                        ? 'bg-white text-[#075044] border-white'
                        : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                    }`}
                  >
                    ৳{toBengaliNumerals(q.toLocaleString('en-US'))}
                  </button>
                ))}
              </div>
            </div>

            {/* Month + date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-200">সঞ্চয়ের মাস</label>
                <select value={savingsMonth} onChange={handleMonthChange} className={`${inputCls} cursor-pointer font-bold`}>
                  {monthOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  জমার তারিখ
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className={`${inputCls} font-mono font-bold`}
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">
              নির্বাচিত তারিখ: {new Date(`${transactionDate}T00:00:00`).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            {/* Payment methods */}
            <div className="space-y-2">
              <label className="text-[15px] font-bold text-ink block">পেমেন্ট মাধ্যম</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'BKASH', label: 'বিকাশ' },
                  { id: 'NAGAD', label: 'নগদ' },
                  { id: 'ROCKET', label: 'রকেট' },
                  { id: 'BANK', label: 'ব্যাংক ট্রান্সফার' },
                  { id: 'CASH', label: 'ক্যাশ / সরাসরি' },
                ].map((m) => {
                  const active = paymentMethod === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      aria-pressed={active}
                      className={`min-h-14 px-3 rounded-[18px] text-left border-2 transition-all text-[13px] font-bold flex items-center gap-2.5 cursor-pointer ${
                        active
                          ? 'bg-emerald-500/10 border-emerald-500 text-ink'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </span>
                      <span className="flex-1 truncate">{m.label}</span>
                      {active && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional Bank Details Input */}
            <AnimatePresence initial={false}>
            {(paymentMethod === 'BANK' || paymentMethod === 'BANK_TRANSFER') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: SMOOTH_EASE }}
                className="overflow-hidden"
              >
              <div className="p-3.5 rounded-[20px] bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <Building2 className="w-4 h-4" />
                  <span>ব্যাংক ডিপোজিট বা ট্রান্সফার তথ্য</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ব্যাংকের নাম:</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="যেমন: ইসলামী ব্যাংক / ব্র্যাক ব্যাংক"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">শাখা (Branch):</label>
                    <input
                      type="text"
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      placeholder="যেমন: ধানমন্ডি শাখা"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Transaction Ref */}
            <div className="space-y-1">
              <label className="font-bold text-slate-200">
                {paymentMethod === 'BANK' ? 'ভাউচার / ডিপোজিট স্লিপ নং' : 'ট্রানজেকশন আইডি / রেফারেন্স'}
              </label>
              <input
                type="text"
                placeholder={paymentMethod === 'BANK' ? 'যেমন: DEP-20261016-092' : 'যেমন: BK-88129384'}
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-bold text-slate-200">মন্তব্য বা বিবরণ (ঐচ্ছিক)</label>
              <input
                type="text"
                placeholder="জমার বিবরণ লিখুন..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Summary */}
            <div className="rounded-[20px] bg-slate-900 border border-slate-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-[13px] text-slate-400">
                <span>সার্ভিস চার্জ</span>
                <span className="font-bold">৳ ০</span>
              </div>
              <div className="border-t border-slate-800" />
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-ink">মোট জমা</span>
                <AnimatedNumber
                  value={Number(amount) || 0}
                  formatter={(v) => formatCurrencyBengali(Math.round(v))}
                  className="text-[18px] text-ink"
                />
              </div>
            </div>

            {/* Approval Policy Note */}
            <div className="p-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-[11px] text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                নীতিমালা অনুচ্ছেদ ৫: এই এন্ট্রিটি দাখিলের পর অবিলম্বে পেন্ডিং থাকবে। যোগ্য মডারেটরদের ২/৩ অংশ (Ceiling) ভোট প্রদানের পর রসিদ প্রস্তুত হবে এবং মূল তহবিলে যোগ হবে।
              </span>
            </div>

            {/* Action Buttons */}
            <motion.button
              whileHover={{ y: -1.5 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="btn-brand w-full min-h-14 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 cursor-pointer"
            >
              <SpringIcon activeKey={paymentMethod}>
                <PlusCircle className="w-5 h-5" />
              </SpringIcon>
              <span>জমা নিশ্চিত করুন</span>
            </motion.button>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-11 rounded-2xl text-slate-400 hover:text-ink font-bold text-xs cursor-pointer"
            >
              বাতিল
            </button>
          </form>
        </motion.div>
      </div>

      {/* Duplicate Month Deposit / Pending Status Warning Popup */}
      <AnimatePresence>
      {duplicatePopupInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SMOOTH_EASE }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.24, ease: SMOOTH_EASE }}
            className={`bg-slate-900 border ${
              duplicatePopupInfo.status === 'APPROVED'
                ? 'border-emerald-500/50'
                : 'border-amber-500/50'
            } rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl`}
          >
            <div
              className={`w-14 h-14 rounded-3xl flex items-center justify-center mx-auto border ${
                duplicatePopupInfo.status === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {duplicatePopupInfo.status === 'APPROVED' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <AlertCircle className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-ink">
                {duplicatePopupInfo.status === 'APPROVED'
                  ? 'এই মাসের টাকা ইতোমধ্যে জমা হয়েছে!'
                  : 'অনুমোদনের অপেক্ষায় রয়েছে!'}
              </h4>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {duplicatePopupInfo.status === 'APPROVED' ? (
                  <>
                    <strong>{duplicatePopupInfo.memberName}</strong> ইতোমধ্যে{' '}
                    <strong>{duplicatePopupInfo.monthLabel}</strong> মাসের সঞ্চয়ের টাকা (
                    {formatCurrencyBengali(duplicatePopupInfo.amount)}) জমা দিয়েছেন এবং তা অনুমোদিত হয়েছে। একই মাসে পুনরায় জমা দেওয়া যাবে না।
                  </>
                ) : (
                  <>
                    <strong>{duplicatePopupInfo.memberName}</strong>-এর{' '}
                    <strong>{duplicatePopupInfo.monthLabel}</strong> মাসের টাকা জমার তথ্য (
                    {formatCurrencyBengali(duplicatePopupInfo.amount)}) সাবমিট করা হয়েছে এবং মডারেটর প্যানেলের অনুমোদনের অপেক্ষায় রয়েছে।
                  </>
                )}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setDuplicatePopupInfo(null)}
                className={`w-full py-2.5 px-5 rounded-2xl text-white font-bold text-xs transition-all cursor-pointer ${
                  duplicatePopupInfo.status === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                ঠিক আছে, বুঝেছি
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
