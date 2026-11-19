import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Calendar, CalendarClock, ShieldCheck, Wallet, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toBengaliNumerals } from '../../utils/calculations';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { Avatar } from '../common/Avatar';
import { AnimatedNumber, SMOOTH_EASE } from '../common/MotionPrimitives';
import { registerBackHandler } from '../../utils/backNavigation';

interface OverdueReminderPopupModalProps {
  onOpenDepositModal: () => void;
}

const AUTO_CLOSE_MS = 15000;

export const OverdueReminderPopupModal: React.FC<OverdueReminderPopupModalProps> = ({
  onOpenDepositModal,
}) => {
  const {
    currentUser,
    isGuestMode,
    savings,
    config,
    overdueReminders,
    overdueReminderMap,
  } = useApp();

  const [dismissedForKey, setDismissedForKey] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(15);

  const activeReminder = useMemo(() => {
    if (isGuestMode || !currentUser || currentUser.id === '__guest__') return null;
    const memberId = currentUser.memberId;
    if (!overdueReminders.includes(memberId)) return null;

    const entry = overdueReminderMap[memberId] || {
      memberId,
      memberName: currentUser.name,
      amount: config.defaultMonthlyAmount || 1500,
      monthKey: '2026-10',
      monthLabel: 'অক্টোবর ২০২৬',
      deadlineText: `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`,
      sentAt: 'initial',
    };

    // Once user submits a deposit (PENDING or APPROVED) for this month, never show again!
    const alreadySubmitted = savings.some(
      (tx) =>
        tx.memberId === memberId &&
        tx.savingsMonth === entry.monthKey &&
        (tx.status === 'APPROVED' || tx.status === 'PENDING')
    );

    if (alreadySubmitted) return null;
    return entry;
  }, [
    isGuestMode,
    currentUser,
    overdueReminders,
    overdueReminderMap,
    config.defaultMonthlyAmount,
    config.monthlyDueDay,
    savings,
  ]);

  // Unique session key per user entry / login / moderator re-send so every time that user enters the app (or logs in) it pops up
  const sessionTriggerKey = activeReminder
    ? `${currentUser.id}::${activeReminder.memberId}::${activeReminder.sentAt}`
    : null;

  const isOpen = Boolean(activeReminder && sessionTriggerKey && dismissedForKey !== sessionTriggerKey);

  // Register with hardware/browser Back button stack & lock background scroll while open
  useEffect(() => {
    if (!isOpen || !sessionTriggerKey) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const unregisterBack = registerBackHandler(() => {
      setDismissedForKey(sessionTriggerKey);
    });
    return () => {
      unregisterBack();
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, sessionTriggerKey]);

  // 15-second auto-close countdown timer
  useEffect(() => {
    if (!isOpen || !sessionTriggerKey) return;
    setSecondsLeft(15);

    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const rem = Math.max(1, Math.ceil((AUTO_CLOSE_MS - elapsed) / 1000));
      setSecondsLeft(rem);
    }, 200);

    const autoClose = setTimeout(() => {
      setDismissedForKey(sessionTriggerKey);
    }, AUTO_CLOSE_MS);

    return () => {
      clearInterval(tick);
      clearTimeout(autoClose);
    };
  }, [isOpen, sessionTriggerKey]);

  if (typeof document === 'undefined') return null;

  const resolvedLogoUrl = extractDirectImageUrl(config.logoUrl) || config.logoUrl || '/logo.svg';
  const displayMemberName = activeReminder?.memberName || currentUser?.name || 'সম্মানিত সদস্য';
  const displayAmount = activeReminder?.amount || config.defaultMonthlyAmount || 1500;
  const displayMonthLabel = activeReminder?.monthLabel || 'অক্টোবর ২০২৬';
  const displayDeadline =
    activeReminder?.deadlineText || `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`;

  const handleClose = () => {
    if (sessionTriggerKey) {
      setDismissedForKey(sessionTriggerKey);
    }
  };

  const handleDepositNow = () => {
    handleClose();
    onOpenDepositModal();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && activeReminder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, delay: 0, ease: SMOOTH_EASE }}
          onClick={handleClose}
          className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-hidden select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.28, delay: 0, ease: SMOOTH_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-[356px] sm:max-w-[396px] max-h-[88dvh] rounded-3xl bg-slate-900 border border-emerald-500/25 p-3 sm:p-4 shadow-2xl flex flex-col justify-between gap-2 sm:gap-2.5 overflow-hidden"
          >
            {/* Top 15-Second Countdown Header + Close (X) Button + Gold Progress Bar */}
            <div className="space-y-1.5 shrink-0">
              <div className="relative flex items-center justify-center min-h-7 sm:min-h-8">
                <span className="italic text-[11px] sm:text-xs font-medium text-slate-300 tracking-wide">
                  {toBengaliNumerals(secondsLeft)} সেকেন্ড
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="নোটিশ বন্ধ করুন"
                  title="মিনিমাইজ / বন্ধ করুন"
                  className="absolute right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-ink flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-full h-[2.5px] rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  key={sessionTriggerKey}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: AUTO_CLOSE_MS / 1000, ease: 'linear' }}
                  style={{ transformOrigin: 'left' }}
                  className="h-full w-full bg-gradient-to-r from-[#dfa62b] via-[#f1c44b] to-[#f7d56e]"
                />
              </div>
            </div>

            {/* Compact Official Emerald Reminder Card — Fits Entirely Without Scrolling */}
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-b from-[#176e54] via-[#0e503d] to-[#073124] border border-emerald-300/20 p-3 sm:p-3.5 text-center shadow-[0_18px_40px_-15px_rgba(0,0,0,0.7)] shrink-0">
              {/* Decorative Concentric Emerald Arcs */}
              <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full border-[28px] border-emerald-200/[0.06]" />
              <div className="pointer-events-none absolute top-20 -left-20 w-52 h-52 rounded-full border-[30px] border-emerald-200/[0.05]" />

              {/* Top Row: Official Notice Badge + Month Gold Badge */}
              <div className="relative flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#063527]/90 border border-emerald-300/15 text-[#eec465] text-[10px] sm:text-[11px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-[#eec465] shrink-0" />
                  <span>অফিসিয়াল নোটিশ</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#dfaa35] to-[#edc257] text-[#1c1504] text-[10px] sm:text-[11px] font-bold shadow-sm">
                  <CalendarClock className="w-3 h-3 shrink-0" />
                  <span>{displayMonthLabel}</span>
                </span>
              </div>

              {/* Center Official App Logo Squircle (Compact Responsive) */}
              <div className="relative mx-auto mt-2.5 w-16 h-16 sm:w-20 sm:h-20 rounded-[18px] sm:rounded-[20px] p-[2px] bg-gradient-to-b from-[#f4ce6a] via-[#d2a13a] to-[#986b18] shadow-[0_12px_26px_rgba(0,0,0,0.42)]">
                <div className="w-full h-full rounded-[16px] sm:rounded-[18px] flex items-center justify-center overflow-hidden">
                  <img
                    src={resolvedLogoUrl}
                    alt={config.foundationName}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                    }}
                    className={`w-full h-full ${resolvedLogoUrl === '/logo.svg' ? 'object-contain' : 'object-cover'} rounded-[16px] sm:rounded-[18px]`}
                  />
                </div>
              </div>

              {/* Subtitle + User Profile Picture Right Before Member Name */}
              <p className="relative mt-2 text-[10.5px] sm:text-[11.5px] font-medium text-white/85 leading-none">
                সম্মানিত সদস্য
              </p>

              <div className="relative mt-1 flex items-center justify-center gap-2 px-1">
                <Avatar
                  src={currentUser?.avatarUrl}
                  name={displayMemberName}
                  size="sm"
                  ringColor="ring-[#eec465]"
                />
                <h3 className="text-[17px] sm:text-[20px] font-bold text-[#f1cf87] leading-tight tracking-tight truncate">
                  {displayMemberName}
                </h3>
              </div>

              <div className="relative w-20 h-px mx-auto bg-emerald-200/20 my-2" />

              {/* Notice Body Copy */}
              <div className="relative space-y-1 px-0.5">
                <p className="text-[12px] sm:text-[13px] text-white/95 leading-snug">
                  <strong className="font-bold text-white">{displayMonthLabel}</strong> মাসের ফান্ডের টাকা এখনো জমা করেননি।
                </p>
                <p className="text-[11px] sm:text-xs text-white/80 leading-snug">
                  অনুগ্রহ করে নির্ধারিত সময়ের মাঝে টাকা জমা দেওয়ার অনুরোধ করা হলো।
                </p>
              </div>

              {/* Bottom Two Inset Info Boxes */}
              <div className="relative grid grid-cols-2 gap-2 mt-2.5 text-left">
                <div className="rounded-xl bg-[#04281d]/90 border border-emerald-300/15 px-2.5 py-2 min-w-0">
                  <div className="flex items-center gap-1 text-[10px] text-white/75 font-medium">
                    <Wallet className="w-3 h-3 text-white/85 shrink-0" />
                    <span className="truncate">নির্ধারিত জমা</span>
                  </div>
                  <p className="mt-0.5 text-[14px] sm:text-[16px] font-bold text-white leading-tight truncate">
                    <AnimatedNumber
                      value={displayAmount}
                      formatter={(v) => `৳${toBengaliNumerals(Math.round(v).toLocaleString('en-IN'))}`}
                    />
                  </p>
                </div>

                <div className="rounded-xl bg-[#04281d]/90 border border-emerald-300/15 px-2.5 py-2 min-w-0">
                  <div className="flex items-center gap-1 text-[10px] text-white/75 font-medium">
                    <Calendar className="w-3 h-3 text-white/85 shrink-0" />
                    <span className="truncate">শেষ তারিখ</span>
                  </div>
                  <p className="mt-0.5 text-[13px] sm:text-[15px] font-bold text-white leading-tight truncate">
                    {displayDeadline}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Copy & Primary Deposit CTA Button */}
            <div className="px-0.5 space-y-2 shrink-0">
              <div className="space-y-0.5 text-left">
                <h4 className="text-[14px] sm:text-[16px] font-bold text-ink leading-snug">
                  ফান্ডে নিয়মিত সঞ্চয় জমা দিন
                </h4>
                <p className="text-[10.5px] sm:text-[11.5px] text-slate-400 leading-snug">
                  আপনার নিয়মিত সঞ্চয়ই আমাদের যৌথ তহবিলের শক্তি। সময়মতো জমা দিলে সবার হিসাব স্বচ্ছ থাকে।
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDepositNow}
                className="w-full min-h-[40px] sm:min-h-[44px] rounded-full bg-gradient-to-r from-[#ebc045] via-[#f5cc54] to-[#dfa729] hover:brightness-105 text-[#171204] font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5 shadow-[0_10px_22px_-6px_rgba(235,192,69,0.45)] cursor-pointer transition-all"
              >
                <span>টাকা জমা দিন</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </motion.button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleClose}
                  className="py-0.5 px-3 text-[11px] font-bold text-slate-400 hover:text-ink transition-colors cursor-pointer"
                >
                  পরে করব
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
