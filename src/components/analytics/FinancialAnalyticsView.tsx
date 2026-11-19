import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Wallet,
  Users,
  Building2,
  Award,
  Target,
  Sparkles,
  Landmark,
  Smartphone,
  CreditCard,
  Banknote,
  Zap,
  BellRing,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { registerBackHandler } from '../../utils/backNavigation';
import {
  formatCurrencyBengali,
  toBengaliNumerals,
} from '../../utils/calculations';
import { Avatar } from '../common/Avatar';
import { AnimatePresence, motion } from 'motion/react';
import {
  AnimatedNumber,
  AnimatedFormattedText,
  SlidingTabPill,
  SpringIcon,
  StaggerItem,
  StaggerList,
  SMOOTH_EASE,
  useViewportReplay,
} from '../common/MotionPrimitives';
import {
  FernlyCapsuleBarChart,
  InteractiveDonutChart,
  InteractiveSplineAreaChart,
  MiniSparkline,
  VoyageMilestoneTracker,
} from '../common/AnimatedCharts';

const ViewportProgressBar: React.FC<{ targetWidthPct: number; barColor: string }> = ({
  targetWidthPct,
  barColor,
}) => {
  const { ref, isInView, replayCount } = useViewportReplay(0.15);
  return (
    <div ref={ref} className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
      <motion.div
        key={replayCount}
        initial={{ width: '0%' }}
        animate={{ width: isInView ? `${targetWidthPct}%` : '0%' }}
        transition={{ duration: isInView ? 0.68 : 0.14, delay: 0, ease: SMOOTH_EASE }}
        className={`h-2 rounded-full bg-gradient-to-r ${barColor}`}
      />
    </div>
  );
};

const BENGALI_MONTH_NAMES = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const formatMonthKeyBengali = (monthKey: string, shortYear = false): string => {
  const [yStr, mStr] = monthKey.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (!y || !m || m < 1 || m > 12) return monthKey;
  const monthName = BENGALI_MONTH_NAMES[m - 1];
  const yearLabel = shortYear ? toBengaliNumerals(String(y).slice(-2)) : toBengaliNumerals(y);
  return `${monthName} ${yearLabel}`;
};

