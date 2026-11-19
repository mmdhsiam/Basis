import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserPlus,
  Award,
  Building2,
  AlertCircle,
  Send,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole, AccountStatus } from '../../types';
import { toBengaliNumerals } from '../../utils/calculations';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { motion } from 'motion/react';
import {
  AnimatedNumber,
  PageTabTransition,
  SlidingTabPill,
  SpringIcon,
  SMOOTH_EASE,
  useViewportReplay,
} from '../common/MotionPrimitives';

const ViewportVoteBar: React.FC<{ pct: number }> = ({ pct }) => {
  const { ref, isInView, replayCount } = useViewportReplay(0.18);
  return (
    <div ref={ref} className="w-full sm:w-48 max-w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
      <motion.div
        key={replayCount}
        initial={{ width: '0%' }}
        animate={{ width: isInView ? `${Math.min(100, Math.max(0, pct))}%` : '0%' }}
        transition={{ duration: isInView ? 0.58 : 0.14, ease: SMOOTH_EASE }}
        className="bg-emerald-500 h-1.5 rounded-full"
      />
    </div>
  );
};

interface ModeratorPanelProps {
  onOpenReceipt: (txId: string) => void;
  setActiveTab: (tab: string) => void;
}

export const ModeratorPanel: React.FC<ModeratorPanelProps> = ({
  setActiveTab,
}) => {
  const {
    currentUser,
    isGuestMode,
    approvals,
    voteOnApproval,
    users,
    savings,
    eligibleModeratorsCount,
    config,
    updateConfig,
    complaints,
    updateComplaintStatus,
    approveUserAccount,
    integrateAndApproveUserAccount,
    rejectUserAccount,
    addDirectUser,
    updateUserProfile,
    updateUserDesignation,
    removeUser,
    executiveMembers,
    addExecutiveMember,
    removeExecutiveMember,
    triggerSuccess,
    triggerWarning,
    checkPendingRequestWarning,
    sendOverdueReminder,
    overdueReminders,
    overdueReminderMap,
  } = useApp();

  const [openVoteDropdown, setOpenVoteDropdown] = useState<
    Record<string, 'APPROVE' | 'REJECT' | null>
  >({});

  const [activeSubTab, setActiveSubTab] = useState<
    'APPROVALS' | 'PENDING_ACCOUNTS' | 'MEMBERS_ROLES' | 'OVERDUE' | 'COMPLAINTS'
  >('APPROVALS');

  // Editable Name, Amount, Month & Deadline per overdue member for OverdueReminderPopupModal
  const [reminderDrafts, setReminderDrafts] = useState<
    Record<string, { memberName: string; amount: string; monthLabel: string; deadlineText: string }>
  >({});

  const getReminderDraft = (memberId: string, fallbackName: string) => {
    if (reminderDrafts[memberId]) return reminderDrafts[memberId];
    const saved = overdueReminderMap[memberId];
    return {
      memberName: saved?.memberName || fallbackName,
      amount: String(saved?.amount ?? (config.defaultMonthlyAmount || 1500)),
      monthLabel: saved?.monthLabel || 'অক্টোবর ২০২৬',
      deadlineText: saved?.deadlineText || `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`,
    };
  };

  const updateReminderDraft = (
    memberId: string,
    fallbackName: string,
    patch: Partial<{ memberName: string; amount: string; monthLabel: string; deadlineText: string }>
  ) => {
    setReminderDrafts((prev) => ({
      ...prev,
      [memberId]: {
        ...getReminderDraft(memberId, fallbackName),
        ...patch,
      },
    }));
  };

  // Edit member name & ID & delete confirmation local state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState('');
  const [editingMemberIdVal, setEditingMemberIdVal] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRemoveExecId, setConfirmRemoveExecId] = useState<string | null>(null);
  const [confirmRemoveHolderIdx, setConfirmRemoveHolderIdx] = useState<number | null>(null);
  const [integrationSelection, setIntegrationSelection] = useState<Record<string, string>>({});

  // Add new person (Member / Moderator / App Moderator) state
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<UserRole>('MEMBER');
  const [newPersonTitle, setNewPersonTitle] = useState('');
  const [newPersonAvatar, setNewPersonAvatar] = useState('');

  // Add Executive Council Member state
  const [execName, setExecName] = useState('');
  const [execDesignation, setExecDesignation] = useState('');
  const [execPhone, setExecPhone] = useState('');
  const [execResp, setExecResp] = useState('');
  const [execAvatar, setExecAvatar] = useState('');

  // Add Joint Bank Account Holder state
  const [holderName, setHolderName] = useState('');
  const [holderRole, setHolderRole] = useState('');
  const [holderMemberId, setHolderMemberId] = useState('');
  const [holderPhone, setHolderPhone] = useState('');
  const [holderAvatar, setHolderAvatar] = useState('');

  // Restrict Guests and ordinary members
  if (!currentUser || isGuestMode || currentUser.role === 'MEMBER') {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl max-w-md mx-auto my-12 space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-ink">অননুমোদিত প্রবেশাধিকার</h3>
        <p className="text-xs text-slate-400">
          এই বিভাগটি শুধুমাত্র বেসিস ফাউন্ডেশনের অনুমোদিত মডারেটরদের জন্য সংরক্ষিত।
        </p>
      </div>
    );
  }

  // Pending approvals (including Savings, Profile Change, and Notice Edit)
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING' && a.requestType !== 'NEW_MEMBER');

  // Pending User Accounts awaiting moderator approval
  const pendingUsers = users.filter((u) => u.id !== '__guest__' && u.status === 'PENDING');

  // All real registered users (excluding unified Guest placeholder)
  const realUsers = users.filter((u) => u.id !== '__guest__' && u.memberId !== 'GUEST');

  // Overdue Members for current month
  const currentMonthKey = '2026-10';
  const currentMonthDeposits = savings.filter(
    (t) => t.savingsMonth === currentMonthKey && t.status === 'APPROVED'
  );
  const depositedIds = new Set(currentMonthDeposits.map((t) => t.memberId));
  const overdueMembers = users.filter(
    (u) => u.id !== '__guest__' && u.status === 'APPROVED' && !depositedIds.has(u.memberId)
  );

  // Existing moderator-added non-integrated approved members eligible for account integration
  const integratableMembers = users.filter(
    (u) =>
      u.id !== '__guest__' &&
      u.memberId !== 'GUEST' &&
      u.status === 'APPROVED' &&
      !u.id.startsWith('user-reg-') &&
      !u.isIntegratedAccount
  );

  const getFieldLabelBn = (field: string) => {
    switch (field) {
      case 'title':
        return 'শিরোনাম';
      case 'content':
        return 'বিস্তারিত বিবরণ';
      case 'description':
        return 'বিবরণ';
      case 'priority':
        return 'গুরুত্ব';
      case 'showInTicker':
        return 'শীর্ষ ঘোষণা স্ক্রলিং';
      case 'isPinned':
        return 'পিন স্ট্যাটাস';
      case 'name':
        return 'পূর্ণ নাম';
      case 'phone':
        return 'মোবাইল নম্বর';
      case 'email':
        return 'ইমেইল ঠিকানা';
      case 'address':
        return 'ঠিকানা';
      case 'avatarUrl':
        return 'প্রোফাইল ছবি';
      case 'nomineeName':
        return 'নমিনীর নাম';
      case 'nomineeRelation':
        return 'নমিনীর সম্পর্ক';
      case 'nomineePhone':
        return 'নমিনীর মোবাইল';
      case 'signatureType':
        return 'স্বাক্ষরের ধরন';
      case 'signatureImageUrl':
        return 'ডিজিটাল স্বাক্ষর ছবি';
      case 'nidFrontImageUrl':
        return 'এনআইডি সামনের ছবি';
      case 'nidBackImageUrl':
        return 'এনআইডি পেছনের ছবি';
      case 'role':
        return 'অ্যাকাউন্ট রোল';
      case 'status':
        return 'অ্যাকাউন্ট স্ট্যাটাস';
      case 'moderatorTitle':
      case 'designation':
        return 'পদবী / দায়িত্ব';
      case 'responsibilities':
        return 'দায়িত্বের বিবরণ';
      case 'amount':
        return 'টাকার পরিমাণ';
      case 'reason':
        return 'কারণ';
      case 'category':
        return 'খাত / বিভাগ';
      case 'expense':
        return 'ব্যয় রেকর্ড';
      case 'member':
        return 'সদস্য প্রোফাইল';
      case 'bankName':
        return 'ব্যাংকের নাম';
      case 'accountName':
        return 'একাউন্টের নাম';
      case 'accountNumber':
        return 'হিসাব নম্বর';
      case 'branchName':
        return 'শাখার নাম';
      case 'routingNumber':
        return 'রাউটিং নম্বর';
      case 'swiftCode':
        return 'সুইফট কোড';
      case 'bkashNumber':
        return 'বিকাশ নম্বর';
      case 'nagadNumber':
        return 'নগদ নম্বর';
      case 'rocketNumber':
        return 'রকেট নম্বর';
      case 'instructions':
        return 'জমা প্রদানের নির্দেশনা';
      case 'qrCodeImageUrl':
        return 'QR কোড লিংক';
      case 'googleSheetsUrl':
        return 'গুগল শিট লিংক';
      case 'jointBankAccountHolders':
        return 'যৌথ একাউন্ট হোল্ডার তালিকা';
      case 'dashboardBalanceDisplay':
        return 'ড্যাশবোর্ড ব্যালেন্স মোড';
      case 'organizationName':
        return 'প্রতিষ্ঠানের নাম';
      case 'aboutBannerBadge':
        return 'আমাদের সম্পর্কে ব্যাজ';
      case 'aboutBannerSubtitle':
        return 'আমাদের সম্পর্কে উপশিরোনাম';
      case 'aboutVisionText':
        return 'আমাদের ভিশন';
      case 'aboutMissionItems':
        return 'আমাদের মিশন তালিকা';
      case 'aboutCoreValues':
        return 'মূল আদর্শ ও মূল্যবোধ';
      case 'aboutGuarantees':
        return 'সুরক্ষা ও স্বচ্ছতার নিশ্চয়তা';
      case 'aboutJointAccountIntro':
        return 'যৌথ ব্যাংক হিসাব ভূমিকা';
      case 'aboutFooterNote':
        return 'প্রাতিষ্ঠানিক প্রত্যয়ন নোট';
      default:
        return field;
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold text-ink">মডারেটর নির্বাহী প্যানেল (Moderator Panel)</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              অনুমোদন অনুরোধ (জমা, প্রোফাইল ও নোটিশ এডিট), নতুন অ্যাকাউন্ট অনুমোদন, ফায়ারবেজ মডারেটর প্যানেল তথ্য ও অভিযোগ নিষ্পত্তি।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className="py-2 px-3.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 font-semibold text-xs transition-colors cursor-pointer"
            >
              মডারেটর-অনলি চ্যাট
            </button>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('APPROVALS')}
            className={`relative py-2 px-4 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'APPROVALS'
                ? 'text-white'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {activeSubTab === 'APPROVALS' && (
              <SlidingTabPill layoutId="mod-subtab-pill" className="bg-emerald-600 shadow-md" />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span>অনুমোদন ওয়ার্কফ্লো</span>
              {pendingApprovals.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {toBengaliNumerals(pendingApprovals.length)}
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('PENDING_ACCOUNTS')}
            className={`relative py-2 px-4 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'PENDING_ACCOUNTS'
                ? 'text-white'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {activeSubTab === 'PENDING_ACCOUNTS' && (
              <SlidingTabPill layoutId="mod-subtab-pill" className="bg-blue-600 shadow-md" />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>নতুন অ্যাকাউন্ট অনুমোদন</span>
              {pendingUsers.length > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {toBengaliNumerals(pendingUsers.length)}
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('MEMBERS_ROLES')}
            className={`relative py-2 px-4 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'MEMBERS_ROLES'
                ? 'text-white'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {activeSubTab === 'MEMBERS_ROLES' && (
              <SlidingTabPill layoutId="mod-subtab-pill" className="bg-emerald-600 shadow-md" />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              <span>সদস্য ও পদবি নিয়ন্ত্রণ ({toBengaliNumerals(realUsers.length)})</span>
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('OVERDUE')}
            className={`relative py-2 px-4 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'OVERDUE'
                ? 'text-white'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {activeSubTab === 'OVERDUE' && (
              <SlidingTabPill layoutId="mod-subtab-pill" className="bg-emerald-600 shadow-md" />
            )}
            <span className="relative z-10">
              বকেয়া সঞ্চয় ও রিমাইন্ডার ({toBengaliNumerals(overdueMembers.length)})
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('COMPLAINTS')}
            className={`relative py-2 px-4 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'COMPLAINTS'
                ? 'text-white'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {activeSubTab === 'COMPLAINTS' && (
              <SlidingTabPill layoutId="mod-subtab-pill" className="bg-emerald-600 shadow-md" />
            )}
            <span className="relative z-10">অভিযোগ পর্যবেক্ষণ</span>
          </button>
        </div>
      </div>

      <PageTabTransition tabKey={activeSubTab}>
      {/* SubTab 1: Approvals Workflow Engine (Savings, Profile Change, Notice Edit) */}
      {activeSubTab === 'APPROVALS' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-ink">২/৩ সিলিং অনুমোদন ও প্রত্যাখ্যান নীতি সক্রিয়:</strong>{' '}
              বর্তমানে অনুমোদিত মডারেটর সংখ্যা {toBengaliNumerals(eligibleModeratorsCount)} জন।
              যেকোনো অনুরোধ অনুমোদন অথবা প্রত্যাখ্যান উভয় ক্ষেত্রেই নূন্যতম{' '}
              <strong className="text-emerald-400 font-bold">
                {toBengaliNumerals(Math.max(1, Math.ceil((eligibleModeratorsCount * 2) / 3)))} জনের
              </strong>{' '}
              ভোট আবশ্যক।
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-ink text-sm">
              মুলতুবি অনুরোধসমূহ ({toBengaliNumerals(pendingApprovals.length)})
            </h3>

            {pendingApprovals.map((appr) => {
              const hasVoted =
                (appr.approvalVotes || []).includes(currentUser.id) ||
                (appr.rejectionVotes || []).includes(currentUser.id);

              const badgeMap: Record<string, string> = {
                SAVINGS_ENTRY: 'সঞ্চয় জমা',
                FINANCIAL_CORRECTION: 'লেনদেন রিভার্সাল',
                NEW_MEMBER: 'নতুন নিবন্ধন',
                MEMBER_DIRECT_ADD: 'নতুন সদস্য সংযোজন',
                MEMBER_REMOVE: 'সদস্য অপসারণ',
                PROFILE_CHANGE: 'প্রোফাইল সংশোধন',
                MODERATOR_APPOINTMENT: 'পদবী ও রোল পরিবর্তন',
                RULE_ADD: 'নতুন ধারা সংযোজন',
                RULE_CHANGE: 'গঠনতন্ত্র সংশোধন',
                NOTICE_ADD: 'নতুন নোটিশ',
                NOTICE_EDIT: 'নোটিশ সম্পাদনা',
                NOTICE_DELETE: 'নোটিশ বাতিল',
                EXECUTIVE_ADD: 'কার্যনির্বাহী সংযোজন',
                EXECUTIVE_EDIT: 'কার্যনির্বাহী সম্পাদনা',
                EXECUTIVE_DELETE: 'কার্যনির্বাহী অপসারণ',
                EXPENSE_ADD: 'নতুন ব্যয় সংযোজন',
                EXPENSE_DELETE: 'ব্যয় অপসারণ',
                BANK_CONFIG_CHANGE: 'ব্যাংক ও কনফিগ পরিবর্তন',
              };
              const badgeLabel = badgeMap[appr.requestType] || 'অনুমোদন প্রস্তাব';
              const isDeleteType =
                appr.requestType.endsWith('_DELETE') ||
                appr.requestType === 'MEMBER_REMOVE' ||
                appr.requestType === 'FINANCIAL_CORRECTION';

              return (
                <div
                  key={appr.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isDeleteType
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : appr.requestType.startsWith('NOTICE_')
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {badgeLabel}
                      </span>
                      <h4 className="font-bold text-ink text-sm sm:text-base">{appr.title}</h4>
                    </div>

                    <span className="text-xs text-slate-400">
                      তারিখ: {new Date(appr.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{appr.description}</p>

                  {/* Proposed Changes Diff Viewer (for NOTICE_EDIT and PROFILE_CHANGE) */}
                  {appr.proposedChanges && appr.proposedChanges.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="font-bold text-amber-300 text-[11px]">প্রস্তাবিত পরিবর্তনসমূহ:</div>
                      {appr.proposedChanges
                        .filter((ch) => ch.field !== 'plainPassword')
                        .map((ch, idx) => (
                        <div key={idx} className="space-y-0.5 border-t border-slate-900 pt-1.5 first:border-t-0 first:pt-0">
                          <span className="font-bold text-slate-400">{getFieldLabelBn(ch.field)}:</span>
                          <div className="text-rose-300/80 line-through text-[11px] whitespace-pre-line">
                            {String(ch.oldValue)}
                          </div>
                          <div className="text-emerald-300 font-bold text-[11px] whitespace-pre-line">
                            {String(ch.newValue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vote Progress Tracker & Individual Approve / Reject Voter Dropdowns */}
                  {(() => {
                    const approveVotes = appr.approvalVotes || [];
                    const rejectVotes = appr.rejectionVotes || [];
                    const activeDrop = openVoteDropdown[appr.id] || null;
                    const resolveVoterName = (vid: string) => {
                      const found = users.find((usr) => usr.id === vid);
                      return found ? `${found.name} (${found.memberId})` : vid;
                    };

                    return (
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-slate-400 font-bold">ভোট অগ্রগতি:</span>
                            <span className="text-emerald-400 font-bold">
                              <AnimatedNumber
                                value={approveVotes.length}
                                formatter={(v) => `${toBengaliNumerals(Math.round(v))} অনুমোদিত`}
                              />
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-rose-400 font-bold">
                              <AnimatedNumber
                                value={rejectVotes.length}
                                formatter={(v) => `${toBengaliNumerals(Math.round(v))} প্রত্যাখ্যাত`}
                              />
                            </span>
                            <span className="text-slate-500">/</span>
                            <span className="text-slate-300 font-bold">
                              প্রয়োজন:{' '}
                              <AnimatedNumber
                                value={appr.requiredApprovalCount}
                                formatter={(v) => `${toBengaliNumerals(Math.round(v))} ভোট`}
                              />
                            </span>
                          </div>
                          <ViewportVoteBar
                            pct={(approveVotes.length / Math.max(1, appr.requiredApprovalCount)) * 100}
                          />
                        </div>

                        <div className="flex items-start gap-2.5 flex-wrap">
                          {/* Approve button + individual voter dropdown */}
                          <div className="flex flex-col items-start gap-1">
                            <button
                              onClick={() => voteOnApproval(appr.id, 'APPROVE')}
                              disabled={hasVoted}
                              className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{hasVoted ? 'ভোট প্রদান সম্পন্ন' : 'অনুমোদন ভোট দিন'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenVoteDropdown((prev) => ({
                                  ...prev,
                                  [appr.id]: activeDrop === 'APPROVE' ? null : 'APPROVE',
                                }))
                              }
                              className="inline-flex items-center gap-1 px-1 text-[10.5px] font-normal text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                            >
                              <span>অনুমোদন ভোটদাতা ({toBengaliNumerals(approveVotes.length)})</span>
                              {activeDrop === 'APPROVE' ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            {activeDrop === 'APPROVE' && (
                              <div className="mt-0.5 p-2 rounded-xl bg-slate-950/90 border border-slate-800 text-[10.5px] font-normal text-slate-400 space-y-1 min-w-[160px] max-w-[240px]">
                                {approveVotes.length > 0 ? (
                                  approveVotes.map((vid) => (
                                    <div key={vid} className="flex items-center gap-1.5 text-slate-300/90">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                      <span className="truncate">{resolveVoterName(vid)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-500">এখনো কেউ অনুমোদন ভোট দেননি</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reject button + individual voter dropdown */}
                          <div className="flex flex-col items-start gap-1">
                            <button
                              onClick={() => voteOnApproval(appr.id, 'REJECT', 'মডারেটর কর্তৃক বাতিল')}
                              disabled={hasVoted}
                              className="py-1.5 px-3 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 disabled:opacity-40 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>প্রত্যাখ্যান</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenVoteDropdown((prev) => ({
                                  ...prev,
                                  [appr.id]: activeDrop === 'REJECT' ? null : 'REJECT',
                                }))
                              }
                              className="inline-flex items-center gap-1 px-1 text-[10.5px] font-normal text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                            >
                              <span>প্রত্যাখ্যান ভোটদাতা ({toBengaliNumerals(rejectVotes.length)})</span>
                              {activeDrop === 'REJECT' ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            {activeDrop === 'REJECT' && (
                              <div className="mt-0.5 p-2 rounded-xl bg-slate-950/90 border border-slate-800 text-[10.5px] font-normal text-slate-400 space-y-1 min-w-[160px] max-w-[240px]">
                                {rejectVotes.length > 0 ? (
                                  rejectVotes.map((vid) => (
                                    <div key={vid} className="flex items-center gap-1.5 text-slate-300/90">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                      <span className="truncate">{resolveVoterName(vid)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-500">এখনো কেউ প্রত্যাখ্যান ভোট দেননি</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {pendingApprovals.length === 0 && (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400">বর্তমানে কোনো মুলতুবি অনুমোদন অনুরোধ নেই।</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Pending User Accounts Awaiting Approval */}
      {activeSubTab === 'PENDING_ACCOUNTS' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-200">
            <UserCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-ink">নতুন সদস্য অ্যাকাউন্ট যাচাই ও অনুমোদন:</strong>{' '}
              ব্যবহারকারীরা যখন অ্যাপের "নতুন অ্যাকাউন্ট খুলুন" সেকশন থেকে রেজিস্ট্রেশন করেন, তখন তাদের অ্যাকাউন্ট এখানে জমা হয়।
              মডারেটরের অনুমোদনের পরই ব্যবহারকারী অ্যাপে সফলভাবে লগইন করতে পারবেন।
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-ink text-sm">
              অনুমোদনের অপেক্ষমাণ অ্যাকাউন্টসমূহ ({toBengaliNumerals(pendingUsers.length)})
            </h3>

            {pendingUsers.map((u) => {
              const uPhone10 = (u.phone || '').replace(/\D/g, '').slice(-10);
              const uEmailNorm = (u.email || '').trim().toLowerCase();
              const uNameNorm = (u.name || '').trim().toLowerCase();

              const autoMatchedMember = integratableMembers.find((m) => {
                const mPhone10 = (m.phone || '').replace(/\D/g, '').slice(-10);
                const mEmailNorm = (m.email || '').trim().toLowerCase();
                const mNameNorm = (m.name || '').trim().toLowerCase();
                return (
                  (uPhone10.length === 10 && mPhone10 === uPhone10) ||
                  (uEmailNorm && mEmailNorm === uEmailNorm) ||
                  (uNameNorm && mNameNorm === uNameNorm)
                );
              });

              const selectedTargetId =
                integrationSelection[u.id] !== undefined
                  ? integrationSelection[u.id]
                  : autoMatchedMember?.id || '';

              return (
                <div
                  key={u.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={u.avatarUrl} name={u.name} size="lg" ringColor="ring-amber-500" />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-ink font-bold text-sm">{u.name}</strong>
                          <span className="font-mono text-emerald-400 font-bold">({u.memberId})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            অপেক্ষমাণ
                          </span>
                        </div>
                        <p className="text-slate-300 break-words">
                          মোবাইল: <span className="font-mono">{u.phone}</span> • ইমেইল: {u.email}
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          লিঙ্গ: {u.gender === 'MALE' ? 'পুরুষ' : u.gender === 'FEMALE' ? 'নারী' : 'অন্যান্য'} • নমিনী:{' '}
                          {u.nomineeName || 'N/A'} ({u.nomineeRelation || ''}) • ঠিকানা: {u.address || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => approveUserAccount(u.id)}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>নতুন হিসেবে অনুমোদন</span>
                      </button>
                      <button
                        onClick={() => rejectUserAccount(u.id)}
                        className="py-2 px-3 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 font-bold text-xs border border-rose-800 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>বাতিল</span>
                      </button>
                    </div>
                  </div>

                  {/* Requirement 3: Integrate with Existing Moderator-Added Member Profile */}
                  {integratableMembers.length > 0 && (
                    <div className="pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/70">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-amber-300 text-[11px]">
                            বিদ্যমান সদস্য প্রোফাইলের সাথে ইন্টিগ্রেট করুন:
                          </span>
                          {autoMatchedMember && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              সম্ভাব্য মিল: {autoMatchedMember.name} ({autoMatchedMember.memberId})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          পূর্বে মডারেটর কর্তৃক যুক্ত করা সদস্য হলে তার বিদ্যমান আইডি ও জমার হিসাব অক্ষুণ্ণ রেখে এই একাউন্ট যুক্ত করুন।
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        <select
                          value={selectedTargetId}
                          onChange={(e) =>
                            setIntegrationSelection((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          className="bg-slate-900 border border-slate-700 text-ink font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">-- বিদ্যমান সদস্য নির্বাচন করুন --</option>
                          {integratableMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.memberId}) - {m.phone}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!selectedTargetId}
                          onClick={() => integrateAndApproveUserAccount(u.id, selectedTargetId)}
                          className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>ইন্টিগ্রেট ও অনুমোদন</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {pendingUsers.length === 0 && (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400">বর্তমানে কোনো অপেক্ষমাণ অ্যাকাউন্ট নেই।</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 3: Complete Add & Remove Access for All People & Roles (Point 14) */}
      {activeSubTab === 'MEMBERS_ROLES' && (
        <div className="space-y-5 text-xs">
          {/* 1. Add New Member / Moderator / App Moderator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-ink text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <span>নতুন সদস্য / মডারেটর যুক্ত করুন</span>
                </h4>
                <p className="text-slate-400 mt-0.5">
                  মডারেটর প্যানেল থেকে সরাসরি সাধারণ সদস্য, মডারেটর বা অ্যাপ মডারেটর যুক্ত করুন।
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const ok = addDirectUser({
                  name: newPersonName.trim(),
                  phone: newPersonPhone.trim(),
                  email: newPersonEmail.trim(),
                  role: newPersonRole,
                  moderatorTitle: newPersonTitle.trim() || undefined,
                  avatarUrl: extractDirectImageUrl(newPersonAvatar) || undefined,
                });
                if (ok) {
                  setNewPersonName('');
                  setNewPersonPhone('');
                  setNewPersonEmail('');
                  setNewPersonRole('MEMBER');
                  setNewPersonTitle('');
                  setNewPersonAvatar('');
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <input
                type="text"
                placeholder="পূর্ণ নাম *"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                required
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-ink font-bold"
              />
              <input
                type="tel"
                placeholder="মোবাইল নম্বর (যেমন: 017XXXXXXXX) *"
                value={newPersonPhone}
                onChange={(e) => setNewPersonPhone(e.target.value)}
                required
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-ink font-mono"
              />
              <input
                type="email"
                placeholder="ইমেইল ঠিকানা (স্বতন্ত্র ইমেইল)"
                value={newPersonEmail}
                onChange={(e) => setNewPersonEmail(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-ink"
              />
              <select
                value={newPersonRole}
                onChange={(e) => setNewPersonRole(e.target.value as UserRole)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-bold cursor-pointer"
              >
                <option value="MEMBER">সাধারণ সদস্য (MEMBER)</option>
                <option value="MODERATOR">মডারেটর (MODERATOR)</option>
                {currentUser.role === 'APP_MODERATOR' && (
                  <option value="APP_MODERATOR">অ্যাপ মডারেটর (APP_MODERATOR)</option>
                )}
              </select>
              <input
                type="text"
                placeholder="দাপ্তরিক পদবি (যেমন: কোষাধ্যক্ষ / সদস্য)"
                value={newPersonTitle}
                onChange={(e) => setNewPersonTitle(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-bold"
              />
              <div className="flex items-start gap-2">
                <Avatar src={newPersonAvatar} name={newPersonName || 'নতুন'} size="sm" />
                <HostedImageInput
                  value={newPersonAvatar}
                  onChange={setNewPersonAvatar}
                  placeholder="প্রোফাইল ছবির হোস্টেড লিংক (ঐচ্ছিক)"
                  className="flex-1 min-w-0"
                  inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-ink font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
                >
                  যুক্ত করুন
                </button>
              </div>
            </form>
          </div>

          {/* 2. Existing Members, Moderators & App Moderators List (Edit Role/Title & Remove) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-ink text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span>সকল সদস্য ও মডারেটর তালিকা (রোল পরিবর্তন ও অপসারণ)</span>
                </h4>
                <p className="text-slate-400 mt-0.5">
                  সদস্য, মডারেটর ও অ্যাপ মডারেটরদের নাম, পদবি, রোল ও স্ট্যাটাস নিয়ন্ত্রণ বা অপসারণ করুন।
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-800 text-slate-300">
                মোট: {toBengaliNumerals(realUsers.length)} জন
              </span>
            </div>

            <div className="space-y-2.5 pt-2">
              {realUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={u.avatarUrl}
                      name={u.name}
                      size="md"
                      expandable
                      ringColor={
                        u.role === 'APP_MODERATOR'
                          ? 'ring-amber-500'
                          : u.role === 'MODERATOR'
                          ? 'ring-blue-500'
                          : 'ring-slate-700'
                      }
                    />
                    <div className="min-w-0">
                      {editingMemberId === u.id ? (
                        <div className="flex flex-col gap-1.5 my-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-700/80">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <label className="text-[10px] text-slate-400 font-bold w-12">নাম:</label>
                            <input
                              type="text"
                              value={editingMemberName}
                              onChange={(e) => setEditingMemberName(e.target.value)}
                              placeholder="সদস্যের পুরো নাম"
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-ink font-bold w-44 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <label className="text-[10px] text-slate-400 font-bold w-12">সদস্য আইডি:</label>
                            <input
                              type="text"
                              value={editingMemberIdVal}
                              onChange={(e) => setEditingMemberIdVal(e.target.value)}
                              placeholder="যেমন: BF-001"
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono font-bold w-44 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const cleanName = editingMemberName.trim();
                                const cleanMemberId = editingMemberIdVal.trim().toUpperCase();
                                if (!cleanName || !cleanMemberId) {
                                  triggerWarning('অসম্পূর্ণ তথ্য', 'সদস্যের নাম ও সদস্য আইডি উভয়ই প্রদান করতে হবে।');
                                  return;
                                }
                                const idDuplicate = users.some(
                                  (other) => other.id !== u.id && other.memberId.toUpperCase() === cleanMemberId
                                );
                                if (idDuplicate) {
                                  triggerWarning('আইডি ইতিমধ্যে ব্যবহৃত', 'এই সদস্য আইডি ইতিমধ্যে অন্য একজন সদস্যের জন্য সংরক্ষিত।');
                                  return;
                                }
                                const ok = updateUserProfile(u.id, { name: cleanName, memberId: cleanMemberId });
                                if (ok) {
                                  setEditingMemberId(null);
                                }
                              }}
                              className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              সংরক্ষণ
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemberId(null)}
                              className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer transition-colors"
                            >
                              বাতিল
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-ink font-bold text-sm truncate">{u.name}</strong>
                          <span className="font-mono text-emerald-400 text-xs font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            {u.memberId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                checkPendingRequestWarning(
                                  { requestTypes: ['PROFILE_CHANGE'], targetRecordId: u.id },
                                  'সদস্যের নাম ও আইডি পরিবর্তন'
                                )
                              ) {
                                return;
                              }
                              setEditingMemberId(u.id);
                              setEditingMemberName(u.name);
                              setEditingMemberIdVal(u.memberId);
                            }}
                            title="সদস্যের নাম ও আইডি এডিট করুন"
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded-md bg-amber-950/30 border border-amber-800/40 text-[11px] font-medium cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>এডিট</span>
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 truncate">
                        {u.phone} • যোগদানের তারিখ: {u.joinDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-slate-400 font-bold">পদবি:</label>
                      <input
                        key={`${u.id}-${u.role}-${u.moderatorTitle || ''}`}
                        type="text"
                        placeholder="যেমন: সভাপতি / সম্পাদক"
                        defaultValue={u.moderatorTitle || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (u.moderatorTitle || '')) {
                            const ok = updateUserDesignation(u.id, e.target.value.trim(), u.role);
                            if (!ok) {
                              e.target.value = u.moderatorTitle || '';
                            }
                          }
                        }}
                        className="bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold rounded-xl px-2.5 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-slate-400 font-bold">রোল:</label>
                      {currentUser.role !== 'APP_MODERATOR' && u.role === 'APP_MODERATOR' ? (
                        <span className="bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold rounded-xl px-2.5 py-1.5">
                          অ্যাপ মডারেটর
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const newRole = e.target.value as UserRole;
                            if (newRole === 'APP_MODERATOR' && currentUser.role !== 'APP_MODERATOR') {
                              return;
                            }
                            updateUserProfile(u.id, {
                              role: newRole,
                              isPublicModerator: newRole !== 'MEMBER',
                            });
                          }}
                          disabled={u.id === currentUser.id}
                          className="bg-slate-900 border border-slate-700 text-xs text-ink font-bold rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60 cursor-pointer"
                        >
                          <option value="MEMBER">সাধারণ সদস্য</option>
                          <option value="MODERATOR">মডারেটর</option>
                          {currentUser.role === 'APP_MODERATOR' && (
                            <option value="APP_MODERATOR">অ্যাপ মডারেটর</option>
                          )}
                        </select>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-slate-400 font-bold">স্ট্যাটাস:</label>
                      <select
                        value={u.status}
                        onChange={(e) => {
                          updateUserProfile(u.id, { status: e.target.value as AccountStatus });
                        }}
                        disabled={u.id === currentUser.id}
                        className="bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-bold rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60 cursor-pointer"
                      >
                        <option value="APPROVED">অনুমোদিত</option>
                        <option value="PENDING">অপেক্ষমান</option>
                        <option value="SUSPENDED">স্থগিত</option>
                      </select>
                    </div>

                    {u.id !== currentUser.id && (
                      confirmRemoveId === u.id ? (
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-rose-950/80 border border-rose-800">
                          <button
                            type="button"
                            onClick={() => {
                              const ok = removeUser(u.id);
                              if (ok) setConfirmRemoveId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer transition-colors"
                            title="মডারেটর প্যানেলে ২/৩ অনুমোদনের জন্য প্রস্তাব জমা হবে"
                          >
                            অপসারণ প্রস্তাব পাঠান
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer transition-colors"
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
                                { requestTypes: ['PROFILE_CHANGE'], targetRecordId: u.id },
                                'সদস্য অপসারণ'
                              )
                            ) {
                              return;
                            }
                            setConfirmRemoveId(u.id);
                          }}
                          title="সদস্য অপসারণের জন্য ২/৩ অনুমোদন প্রস্তাব দাখিল করুন"
                          className="p-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-400 border border-rose-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Executive Council (কার্যনির্বাহী পর্ষদ) Add & Remove */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-ink text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>কার্যনির্বাহী পর্ষদ সদস্য সংযোজন ও অপসারণ</span>
                </h4>
                <p className="text-slate-400 mt-0.5">
                  বিদ্যমান সদস্য তালিকা থেকে সিলেক্ট করে অথবা নতুন তথ্য দিয়ে কার্যনির্বাহী পর্ষদে যুক্ত ও রিমুভ করুন।
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-800 text-amber-300">
                মোট: {toBengaliNumerals(executiveMembers.length)} জন
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">সদস্য থেকে দ্রুত অটো-ফিল:</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const found = realUsers.find((u) => u.id === e.target.value);
                  if (found) {
                    setExecName(found.name);
                    setExecDesignation(found.moderatorTitle || 'কার্যনির্বাহী সদস্য');
                    setExecPhone(found.phone);
                    setExecAvatar(found.avatarUrl || '');
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-ink font-bold cursor-pointer"
              >
                <option value="">— সদস্য নির্বাচন করুন —</option>
                {realUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.memberId})
                  </option>
                ))}
              </select>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!execName.trim() || !execDesignation.trim()) {
                  triggerWarning('অসম্পূর্ণ তথ্য', 'কার্যনির্বাহী সদস্যের নাম ও পদবি প্রদান করুন।');
                  return;
                }
                const ok = addExecutiveMember({
                  name: execName.trim(),
                  designation: execDesignation.trim(),
                  phone: execPhone.trim() || '+8801700000000',
                  responsibilities: execResp.trim() || 'ফাউন্ডেশনের সার্বিক তত্ত্বাবধান ও নীতি নির্ধারণ।',
                  avatarUrl: extractDirectImageUrl(execAvatar) || undefined,
                  order: executiveMembers.length + 1,
                });
                if (ok) {
                  setExecName('');
                  setExecDesignation('');
                  setExecPhone('');
                  setExecResp('');
                  setExecAvatar('');
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <input
                type="text"
                placeholder="সদস্যের নাম *"
                value={execName}
                onChange={(e) => setExecName(e.target.value)}
                required
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-bold"
              />
              <input
                type="text"
                placeholder="পর্ষদ পদবি (যেমন: সভাপতি / কোষাধ্যক্ষ) *"
                value={execDesignation}
                onChange={(e) => setExecDesignation(e.target.value)}
                required
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
              />
              <input
                type="tel"
                placeholder="মোবাইল নম্বর"
                value={execPhone}
                onChange={(e) => setExecPhone(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono"
              />
              <input
                type="text"
                placeholder="দায়িত্বসমূহ"
                value={execResp}
                onChange={(e) => setExecResp(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink sm:col-span-2"
              />
              <div className="flex items-start gap-2">
                <Avatar src={execAvatar} name={execName || 'পর্ষদ'} size="sm" />
                <HostedImageInput
                  value={execAvatar}
                  onChange={setExecAvatar}
                  placeholder="ছবির হোস্টেড লিংক (ঐচ্ছিক)"
                  className="flex-1 min-w-0"
                  inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
                >
                  যুক্ত করুন
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {executiveMembers.map((em) => (
                <div
                  key={em.id}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={em.avatarUrl} name={em.name} size="sm" expandable ringColor="ring-amber-500/60" />
                    <div className="min-w-0">
                      <strong className="text-ink font-bold text-xs block truncate">{em.name}</strong>
                      <span className="text-[11px] text-amber-400 font-bold block truncate">{em.designation}</span>
                    </div>
                  </div>
                  {confirmRemoveExecId === em.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const ok = removeExecutiveMember(em.id);
                            if (ok) setConfirmRemoveExecId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          মুছুন
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveExecId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
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
                              { requestTypes: ['EXECUTIVE_EDIT', 'EXECUTIVE_DELETE'], targetRecordId: em.id },
                              'কার্যনির্বাহী সদস্য অপসারণ'
                            )
                          ) {
                            return;
                          }
                          setConfirmRemoveExecId(em.id);
                        }}
                        title="পর্ষদ থেকে অপসারণ করুন"
                        className="p-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-400 border border-rose-800 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Joint Bank Account Holders (যৌথ ব্যাংক হিসাব পরিচালনাকারী) Add & Remove */}
          {(() => {
            const currentHolders = Array.isArray(config.jointBankAccountHolders)
              ? config.jointBankAccountHolders
              : [];

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-ink text-base flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      <span>যৌথ ব্যাংক একাউন্ট হোল্ডার সংযোজন ও অপসারণ</span>
                    </h4>
                    <p className="text-slate-400 mt-0.5">
                      যৌথ ব্যাংক হিসাব পরিচালনাকারী স্বাক্ষরকারী মডারেটর/সদস্য যুক্ত বা অপসারণ করুন।
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-800 text-emerald-400">
                    মোট: {toBengaliNumerals(currentHolders.length)} জন
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">সদস্য থেকে দ্রুত অটো-ফিল:</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const found = realUsers.find((u) => u.id === e.target.value);
                      if (found) {
                        setHolderName(found.name);
                        setHolderRole(found.moderatorTitle || 'যৌথ একাউন্ট স্বাক্ষরকারী');
                        setHolderMemberId(found.memberId);
                        setHolderPhone(found.phone);
                        setHolderAvatar(found.avatarUrl || '');
                      }
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-ink font-bold cursor-pointer"
                  >
                    <option value="">— সদস্য নির্বাচন করুন —</option>
                    {realUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.memberId})
                      </option>
                    ))}
                  </select>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!holderName.trim()) {
                      triggerWarning('অসম্পূর্ণ তথ্য', 'একাউন্ট হোল্ডারের নাম প্রদান করুন।');
                      return;
                    }
                    const nextEntry = {
                      name: holderName.trim(),
                      role: holderRole.trim() || `একাউন্ট হোল্ডার ${toBengaliNumerals(currentHolders.length + 1)}`,
                      memberId: holderMemberId.trim() || `BF-00${currentHolders.length + 1}`,
                      phone: holderPhone.trim() || '+8801700000000',
                      avatarUrl: extractDirectImageUrl(holderAvatar) || undefined,
                    };
                    updateConfig({
                      jointBankAccountHolders: [...currentHolders, nextEntry],
                    });
                    triggerSuccess(`"${nextEntry.name}" যৌথ ব্যাংক একাউন্ট হোল্ডার হিসেবে যুক্ত হয়েছে!`);
                    setHolderName('');
                    setHolderRole('');
                    setHolderMemberId('');
                    setHolderPhone('');
                    setHolderAvatar('');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                >
                  <input
                    type="text"
                    placeholder="হোল্ডারের নাম *"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-bold"
                  />
                  <input
                    type="text"
                    placeholder="দায়িত্ব / পদবি"
                    value={holderRole}
                    onChange={(e) => setHolderRole(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold"
                  />
                  <input
                    type="text"
                    placeholder="সদস্য আইডি (যেমন: BF-001)"
                    value={holderMemberId}
                    onChange={(e) => setHolderMemberId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono"
                  />
                  <input
                    type="tel"
                    placeholder="মোবাইল নম্বর"
                    value={holderPhone}
                    onChange={(e) => setHolderPhone(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono"
                  />
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <Avatar src={holderAvatar} name={holderName || 'হোল্ডার'} size="sm" />
                    <HostedImageInput
                      value={holderAvatar}
                      onChange={setHolderAvatar}
                      placeholder="ছবির হোস্টেড লিংক (ঐচ্ছিক)"
                      className="flex-1 min-w-0"
                      inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
                    >
                      হোল্ডার যুক্ত করুন
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {currentHolders.map((raw, idx) => {
                    const h =
                      typeof raw === 'string'
                        ? { name: raw, role: `স্বাক্ষরকারী #${toBengaliNumerals(idx + 1)}`, memberId: '', phone: '', avatarUrl: undefined }
                        : raw;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar src={h.avatarUrl} name={h.name} size="sm" expandable ringColor="ring-emerald-500/60" />
                          <div className="min-w-0">
                            <strong className="text-ink font-bold text-xs block truncate">{h.name}</strong>
                            <span className="text-[10.5px] text-emerald-400 font-bold block truncate">
                              {h.role} {h.memberId ? `(${h.memberId})` : ''}
                            </span>
                          </div>
                        </div>
                        {confirmRemoveHolderIdx === idx ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                                onClick={() => {
                                  const updated = currentHolders.filter((_, i) => i !== idx);
                                  updateConfig({ jointBankAccountHolders: updated });
                                  triggerSuccess(`"${h.name}" যৌথ ব্যাংক একাউন্ট হোল্ডার তালিকা থেকে অপসারণ করা হয়েছে!`);
                                  setConfirmRemoveHolderIdx(null);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                মুছুন
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveHolderIdx(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                              >
                                না
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveHolderIdx(idx)}
                              title="একাউন্ট হোল্ডার অপসারণ করুন"
                              className="p-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-400 border border-rose-800 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {currentHolders.length === 0 && (
                      <div className="col-span-full text-center py-5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
                        কোনো যৌথ ব্যাংক একাউন্ট হোল্ডার তালিকাভুক্ত নেই।
                      </div>
                    )}
                  </div>
                </div>
            );
          })()}
        </div>
      )}

      {/* SubTab 4: Overdue List & Custom Popup Reminder Dispatch */}
      {activeSubTab === 'OVERDUE' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-ink">অফিসিয়াল বকেয়া পপআপ রিমাইন্ডার সক্রিয়করণ:</strong>{' '}
              সদস্যের <strong>নাম</strong> ও <strong>টাকার পরিমাণ</strong> নির্ধারণ করে <strong>"তাগিদ পাঠান"</strong> বাটনে ক্লিক করলে উক্ত সদস্য যতবার অ্যাপে প্রবেশ করবেন ততবার তার প্রোফাইল ছবি, নাম ও টাকার পরিমাণসহ অফিসিয়াল পপআপ কার্ড প্রদর্শিত হবে। সদস্য টাকা জমা করলেই রিমাইন্ডারটি স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে।
            </div>
          </div>

          <div className="space-y-3">
            {overdueMembers.map((m) => {
              const isReminded = overdueReminders.includes(m.memberId);
              const draft = getReminderDraft(m.memberId, m.name);

              return (
                <div
                  key={m.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={m.avatarUrl} name={m.name} size="md" expandable />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-ink font-bold text-sm">{m.name}</strong>
                          <span className="font-mono text-emerald-400 font-bold">({m.memberId})</span>
                          {isReminded && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                              পপআপ রিমাইন্ডার সক্রিয়
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          মোবাইল: {m.phone} • নির্ধারিত মাসিক জমা: ৳
                          <AnimatedNumber
                            value={Number(draft.amount) || config.defaultMonthlyAmount || 1500}
                            formatter={(v) => toBengaliNumerals(Math.round(v))}
                          />
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        sendOverdueReminder(m.memberId, {
                          memberName: draft.memberName.trim() || m.name,
                          amount: Math.max(1, Number(draft.amount) || config.defaultMonthlyAmount || 1500),
                          monthKey: currentMonthKey,
                          monthLabel: draft.monthLabel.trim() || 'অক্টোবর ২০২৬',
                          deadlineText:
                            draft.deadlineText.trim() ||
                            `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`,
                        })
                      }
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                        isReminded
                          ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isReminded ? 'তথ্য আপডেট ও পুনরায় পাঠান' : 'তাগিদ পাঠান'}</span>
                    </button>
                  </div>

                  {/* Editable Name, Amount, Month & Deadline Inputs for Overdue Popup Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400">
                        পপআপ কার্ডে প্রদর্শিত নাম:
                      </label>
                      <input
                        type="text"
                        value={draft.memberName}
                        onChange={(e) =>
                          updateReminderDraft(m.memberId, m.name, { memberName: e.target.value })
                        }
                        placeholder="সদস্যের নাম"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400">
                        টাকার পরিমাণ (৳):
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={draft.amount}
                        onChange={(e) =>
                          updateReminderDraft(m.memberId, m.name, { amount: e.target.value })
                        }
                        placeholder="১৫০০"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400">
                        বকেয়া মাসের নাম:
                      </label>
                      <input
                        type="text"
                        value={draft.monthLabel}
                        onChange={(e) =>
                          updateReminderDraft(m.memberId, m.name, { monthLabel: e.target.value })
                        }
                        placeholder="অক্টোবর ২০২৬"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400">
                        জমার শেষ তারিখ:
                      </label>
                      <input
                        type="text"
                        value={draft.deadlineText}
                        onChange={(e) =>
                          updateReminderDraft(m.memberId, m.name, { deadlineText: e.target.value })
                        }
                        placeholder="প্রতি মাসের ১০"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {overdueMembers.length === 0 && (
              <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
                চলতি মাসে কোনো সদস্যের সঞ্চয় বকেয়া নেই।
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 5: Complaints Resolution */}
      {activeSubTab === 'COMPLAINTS' && (
        <div className="space-y-3">
          <h3 className="font-bold text-ink text-sm">সদস্য অভিযোগ ও প্রতিকার ট্র্যাকিং</h3>
          <div className="space-y-3">
            {complaints.map((comp) => (
              <div
                key={comp.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink text-sm">{comp.title}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      comp.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : comp.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {comp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{comp.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <span>দাখিলকারী: {comp.submitterName}</span>
                  <div className="flex items-center gap-2">
                    {comp.status !== 'RESOLVED' && (
                      <button
                        onClick={() =>
                          updateComplaintStatus(comp.id, 'RESOLVED', 'সমস্যার সন্তোষজনক সমাধান করা হয়েছে।')
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                      >
                        সমাধান নিশ্চিত করুন
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </PageTabTransition>
    </div>
  );
};
