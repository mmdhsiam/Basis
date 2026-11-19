import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  QrCode,
  CreditCard,
  PlusCircle,
  Trash2,
  Copy,
  Check,
  TrendingDown,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Shield,
  FileText,
  AlertCircle,
  ExternalLink,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { registerBackHandler } from '../../utils/backNavigation';
import { formatCurrencyBengali, toBengaliNumerals, maskPhoneForPrivacy } from '../../utils/calculations';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { BankAccountDetails, FoundationExpense } from '../../types';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { motion, AnimatePresence } from 'motion/react';
import {
  AnimatedNumber,
  SlidingTabPill,
  StaggerList,
  StaggerItem,
  SpringIcon,
  SMOOTH_EASE,
} from '../common/MotionPrimitives';

export const BankInformationView: React.FC = () => {
  const {
    config,
    proposeBankOrConfigChange,
    currentUser,
    financialTotals,
    expenses,
    addExpense,
    removeExpense,
    totalExpenses,
    netReserveBalance,
    isGuestMode,
    triggerWarning,
    checkPendingRequestWarning,
    users,
  } = useApp();
  const [confirmDeleteExpId, setConfirmDeleteExpId] = useState<string | null>(null);

  const isModerator =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  const defaultBankDetails: BankAccountDetails = {
    bankName: 'সোনালী ব্যাংক পিএলসি',
    accountName: 'বেসিস সমবায় সঞ্চয় তহবিল',
    accountNumber: '120.101.8892',
    branchName: 'উত্তরা মডেল টাউন শাখা, ঢাকা',
    routingNumber: '200261572',
    swiftCode: 'BSONBDDH',
    qrCodeImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=BASIS-FOUNDATION-BANK-DEPOSIT-ACC-1201018892',
    bkashNumber: '01712-345678 (মার্চেন্ট)',
    nagadNumber: '01812-345678',
    rocketNumber: '01912-345678-9',
    instructions: 'ব্যাংক ডিপোজিট বা ফান্ড ট্রান্সফারের সময় রেফারেন্স হিসেবে আপনার সদস্য আইডি উল্লেখ করুন।',
  };

  // Bank details state
  const bankDetails: BankAccountDetails = {
    ...defaultBankDetails,
    ...(config.bankDetails || {}),
  };

  // Deliverable 1: Joint Bank Account Operating Moderators (same as AboutUs tab)
  const resolvedHolders = (
    config.jointBankAccountHolders || [
      {
        name: 'মাহমুদুল হাসান সিয়াম',
        role: 'প্রধান সমন্বয়ক ও একাউন্ট হোল্ডার ১',
        memberId: 'BF-001',
        phone: '০১৭০০-০০০০০১',
      },
      {
        name: 'তানভীর আহমেদ',
        role: 'যুগ্ম সমন্বয়ক ও একাউন্ট হোল্ডার ২',
        memberId: 'BF-002',
        phone: '০১৭০০-০০০০০২',
      },
      {
        name: 'সাবরিনা আক্তার',
        role: 'কোষাধ্যক্ষ ও একাউন্ট হোল্ডার ৩',
        memberId: 'BF-003',
        phone: '০১৭০০-০০০০০৩',
      },
    ]
  ).map((rawHolder, idx) => {
    const matchedFromRaw =
      typeof rawHolder === 'string'
        ? users.find(
            (u) => rawHolder.includes(u.name) || u.id === rawHolder || u.memberId === rawHolder
          )
        : users.find((u) => u.memberId === rawHolder.memberId || u.name === rawHolder.name);

    if (typeof rawHolder === 'string') {
      const match = rawHolder.match(/^(.+?)\s*\((.+)\)$/);
      const parsedName = match ? match[1].trim() : rawHolder.trim();
      const parsedRole = match ? match[2].trim() : `একাউন্ট হোল্ডার ${toBengaliNumerals(idx + 1)}`;
      return {
        name: matchedFromRaw?.name || parsedName,
        role: matchedFromRaw?.moderatorTitle || parsedRole,
        memberId: matchedFromRaw?.memberId || `BF-00${idx + 1}`,
        phone: matchedFromRaw?.phone || '০১৭০০-০০০০০' + (idx + 1),
        avatarUrl: matchedFromRaw?.avatarUrl,
        gender: matchedFromRaw?.gender,
      };
    }

    return {
      ...rawHolder,
      avatarUrl: rawHolder.avatarUrl || matchedFromRaw?.avatarUrl,
      gender: matchedFromRaw?.gender,
    };
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Deliverable 11: Full Bank Account Details Edit Modal State for Moderators
  const [isBankEditModalOpen, setIsBankEditModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState<BankAccountDetails>(bankDetails);

  // New QR code edit state
  const [qrInput, setQrInput] = useState(bankDetails.qrCodeImageUrl || '');
  const [isEditingQr, setIsEditingQr] = useState(false);

  // New Expense form modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<FoundationExpense['category']>('OFFICE');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expVoucher, setExpVoucher] = useState('');
  const [expNotes, setExpNotes] = useState('');

  useEffect(() => {
    if (!isBankEditModalOpen && !isExpenseModalOpen) return;
    return registerBackHandler(() => {
      if (isBankEditModalOpen) {
        setIsBankEditModalOpen(false);
        return;
      }
      if (isExpenseModalOpen) {
        setIsExpenseModalOpen(false);
      }
    });
  }, [isBankEditModalOpen, isExpenseModalOpen]);

  const openBankEditModal = () => {
    if (
      checkPendingRequestWarning(
        { requestTypes: ['BANK_CONFIG_CHANGE'], sourceKey: 'config-bankDetails' },
        'ব্যাংক একাউন্ট বিবরণী সম্পাদনা'
      )
    ) {
      return;
    }
    setBankForm({
      ...defaultBankDetails,
      ...(config.bankDetails || {}),
    });
    setIsBankEditModalOpen(true);
  };

  const handleSaveBankAccountDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName.trim() || !bankForm.accountName.trim() || !bankForm.accountNumber.trim()) {
      triggerWarning('অসম্পূর্ণ তথ্য', 'অনুগ্রহ করে ব্যাংকের নাম, একাউন্টের নাম এবং হিসাব নম্বর পূরণ করুন।');
      return;
    }
    const cleanedQr =
      extractDirectImageUrl(bankForm.qrCodeImageUrl || '') || bankForm.qrCodeImageUrl?.trim() || '';
    const nextBankDetails: BankAccountDetails = {
      bankName: bankForm.bankName.trim(),
      accountName: bankForm.accountName.trim(),
      accountNumber: bankForm.accountNumber.trim(),
      branchName: (bankForm.branchName || '').trim(),
      routingNumber: (bankForm.routingNumber || '').trim(),
      swiftCode: (bankForm.swiftCode || '').trim(),
      bkashNumber: (bankForm.bkashNumber || '').trim(),
      nagadNumber: (bankForm.nagadNumber || '').trim(),
      rocketNumber: (bankForm.rocketNumber || '').trim(),
      qrCodeImageUrl: cleanedQr,
      instructions: (bankForm.instructions || '').trim(),
    };

    const diffChanges: { field: string; oldValue: any; newValue: any }[] = [];
    (Object.keys(nextBankDetails) as Array<keyof BankAccountDetails>).forEach((k) => {
      const oldV = String(bankDetails[k] ?? '');
      const newV = String(nextBankDetails[k] ?? '');
      if (oldV !== newV) {
        diffChanges.push({ field: String(k), oldValue: oldV || 'খালি', newValue: newV || 'খালি' });
      }
    });

    if (diffChanges.length === 0) {
      triggerWarning('কোনো পরিবর্তন নেই', 'ব্যাংক একাউন্ট বিবরণীতে কোনো পরিবর্তন করা হয়নি।');
      return;
    }

    const ok = proposeBankOrConfigChange(
      `ব্যাংক একাউন্ট বিবরণী হালনাগাদ (${nextBankDetails.bankName})`,
      `${currentUser?.name || 'মডারেটর'} ব্যাংক একাউন্ট বিবরণী হালনাগাদের প্রস্তাব দাখিল করেছেন।`,
      { bankDetails: nextBankDetails },
      diffChanges
    );
    if (ok) {
      setIsBankEditModalOpen(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveQr = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = extractDirectImageUrl(qrInput);
    const ok = proposeBankOrConfigChange(
      'ব্যাংক পেমেন্ট QR কোড পরিবর্তন',
      `${currentUser?.name || 'মডারেটর'} ব্যাংকের QR কোড লিংক হালনাগাদের প্রস্তাব দাখিল করেছেন।`,
      {
        bankDetails: {
          ...bankDetails,
          qrCodeImageUrl: cleanUrl,
        },
      },
      [
        {
          field: 'qrCodeImageUrl',
          oldValue: bankDetails.qrCodeImageUrl || 'পূর্বের লিংক',
          newValue: cleanUrl,
        },
      ]
    );
    if (ok) {
      setIsEditingQr(false);
    }
  };

  const handleToggleDisplayBalance = (mode: 'GROSS' | 'NET_AFTER_EXPENSE') => {
    if ((config.dashboardBalanceDisplay || 'GROSS') === mode) return;
    proposeBankOrConfigChange(
      'ড্যাশবোর্ড ব্যালেন্স প্রদর্শন মোড পরিবর্তন',
      `${currentUser?.name || 'মডারেটর'} ড্যাশবোর্ডে তহবিল প্রদর্শন মোড পরিবর্তনের প্রস্তাব দাখিল করেছেন।`,
      {
        dashboardBalanceDisplay: mode,
      },
      [
        {
          field: 'dashboardBalanceDisplay',
          oldValue: (config.dashboardBalanceDisplay || 'GROSS') === 'NET_AFTER_EXPENSE' ? 'প্রকৃত অবশিষ্ট তহবিল' : 'মোট জমাকৃত তহবিল',
          newValue: mode === 'NET_AFTER_EXPENSE' ? 'প্রকৃত অবশিষ্ট তহবিল' : 'মোট জমাকৃত তহবিল',
        },
      ]
    );
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount || Number(expAmount) <= 0) {
      triggerWarning('অসম্পূর্ণ তথ্য', 'সঠিক বিবরণ ও খরচের পরিমাণ প্রদান করুন।');
      return;
    }

    const ok = addExpense({
      title: expTitle.trim(),
      category: expCategory,
      amount: Number(expAmount),
      expenseDate: expDate,
      approvedBy: currentUser?.name || 'মডারেটর',
      voucherRef: expVoucher.trim() || undefined,
      notes: expNotes.trim() || undefined,
    });

    if (ok) {
      setExpTitle('');
      setExpAmount('');
      setExpVoucher('');
      setExpNotes('');
      setIsExpenseModalOpen(false);
    }
  };

  const cleanQrCode = extractDirectImageUrl(bankDetails.qrCodeImageUrl);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink">
                  প্রাতিষ্ঠানিক ব্যাংক হিসাব ও তহবিল খরচ
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  বেসিস ফাউন্ডেশনের অনুমোদিত ব্যাংকিং চ্যানেল, কিউআর কোড স্ক্যান ও তহবিল ব্যয়ের হিসাব।
                </p>
              </div>
            </div>
          </div>

          {isModerator && (
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>নতুন খরচ / ব্যয় লিপিবদ্ধ করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Health Summary Cards: Gross Deposits, Expenses, Net Balance (Requirement 11) */}
      <StaggerList className="grid grid-cols-1 sm:grid-cols-3 gap-4" stagger={0.06}>
        {/* Card 1: Gross Collections */}
        <StaggerItem hoverLift className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-2 card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">সর্বমোট জমাকৃত সঞ্চয় (Gross)</span>
            <SpringIcon>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </SpringIcon>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">
            <AnimatedNumber
              value={financialTotals.totalApproved}
              formatter={(v) => formatCurrencyBengali(Math.round(v))}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-bold">
            সকল সদস্যের অনুমোদিত সঞ্চয় কিস্তির মোট পরিমাণ
          </p>
        </StaggerItem>

        {/* Card 2: Total Expenses */}
        <StaggerItem hoverLift className="bg-slate-900 border border-rose-900/40 rounded-3xl p-5 shadow-sm space-y-2 card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300">মোট প্রাতিষ্ঠানিক ব্যয় ও খরচ</span>
            <SpringIcon>
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </SpringIcon>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400">
            <AnimatedNumber
              value={totalExpenses}
              formatter={(v) => formatCurrencyBengali(Math.round(v))}
            />
          </div>
          <p className="text-[11px] text-rose-400/80 font-bold">
            মোট{' '}
            <strong className="text-ink font-bold">
              <AnimatedNumber
                value={expenses.length}
                formatter={(v) => toBengaliNumerals(Math.round(v))}
              />
            </strong>{' '}
            টি খাতে তহবিল খরচ লিপিবদ্ধ
          </p>
        </StaggerItem>

        {/* Card 3: Net Actual Balance */}
        <StaggerItem hoverLift className="bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-5 shadow-lg space-y-2 card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300">প্রকৃত অবশিষ্ট তহবিল (Net Balance)</span>
            <SpringIcon>
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
            </SpringIcon>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-ink">
            <AnimatedNumber
              value={netReserveBalance}
              formatter={(v) => formatCurrencyBengali(Math.round(v))}
            />
          </div>
          <p className="text-[11px] text-emerald-400 font-bold">
            মোট জমা থেকে খরচ বাদ দিয়ে বর্তমান নিট জমা
          </p>
        </StaggerItem>
      </StaggerList>

      {/* Requirement 11 Option: Choose what to show on Dashboard */}
      {isModerator && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-ink text-sm block">
              ড্যাশবোর্ডে জমার ব্যালেন্স প্রদর্শনের ধরণ (Dashboard Balance Mode):
            </span>
            <p className="text-slate-400">
              আপনি কি ড্যাশবোর্ডে মোট সংগৃহীত টাকা (Gross) দেখাতে চান নাকি খরচ বাদ দিয়ে একচুয়াল জমার টাকা (Net Actual) দেখাতে চান?
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => handleToggleDisplayBalance('GROSS')}
              className={`relative py-2 px-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                config.dashboardBalanceDisplay !== 'NET_AFTER_EXPENSE'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-ink'
              }`}
            >
              {config.dashboardBalanceDisplay !== 'NET_AFTER_EXPENSE' && (
                <SlidingTabPill layoutId="bank-balance-mode-pill" className="bg-emerald-600 shadow" />
              )}
              <span className="relative z-10">গ্রস মোট জমা (Gross)</span>
            </button>

            <button
              onClick={() => handleToggleDisplayBalance('NET_AFTER_EXPENSE')}
              className={`relative py-2 px-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                config.dashboardBalanceDisplay === 'NET_AFTER_EXPENSE'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-ink'
              }`}
            >
              {config.dashboardBalanceDisplay === 'NET_AFTER_EXPENSE' && (
                <SlidingTabPill layoutId="bank-balance-mode-pill" className="bg-emerald-600 shadow" />
              )}
              <span className="relative z-10">খরচ বাদে প্রকৃত জমা (Net)</span>
            </button>
          </div>
        </div>
      )}

      {/* Bank Account Details & QR Code Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Official Bank Account Specs */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400 shrink-0" />
              <h3 className="font-bold text-ink text-base">ব্যাংক একাউন্ট বিবরণী</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                অফিসিয়াল একাউন্ট
              </span>
              {isModerator && (
                <button
                  type="button"
                  onClick={openBankEditModal}
                  className="py-1.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="ব্যাংক একাউন্ট বিবরণী এডিট করুন"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>এডিট করুন</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Bank Name */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">ব্যাংকের নাম:</span>
                <strong className="text-ink text-sm font-bold">{bankDetails.bankName}</strong>
              </div>
            </div>

            {/* Account Name */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">একাউন্টের নাম:</span>
                <strong className="text-ink text-sm font-bold">{bankDetails.accountName}</strong>
              </div>
              <button
                onClick={() => handleCopy(bankDetails.accountName, 'accName')}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-ink transition-colors cursor-pointer"
                title="কপি করুন"
              >
                <SpringIcon activeKey={copiedKey === 'accName'}>
                  {copiedKey === 'accName' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </SpringIcon>
              </button>
            </div>

            {/* Account Number */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-900/50 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">হিসাব নম্বর (Account Number):</span>
                <span className="text-emerald-400 font-mono text-base font-bold tracking-wider">
                  {bankDetails.accountNumber}
                </span>
              </div>
              <button
                onClick={() => handleCopy(bankDetails.accountNumber, 'accNo')}
                className="p-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-colors cursor-pointer"
                title="হিসাব নম্বর কপি করুন"
              >
                <SpringIcon activeKey={copiedKey === 'accNo'}>
                  {copiedKey === 'accNo' ? <Check className="w-3.5 h-3.5 text-ink" /> : <Copy className="w-3.5 h-3.5" />}
                </SpringIcon>
              </button>
            </div>

            {/* Branch & Routing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[11px] font-bold">শাখা (Branch):</span>
                <strong className="text-slate-200 font-bold">{bankDetails.branchName}</strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px] font-bold">রাউটিং নম্বর (Routing):</span>
                  <span className="font-mono text-slate-200 font-bold">{bankDetails.routingNumber || '200261572'}</span>
                </div>
                <button
                  onClick={() => handleCopy(bankDetails.routingNumber || '200261572', 'routing')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-ink cursor-pointer"
                >
                  {copiedKey === 'routing' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Mobile Financial Services (MFS) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 text-xs block">মোবাইল ব্যাংকিং চ্যানেলসমূহ:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-pink-950/20 border border-pink-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-pink-400 font-bold block">বিকাশ (bKash):</span>
                    <span className="font-mono text-ink font-bold">{bankDetails.bkashNumber || '01712-345678'}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(bankDetails.bkashNumber || '01712-345678', 'bkash')}
                    className="p-1 text-slate-400 hover:text-ink cursor-pointer"
                  >
                    {copiedKey === 'bkash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold block">নগদ (Nagad):</span>
                    <span className="font-mono text-ink font-bold">{bankDetails.nagadNumber || '01812-345678'}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(bankDetails.nagadNumber || '01812-345678', 'nagad')}
                    className="p-1 text-slate-400 hover:text-ink cursor-pointer"
                  >
                    {copiedKey === 'nagad' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold block">রকেট (Rocket):</span>
                    <span className="font-mono text-ink font-bold">{bankDetails.rocketNumber || '01912-345678-9'}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(bankDetails.rocketNumber || '01912-345678-9', 'rocket')}
                    className="p-1 text-slate-400 hover:text-ink cursor-pointer"
                  >
                    {copiedKey === 'rocket' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {(bankDetails.swiftCode || bankDetails.instructions) && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                {bankDetails.swiftCode && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">সুইফট কোড (SWIFT):</span>
                    <span className="font-mono text-slate-200 font-bold">{bankDetails.swiftCode}</span>
                  </div>
                )}
                {bankDetails.instructions && (
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-emerald-400">নির্দেশনা:</strong> {bankDetails.instructions}
                  </p>
                )}
              </div>
            )}

            {/* Deliverable 1: Joint Bank Account Operating Moderators Section */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>যৌথ ব্যাংক একাউন্ট পরিচালনাকারী ৩ জন মডারেটর তালিকা</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ব্যাংক হিসাব পরিচালনার জন্য অনুমোদিত যৌথ স্বাক্ষরকারী মডারেটর পরিষদ।
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                  {toBengaliNumerals(resolvedHolders.length)} জন অনুমোদিত স্বাক্ষরকারী
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {resolvedHolders.map((holder, idx) => {
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between space-y-2 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            স্বাক্ষরকারী #{toBengaliNumerals(idx + 1)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            {holder.memberId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={holder.avatarUrl}
                            name={holder.name}
                            size="md"
                            ringColor="ring-emerald-500/60"
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="font-bold text-xs text-ink truncate">
                              {holder.name}
                            </h5>
                            <p className="text-[10px] text-emerald-400/90 font-medium mt-0.5 truncate">
                              {holder.role}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
                        <span>ফোন:</span>
                        <span className="text-slate-300 font-mono font-bold">
                          {maskPhoneForPrivacy(
                            holder.phone,
                            holder.gender || (holder.name.includes('সাবরিনা') ? 'FEMALE' : 'MALE'),
                            currentUser?.role
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Hosted QR Code Card with Input Box for Moderator (Requirement 11) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-ink text-base">স্ক্যান ও পে কিউআর কোড (QR Code)</h3>
              </div>
              {isModerator && (
                <button
                  onClick={() => {
                    if (
                      !isEditingQr &&
                      checkPendingRequestWarning(
                        { requestTypes: ['BANK_CONFIG_CHANGE'], sourceKey: 'config-bankDetails' },
                        'ব্যাংক QR কোড পরিবর্তন'
                      )
                    ) {
                      return;
                    }
                    setIsEditingQr(!isEditingQr);
                  }}
                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingQr ? 'বাতিল' : 'QR কোড এডিট'}</span>
                </button>
              )}
            </div>

            {/* Hosted QR Code Image Input for Moderator */}
            {isEditingQr && isModerator && (
              <form onSubmit={handleSaveQr} className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/50 space-y-2 text-xs">
                <label className="font-bold text-ink block">
                  ব্যাংকের হোস্টেড QR কোড লিংক (ImgBB / hosted link / html / bbcode):
                </label>
                <div className="flex items-start gap-2.5">
                  {qrInput && extractDirectImageUrl(qrInput) && (
                    <img
                      src={extractDirectImageUrl(qrInput)}
                      alt="QR Preview"
                      className="w-12 h-12 rounded-lg object-contain bg-white p-1 border border-slate-700 shrink-0"
                    />
                  )}
                  <HostedImageInput
                    value={qrInput}
                    onChange={setQrInput}
                    placeholder="https://i.ibb.co/.../qr.png অথবা গ্যালারি থেকে আপলোড করুন"
                    className="flex-1 min-w-0"
                    inputClassName="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-ink font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  * ImgBB বা যেকোনো সাইটের ভিউয়ার লিংক বা HTML কোড দিলে স্বয়ংক্রিয়ভাবে ডিরেক্ট ছবি এক্সট্রাক্ট হবে।
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>QR লিংক সেভ করুন</span>
                  </button>
                </div>
              </form>
            )}

            {/* QR Image Display */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner border border-slate-200">
              {cleanQrCode ? (
                <img
                  src={cleanQrCode}
                  alt="Bank Deposit QR Code"
                  className="w-48 h-48 object-contain rounded-lg"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=BASIS-FOUNDATION-BANK-DEPOSIT-ACC-1201018892';
                  }}
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs italic">
                  কোনো QR কোড ছবি সংযুক্ত নেই
                </div>
              )}
              <span className="mt-2 text-slate-800 font-bold text-xs">
                যেকোনো ব্যাংকিং অ্যাপ দিয়ে স্ক্যান করে ডিপোজিট করুন
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 block">জমা প্রদানের নিয়মাবলী:</span>
              <p className="leading-relaxed">
                ১. ডিপোজিট বা ট্রান্সফার করার পর ট্রানজেকশন আইডি ও ভাউচারের স্ক্রিনশট সংরক্ষণ করুন।
              </p>
              <p className="leading-relaxed">
                ২. অ্যাপের <strong>মাসিক সঞ্চয় খাতা</strong> থেকে "টাকা জমা দিন" এ গিয়ে জমা সাবমিট করুন।
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table (খরচ ও ব্যয়ের বিস্তারিত বিবরণ) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-400" />
              <span>প্রাতিষ্ঠানিক ব্যয়ের খাতা ({toBengaliNumerals(expenses.length)} টি এন্ট্রি)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ফাউন্ডেশনের বিভিন্ন প্রশাসনিক, সেবা ও ব্যবস্থাপনাগত খরচের পুঙ্খানুপুঙ্খ অডিট ট্রেইল।
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">সর্বমোট ব্যয়:</span>
            <span className="text-lg font-bold text-rose-400 block">
              {formatCurrencyBengali(totalExpenses)}
            </span>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-2.5">
          {expenses.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              এখনও কোনো খরচের রেকর্ড যুক্ত করা হয়নি।
            </div>
          ) : (
            expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-ink font-bold text-sm">{exp.title}</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {exp.category === 'OFFICE'
                        ? 'অফিস ব্যয়'
                        : exp.category === 'EVENT'
                        ? 'সভা ও রিফ্রেশমেন্ট'
                        : exp.category === 'BANK_CHARGE'
                        ? 'ব্যাংক ফি'
                        : exp.category === 'WELFARE'
                        ? 'কল্যাণ অনুদান'
                        : 'বিবিধ'}
                    </span>
                    {exp.voucherRef && (
                      <span className="font-mono text-[10px] text-emerald-400 font-bold">
                        ভাউচার: {exp.voucherRef}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    তারিখ: {exp.expenseDate} • অনুমোদনে: {exp.approvedBy} {exp.notes && `• নোট: ${exp.notes}`}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-base font-bold text-rose-400">
                    -{formatCurrencyBengali(exp.amount)}
                  </span>

                  {isModerator && (
                    confirmDeleteExpId === exp.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (removeExpense(exp.id)) {
                              setConfirmDeleteExpId(null);
                            } else {
                              setConfirmDeleteExpId(null);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          নিশ্চিত মুছুন
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteExpId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                        >
                          না
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            checkPendingRequestWarning(
                              { requestTypes: ['EXPENSE_DELETE'], targetRecordId: exp.id },
                              `ব্যয় রেকর্ড "${exp.title}" অপসারণ`
                            )
                          ) {
                            return;
                          }
                          setConfirmDeleteExpId(exp.id);
                        }}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="খরচের রেকর্ড মুছে ফেলার প্রস্তাব পাঠান"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add New Expense Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.26, ease: SMOOTH_EASE }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-ink text-base">নতুন ব্যয় / খরচ এন্ট্রি</h3>
                </div>
                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">খরচের বিবরণ / খাত:</label>
                  <input
                    type="text"
                    placeholder="যেমন: মাসিক অফিস খাতা ও রশিদ প্রিন্টিং খরচ"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">খরচের পরিমাণ (টাকা):</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="৳ 0"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-rose-400 font-bold text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">খরচের ধরণ:</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
                    >
                      <option value="OFFICE">অফিস ব্যয়</option>
                      <option value="EVENT">সভা ও রিফ্রেশমেন্ট</option>
                      <option value="BANK_CHARGE">ব্যাংক সার্ভিস চার্জ</option>
                      <option value="WELFARE">সদস্য কল্যাণ / সাহায্য</option>
                      <option value="MISC">বিবিধ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">খরচের তারিখ:</label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">ভাউচার / রসিদ নং:</label>
                    <input
                      type="text"
                      placeholder="VCH-2026-00X"
                      value={expVoucher}
                      onChange={(e) => setExpVoucher(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">মন্তব্য (ঐচ্ছিক):</label>
                  <input
                    type="text"
                    placeholder="অতিরিক্ত কোনো তথ্য থাকলে লিখুন..."
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                  >
                    খরচ সংরক্ষণ করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deliverable 11: Full Bank Account Details Edit Modal (Moderators Only) */}
      {isBankEditModalOpen &&
        isModerator &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: SMOOTH_EASE }}
              onClick={() => setIsBankEditModalOpen(false)}
              className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.2, ease: SMOOTH_EASE }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[86dvh] flex flex-col shadow-2xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink text-sm sm:text-base truncate">
                        ব্যাংক একাউন্ট বিবরণী সম্পাদনা
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        সংশোধনের পর মডারেটর প্যানেলে অনুমোদন সাপেক্ষে স্বয়ংক্রিয়ভাবে কার্যকর হবে
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBankEditModalOpen(false)}
                    aria-label="বন্ধ করুন"
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleSaveBankAccountDetails}
                  className="p-5 overflow-y-auto space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">ব্যাংকের নাম *</label>
                      <input
                        type="text"
                        required
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                        placeholder="যেমন: সোনালী ব্যাংক পিএলসি"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-ink font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">একাউন্টের নাম *</label>
                      <input
                        type="text"
                        required
                        value={bankForm.accountName}
                        onChange={(e) => setBankForm((p) => ({ ...p, accountName: e.target.value }))}
                        placeholder="যেমন: বেসিস সমবায় সঞ্চয় তহবিল"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-ink font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">হিসাব নম্বর (Account No) *</label>
                      <input
                        type="text"
                        required
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
                        placeholder="যেমন: 120.101.8892"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">শাখা (Branch)</label>
                      <input
                        type="text"
                        value={bankForm.branchName || ''}
                        onChange={(e) => setBankForm((p) => ({ ...p, branchName: e.target.value }))}
                        placeholder="যেমন: উত্তরা মডেল টাউন শাখা, ঢাকা"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-ink font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">রাউটিং নম্বর (Routing No)</label>
                      <input
                        type="text"
                        value={bankForm.routingNumber || ''}
                        onChange={(e) => setBankForm((p) => ({ ...p, routingNumber: e.target.value }))}
                        placeholder="যেমন: 200261572"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">সুইফট কোড (SWIFT Code)</label>
                      <input
                        type="text"
                        value={bankForm.swiftCode || ''}
                        onChange={(e) => setBankForm((p) => ({ ...p, swiftCode: e.target.value }))}
                        placeholder="যেমন: BSONBDDH"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 mb-2.5">
                      মোবাইল ব্যাংকিং চ্যানেল নম্বরসমূহ:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block font-bold text-pink-400">বিকাশ (bKash)</label>
                        <input
                          type="text"
                          value={bankForm.bkashNumber || ''}
                          onChange={(e) => setBankForm((p) => ({ ...p, bkashNumber: e.target.value }))}
                          placeholder="017XX-XXXXXX"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-amber-400">নগদ (Nagad)</label>
                        <input
                          type="text"
                          value={bankForm.nagadNumber || ''}
                          onChange={(e) => setBankForm((p) => ({ ...p, nagadNumber: e.target.value }))}
                          placeholder="018XX-XXXXXX"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-indigo-400">রকেট (Rocket)</label>
                        <input
                          type="text"
                          value={bankForm.rocketNumber || ''}
                          onChange={(e) => setBankForm((p) => ({ ...p, rocketNumber: e.target.value }))}
                          placeholder="019XX-XXXXXX-X"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">
                        পেমেন্ট QR কোড হোস্টেড ছবি লিংক
                      </label>
                      <div className="flex items-start gap-2">
                        {bankForm.qrCodeImageUrl && extractDirectImageUrl(bankForm.qrCodeImageUrl) && (
                          <img
                            src={extractDirectImageUrl(bankForm.qrCodeImageUrl)}
                            alt="Bank QR Preview"
                            className="w-11 h-11 rounded-lg object-contain bg-white p-1 border border-slate-700 shrink-0"
                          />
                        )}
                        <HostedImageInput
                          value={bankForm.qrCodeImageUrl || ''}
                          onChange={(val) => setBankForm((p) => ({ ...p, qrCodeImageUrl: val }))}
                          placeholder="https://i.ibb.co/... অথবা গ্যালারি থেকে আপলোড"
                          className="flex-1 min-w-0"
                          inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-ink font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">জমা প্রদানের নির্দেশনা</label>
                      <textarea
                        rows={2}
                        value={bankForm.instructions || ''}
                        onChange={(e) => setBankForm((p) => ({ ...p, instructions: e.target.value }))}
                        placeholder="ব্যাংক ডিপোজিট বা ফান্ড ট্রান্সফারের সময় নির্দেশনা..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsBankEditModalOpen(false)}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>অনুমোদনের জন্য সংরক্ষণ করুন</span>
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