export const FinancialAnalyticsView: React.FC = () => {
  const {
    savings,
    users,
    financialTotals,
    growthRate,
    expenses,
    currentUser,
    isGuestMode,
    config,
    sendOverdueReminder,
    overdueReminders,
    overdueReminderMap,
  } = useApp();

  const now = new Date();
  const liveMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isModerator =
    !isGuestMode &&
    Boolean(currentUser && (currentUser.role === 'APP_MODERATOR' || currentUser.role === 'MODERATOR'));

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [activeChartType, setActiveChartType] = useState<'BAR' | 'VS_EXPENSE' | 'CUMULATIVE' | 'DONUT'>('BAR');
  const [cumulativeShadow, setCumulativeShadow] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const [hoveredDonutId, setHoveredDonutId] = useState<string | null>(null);

  // Deliverable 9: Member Contributions Sub-Tabs & Monthly Paid/Unpaid + Conditional Overdue Reminder
  const [contribSubTab, setContribSubTab] = useState<'RANKING' | 'MONTHLY_STATUS'>('RANKING');
  const [selectedContribMonth, setSelectedContribMonth] = useState<string>(liveMonthKey);
  const [tagidTarget, setTagidTarget] = useState<{
    memberId: string;
    memberName: string;
    amount: string;
    monthLabel: string;
    deadlineText: string;
  } | null>(null);

  useEffect(() => {
    if (!tagidTarget) return;
    return registerBackHandler(() => setTagidTarget(null));
  }, [tagidTarget]);

  // Month list with data dynamically computed from all approved transactions across all members
  const monthsData = useMemo(() => {
    const baseMonths = [
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ];
    const hasLiveMonthActivity =
      savings.some((t) => t.savingsMonth === liveMonthKey && t.status === 'APPROVED') ||
      expenses.some((e) => e.expenseDate.startsWith(liveMonthKey)) ||
      selectedMonth === liveMonthKey;
    if (hasLiveMonthActivity && !baseMonths.includes(liveMonthKey)) {
      baseMonths.push(liveMonthKey);
    }
    const months = baseMonths.sort().map((mKey) => ({
      month: mKey,
      label: formatMonthKeyBengali(mKey, true),
    }));
    let cum = 0;
    let cumExp = 0;
    return months.map((m) => {
      // Sum all approved transactions for this specific month from any member
      const monthTxSum = savings
        .filter((t) => t.savingsMonth === m.month && t.status === 'APPROVED')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpSum = expenses
        .filter((e) => e.expenseDate.startsWith(m.month))
        .reduce((sum, e) => sum + e.amount, 0);

      cum += monthTxSum;
      cumExp += monthExpSum;
      return {
        month: m.month,
        label: m.label,
        amount: monthTxSum,
        expense: monthExpSum,
        cumulative: cum,
        cumulativeExpense: cumExp,
      };
    });
  }, [savings, expenses]);

  const maxMonthAmount = Math.max(...monthsData.map((m) => Math.max(m.amount, m.expense || 0)), 10000);
  const maxCumulative = Math.max(...monthsData.map((m) => m.cumulative), 30000);

  // Payment method breakdown for selected month (including BANK)
  const paymentBreakdown = useMemo(() => {
    const monthTxs = savings.filter(
      (t) => t.savingsMonth === selectedMonth && t.status === 'APPROVED'
    );
    const breakdown: Record<string, number> = {
      BKASH: 0,
      BANK: 0,
      BANK_TRANSFER: 0,
      NAGAD: 0,
      ROCKET: 0,
      CASH: 0,
      OTHER: 0,
    };
    for (const tx of monthTxs) {
      if (tx.paymentMethod === 'BANK_TRANSFER' || tx.paymentMethod === 'BANK') {
        breakdown.BANK = (breakdown.BANK || 0) + tx.amount;
      } else {
        breakdown[tx.paymentMethod] = (breakdown[tx.paymentMethod] || 0) + tx.amount;
      }
    }
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { breakdown, total };
  }, [savings, selectedMonth]);

  // Approved real members (excluding unified Guest placeholder)
  const approvedRealMembers = useMemo(
    () =>
      users.filter(
        (u) => u.status === 'APPROVED' && u.id !== '__guest__' && u.memberId !== 'GUEST'
      ),
    [users]
  );

  // Deliverable 9 Sub-Tab 1: Member savings ranking based on regular deposits (count first, then total amount)
  const memberRankings = useMemo(() => {
    const totals: Record<
      string,
      { memberId: string; name: string; total: number; count: number; avatar?: string }
    > = {};

    for (const u of approvedRealMembers) {
      totals[u.memberId] = {
        memberId: u.memberId,
        name: u.name,
        total: 0,
        count: 0,
        avatar: u.avatarUrl,
      };
    }

    for (const tx of savings.filter((s) => s.status === 'APPROVED')) {
      if (!totals[tx.memberId]) {
        const u = users.find((user) => user.memberId === tx.memberId);
        if (u && (u.id === '__guest__' || u.memberId === 'GUEST')) continue;
        totals[tx.memberId] = {
          memberId: tx.memberId,
          name: u?.name || tx.memberName,
          total: 0,
          count: 0,
          avatar: u?.avatarUrl,
        };
      }
      totals[tx.memberId].total += tx.amount;
      if (!tx.isCorrection && tx.amount > 0) {
        totals[tx.memberId].count += 1;
      }
    }

    return Object.values(totals).sort(
      (a, b) => b.count - a.count || b.total - a.total || a.memberId.localeCompare(b.memberId)
    );
  }, [savings, users, approvedRealMembers]);

  // Deliverable 9 Sub-Tab 2: Selectable contribution months (newest first, including live ongoing month)
  const contribMonthOptions = useMemo(() => {
    const monthSet = new Set<string>([
      liveMonthKey,
      '2026-10',
      '2026-09',
      '2026-08',
      '2026-07',
      '2026-06',
    ]);
    for (const tx of savings) {
      if (tx.savingsMonth) monthSet.add(tx.savingsMonth);
    }
    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map((mKey) => ({
        id: mKey,
        label:
          mKey === liveMonthKey
            ? `${formatMonthKeyBengali(mKey)} (চলতি মাস)`
            : formatMonthKeyBengali(mKey),
        cleanLabel: formatMonthKeyBengali(mKey),
      }));
  }, [savings, liveMonthKey]);

  // Monthly Paid vs Unpaid member list for selectedContribMonth (Paid on top, Unpaid at bottom)
  const monthlyMemberStatus = useMemo(() => {
    const items = approvedRealMembers.map((u) => {
      const memberMonthTxs = savings.filter(
        (s) =>
          s.memberId === u.memberId &&
          s.savingsMonth === selectedContribMonth &&
          !s.isCorrection &&
          s.amount > 0
      );
      const paidAmount = memberMonthTxs
        .filter((s) => s.status === 'APPROVED')
        .reduce((acc, s) => acc + s.amount, 0);
      const hasPending = memberMonthTxs.some((s) => s.status === 'PENDING');
      return {
        id: u.id,
        memberId: u.memberId,
        name: u.name,
        avatar: u.avatarUrl,
        phone: u.phone,
        paidAmount,
        hasPaid: paidAmount > 0,
        hasPending,
      };
    });

    const paidList = items
      .filter((i) => i.hasPaid)
      .sort((a, b) => b.paidAmount - a.paidAmount || a.memberId.localeCompare(b.memberId));
    const unpaidList = items
      .filter((i) => !i.hasPaid)
      .sort((a, b) => a.memberId.localeCompare(b.memberId));

    return {
      all: [...paidList, ...unpaidList],
      paidCount: paidList.length,
      unpaidCount: unpaidList.length,
    };
  }, [approvedRealMembers, savings, selectedContribMonth]);

  // Conditional Overdue Reminder ("তাগিদ") rule:
  // ONLY for moderators, ONLY when selectedContribMonth is the current ongoing month, AND ONLY up to the 10th day of the month.
  const canShowOverdueTagid =
    isModerator && selectedContribMonth === liveMonthKey && now.getDate() <= 10;

  const openTagidModalForMember = (memberId: string, fallbackName: string) => {
    const saved = overdueReminderMap[memberId];
    const chosenOpt = contribMonthOptions.find((o) => o.id === selectedContribMonth);
    const cleanMonthLabel = chosenOpt?.cleanLabel || formatMonthKeyBengali(selectedContribMonth);
    setTagidTarget({
      memberId,
      memberName: saved?.memberName || fallbackName,
      amount: String(saved?.amount ?? (config.defaultMonthlyAmount || 1500)),
      monthLabel: cleanMonthLabel,
      deadlineText:
        saved?.deadlineText || `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`,
    });
  };

  const handleConfirmTagidSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagidTarget) return;
    sendOverdueReminder(tagidTarget.memberId, {
      memberName: tagidTarget.memberName.trim() || tagidTarget.memberId,
      amount: Math.max(1, Number(tagidTarget.amount) || config.defaultMonthlyAmount || 1500),
      monthKey: selectedContribMonth,
      monthLabel: tagidTarget.monthLabel.trim() || formatMonthKeyBengali(selectedContribMonth),
      deadlineText:
        tagidTarget.deadlineText.trim() ||
        `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`,
    });
    setTagidTarget(null);
  };

  // Participation rate for selected month (excluding unified Guest placeholder)
  const activeMembersCount = users.filter(
    (u) => u.status === 'APPROVED' && u.id !== '__guest__' && u.memberId !== 'GUEST'
  ).length;
  const depositedMembersCount = new Set(
    savings
      .filter((t) => t.savingsMonth === selectedMonth && t.status === 'APPROVED')
      .map((t) => t.memberId)
  ).size;
  const participationPct = Math.round(
    (depositedMembersCount / Math.max(1, activeMembersCount)) * 100
  );

  // Annual Target (৳ ২,০০,০০০)
  const annualTarget = 200000;
  const totalSavings = financialTotals.totalApproved;
  const targetPct = Math.min(100, Math.round((totalSavings / annualTarget) * 100));

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Header with Month & Year Selectors */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              <span>হিসাব বিশ্লেষণ ও আর্থিক পরিসংখ্যান (Financial Analytics)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              অনুমোদিত লেনদেনের গতিপ্রকৃতি, বার চার্ট, ডোনাট গ্রাফ, সঞ্চয়ন কার্ভ ও বাৎসরিক লক্ষ্যমাত্রা পর্যবেক্ষণ।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="মাস নির্বাচন করুন"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-ink font-bold rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="2026-11">নভেম্বর ২০২৬</option>
              <option value="2026-10">অক্টোবর ২০২৬</option>
              <option value="2026-09">সেপ্টেম্বর ২০২৬</option>
              <option value="2026-08">আগস্ট ২০২৬</option>
            </select>

            <select
              aria-label="সাল নির্বাচন করুন"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-xs text-ink font-bold rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value={2026}>২০২৬ সাল</option>
              <option value={2025}>২০২৫ সাল</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Primary 4 Metric Highlights (Upgraded with Lucide Icons, Count-Ups & Inline Sparklines) */}
      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StaggerItem hoverLift>
          <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-sm card-interactive flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400">নির্বাচিত মাসের সঞ্চয়</span>
              <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <SpringIcon activeKey={selectedMonth}>
                  <Wallet className="w-4 h-4" />
                </SpringIcon>
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 mt-2">
              <div>
                <h3 className="text-2xl font-bold text-emerald-400">
                  <AnimatedNumber value={paymentBreakdown.total} formatter={formatCurrencyBengali} />
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-bold">
                  সময়কাল: {selectedMonth}
                </p>
              </div>
              <MiniSparkline values={monthsData.map((m) => m.amount)} stroke="#10b981" className="w-16 h-7" />
            </div>
          </div>
        </StaggerItem>

        <StaggerItem hoverLift>
          <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-sm card-interactive flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400">মাসিক প্রবৃদ্ধি হার</span>
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  growthRate.isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                <SpringIcon activeKey={growthRate.formatted}>
                  <TrendingUp className="w-4 h-4" />
                </SpringIcon>
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 mt-2">
              <div>
                <h3
                  className={`text-2xl font-bold flex items-center gap-1 ${
                    growthRate.isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {growthRate.isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  <AnimatedFormattedText text={growthRate.formatted} />
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-bold">পূর্ববর্তী মাসের তুলনায়</p>
              </div>
              <MiniSparkline
                values={monthsData.map((m) => m.cumulative)}
                stroke={growthRate.isPositive ? '#34d399' : '#fb7185'}
                className="w-16 h-7"
              />
            </div>
          </div>
        </StaggerItem>

        <StaggerItem hoverLift>
          <div className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-3xl p-4 sm:p-5 shadow-sm card-interactive flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400">সদস্য অংশগ্রহণ হার</span>
              <span className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                <SpringIcon activeKey={participationPct}>
                  <Users className="w-4 h-4" />
                </SpringIcon>
              </span>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-bold text-blue-400">
                <AnimatedNumber value={participationPct} formatter={(v) => `${toBengaliNumerals(Math.round(v))}%`} />
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-bold">
                <AnimatedNumber
                  value={depositedMembersCount}
                  formatter={(v) => toBengaliNumerals(Math.round(v))}
                />
                /
                <AnimatedNumber
                  value={activeMembersCount}
                  formatter={(v) => toBengaliNumerals(Math.round(v))}
                />{' '}
                জন সদস্য
              </p>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem hoverLift>
          <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-sm card-interactive flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400">বাৎসরিক লক্ষ্য অর্জন</span>
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <SpringIcon activeKey={targetPct}>
                  <Target className="w-4 h-4" />
                </SpringIcon>
              </span>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-bold text-amber-400">
                <AnimatedNumber value={targetPct} formatter={(v) => `${toBengaliNumerals(Math.round(v))}%`} />
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-bold">
                লক্ষ্য: <AnimatedNumber value={annualTarget} formatter={formatCurrencyBengali} />
              </p>
            </div>
          </div>
        </StaggerItem>
      </StaggerList>

      {/* 3. Interactive Main Chart: Toggle Between Monthly Bar Chart, Savings vs Expenses, & Cumulative Fund Curve */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-ink text-base sm:text-lg flex items-center gap-2">
              <SpringIcon activeKey={activeChartType}>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </SpringIcon>
              <span>
                {activeChartType === 'BAR' && 'মাসভিত্তিক সঞ্চয় আদায় বার চার্ট'}
                {activeChartType === 'VS_EXPENSE' && 'মাসিক সঞ্চয় বনাম ফাউন্ডেশন খরচ তুলনামূলক গ্রাফ'}
                {activeChartType === 'CUMULATIVE' && 'ক্রমপুঞ্জিত মোট তহবিল সঞ্চয়ন কার্ভ'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {activeChartType === 'BAR' && 'প্রতি মাসের অনুমোদিত আয়ের তুলনামূলক চিত্র'}
              {activeChartType === 'VS_EXPENSE' && 'অনুমোদিত সঞ্চয় আদায় এবং সাংগঠনিক ব্যয়ের তুলনামূলক স্বাস্থ্য'}
              {activeChartType === 'CUMULATIVE' && 'তহবিলের ক্রমাগত বৃদ্ধি ও সঞ্চয়ের সার্বিক গতিপ্রকৃতি'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto flex-wrap">
            {(
              [
                { id: 'BAR', label: 'বার চার্ট (Monthly)' },
                { id: 'CUMULATIVE', label: 'সঞ্চয়ন কার্ভ (Cumulative)' },
                { id: 'VS_EXPENSE', label: 'সঞ্চয় বনাম ব্যয় (Comparison)' },
              ] as const
            ).map((btn) => {
              const isSelected = activeChartType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setActiveChartType(btn.id)}
                  className={`relative py-1.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected ? 'text-white' : 'text-slate-400 hover:text-ink'
                  }`}
                >
                  {isSelected && <SlidingTabPill layoutId="analytics-main-chart-pill" />}
                  <span className="relative z-10">{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <motion.div
          key={activeChartType}
          initial={{ opacity: 0.72, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0, ease: SMOOTH_EASE }}
        >
          {/* Visual Fernly Capsule Bar Chart */}
          {activeChartType === 'BAR' && (
            <div className="pt-2">
              <FernlyCapsuleBarChart
                heightClass="h-60"
                data={monthsData.map((item) => ({
                  key: item.month,
                  label: item.label,
                  value: item.amount,
                  isHighlighted: item.month === selectedMonth,
                }))}
              />
            </div>
          )}

          {/* Savings vs Expenses Comparative Capsule Bar Chart */}
          {activeChartType === 'VS_EXPENSE' && (
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
                  <span>অনুমোদিত সঞ্চয় জমা (Income)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" />
                  <span>ফাউন্ডেশন খরচ ও ব্যয় (Expense)</span>
                </span>
              </div>

              <FernlyCapsuleBarChart
                heightClass="h-60"
                dualMode
                primaryLabel="সঞ্চয় জমা"
                secondaryLabel="ব্যয়"
                data={monthsData.map((item) => ({
                  key: item.month,
                  label: item.label,
                  value: item.amount,
                  secondaryValue: item.expense || 0,
                  isHighlighted: item.month === selectedMonth,
                }))}
              />

              <p className="text-[11px] text-slate-400 text-center italic">
                * সবুজ বার নির্দেশ করে মোট সঞ্চয় জমা এবং লাল বার নির্দেশ করে ফাউন্ডেশনের দাপ্তরিক ও কল্যাণ ব্যয়
              </p>
            </div>
          )}

          {/* Cumulative Interactive Smooth Spline Area Curve (Points 3 & 5) */}
          {activeChartType === 'CUMULATIVE' && (
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-300 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCumulativeShadow('PRIMARY')}
                  className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
                    cumulativeShadow === 'PRIMARY' ? 'opacity-100 text-ink' : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0" />
                  <span>অনুমোদিত সঞ্চয় জমা (Income)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCumulativeShadow('SECONDARY')}
                  className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
                    cumulativeShadow === 'SECONDARY' ? 'opacity-100 text-ink' : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shrink-0" />
                  <span>ফাউন্ডেশন খরচ ও ব্যয় (Expense)</span>
                </button>
              </div>

              <InteractiveSplineAreaChart
                height={232}
                valueLabel="ক্রমপুঞ্জিত সঞ্চয়"
                secondarySeriesLabel="ক্রমপুঞ্জিত ব্যয়"
                activeShadow={cumulativeShadow}
                onChangeActiveShadow={setCumulativeShadow}
                data={monthsData.map((item) => ({
                  key: item.month,
                  label: item.label,
                  value: item.cumulative,
                  secondaryValue: item.cumulativeExpense || 0,
                  isHighlighted: item.month === selectedMonth,
                }))}
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* 4. Payment Method Distribution (Interactive SVG Donut) & Annual Target Voyage Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods Breakdown with Interactive SVG Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-400" />
              <span>পদ্ধতিভিত্তিক পাই চার্ট ও অনুপাত ({selectedMonth})</span>
            </h3>
            <span className="text-xs font-bold text-emerald-400">
              মোট: <AnimatedNumber value={paymentBreakdown.total} formatter={formatCurrencyBengali} />
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
            <InteractiveDonutChart
              total={paymentBreakdown.total}
              activeId={hoveredDonutId}
              onHoverSlice={setHoveredDonutId}
              slices={[
                { id: 'BANK', label: 'ব্যাংক ডিপোজিট (Bank)', amount: paymentBreakdown.breakdown.BANK || 0, stroke: '#10b981' },
                { id: 'BKASH', label: 'বিকাশ (bKash)', amount: paymentBreakdown.breakdown.BKASH || 0, stroke: '#ec4899' },
                { id: 'NAGAD', label: 'নগদ (Nagad)', amount: paymentBreakdown.breakdown.NAGAD || 0, stroke: '#f59e0b' },
                { id: 'ROCKET', label: 'রকেট (Rocket)', amount: paymentBreakdown.breakdown.ROCKET || 0, stroke: '#a855f7' },
                { id: 'CASH', label: 'সরাসরি ক্যাশ (Cash)', amount: paymentBreakdown.breakdown.CASH || 0, stroke: '#3b82f6' },
              ]}
            />

            {/* Methods Legend Bars with Modern Lucide Icons */}
            <div className="flex-1 w-full space-y-2.5">
              {[
                { id: 'BANK', method: 'ব্যাংক ডিপোজিট (Bank)', amount: paymentBreakdown.breakdown.BANK || 0, color: 'bg-emerald-500', barColor: 'from-emerald-600 to-teal-400', Icon: Landmark, iconTone: 'text-emerald-400' },
                { id: 'BKASH', method: 'বিকাশ (bKash)', amount: paymentBreakdown.breakdown.BKASH || 0, color: 'bg-pink-500', barColor: 'from-pink-600 to-rose-400', Icon: Smartphone, iconTone: 'text-pink-400' },
                { id: 'NAGAD', method: 'নগদ (Nagad)', amount: paymentBreakdown.breakdown.NAGAD || 0, color: 'bg-amber-500', barColor: 'from-amber-600 to-yellow-400', Icon: CreditCard, iconTone: 'text-amber-400' },
                { id: 'ROCKET', method: 'রকেট (Rocket)', amount: paymentBreakdown.breakdown.ROCKET || 0, color: 'bg-purple-500', barColor: 'from-purple-600 to-indigo-400', Icon: Zap, iconTone: 'text-purple-400' },
                { id: 'CASH', method: 'সরাসরি ক্যাশ (Cash)', amount: paymentBreakdown.breakdown.CASH || 0, color: 'bg-blue-500', barColor: 'from-blue-600 to-cyan-400', Icon: Banknote, iconTone: 'text-blue-400' },
              ].map((p, idx) => {
                const pct = paymentBreakdown.total > 0
                  ? Math.round((p.amount / paymentBreakdown.total) * 100)
                  : 0;
                const MethodIcon = p.Icon;
                const isHighlighted = hoveredDonutId === p.id;

                return (
                  <div
                    key={p.method}
                    onMouseEnter={() => setHoveredDonutId(p.id)}
                    onMouseLeave={() => setHoveredDonutId(null)}
                    className={`space-y-1 p-1.5 -mx-1.5 rounded-xl transition-colors cursor-pointer ${
                      isHighlighted ? 'bg-slate-800/70' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex justify-between text-[11px]">
                      <span className="text-ink font-bold flex items-center gap-1.5">
                        <MethodIcon className={`w-3.5 h-3.5 ${p.iconTone}`} />
                        <span>{p.method}</span>
                      </span>
                      <span className="text-slate-300 font-bold tabular">
                        <AnimatedNumber value={p.amount} formatter={formatCurrencyBengali} /> (
                        <AnimatedNumber value={pct} formatter={(v) => `${toBengaliNumerals(Math.round(v))}%`} />)
                      </span>
                    </div>
                    <ViewportProgressBar
                      targetWidthPct={Math.max(pct, p.amount > 0 ? 5 : 0)}
                      barColor={p.barColor}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Annual Target & Moorly Wavy Voyage Milestone Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <span>বাৎসরিক সঞ্চয় লক্ষ্যমাত্রা অগ্রগতি</span>
              </h3>
              <span className="text-xs font-bold text-amber-400">২০২৬ অর্থবছর</span>
            </div>

            <div className="pt-4 space-y-3.5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block">বর্তমান সঞ্চিত তহবিল:</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    <AnimatedNumber value={totalSavings} formatter={formatCurrencyBengali} />
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 font-bold block">ধার্যকৃত লক্ষ্যমাত্রা:</span>
                  <span className="text-xl font-bold text-ink">
                    <AnimatedNumber value={annualTarget} formatter={formatCurrencyBengali} />
                  </span>
                </div>
              </div>

              {/* Video 3 (Moorly) Wavy Milestone Voyage Route */}
              <VoyageMilestoneTracker
                progressPct={targetPct}
                milestones={[
                  { pct: 0, label: '০%' },
                  { pct: 25, label: '২৫%' },
                  { pct: 50, label: '৫০%' },
                  { pct: 75, label: '৭৫%' },
                  { pct: 100, label: '১০০%' },
                ]}
              />

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                <p>
                  🎯 ফাউন্ডেশন নির্ধারিত বার্ষিক লক্ষ্যমাত্রার{' '}
                  <strong className="text-emerald-400 font-bold">
                    <AnimatedNumber value={targetPct} formatter={(v) => `${toBengaliNumerals(Math.round(v))}%`} />
                  </strong>{' '}
                  অর্জিত হয়েছে। বাকি{' '}
                  <strong className="text-amber-300 font-bold">
                    <AnimatedNumber
                      value={Math.max(0, annualTarget - totalSavings)}
                      formatter={formatCurrencyBengali}
                    />
                  </strong>{' '}
                  সঞ্চয় চলতি অর্থবছরে সদস্যদের নিয়মিত জমার মাধ্যমে আদায়যোগ্য।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Member Contributions: Sub-Tab 1 (Regular Deposit Ranking) & Sub-Tab 2 (Monthly Paid/Unpaid + Conditional Overdue Reminder) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="font-bold text-ink text-base">
                সদস্য সঞ্চয় অবদান ও মাসিক জমা ট্র্যাকার (Member Contributions)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {contribSubTab === 'RANKING'
                ? 'নিয়মিত কিস্তি জমা ও মোট সঞ্চয়ের ভিত্তিতে সদস্যদের সার্বিক র‍্যাংকিং'
                : 'নির্বাচিত মাসে জমাদানকারী সদস্য উপরে এবং বকেয়া সদস্য নিচে প্রদর্শিত'}
            </p>
          </div>

          {/* 2 Sub-Tabs Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start md:self-auto">
            {(
              [
                { id: 'RANKING', label: 'নিয়মিত জমা ও র‍্যাংকিং' },
                { id: 'MONTHLY_STATUS', label: 'মাসভিত্তিক জমা ও বকেয়া' },
              ] as const
            ).map((tab) => {
              const isSelected = contribSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setContribSubTab(tab.id)}
                  className={`relative py-2 px-3.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected ? 'text-white' : 'text-slate-400 hover:text-ink'
                  }`}
                >
                  {isSelected && <SlidingTabPill layoutId="member-contrib-subtab-pill" />}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SUB-TAB 1: Regular Deposit Ranking */}
        {contribSubTab === 'RANKING' && (
          <StaggerList key="contrib-ranking" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {memberRankings.map((rank, index) => (
              <StaggerItem key={rank.memberId} hoverLift>
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 card-interactive flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        index === 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : index === 1
                          ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                          : index === 2
                          ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <AnimatedNumber
                        value={index + 1}
                        formatter={(v) => `#${toBengaliNumerals(Math.round(v))}`}
                      />
                    </div>

                    <Avatar src={rank.avatar} name={rank.name} size="sm" />

                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-ink truncate">{rank.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono block">{rank.memberId}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-emerald-400 text-xs block">
                      <AnimatedNumber value={rank.total} formatter={formatCurrencyBengali} />
                    </span>
                    <span className="text-[10px] text-amber-300/90 font-bold">
                      <AnimatedNumber
                        value={rank.count}
                        formatter={(v) => `${toBengaliNumerals(Math.round(v))} বার নিয়মিত জমা`}
                      />
                    </span>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        )}

        {/* SUB-TAB 2: Monthly Paid vs Unpaid Members + Conditional Overdue Reminder */}
        {contribSubTab === 'MONTHLY_STATUS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>জমা দিয়েছেন: {toBengaliNumerals(monthlyMemberStatus.paidCount)} জন</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-rose-400 font-bold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>জমা দেয়নি: {toBengaliNumerals(monthlyMemberStatus.unpaidCount)} জন</span>
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <label htmlFor="contrib-month-select" className="text-xs font-bold text-slate-300 whitespace-nowrap">
                  মাস নির্বাচন:
                </label>
                <select
                  id="contrib-month-select"
                  value={selectedContribMonth}
                  onChange={(e) => setSelectedContribMonth(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-ink font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  {contribMonthOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-100">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <StaggerList
              key={`monthly-status-${selectedContribMonth}`}
              className="space-y-2.5"
              stagger={0}
            >
              {monthlyMemberStatus.all.map((member) => {
                const isReminded = overdueReminders.includes(member.memberId);
                return (
                  <StaggerItem key={member.memberId}>
                    <div
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        member.hasPaid
                          ? 'bg-slate-950/80 border-emerald-500/25 hover:border-emerald-500/45'
                          : 'bg-rose-950/15 border-rose-500/25 hover:border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={member.avatar}
                          name={member.name}
                          size="sm"
                          ringColor={member.hasPaid ? 'ring-emerald-500/60' : 'ring-rose-500/50'}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-ink truncate">
                              {member.name}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({member.memberId})
                            </span>
                            {!member.hasPaid && member.hasPending && (
                              <span className="text-[10px] font-bold text-amber-300">
                                • পেন্ডিং আবেদন রয়েছে
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            {member.hasPaid ? 'নির্বাচিত মাসের সঞ্চয় অনুমোদিত' : 'নির্বাচিত মাসে কোনো অনুমোদিত জমা নেই'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/70 shrink-0">
                        {member.hasPaid ? (
                          <div className="text-right">
                            <span className="font-bold text-emerald-400 text-sm block">
                              <AnimatedNumber
                                value={member.paidAmount}
                                formatter={formatCurrencyBengali}
                              />
                            </span>
                            <span className="text-[10px] text-emerald-300/80 font-bold">
                              জমা সম্পন্ন
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-rose-400 text-xs sm:text-sm">
                              জমা দেয়নি
                            </span>

                            {/* Conditional Overdue Reminder ("তাগিদ দিন"): ONLY ongoing month + up to 10th + moderator */}
                            {canShowOverdueTagid && (
                              <button
                                type="button"
                                onClick={() => openTagidModalForMember(member.memberId, member.name)}
                                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                                  isReminded
                                    ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35'
                                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                                }`}
                              >
                                <BellRing className="w-3.5 h-3.5 shrink-0" />
                                <span>{isReminded ? 'পুনরায় তাগিদ' : 'তাগিদ দিন'}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          </div>
        )}
      </div>

      {/* Overdue Reminder ("তাগিদ") Configuration Portal Modal */}
      {tagidTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: SMOOTH_EASE }}
              onClick={() => setTagidTarget(null)}
              className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.2, ease: SMOOTH_EASE }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full max-h-[86dvh] flex flex-col shadow-2xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                      <BellRing className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-ink text-sm sm:text-base truncate">
                        বকেয়া সঞ্চয়ের তাগিদ পাঠান
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        সদস্য আইডি: {tagidTarget.memberId} • পপআপ রিমাইন্ডার কনফিগারেশন
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTagidTarget(null)}
                    aria-label="বন্ধ করুন"
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleConfirmTagidSend}
                  className="p-5 overflow-y-auto space-y-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">
                      পপআপ কার্ডে প্রদর্শিত নাম
                    </label>
                    <input
                      type="text"
                      required
                      value={tagidTarget.memberName}
                      onChange={(e) =>
                        setTagidTarget((prev) =>
                          prev ? { ...prev, memberName: e.target.value } : prev
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-ink font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300 block">
                        টাকার পরিমাণ (৳)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={tagidTarget.amount}
                        onChange={(e) =>
                          setTagidTarget((prev) =>
                            prev ? { ...prev, amount: e.target.value } : prev
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-300 block">
                        চলতি মাসের নাম
                      </label>
                      <input
                        type="text"
                        required
                        value={tagidTarget.monthLabel}
                        onChange={(e) =>
                          setTagidTarget((prev) =>
                            prev ? { ...prev, monthLabel: e.target.value } : prev
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-ink font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">
                      জমা দেওয়ার শেষ সময়সীমা
                    </label>
                    <input
                      type="text"
                      required
                      value={tagidTarget.deadlineText}
                      onChange={(e) =>
                        setTagidTarget((prev) =>
                          prev ? { ...prev, deadlineText: e.target.value } : prev
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-ink font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTagidTarget(null)}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>তাগিদ পাঠান</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
