import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Receipt,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  TrendingDown,
  Bell,
  LayoutGrid,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrencyBengali, toBengaliNumerals } from '../../utils/calculations';
import { Avatar } from '../common/Avatar';
import { formatUserPhone } from '../../utils/userPrivacy';
import { motion, AnimatePresence } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

const BN_TO_EN_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

function normalizeSearchQuery(val: string): string {
  return (val || '')
    .toLowerCase()
    .replace(/[০-৯]/g, (d) => BN_TO_EN_DIGITS[d] || d)
    .trim();
}

const SEARCHABLE_APP_SECTIONS = [
  { id: 'home', title: 'হোম ড্যাশবোর্ড', keywords: 'dashboard home ব্যালেন্স মোট সঞ্চয়' },
  { id: 'members', title: 'সদস্য তালিকা ও পদবি', keywords: 'members list সদস্য আইডি প্রোফাইল' },
  { id: 'savings', title: 'সঞ্চয় খাতা ও নতুন জমা', keywords: 'savings deposit জমা কিস্তি লেজার' },
  { id: 'receipts', title: 'ই-রসিদ ও পিডিএফ স্টেটমেন্ট', keywords: 'receipt statement রসিদ স্টেটমেন্ট pdf' },
  { id: 'analytics', title: 'হিসাব বিশ্লেষণ ও গ্রাফ', keywords: 'analytics chart graph চার্ট গ্রাফ রিপোর্ট' },
  { id: 'bank', title: 'ব্যাংক ইনফরমেশন ও হিসাব', keywords: 'bank account bkash nagad rocket ব্যাংক বিকাশ নগদ খরচ' },
  { id: 'notices', title: 'নোটিশ বোর্ড', keywords: 'notice announcement নোটিশ ঘোষণা বিজ্ঞপ্তি' },
  { id: 'chat', title: 'কমিউনিটি চ্যাট ও ইনবক্স', keywords: 'chat message inbox চ্যাট মেসেজ ইনবক্স জরিপ' },
  { id: 'executive', title: 'কার্যনির্বাহী পর্ষদ', keywords: 'executive committee কমিটি পর্ষদ পদবি' },
  { id: 'rules', title: 'ফাউন্ডেশন গঠনতন্ত্র ও বিধি', keywords: 'rules constitution গঠনতন্ত্র নিয়ম নীতি' },
  { id: 'complaints', title: 'অভিযোগ প্রতিকার সেল', keywords: 'complaints অভিযোগ সমস্যা' },
  { id: 'features', title: 'নতুন ফিচারের প্রস্তাবনা', keywords: 'features vote ফিচার প্রস্তাবনা ভোট' },
  { id: 'sheets', title: 'গুগল শিটস ক্লাউড সিঙ্ক', keywords: 'google sheets গুগল শিট ক্লাউড' },
  { id: 'about-us', title: 'আমাদের সম্পর্কে (About Us)', keywords: 'about us পরিচিতি আমাদের সম্পর্কে স্বাক্ষরকারী' },
  { id: 'profile', title: 'প্রোফাইল ও অ্যাপ সেটিংস', keywords: 'profile settings প্রোফাইল সেটিংস থিম' },
];

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const {
    users,
    savings,
    receipts,
    expenses,
    notices,
    currentUser,
    isGuestMode,
    triggerGuestWarning,
    setActivePrintReceipt,
    setActivePrivateChatUser,
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(t);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const q = isOpen ? normalizeSearchQuery(query) : '';

  const matchesText = (target?: string | number | null) => {
    if (target === undefined || target === null || !q) return false;
    return normalizeSearchQuery(String(target)).includes(q);
  };

  // 0. Matched App Sections / Information Tabs
  const matchedSections = q
    ? SEARCHABLE_APP_SECTIONS.filter(
        (sec) => matchesText(sec.title) || matchesText(sec.keywords) || matchesText(sec.id)
      )
    : [];

  // 1. Matched Members (exclude unified Guest placeholder)
  const matchedMembers = q
    ? users.filter(
        (u) =>
          u.id !== '__guest__' &&
          u.memberId !== 'GUEST' &&
          (matchesText(u.name) ||
            matchesText(u.memberId) ||
            matchesText(u.phone) ||
            matchesText(u.email) ||
            matchesText(u.moderatorTitle))
      )
    : [];

  // 2. Matched Notices & Information
  const matchedNotices = q
    ? notices.filter(
        (n) => matchesText(n.title) || matchesText(n.content) || matchesText(n.authorName)
      )
    : [];

  // 3. Matched Savings Transactions
  const matchedSavings = q
    ? savings.filter(
        (s) =>
          matchesText(s.id) ||
          matchesText(s.memberName) ||
          matchesText(s.memberId) ||
          matchesText(s.transactionRef) ||
          matchesText(s.savingsMonth) ||
          matchesText(s.amount)
      )
    : [];

  // 4. Matched Receipts (hide from Guest users)
  const matchedReceipts =
    q && !isGuestMode
      ? receipts.filter(
          (r) =>
            matchesText(r.receiptNumber) ||
            matchesText(r.memberName) ||
            matchesText(r.memberId) ||
            matchesText(r.transactionRef) ||
            matchesText(r.amount)
        )
      : [];

  // 5. Matched Expenses
  const matchedExpenses = q
    ? expenses.filter(
        (e) =>
          matchesText(e.title) ||
          matchesText(e.voucherRef) ||
          matchesText(e.approvedBy) ||
          matchesText(e.amount)
      )
    : [];

  const totalResults =
    matchedSections.length +
    matchedMembers.length +
    matchedNotices.length +
    matchedSavings.length +
    matchedReceipts.length +
    matchedExpenses.length;

  return (
    <AnimatePresence>
    {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay: 0, ease: SMOOTH_EASE }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -10 }}
        transition={{ duration: 0.36, delay: 0, ease: SMOOTH_EASE }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden mt-6 sm:mt-12 flex flex-col max-h-[84dvh]"
      >
        {/* Search Header Bar: Transparent search input box with zero background fill (Point 1) */}
        <div className="p-3.5 sm:p-4 shrink-0 border-b border-slate-800 flex items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-transparent border border-slate-700 focus-within:border-emerald-500 text-ink transition-colors min-w-0">
            <SpringIcon activeKey={Boolean(q)}>
              <Search className="w-4 h-4 text-emerald-400 shrink-0" />
            </SpringIcon>
            <input
              ref={inputRef}
              type="text"
              placeholder="আইডি, নাম, রসিদ বা তথ্য সার্চ করুন..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input-clean flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-ink placeholder-slate-400 font-bold border-0 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="মুছে ফেলুন"
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs leading-none cursor-pointer shrink-0"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-ink transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto overscroll-contain space-y-5 text-xs flex-1 min-h-0">
          {!q ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Search className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300 text-sm">সার্বজনীন সার্চ কনসোল</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                সদস্যের নাম, মেম্বার আইডি (যেমন: BF-001 বা ০০১), রসিদ নম্বর, নোটিশ বা যেকোনো তথ্য লিখে সার্চ করুন।
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <p className="text-ink font-bold text-sm">কোনো ফলাফল পাওয়া যায়নি</p>
              <p className="text-xs text-slate-500">"{query}" এর সাথে মিল রেখে কোনো রেকর্ড নেই।</p>
            </div>
          ) : (
            <>
              {/* 0. Matched App Sections */}
              {matchedSections.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-bold px-1">
                    <span className="flex items-center gap-1.5 text-teal-400 font-bold">
                      <LayoutGrid className="w-4 h-4" />
                      <span>অ্যাপ সেবা ও বিভাগসমূহ ({toBengaliNumerals(matchedSections.length)})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {matchedSections.map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(sec.id);
                          onClose();
                        }}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between text-left transition-all cursor-pointer group"
                      >
                        <strong className="text-ink font-bold group-hover:text-emerald-400 transition-colors truncate">
                          {sec.title}
                        </strong>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Matched Members */}
              {matchedMembers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-bold px-1">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <User className="w-4 h-4" />
                      <span>সদস্যবৃন্দ ({toBengaliNumerals(matchedMembers.length)})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {matchedMembers.map((m) => {
                      const displayPhone = formatUserPhone(m, currentUser?.role, currentUser?.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (isGuestMode) {
                              onSelectTab('members');
                              onClose();
                              return;
                            }
                            setActivePrivateChatUser(m);
                            onSelectTab('chat');
                            onClose();
                          }}
                          className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar src={m.avatarUrl} name={m.name} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <strong className="text-ink font-bold group-hover:text-emerald-400 transition-colors truncate">
                                  {m.name}
                                </strong>
                                {m.role !== 'MEMBER' && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-500 text-ink shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono truncate">
                                {m.memberId} • {displayPhone}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px] shrink-0">
                            <span>{isGuestMode ? 'সদস্য দেখুন' : 'বার্তা দিন'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 1b. Matched Notices */}
              {matchedNotices.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-bold px-1">
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Bell className="w-4 h-4" />
                      <span>নোটিশ ও তথ্য ({toBengaliNumerals(matchedNotices.length)})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {matchedNotices.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          onSelectTab('notices');
                          onClose();
                        }}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <strong className="text-ink font-bold block truncate group-hover:text-amber-300 transition-colors">
                            {n.title}
                          </strong>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{n.content}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Matched Receipts */}
              {matchedReceipts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-bold px-1">
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Receipt className="w-4 h-4" />
                      <span>ডিজিটাল রসিদসমূহ ({toBengaliNumerals(matchedReceipts.length)})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {matchedReceipts.map((r) => (
                      <div
                        key={r.receiptNumber}
                        onClick={() => {
                          setActivePrintReceipt(r);
                          onClose();
                        }}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                              {r.receiptNumber}
                            </span>
                            <strong className="text-ink font-bold">{r.memberName}</strong>
                            <span className="text-slate-400 font-mono">({r.memberId})</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            মাস: {r.savingsMonth} • মাধ্যম: {r.paymentMethod} {r.transactionRef && `• রেফ: ${r.transactionRef}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-400 block">
                            {formatCurrencyBengali(r.amount)}
                          </span>
                          <span className="text-[10px] text-amber-400 group-hover:underline">
                            রসিদ প্রিন্ট →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Matched Savings Transactions */}
              {matchedSavings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-bold px-1">
                    <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <CreditCard className="w-4 h-4" />
                      <span>সঞ্চয় ও জমার এন্ট্রি ({toBengaliNumerals(matchedSavings.length)})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {matchedSavings.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onSelectTab('savings');
                          onClose();
                        }}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold">#{s.id.slice(-6)}</span>
                            <strong className="text-ink font-bold">{s.memberName}</strong>
                            <span className="text-emerald-400 font-mono font-bold">({s.memberId})</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            মাস: {s.savingsMonth} • তারিখ: {s.transactionDate} {s.transactionRef && `• ভাউচার: ${s.transactionRef}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-400 block">
                            {formatCurrencyBengali(s.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {s.status === 'APPROVED' ? 'অনুমোদিত' : s.status === 'PENDING' ? 'অপেক্ষমান' : 'প্রত্যাখ্যাত'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Matched Expenses */}
              {matchedExpenses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-bold px-1">
                    <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                      <TrendingDown className="w-4 h-4" />
                      <span>প্রাতিষ্ঠানিক ব্যয় ও খরচ ({toBengaliNumerals(matchedExpenses.length)})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {matchedExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        onClick={() => {
                          onSelectTab('bank');
                          onClose();
                        }}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div>
                          <strong className="text-ink font-bold">{exp.title}</strong>
                          <p className="text-[11px] text-slate-400">
                            তারিখ: {exp.expenseDate} {exp.voucherRef && `• ভাউচার: ${exp.voucherRef}`}
                          </p>
                        </div>
                        <span className="font-bold text-rose-400 text-sm">
                          -{formatCurrencyBengali(exp.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
