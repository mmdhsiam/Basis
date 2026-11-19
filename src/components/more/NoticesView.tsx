import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  PlusCircle,
  Pin,
  User,
  ShieldCheck,
  Clock,
  Megaphone,
  Edit3,
  Trash2,
  Hourglass,
  CheckCircle2,
  XCircle,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NoticeItem, UserNotification } from '../../types';
import { formatDateTimeBengali, toBengaliNumerals } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { StaggerList, StaggerItem, SpringIcon, SlidingTabPill, SMOOTH_EASE } from '../common/MotionPrimitives';

export const NoticesView: React.FC = () => {
  const {
    notices,
    userNotifications,
    users,
    approvals,
    currentUser,
    isGuestMode,
    setIsAuthModalOpen,
    addNotice,
    proposeNoticeEdit,
    deleteNotice,
    markNoticesSeen,
    markNotificationRead,
    checkPendingRequestWarning,
  } = useApp();

  const getNoticeAuthorDesignation = (notice: NoticeItem): string => {
    const matchedAuthor = users.find(
      (u) => u.id !== '__guest__' && u.name.trim() === notice.authorName.trim()
    );
    if (matchedAuthor?.moderatorTitle?.trim()) {
      return matchedAuthor.moderatorTitle.trim();
    }
    switch (notice.authorRole) {
      case 'APP_MODERATOR':
        return 'অ্যাপ মডারেটর';
      case 'MODERATOR':
        return 'মডারেটর';
      case 'MEMBER':
        return 'সাধারণ সদস্য';
      default:
        return notice.authorRole;
    }
  };
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<NoticeItem['priority']>('NORMAL');
  const [showInTicker, setShowInTicker] = useState<boolean>(true);

  // Notice Edit Modal state (Point 17: Any moderator can propose an edit; goes live after approval)
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<NoticeItem['priority']>('NORMAL');
  const [editShowInTicker, setEditShowInTicker] = useState<boolean>(false);

  const [activeSection, setActiveSection] = useState<'OFFICIAL' | 'PERSONAL'>('OFFICIAL');

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  // Reset to Official tab whenever the header notification bell icon is clicked
  useEffect(() => {
    const handleResetOfficial = () => {
      setActiveSection('OFFICIAL');
    };
    window.addEventListener('notices-reset-official', handleResetOfficial);
    return () => window.removeEventListener('notices-reset-official', handleResetOfficial);
  }, []);

  // Sort official notices strictly by Date and Time descending (Newest First)
  const sortedNotices = useMemo(() => {
    return [...notices].sort(
      (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
    );
  }, [notices]);

  // Personal notifications (deposit approvals, rejections, workflow approvals, personal notices) sorted strictly newest first
  const personalNotifications = useMemo(() => {
    if (isGuestMode) return [];
    return userNotifications
      .filter((n) => n.userId === currentUser.memberId || n.userId === currentUser.id)
      .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  }, [userNotifications, isGuestMode, currentUser.memberId, currentUser.id]);

  // Permanently clear unseen notice badges whenever Notice Board is viewed (Point 9)
  useEffect(() => {
    markNoticesSeen();
  }, [notices.length, personalNotifications.length]);

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const ok = addNotice({
      title: title.trim(),
      content: content.trim(),
      priority,
      isPinned: priority === 'HIGH' || priority === 'URGENT',
      showInTicker,
    });

    if (ok) {
      setShowAddModal(false);
      setTitle('');
      setContent('');
      setShowInTicker(true);
    }
  };

  const handleOpenEditModal = (notice: NoticeItem) => {
    if (
      checkPendingRequestWarning(
        { requestTypes: ['NOTICE_EDIT', 'NOTICE_DELETE'], targetRecordId: notice.id },
        `নোটিশ সম্পাদনা (${notice.title})`
      )
    ) {
      return;
    }
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditPriority(notice.priority);
    setEditShowInTicker(Boolean(notice.showInTicker));
  };

  const handleSubmitNoticeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice || !editTitle.trim() || !editContent.trim()) return;

    const ok = proposeNoticeEdit(editingNotice.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
      priority: editPriority,
      isPinned: editPriority === 'HIGH' || editPriority === 'URGENT',
      showInTicker: editShowInTicker,
    });

    if (ok) {
      setEditingNotice(null);
    }
  };

  return (
    <div className="space-y-2.5 pb-16">
      {/* Compact Header + Inline Action/Tab Row */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm space-y-2.5">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-ink flex items-center gap-2">
            <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <SpringIcon activeKey={notices.length}>
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 icon-motion" />
              </SpringIcon>
            </span>
            <span className="bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600 dark:from-amber-300 dark:via-white dark:to-emerald-300 bg-clip-text text-transparent">
              অফিসিয়াল নোটিশ বোর্ড ও ঘোষণা
            </span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 max-w-2xl leading-snug">
            বেসিস ফাউন্ডেশনের কার্যনির্বাহী পরিষদ কর্তৃক প্রকাশিত সাধারণ নোটিশ, সঞ্চয় নির্দেশনা ও জরুরি বিজ্ঞপ্তি।
          </p>
        </div>

        {/* Inline 3-Button Row: Official, Personal, and Moderator-only Publish Notice */}
        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap w-full">
          <div className="flex items-center gap-0.5 sm:gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl p-0.5 sm:p-1 flex-1 sm:flex-initial min-w-0">
            {[
              { id: 'OFFICIAL' as const, label: 'অফিশিয়াল', count: sortedNotices.length },
              { id: 'PERSONAL' as const, label: 'ব্যাক্তিগত', count: personalNotifications.length },
            ].map((tab) => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`relative flex-1 sm:flex-initial py-1.5 sm:py-2 px-1.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-colors flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap min-w-0 ${
                    isActive ? 'text-white' : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  {isActive && (
                    <SlidingTabPill
                      layoutId="notices-section-pill"
                      className={
                        tab.id === 'OFFICIAL'
                          ? 'bg-emerald-600 shadow-md'
                          : 'bg-amber-600 shadow-md'
                      }
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  <span
                    className={`relative z-10 px-1 sm:px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {toBengaliNumerals(tab.count)}
                  </span>
                </button>
              );
            })}
          </div>

          {isModeratorOrAppMod && (
            <motion.button
              type="button"
              whileHover={{ y: -1.5, scale: 1.01 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowAddModal(true)}
              className="py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 sm:ml-auto whitespace-nowrap shadow-sm"
            >
              <SpringIcon>
                <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </SpringIcon>
              <span>নতুন নোটিশ প্রকাশ</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Notices / Personal Notifications List */}
      {activeSection === 'OFFICIAL' ? (
      sortedNotices.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-xs text-slate-400">
          বর্তমানে কোনো অফিসিয়াল নোটিশ নেই।
        </div>
      ) : (
      <StaggerList className="space-y-4">
        {sortedNotices.map((notice) => {
          const hasPendingEdit = approvals.some(
            (a) =>
              (a.requestType === 'NOTICE_EDIT' || a.requestType === 'NOTICE_DELETE') &&
              a.targetRecordId === notice.id &&
              a.status === 'PENDING'
          );

          return (
            <StaggerItem key={notice.id} hoverLift>
            <div
              className={`p-5 sm:p-6 rounded-3xl border transition-all duration-200 group ${
                notice.isPinned
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-amber-500/50 hover:border-amber-400 shadow-lg hover:shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/40 shadow-sm hover:shadow-emerald-500/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.isPinned && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <Pin className="w-3 h-3 text-amber-400" />
                        <span>পিনকৃত</span>
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg ${
                        notice.priority === 'HIGH' || notice.priority === 'URGENT'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {notice.priority === 'HIGH' || notice.priority === 'URGENT' ? 'জরুরি বিজ্ঞপ্তি' : 'সাধারণ নোটিশ'}
                    </span>
                    {notice.showInTicker && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Megaphone className="w-3 h-3 text-emerald-400" />
                        <span>শীর্ষ ঘোষণায় প্রদর্শিত</span>
                      </span>
                    )}
                    {hasPendingEdit && (
                      <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1">
                        <Hourglass className="w-3 h-3 text-purple-400" />
                        <span>সংশোধন অনুমোদনাধীন</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-ink group-hover:text-amber-300 transition-colors text-base sm:text-lg">
                    {notice.title}
                  </h3>
                </div>

                {/* Date/Time + Moderator Edit Icon on Every Notice (Point 17) */}
                <div className="flex items-center gap-2 shrink-0 self-start">
                  <div className="flex items-center gap-2 text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-cyan-300 font-bold">
                      {formatDateTimeBengali(notice.createdAt)}
                    </span>
                  </div>

                  {isModeratorOrAppMod && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(notice)}
                        title="নোটিশ সম্পাদনা করুন (অনুমোদনের পর লাইভ হবে)"
                        className="p-2 rounded-xl bg-slate-950/90 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
                      >
                        <SpringIcon>
                          <Edit3 className="w-3.5 h-3.5" />
                        </SpringIcon>
                        <span className="hidden sm:inline">এডিট</span>
                      </button>

                      {confirmDeleteId === notice.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const ok = deleteNotice(notice.id);
                              if (ok) setConfirmDeleteId(null);
                            }}
                            className="py-1.5 px-2.5 rounded-xl bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            নিশ্চিত মুছুন
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="py-1.5 px-2 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
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
                                { requestTypes: ['NOTICE_EDIT', 'NOTICE_DELETE'], targetRecordId: notice.id },
                                `নোটিশ মুছে ফেলা (${notice.title})`
                              )
                            ) {
                              return;
                            }
                            setConfirmDeleteId(notice.id);
                          }}
                          title="নোটিশ মুছে ফেলার প্রস্তাব পাঠান"
                          className="p-2 rounded-xl bg-slate-950/90 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-3.5 whitespace-pre-line group-hover:text-slate-200 transition-colors">
                {notice.content}
              </p>

              <div className="pt-3.5 mt-3.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    প্রকাশক:{' '}
                    <strong className="text-amber-300 font-bold">{notice.authorName}</strong>{' '}
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({getNoticeAuthorDesignation(notice)})
                    </span>
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ভেরিফাইড অফিসিয়াল বিজ্ঞপ্তি</span>
                </span>
              </div>
            </div>
            </StaggerItem>
          );
        })}
      </StaggerList>
      )
      ) : isGuestMode ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-ink">ব্যক্তিগত নোটিফিকেশন লকড</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            আপনার ব্যক্তিগত অনুমোদন, প্রত্যাখ্যান ও লেনদেন সংক্রান্ত নোটিফিকেশন দেখতে সদস্য অ্যাকাউন্টে লগইন করুন।
          </p>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            লগইন করুন
          </button>
        </div>
      ) : personalNotifications.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2 text-xs text-slate-400">
          <Bell className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-semibold">এখনো কোনো ব্যক্তিগত বা ওয়ার্কফ্লো নোটিফিকেশন নেই।</p>
        </div>
      ) : (
        <StaggerList className="space-y-3">
          {personalNotifications.map((notif: UserNotification) => {
            const isApprovedType =
              notif.type === 'DEPOSIT_APPROVED' ||
              notif.type === 'PROFILE_APPROVED' ||
              notif.color === 'emerald' ||
              notif.color === 'blue';
            const isRejectedType =
              notif.type === 'DEPOSIT_REJECTED' || notif.color === 'rose';

            return (
              <StaggerItem key={notif.id} hoverLift>
                <div
                  onClick={() => {
                    if (!notif.read) markNotificationRead(notif.id);
                  }}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer ${
                    isRejectedType
                      ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/25 border-rose-500/40'
                      : isApprovedType
                      ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/25 border-emerald-500/40'
                      : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isRejectedType
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : isApprovedType
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isRejectedType ? (
                          <XCircle className="w-4 h-4" />
                        ) : isApprovedType ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              isRejectedType
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : isApprovedType
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            }`}
                          >
                            {notif.type === 'DEPOSIT_APPROVED'
                              ? 'সঞ্চয় অনুমোদিত'
                              : notif.type === 'PROFILE_APPROVED'
                              ? 'ওয়ার্কফ্লো অনুমোদিত'
                              : notif.type === 'DEPOSIT_REJECTED'
                              ? 'প্রত্যাখ্যাত'
                              : notif.type === 'DEPOSIT_SUBMITTED'
                              ? 'জমা দাখিল'
                              : 'ব্যক্তিগত বিজ্ঞপ্তি'}
                          </span>
                        </div>
                        <h3 className="font-bold text-ink text-sm sm:text-base">{notif.title}</h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800 shrink-0 self-start">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-cyan-300 font-bold">
                        {formatDateTimeBengali(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      {/* Modal for adding new notice */}
      <AnimatePresence>
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SMOOTH_EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm"
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: SMOOTH_EASE }}
            onSubmit={handleCreateNotice}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">নতুন নোটিশ প্রকাশ</h3>
                  <p className="text-[11px] text-slate-400">সদস্যদের জন্য নোটিশ ও শীর্ষ ঘোষণা নির্ধারণ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-200">নোটিশের শিরোনাম:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="যেমন: চলতি মাসের সঞ্চয় জমা ও সাধারণ সভা সংক্রান্ত বিজ্ঞপ্তি..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-200">গুরুত্ব (Priority):</label>
              <select
                aria-label="গুরুত্ব নির্বাচন করুন"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="NORMAL">সাধারণ নোটিশ (Normal)</option>
                <option value="HIGH">জরুরি বিজ্ঞপ্তি (Urgent / Pinned)</option>
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showInTicker}
                  onChange={(e) => setShowInTicker(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-200 text-xs">
                  শীর্ষ ঘোষণা বারে স্ক্রলিং হিসেবে প্রদর্শন করুন (Show in Scrolling Ticker)
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-200">বিস্তারিত বিবরণ:</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="নোটিশের বিস্তারিত লিখুন..."
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
              >
                প্রকাশ ও সিংক করুন
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Point 17: Modal for Editing Existing Notice (Goes live after Moderator Panel Approval) */}
      <AnimatePresence>
      {editingNotice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SMOOTH_EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm"
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: SMOOTH_EASE }}
            onSubmit={handleSubmitNoticeEdit}
            className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">নোটিশ সম্পাদনা প্রস্তাব</h3>
                  <p className="text-[11px] text-amber-300 font-bold">
                    মডারেটর প্যানেলে অনুমোদনের পর সংশোধিত নোটিশটি লাইভ হবে
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-200">নোটিশের শিরোনাম:</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-200">গুরুত্ব (Priority):</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="NORMAL">সাধারণ নোটিশ (Normal)</option>
                <option value="HIGH">জরুরি বিজ্ঞপ্তি (Urgent / Pinned)</option>
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editShowInTicker}
                  onChange={(e) => setEditShowInTicker(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-200 text-xs">
                  শীর্ষ ঘোষণা বারে স্ক্রলিং হিসেবে প্রদর্শন করুন
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-200">বিস্তারিত বিবরণ:</label>
              <textarea
                rows={5}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
              >
                অনুমোদনের জন্য পাঠান
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
