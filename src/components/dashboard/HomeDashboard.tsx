import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  Bell,
  PlusCircle,
  FileSpreadsheet,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Lightbulb,
  Receipt,
  BarChart3,
  Send,
  Building2,
  MessageSquare,
  BookOpen,
  HelpCircle,
  X,
  Plus,
  LayoutGrid,
  Landmark,
  Award,
  RotateCw,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrencyBengali,
  toBengaliNumerals,
  getBengaliDateParts,
  getMonthNameBengali,
  formatDateTimeBengali,
  getUserDesignationList,
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
  InteractiveSplineAreaChart,
  MiniSparkline,
} from '../common/AnimatedCharts';

interface HomeDashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenNewSavingsModal: () => void;
}

/** Month key (YYYY-MM) in Asia/Dhaka */
const currentMonthKey = (): string => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const monthLabel = (key: string): string => {
  const known = getMonthNameBengali(key);
  if (known !== key) return known;
  const [y, m] = key.split('-');
  return `${BN_MONTHS[Number(m) - 1] ?? key} ${toBengaliNumerals(y)}`;
};

/** Circular progress ring — animates from 0 every time it enters the viewport */
const Ring: React.FC<{ pct: number }> = ({ pct }) => {
  const { ref, isInView, replayCount } = useViewportReplay(0.2);
  const r = 34;
  const c = 2 * Math.PI * r;
  const targetOffset = c - (Math.min(pct, 100) / 100) * c;
  return (
    <div ref={ref} className="relative w-[88px] h-[88px] shrink-0">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="9" className="stroke-slate-800" />
        <motion.circle
          key={replayCount}
          cx="44"
          cy="44"
          r={r}
          fill="none"
          className="stroke-emerald-400"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: isInView ? targetOffset : c }}
          transition={{ duration: isInView ? 0.92 : 0.15, ease: SMOOTH_EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <AnimatedNumber
          value={Math.round(pct)}
          formatter={(v) => `${toBengaliNumerals(Math.round(v))}%`}
          className="text-lg font-bold text-ink"
        />
        <span className="text-[9px] font-bold text-slate-400 mt-0.5">জমা সম্পন্ন</span>
      </div>
    </div>
  );
};

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ setActiveTab, onOpenNewSavingsModal }) => {
  const {
    currentUser,
    users,
    savings,
    financialTotals,
    growthRate,
    monthlyAggregates,
    notices,
    complaints,
    chatMessages,
    receipts,
    config,
    overdueReminders,
    sendOverdueReminder,
    totalExpenses,
    netReserveBalance,
    isGuestMode,
    executiveMembers,
    rules,
  } = useApp();

  const selectedMonth = useMemo(currentMonthKey, []);
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [dashboardChartMode, setDashboardChartMode] = useState<'CAPSULE' | 'SPLINE'>('CAPSULE');
  const [isBalanceCardFlipped, setIsBalanceCardFlipped] = useState(false);

  useEffect(() => {
    setIsBalanceCardFlipped(false);
  }, [currentUser?.id, isGuestMode]);

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  const monthDeposits = savings
    .filter((t) => t.savingsMonth === selectedMonth && t.status === 'APPROVED')
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const currentMonthTotalAmount = monthDeposits.reduce((sum, t) => sum + t.amount, 0);

  const approvedMembers = users.filter((u) => u.id !== '__guest__' && u.status === 'APPROVED');

  const overdueMembers = users.filter(
    (u) =>
      u.id !== '__guest__' &&
      u.status === 'APPROVED' &&
      !savings.some(
        (t) =>
          t.memberId === u.memberId &&
          t.savingsMonth === selectedMonth &&
          (t.status === 'APPROVED' || t.status === 'PENDING')
      )
  );

  const hasUserDepositedOrPending =
    !isGuestMode && currentUser
      ? savings.some(
          (t) =>
            t.memberId === currentUser.memberId &&
            t.savingsMonth === selectedMonth &&
            (t.status === 'APPROVED' || t.status === 'PENDING')
        )
      : false;

  // Guests must NEVER see the overdue reminder banner; only reminded members who haven't deposited yet see it
  const isCurrentUserReminded =
    !isGuestMode &&
    Boolean(currentUser) &&
    currentUser.role === 'MEMBER' &&
    !hasUserDepositedOrPending &&
    !isAlertDismissed &&
    overdueReminders.includes(currentUser.memberId);

  const pinnedNotice = notices.find((n) => n.isPinned) || notices[0];

  const showNet = config.dashboardBalanceDisplay === 'NET_AFTER_EXPENSE';
  const heroValue = showNet ? netReserveBalance : financialTotals.totalApproved;
  const otherValue = showNet ? financialTotals.totalApproved : netReserveBalance;

  const monthEntries = Object.entries(monthlyAggregates).sort(([a], [b]) => a.localeCompare(b));
  const chartMonths = monthEntries.slice(-6);
  const chartMax = Math.max(...chartMonths.map(([, v]) => v), 1);

  const paidPct = approvedMembers.length ? (monthDeposits.length / approvedMembers.length) * 100 : 0;

  const date = getBengaliDateParts();
  const dhakaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const dayMonthFormatted = `${toBengaliNumerals(dhakaNow.getDate())} ${BN_MONTHS[dhakaNow.getMonth()]}`;
  const yearFormatted = toBengaliNumerals(dhakaNow.getFullYear());
  const hour = dhakaNow.getHours();
  const greeting = hour < 5 ? 'শুভ রাত্রি' : hour < 12 ? 'শুভ সকাল' : hour < 16 ? 'শুভ দুপুর' : hour < 18 ? 'শুভ বিকাল' : 'শুভ সন্ধ্যা';
  const [showAllServices, setShowAllServices] = useState(false);
  const fullUserName = !isGuestMode && currentUser ? currentUser.name || 'সদস্য' : 'অতিথি';
  const designationList = useMemo(() => {
    if (isGuestMode || !currentUser) return ['গেস্ট ভিজিটর'];
    return getUserDesignationList(currentUser, executiveMembers);
  }, [isGuestMode, currentUser, executiveMembers]);

  const myDepositSummary = useMemo(() => {
    if (isGuestMode || !currentUser) {
      return { approvedTotal: 0, pendingTotal: 0, currentMonthTotal: 0, installmentsCount: 0, monthlySpark: [] as number[] };
    }
    const mine = savings.filter(
      (t) => t.memberId === currentUser.memberId || t.memberId === currentUser.id
    );
    const approved = mine.filter((t) => t.status === 'APPROVED');
    const pending = mine.filter((t) => t.status === 'PENDING');
    const approvedTotal = approved.reduce((sum, t) => sum + t.amount, 0);
    const pendingTotal = pending.reduce((sum, t) => sum + t.amount, 0);
    const currentMonthTotal = approved
      .filter((t) => t.savingsMonth === selectedMonth)
      .reduce((sum, t) => sum + t.amount, 0);
    const installmentsCount = approved.filter((t) => !t.isCorrection && t.amount > 0).length;
    const monthlySpark = chartMonths.map(([mKey]) =>
      approved.filter((t) => t.savingsMonth === mKey).reduce((s, t) => s + t.amount, 0)
    );
    return { approvedTotal, pendingTotal, currentMonthTotal, installmentsCount, monthlySpark };
  }, [isGuestMode, currentUser, savings, selectedMonth, chartMonths]);

  const MONTH_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

  // দ্রুত সেবা ও অন্যান্য সেবা (App Moderator থেকে রি-অর্ডারযোগ্য)
  const rawServiceCatalog: {
    id: string;
    title: string;
    meta: string;
    icon: React.ComponentType<{ className?: string }>;
    show?: boolean;
  }[] = [
    { id: 'members', title: 'সদস্য তালিকা', meta: `${toBengaliNumerals(users.length)} জন সদস্য`, icon: Users },
    { id: 'savings', title: 'জমার হিসাব', meta: 'মাসিক লেজার', icon: Receipt },
    { id: 'analytics', title: 'রিপোর্ট ও চার্ট', meta: 'বিস্তারিত বিশ্লেষণ', icon: BarChart3 },
    { id: 'bank', title: 'ব্যাংক তথ্য', meta: 'নিরাপদ তথ্য', icon: Landmark },
    { id: 'rules', title: 'গঠনতন্ত্র', meta: 'নীতি ও বিধি', icon: ShieldCheck },
    { id: 'all', title: 'সব সেবা', meta: '', icon: LayoutGrid },
    { id: 'receipts', title: 'ই-রসিদ ও স্টেটমেন্ট', meta: receipts[0]?.receiptNumber || 'ডিজিটাল রসিদ', icon: Receipt },
    { id: 'chat', title: 'কমিউনিটি চ্যাট', meta: 'গ্রুপ ও ইনবক্স', icon: MessageSquare },
    { id: 'notices', title: 'নোটিশ বোর্ড', meta: `${toBengaliNumerals(notices.length)} টি নোটিশ`, icon: Bell },
    { id: 'executive', title: 'কার্যনির্বাহী পর্ষদ', meta: 'পদবি ও দায়িত্ব', icon: Award },
    { id: 'complaints', title: 'অভিযোগ সেল', meta: `${toBengaliNumerals(complaints.length)} টি দাখিল`, icon: HelpCircle },
    { id: 'features', title: 'ফিচার ভোট', meta: 'প্রস্তাবনা ও ভোট', icon: Lightbulb },
    { id: 'sheets', title: 'গুগল শীট', meta: 'লাইভ ক্লাউড সিঙ্ক', icon: FileSpreadsheet },
    { id: 'about-us', title: 'আমাদের সম্পর্কে', meta: 'ফাউন্ডেশন পরিচিতি', icon: BookOpen },
    { id: 'profile', title: 'প্রোফাইল ও সেটিংস', meta: 'অ্যাকাউন্ট', icon: Users },
    { id: 'moderator', title: 'মডারেটর প্যানেল', meta: '২/৩ সিলিং ভোট', icon: ShieldCheck, show: isModeratorOrAppMod },
  ];

  const orderedVisibleServices = (() => {
    const customOrder = config.quickServicesOrder || [];
    const visible = rawServiceCatalog
      .filter((item) => item.show !== false)
      .map((item) => ({
        ...item,
        title: config.customTabTitles?.[item.id]?.trim() || item.title,
      }));
    if (customOrder.length === 0) return visible;
    const orderMap = new Map(customOrder.map((id, idx) => [id, idx]));
    return [...visible].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : 999;
      const idxB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : 999;
      return idxA - idxB;
    });
  })();

  const extraServicesCount = Math.max(0, orderedVisibleServices.length - 6);
  const services = orderedVisibleServices.slice(0, 6).map((sv) => ({
    ...sv,
    meta:
      sv.id === 'all'
        ? showAllServices
          ? 'সংক্ষিপ্ত করুন'
          : `আরো ${toBengaliNumerals(extraServicesCount)}টি`
        : sv.meta,
    action: sv.id === 'all' ? () => setShowAllServices((v) => !v) : () => setActiveTab(sv.id),
  }));

  const moreServices = orderedVisibleServices.slice(6).map((sv) => ({
    ...sv,
    meta:
      sv.id === 'all'
        ? showAllServices
          ? 'সংক্ষিপ্ত করুন'
          : 'সেবা তালিকা'
        : sv.meta,
    action: sv.id === 'all' ? () => setShowAllServices((v) => !v) : () => setActiveTab(sv.id),
  }));

  const card = 'rounded-[22px] bg-slate-900 border border-slate-800';
  const chip = 'w-10 h-10 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center';

  return (
    <div className="space-y-4 animate-rise">
      {/* Greeting: Full Name & Designation constrained strictly within 2/3 of the row */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0 flex-1 sm:max-w-[66.666%]">
          <p className="text-[12px] font-medium text-slate-400 truncate">
            <span className="text-emerald-400 font-semibold">{greeting}</span>
            <span className="text-slate-500"> · </span>
            <span className="text-amber-400 font-semibold">{date.weekday}</span>
            <span className="text-slate-500">, </span>
            <span className="text-slate-200 font-medium">{dayMonthFormatted}</span>
            <span className="text-slate-500">, </span>
            <span className="text-teal-400 font-semibold">{yearFormatted}</span>
          </p>
          <div className="flex flex-col min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <h2 className="text-[18px] sm:text-2xl font-bold text-ink leading-tight shrink-0">
                {fullUserName}
              </h2>
              {designationList.length > 0 && (
                <div className="inline-flex flex-wrap items-baseline gap-x-1 text-xs sm:text-sm font-bold text-emerald-400">
                  <span className="text-slate-500 shrink-0">·</span>
                  {designationList.map((title, idx) => (
                    <span key={idx} className="whitespace-normal">
                      {title}{idx < designationList.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('about-us')}
          className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer shrink-0"
        >
          <Landmark className="w-4 h-4" />
          আমাদের সম্পর্কে
        </button>
      </div>

      {/* Overdue reminder for the member */}
      <AnimatePresence initial={false}>
        {isCurrentUserReminded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, scale: 0.97 }}
            transition={{ duration: 0.38, delay: 0, ease: SMOOTH_EASE }}
            className="relative overflow-hidden rounded-[22px] border border-rose-500/30 bg-rose-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3.5"
          >
            <button
              onClick={() => setIsAlertDismissed(true)}
              aria-label="নোটিশ বন্ধ করুন"
              className="absolute right-2.5 top-2.5 p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 pr-8">
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <SpringIcon activeKey="overdue-alert">
                  <AlertCircle className="w-5 h-5" />
                </SpringIcon>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  জরুরি বকেয়া নোটিশ
                </span>
                <p className="text-ink font-bold text-sm mt-1 leading-snug">
                  "আপনি এই মাসের টাকা এখনো জমা দেননি। যথা সময়ে টাকা জমা করার জন্য অনুরোধ করা হলো।"
                </p>
                <p className="text-[11px] text-rose-400 font-normal mt-0.5">
                  নির্ধারিত জমা: ৳{toBengaliNumerals(config.defaultMonthlyAmount || 1500)} • শেষ তারিখ: প্রতি মাসের{' '}
                  {toBengaliNumerals(config.monthlyDueDay || 10)} তারিখ
                </p>
              </div>
            </div>
            <button
              onClick={onOpenNewSavingsModal}
              className="sm:ml-auto bg-rose-600 hover:bg-rose-500 text-white min-h-11 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              এখনই টাকা জমা দিন
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* ------------------------ MAIN COLUMN ------------------------ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4 min-w-0">
          {/* Balance card: 3D Flip for Logged-In Members (Own Deposit <-> Foundation Total), Direct Foundation Total for Guests */}
          {!isGuestMode && currentUser ? (
            <div
              style={{ perspective: '1200px' }}
              onClick={() => setIsBalanceCardFlipped((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsBalanceCardFlipped((prev) => !prev);
                }
              }}
              aria-label={
                isBalanceCardFlipped
                  ? 'ফাউন্ডেশনের মোট সঞ্চয় দেখাচ্ছে — নিজস্ব সঞ্চয় দেখতে ক্লিক করুন'
                  : 'আপনার নিজস্ব সঞ্চয় দেখাচ্ছে — ফাউন্ডেশনের মোট সঞ্চয় দেখতে ক্লিক করুন'
              }
              className="cursor-pointer select-none focus:outline-none"
            >
              <motion.div
                initial={false}
                animate={{ rotateY: isBalanceCardFlipped ? 180 : 0 }}
                transition={{ duration: 0.62, delay: 0, ease: SMOOTH_EASE }}
                style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                className="grid grid-cols-1"
              >
                {/* FRONT FACE: Logged-In User's Own Deposit Summary */}
                <section
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg) translateZ(1px)',
                    pointerEvents: isBalanceCardFlipped ? 'none' : 'auto',
                  }}
                  className="col-start-1 row-start-1 relative overflow-hidden rounded-[22px] bg-hero text-white p-4 sm:p-5 shadow-[0_14px_30px_-12px_rgba(7,80,68,0.55)]"
                >
                  <div className="pointer-events-none absolute -top-20 -right-14 h-44 w-44 rounded-full border-[34px] border-white/[0.06]" />
                  <div className="relative flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-bold text-white/90 inline-flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-white/90" />
                      আমার নিজস্ব সঞ্চয় জমা
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold">
                      <RotateCw className="w-3 h-3" /> মোট তহবিল দেখুন
                    </span>
                  </div>
                  <div className="relative mt-1 flex items-end justify-between gap-3">
                    <h3 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight">
                      <AnimatedNumber value={myDepositSummary.approvedTotal} formatter={formatCurrencyBengali} />
                    </h3>
                    {myDepositSummary.monthlySpark.some((v) => v > 0) && (
                      <MiniSparkline
                        values={myDepositSummary.monthlySpark}
                        stroke="#a7f3d0"
                        className="w-24 h-9 hidden sm:block opacity-90"
                      />
                    )}
                  </div>
                  <div className="relative flex items-center justify-between gap-2 text-[12px] text-white/75 pb-3 border-b border-white/15">
                    <span>
                      এই মাসে আমার জমা{' '}
                      <b className="text-white">
                        + <AnimatedNumber value={myDepositSummary.currentMonthTotal} formatter={formatCurrencyBengali} />
                      </b>
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-white">
                      মোট কিস্তি:{' '}
                      <AnimatedNumber
                        value={myDepositSummary.installmentsCount}
                        formatter={(v) => `${toBengaliNumerals(Math.round(v))}টি`}
                      />
                    </span>
                  </div>
                  <div className="relative grid grid-cols-2 gap-2.5 pt-3 text-[11px]">
                    <div className="rounded-xl bg-white/10 px-3 py-2 min-w-0 backdrop-blur-xs">
                      <p className="text-white/70 truncate">অনুমোদনের অপেক্ষায়</p>
                      <p className="text-[14px] font-bold truncate">
                        <AnimatedNumber value={myDepositSummary.pendingTotal} formatter={formatCurrencyBengali} />
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-3 py-2 min-w-0 backdrop-blur-xs">
                      <p className="text-white/70 truncate">সদস্য আইডি</p>
                      <p className="text-[14px] font-bold font-mono truncate">{currentUser.memberId}</p>
                    </div>
                  </div>
                  <div className="relative grid grid-cols-2 gap-2 pt-3">
                    <motion.button
                      type="button"
                      whileHover={{ y: -1.5 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewSavingsModal();
                      }}
                      className="min-h-11 flex items-center justify-center gap-1.5 rounded-xl bg-white text-[#075044] text-[13px] font-bold cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> জমা দিন
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ y: -1.5 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('receipts');
                      }}
                      className="min-h-11 flex items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/25 text-white text-[13px] font-bold cursor-pointer transition-colors"
                    >
                      <Receipt className="w-4 h-4" /> স্টেটমেন্ট
                    </motion.button>
                  </div>
                </section>

                {/* BACK FACE: Foundation's Total Deposit Summary */}
                <section
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg) translateZ(1px)',
                    pointerEvents: isBalanceCardFlipped ? 'auto' : 'none',
                  }}
                  className="col-start-1 row-start-1 relative overflow-hidden rounded-[22px] bg-hero text-white p-4 sm:p-5 shadow-[0_14px_30px_-12px_rgba(7,80,68,0.55)]"
                >
                  <div className="pointer-events-none absolute -top-20 -right-14 h-44 w-44 rounded-full border-[34px] border-white/[0.06]" />
                  <div className="relative flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-bold text-white/90 inline-flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-white/90" />
                      {showNet ? 'প্রকৃত অবশিষ্ট সঞ্চয় (খরচ বাদে)' : 'ফাউন্ডেশনের মোট সঞ্চয়'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold">
                      <RotateCw className="w-3 h-3" /> নিজস্ব জমা দেখুন
                    </span>
                  </div>
                  <div className="relative mt-1 flex items-end justify-between gap-3">
                    <h3 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight">
                      <AnimatedNumber value={heroValue} formatter={formatCurrencyBengali} />
                    </h3>
                    {chartMonths.length > 1 && (
                      <MiniSparkline
                        values={chartMonths.map(([, v]) => v)}
                        stroke="#a7f3d0"
                        className="w-24 h-9 hidden sm:block opacity-90"
                      />
                    )}
                  </div>
                  <div className="relative flex items-center justify-between gap-2 text-[12px] text-white/75 pb-3 border-b border-white/15">
                    <span>
                      এই মাসে{' '}
                      <b className="text-white">
                        + <AnimatedNumber value={currentMonthTotalAmount} formatter={formatCurrencyBengali} />
                      </b>
                    </span>
                    <span
                      className="inline-flex items-center gap-1 font-bold text-white"
                      title="গত মাসের তুলনায় প্রবৃদ্ধি"
                    >
                      {growthRate.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <AnimatedFormattedText text={toBengaliNumerals(growthRate.formatted)} />
                    </span>
                  </div>
                  <div className="relative grid grid-cols-2 gap-2.5 pt-3 text-[11px]">
                    <div className="rounded-xl bg-white/10 px-3 py-2 min-w-0 backdrop-blur-xs">
                      <p className="text-white/70 truncate">{showNet ? 'গ্রস জমা' : 'খরচ বাদে'}</p>
                      <p className="text-[14px] font-bold truncate">
                        <AnimatedNumber value={otherValue} formatter={formatCurrencyBengali} />
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-3 py-2 min-w-0 backdrop-blur-xs">
                      <p className="text-white/70 truncate">মোট খরচ</p>
                      <p className="text-[14px] font-bold truncate">
                        <AnimatedNumber value={totalExpenses} formatter={formatCurrencyBengali} />
                      </p>
                    </div>
                  </div>
                  <div className="relative grid grid-cols-2 gap-2 pt-3">
                    <motion.button
                      type="button"
                      whileHover={{ y: -1.5 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewSavingsModal();
                      }}
                      className="min-h-11 flex items-center justify-center gap-1.5 rounded-xl bg-white text-[#075044] text-[13px] font-bold cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> জমা দিন
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ y: -1.5 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('receipts');
                      }}
                      className="min-h-11 flex items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/25 text-white text-[13px] font-bold cursor-pointer transition-colors"
                    >
                      <Receipt className="w-4 h-4" /> স্টেটমেন্ট
                    </motion.button>
                  </div>
                </section>
              </motion.div>
            </div>
          ) : (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0, ease: SMOOTH_EASE }}
              className="relative overflow-hidden rounded-[22px] bg-hero text-white p-4 sm:p-5 shadow-[0_14px_30px_-12px_rgba(7,80,68,0.55)]"
            >
              <div className="pointer-events-none absolute -top-20 -right-14 h-44 w-44 rounded-full border-[34px] border-white/[0.06]" />
              <div className="relative flex items-center justify-between gap-3 text-[12px]">
                <span className="font-normal text-white/85">
                  {showNet ? 'প্রকৃত অবশিষ্ট সঞ্চয় (খরচ বাদে)' : 'মোট সঞ্চয়'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> সুরক্ষিত
                </span>
              </div>
              <div className="relative mt-1 flex items-end justify-between gap-3">
                <h3 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight">
                  <AnimatedNumber value={heroValue} formatter={formatCurrencyBengali} />
                </h3>
                {chartMonths.length > 1 && (
                  <MiniSparkline
                    values={chartMonths.map(([, v]) => v)}
                    stroke="#a7f3d0"
                    className="w-24 h-9 hidden sm:block opacity-90"
                  />
                )}
              </div>
              <div className="relative flex items-center justify-between gap-2 text-[12px] text-white/75 pb-3 border-b border-white/15">
                <span>
                  এই মাসে{' '}
                  <b className="text-white">
                    + <AnimatedNumber value={currentMonthTotalAmount} formatter={formatCurrencyBengali} />
                  </b>
                </span>
                <span
                  className="inline-flex items-center gap-1 font-bold text-white"
                  title="গত মাসের তুলনায় প্রবৃদ্ধি"
                >
                  {growthRate.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <AnimatedFormattedText text={toBengaliNumerals(growthRate.formatted)} />
                </span>
              </div>
              <div className="relative grid grid-cols-2 gap-2.5 pt-3 text-[11px]">
                <div className="rounded-xl bg-white/10 px-3 py-2 min-w-0 backdrop-blur-xs">
                  <p className="text-white/70 truncate">{showNet ? 'গ্রস জমা' : 'খরচ বাদে'}</p>
                  <p className="text-[14px] font-bold truncate">
                    <AnimatedNumber value={otherValue} formatter={formatCurrencyBengali} />
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2 min-w-0 backdrop-blur-xs">
                  <p className="text-white/70 truncate">মোট খরচ</p>
                  <p className="text-[14px] font-bold truncate">
                    <AnimatedNumber value={totalExpenses} formatter={formatCurrencyBengali} />
                  </p>
                </div>
              </div>
              <div className="relative grid grid-cols-2 gap-2 pt-3">
                <motion.button
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onOpenNewSavingsModal}
                  className="min-h-11 flex items-center justify-center gap-1.5 rounded-xl bg-white text-[#075044] text-[13px] font-bold cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> জমা দিন
                </motion.button>
                <motion.button
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab('receipts')}
                  className="min-h-11 flex items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/25 text-white text-[13px] font-bold cursor-pointer transition-colors"
                >
                  <Receipt className="w-4 h-4" /> স্টেটমেন্ট
                </motion.button>
              </div>
            </motion.section>
          )}

          {/* দ্রুত সেবা */}
          <section aria-label="দ্রুত সেবা">
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-[15px] font-bold text-ink">দ্রুত সেবা</h3>
              <button
                onClick={() => setShowAllServices((v) => !v)}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer group"
              >
                {showAllServices ? 'সংক্ষিপ্ত' : 'সব দেখুন'}{' '}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            <StaggerList className="grid grid-cols-3 gap-2.5">
              {services.map((sv) => {
                const Icon = sv.icon;
                return (
                  <StaggerItem key={sv.id} hoverLift>
                    <button
                      onClick={sv.action}
                      className={`${card} card-interactive w-full p-3 text-left min-w-0 hover:border-emerald-500/45 cursor-pointer group`}
                    >
                      <span className="w-9 h-9 rounded-xl bg-emerald-500/15 group-hover:bg-emerald-500/25 text-emerald-400 flex items-center justify-center mb-2 transition-colors">
                        <SpringIcon activeKey={sv.id === 'all' ? String(showAllServices) : sv.id}>
                          <Icon className="w-[18px] h-[18px]" />
                        </SpringIcon>
                      </span>
                      <span className="block text-[12px] font-bold text-ink truncate">{sv.title}</span>
                      <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                        <AnimatedFormattedText text={sv.meta} />
                      </span>
                    </button>
                  </StaggerItem>
                );
              })}
            </StaggerList>
            <AnimatePresence initial={false}>
              {showAllServices && moreServices.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.38, delay: 0, ease: SMOOTH_EASE }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2.5">
                    {moreServices.map((e) => {
                      const Icon = e.icon;
                      return (
                        <motion.button
                          key={e.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.34, delay: 0, ease: SMOOTH_EASE }}
                          onClick={e.action}
                          className={`${card} card-interactive p-3 flex items-center gap-2.5 text-left min-w-0 hover:border-emerald-500/45 cursor-pointer group`}
                        >
                          <span className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/15 group-hover:bg-emerald-500/25 text-emerald-400 flex items-center justify-center transition-colors">
                            <SpringIcon activeKey={e.id}>
                              <Icon className="w-[18px] h-[18px]" />
                            </SpringIcon>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-bold text-ink truncate">{e.title}</span>
                            <span className="block text-[10px] text-slate-400 truncate">
                              <AnimatedFormattedText text={e.meta} />
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* সঞ্চয়ের অগ্রগতি (Upgraded with Fernly Capsule Bars & Corvane Spline Switcher) */}
          <section aria-label="সঞ্চয়ের অগ্রগতি">
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-[15px] font-bold text-ink">সঞ্চয়ের অগ্রগতি</h3>
              <span className="text-[11px] text-slate-400 font-bold">গত {toBengaliNumerals(chartMonths.length || 6)} মাস</span>
            </div>
            <div className={`${card} p-4 space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <strong className="text-[17px] font-bold text-ink">
                    <AnimatedNumber value={financialTotals.totalApproved} formatter={formatCurrencyBengali} />
                  </strong>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400">
                    <AnimatedFormattedText
                      text={`${growthRate.isPositive ? '+' : ''}${toBengaliNumerals(growthRate.formatted)}`}
                    />
                  </span>
                </div>

                {/* Compact Chart Mode Toggle inspired by Fernly & Corvane */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDashboardChartMode('CAPSULE')}
                    className={`relative px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      dashboardChartMode === 'CAPSULE' ? 'text-white' : 'text-slate-400 hover:text-ink'
                    }`}
                  >
                    {dashboardChartMode === 'CAPSULE' && (
                      <SlidingTabPill layoutId="home-chart-pill" className="bg-emerald-600 rounded-lg shadow-sm" />
                    )}
                    <span className="relative z-10">ক্যাপসুল বার</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardChartMode('SPLINE')}
                    className={`relative px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      dashboardChartMode === 'SPLINE' ? 'text-white' : 'text-slate-400 hover:text-ink'
                    }`}
                  >
                    {dashboardChartMode === 'SPLINE' && (
                      <SlidingTabPill layoutId="home-chart-pill" className="bg-emerald-600 rounded-lg shadow-sm" />
                    )}
                    <span className="relative z-10">স্প্লাইন কার্ভ</span>
                  </button>
                </div>
              </div>

              <motion.div
                key={dashboardChartMode}
                initial={{ opacity: 0.72, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0, ease: SMOOTH_EASE }}
              >
                {dashboardChartMode === 'CAPSULE' ? (
                  <FernlyCapsuleBarChart
                    heightClass="h-36"
                    showValuesOnTop={false}
                    data={chartMonths.map(([key, value], i) => ({
                      key,
                      label: monthLabel(key),
                      shortLabel: MONTH_SHORT[Number(key.split('-')[1]) - 1] ?? key,
                      value,
                      isHighlighted: i === chartMonths.length - 1,
                    }))}
                  />
                ) : (
                  <InteractiveSplineAreaChart
                    height={156}
                    valueLabel="মাসিক জমা"
                    data={chartMonths.map(([key, value], i) => ({
                      key,
                      label: monthLabel(key),
                      shortLabel: MONTH_SHORT[Number(key.split('-')[1]) - 1] ?? key,
                      value,
                      isHighlighted: i === chartMonths.length - 1,
                    }))}
                  />
                )}
              </motion.div>
            </div>
          </section>
        </div>

        {/* ------------------------ SIDE COLUMN ------------------------ */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 min-w-0">
          {/* Highlighted Notice Card (Point 1) */}
          {pinnedNotice && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0, ease: SMOOTH_EASE }}
              className={`rounded-[22px] card-interactive p-4 relative overflow-hidden ${
                pinnedNotice.priority === 'URGENT'
                  ? 'bg-gradient-to-br from-rose-500/22 via-rose-500/10 to-slate-900 border border-rose-400/55 shadow-[0_12px_28px_-10px_rgba(244,63,94,0.34)]'
                  : 'bg-gradient-to-br from-amber-500/22 via-amber-500/10 to-slate-900 border border-amber-400/55 shadow-[0_12px_28px_-10px_rgba(245,158,11,0.32)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${
                    pinnedNotice.priority === 'URGENT'
                      ? 'text-rose-600 dark:text-rose-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      pinnedNotice.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-400/35'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-400/35'
                    }`}
                  >
                    <SpringIcon activeKey={pinnedNotice.id}>
                      <Bell className="w-3.5 h-3.5" />
                    </SpringIcon>
                  </span>
                  <span>নোটিশ বোর্ড</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                    pinnedNotice.priority === 'URGENT'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-200 border-rose-400/40'
                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-200 border-amber-400/40'
                  }`}
                >
                  {pinnedNotice.priority === 'URGENT' ? 'জরুরি নোটিশ' : 'গুরুত্বপূর্ণ নোটিশ'}
                </span>
              </div>
              <h3 className="font-bold text-ink text-[15px] leading-snug">{pinnedNotice.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mt-1">{pinnedNotice.content}</p>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-400/20 text-[11px] text-slate-400">
                <span className="truncate font-medium">{pinnedNotice.authorName}</span>
                <button
                  onClick={() => setActiveTab('notices')}
                  className={`inline-flex items-center gap-1 text-xs font-bold cursor-pointer group ${
                    pinnedNotice.priority === 'URGENT'
                      ? 'text-rose-500 dark:text-rose-300 hover:text-rose-200'
                      : 'text-amber-600 dark:text-amber-300 hover:text-amber-200'
                  }`}
                >
                  বিস্তারিত দেখুন <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </motion.section>
          )}

          {/* KPI row */}
          <StaggerList className="grid grid-cols-2 gap-2.5">
            <StaggerItem hoverLift>
              <button onClick={() => setActiveTab('members')} className={`${card} card-interactive w-full p-3 text-left flex items-center gap-2.5 hover:border-emerald-500/40 cursor-pointer`}>
                <span className={chip}>
                  <SpringIcon activeKey="kpi-members"><Users className="w-[18px] h-[18px]" /></SpringIcon>
                </span>
                <span className="min-w-0 block">
                  <span className="block text-[11px] text-slate-400 truncate">সক্রিয় সদস্য</span>
                  <span className="block text-lg font-bold text-ink leading-tight">
                    <AnimatedNumber value={approvedMembers.length} formatter={(v) => `${toBengaliNumerals(Math.round(v))} জন`} />
                  </span>
                </span>
              </button>
            </StaggerItem>
            <StaggerItem hoverLift>
              <button onClick={() => setActiveTab('savings')} className={`${card} card-interactive w-full p-3 text-left flex items-center gap-2.5 hover:border-emerald-500/40 cursor-pointer`}>
                <span className={chip}>
                  <SpringIcon activeKey="kpi-depositors"><Wallet className="w-[18px] h-[18px]" /></SpringIcon>
                </span>
                <span className="min-w-0 block">
                  <span className="block text-[11px] text-slate-400 truncate">জমাদানকারী ({monthLabel(selectedMonth).split(' ')[0]})</span>
                  <span className="block text-lg font-bold text-ink leading-tight">
                    <AnimatedNumber value={monthDeposits.length} formatter={(v) => `${toBengaliNumerals(Math.round(v))} জন`} />
                  </span>
                </span>
              </button>
            </StaggerItem>
            <StaggerItem hoverLift>
              <button onClick={() => setActiveTab('moderator')} className={`${card} card-interactive w-full p-3 text-left flex items-center gap-2.5 hover:border-rose-500/40 cursor-pointer`}>
                <span className="w-10 h-10 shrink-0 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <SpringIcon activeKey="kpi-overdue"><AlertCircle className="w-[18px] h-[18px]" /></SpringIcon>
                </span>
                <span className="min-w-0 block">
                  <span className="block text-[11px] text-slate-400 truncate">বকেয়া সদস্য</span>
                  <span className="block text-lg font-bold text-ink leading-tight">
                    <AnimatedNumber value={overdueMembers.length} formatter={(v) => `${toBengaliNumerals(Math.round(v))} জন`} />
                  </span>
                </span>
              </button>
            </StaggerItem>
            <StaggerItem hoverLift>
              <button onClick={() => setActiveTab('rules')} className={`${card} card-interactive w-full p-3 text-left flex items-center gap-2.5 hover:border-emerald-500/40 cursor-pointer`}>
                <span className="w-10 h-10 shrink-0 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <SpringIcon activeKey="kpi-quorum"><ShieldCheck className="w-[18px] h-[18px]" /></SpringIcon>
                </span>
                <span className="min-w-0 block">
                  <span className="block text-[11px] text-slate-400 truncate">২/৩ মডারেটর অনুমোদন</span>
                  <span className="text-sm font-bold text-emerald-400 leading-tight flex items-center gap-1">
                    সুরক্ষিত <CheckCircle2 className="w-4 h-4" />
                  </span>
                </span>
              </button>
            </StaggerItem>
          </StaggerList>

          {/* Current month collection */}
          <section className={`${card} p-4 space-y-4`}>
            <div className="flex items-center gap-4">
              <Ring pct={paidPct} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-400">{monthLabel(selectedMonth)} এর আদায়</p>
                <p className="text-[22px] font-bold text-ink leading-tight">
                  <AnimatedNumber value={currentMonthTotalAmount} formatter={formatCurrencyBengali} />
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  <strong className="text-emerald-400">
                    <AnimatedNumber
                      value={monthDeposits.length}
                      formatter={(v) => toBengaliNumerals(Math.round(v))}
                    />
                  </strong>{' '}
                  /{' '}
                  <AnimatedNumber
                    value={approvedMembers.length}
                    formatter={(v) => toBengaliNumerals(Math.round(v))}
                  />{' '}
                  জন জমা দিয়েছেন
                </p>
                <button
                  onClick={() => setActiveTab('savings')}
                  className="mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer group"
                >
                  সম্পূর্ণ সঞ্চয় খাতা <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-2">সাম্প্রতিক লেনদেন</p>
              <div className="space-y-2">
                {monthDeposits.slice(0, 4).map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0, ease: SMOOTH_EASE }}
                    className="flex items-center gap-2.5 min-w-0 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-800/40 transition-colors"
                  >
                    <Avatar src={users.find((u) => u.memberId === tx.memberId)?.avatarUrl} name={tx.memberName} size="sm" expandable />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-[13px] text-ink truncate">{tx.memberName}</h4>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {tx.memberId} · {tx.paymentMethod}
                      </span>
                    </div>
                    <span className="font-bold text-[13px] text-emerald-400 shrink-0">
                      +<AnimatedNumber value={tx.amount} formatter={formatCurrencyBengali} />
                    </span>
                  </motion.div>
                ))}
                {monthDeposits.length === 0 && (
                  <div className="w-full py-3 text-center text-xs text-slate-500">
                    চলতি মাসে এখনও কোনো সঞ্চয় জমা অনুমোদিত হয়নি।
                  </div>
                )}
              </div>
            </div>

            {overdueMembers.length > 0 && (
              <div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-slate-200 font-medium">
                      বকেয়া:{' '}
                      <strong className="text-rose-400 font-bold">
                        <AnimatedNumber
                          value={overdueMembers.length}
                          formatter={(v) => `${toBengaliNumerals(Math.round(v))} জন`}
                        />
                      </strong>{' '}
                      এখনো জমা দেননি
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOverdueExpanded(!isOverdueExpanded)}
                    className="min-h-9 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    {isOverdueExpanded ? 'সংক্ষিপ্ত করুন' : 'তালিকা দেখুন'}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {isOverdueExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: SMOOTH_EASE }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 max-h-56 overflow-y-auto">
                        {overdueMembers.map((m) => {
                          const isReminded = overdueReminders.includes(m.memberId);
                          return (
                            <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar src={m.avatarUrl} name={m.name} size="xs" expandable />
                                <span className="text-ink font-bold truncate">{m.name}</span>
                                <span className="text-slate-400 font-mono text-[10px] shrink-0">({m.memberId})</span>
                              </div>
                              {isModeratorOrAppMod && (
                                <button
                                  onClick={() =>
                                    sendOverdueReminder(m.memberId, {
                                      memberName: m.name,
                                      amount: config.defaultMonthlyAmount || 1500,
                                      monthKey: selectedMonth,
                                      monthLabel: monthLabel(selectedMonth),
                                      deadlineText: `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`,
                                    })
                                  }
                                  className={`min-h-8 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-transform active:scale-95 ${
                                    isReminded
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                                  }`}
                                >
                                  <Send className="w-3 h-3" />
                                  {isReminded ? 'পুনরায় পাঠান' : 'তাগিদ পাঠান'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Other Tabs Summary Cards (Replaces Chatbox Card - Point 4) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-0.5">
              <span>অন্যান্য বিভাগের সার্বিক তথ্য ও সামারি</span>
              <span className="text-emerald-400">বেসিস ফাউন্ডেশন</span>
            </div>

            {/* 1. Constitution Rules Summary Card */}
            <div
              onClick={() => setActiveTab('rules')}
              className={`${card} p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-500/40 transition-all card-interactive group`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`${chip} text-emerald-400 bg-emerald-500/15 border-emerald-500/30 group-hover:scale-105 transition-transform`}>
                  <ShieldCheck className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-ink group-hover:text-emerald-400 transition-colors">
                      গঠনতন্ত্র ও বিধিমালা
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      {toBengaliNumerals(rules.length)} টি ধারা
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    স্বচ্ছতা, ২/৩ মডারেটর অনুমোদন নীতি ও ডিজিটাল অডিট ট্রেইল
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* 2. Official Bank & Channel Summary Card */}
            <div
              onClick={() => setActiveTab('bank')}
              className={`${card} p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-500/40 transition-all card-interactive group`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`${chip} text-amber-400 bg-amber-500/15 border-amber-500/30 group-hover:scale-105 transition-transform`}>
                  <Landmark className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-ink group-hover:text-amber-400 transition-colors">
                      অফিসিয়াল ব্যাংক বিবরণী
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                      {config.bankDetails?.bankName || 'সোনালী ব্যাংক'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    হিসাব: {config.bankDetails?.accountNumber || '120.101.8892'} · কিউআর কোড ও অনলাইন চ্যানেল
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* 3. Executive Council Summary Card */}
            <div
              onClick={() => setActiveTab('executive')}
              className={`${card} p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-500/40 transition-all card-interactive group`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`${chip} text-blue-400 bg-blue-500/15 border-blue-500/30 group-hover:scale-105 transition-transform`}>
                  <Award className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-ink group-hover:text-blue-400 transition-colors">
                      কার্যনির্বাহী পর্ষদ
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                      {toBengaliNumerals(executiveMembers.length)} জন কর্মকর্তা
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    সভাপতি, সমন্বয়ক ও কোষাধ্যক্ষসহ পর্ষদের পদবি ও দায়িত্ব
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
