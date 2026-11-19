import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Vote,
  PhoneCall,
  User,
  Lock,
  CheckCircle2,
  Share2,
  ShieldAlert,
  Search,
  Reply,
  Smile,
  X,
  Trash2,
  Edit3,
  Check,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toBengaliNumerals } from '../../utils/calculations';
import { Avatar } from '../common/Avatar';
import { UserProfile, ChatMessage } from '../../types';
import { MemberDetailsModal } from '../members/MemberDetailsModal';
import { motion, AnimatePresence } from 'motion/react';
import {
  PageTabTransition,
  SlidingTabPill,
  SMOOTH_EASE,
} from '../common/MotionPrimitives';

interface ChatViewProps {
  onInitiateCall: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ onInitiateCall }) => {
  const {
    currentUser,
    users,
    chatMessages,
    sendChatMessage,
    deleteChatMessage,
    forwardChatMessage,
    toggleMessageReaction,
    polls,
    votePoll,
    createPoll,
    deletePoll,
    updatePollOption,
    privateMessages,
    sendPrivateMessage,
    deletePrivateMessage,
    activePrivateChatUser,
    isGuestMode,
    setIsAuthModalOpen,
    triggerGuestWarning,
    triggerWarning,
    seenChatIds,
    getChannelUnreadCount,
    getPersonalUnreadCount,
    markChannelSeen,
    markPersonalChatSeen,
  } = useApp();

  const realUsers = users.filter((u) => u.id !== '__guest__' && u.memberId !== 'GUEST');

  const [activeChannel, setActiveChannel] = useState<'GENERAL' | 'MODERATOR_ONLY' | 'PERSONAL'>('GENERAL');
  const [inputText, setInputText] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions] = useState(['হ্যাঁ', 'না', 'মতামত বিবেচনাধীন']);
  const [editingPollOption, setEditingPollOption] = useState<{ pollId: string; optId: string; text: string } | null>(null);

  // Inline confirmation states (replaces native confirm dialogs)
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [confirmDeletePmId, setConfirmDeletePmId] = useState<string | null>(null);
  const [confirmDeletePollId, setConfirmDeletePollId] = useState<string | null>(null);

  // Mention autocomplete state (triggered automatically when typing '@')
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Scroll containers & smart scroll tracking refs
  const groupScrollRef = useRef<HTMLDivElement>(null);
  const personalScrollRef = useRef<HTMLDivElement>(null);
  const lastOpenedBoxKeyRef = useRef<string>('');
  const seenChatIdsRef = useRef<string[]>(seenChatIds);
  seenChatIdsRef.current = seenChatIds;

  // Profile modal on mention click
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<UserProfile | null>(null);

  // Personal chat selected user
  const [selectedPersonalUser, setSelectedPersonalUser] = useState<UserProfile | null>(
    activePrivateChatUser || realUsers.find((u) => u.id !== currentUser?.id) || null
  );

  const [personalInputText, setPersonalInputText] = useState('');
  const [personalSearch, setPersonalSearch] = useState('');

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  // Ensure normal members & guests can never stay on MODERATOR_ONLY channel
  useEffect(() => {
    if (!isModeratorOrAppMod && activeChannel === 'MODERATOR_ONLY') {
      setActiveChannel('GENERAL');
    }
  }, [isModeratorOrAppMod, activeChannel]);

  // Close '+' upward menu when switching channel or clicking outside
  useEffect(() => {
    setShowPlusMenu(false);
    setShowMentions(false);
  }, [activeChannel]);

  useEffect(() => {
    if (!showPlusMenu) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showPlusMenu]);

  // Keep selected personal user synced with context if opened from other views
  useEffect(() => {
    if (activePrivateChatUser) {
      setSelectedPersonalUser(activePrivateChatUser);
      setActiveChannel('PERSONAL');
    }
  }, [activePrivateChatUser]);

  // Filter messages by channel
  const filteredMessages = chatMessages.filter((m) => m.channel === activeChannel);
  const filteredPolls = polls.filter((p) => p.channel === activeChannel);

  // Mention candidates based on active channel
  const mentionCandidates = (
    activeChannel === 'MODERATOR_ONLY'
      ? realUsers.filter((u) => u.role !== 'MEMBER')
      : realUsers
  ).filter((u) => u.name.toLowerCase().includes(mentionFilter.toLowerCase()));

  // Handle typing to detect '@' without needing any '@' icon button
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const atIndex = val.lastIndexOf('@');
    if (atIndex !== -1 && atIndex === val.length - 1) {
      setShowMentions(true);
      setMentionFilter('');
    } else if (atIndex !== -1 && atIndex < val.length) {
      const query = val.slice(atIndex + 1);
      if (!query.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(query);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Reply to message state
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  // Long-press emoji reaction popup state
  const [holdReactionMessageId, setHoldReactionMessageId] = useState<string | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (msgId: string) => {
    longPressTimeoutRef.current = setTimeout(() => {
      setHoldReactionMessageId(msgId);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleSelectMention = (userName: string) => {
    const atIndex = inputText.lastIndexOf('@');
    if (atIndex !== -1) {
      const before = inputText.slice(0, atIndex);
      setInputText(`${before}@${userName} `);
    }
    setShowMentions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestMode) {
      triggerGuestWarning('চ্যাটে বার্তা প্রেরণ');
      return;
    }
    if (!inputText.trim()) return;

    if (activeChannel === 'MODERATOR_ONLY' && !isModeratorOrAppMod) {
      triggerWarning('শুধুমাত্র মডারেটর চ্যানেল', 'শুধুমাত্র অনুমোদিত মডারেটরগণ এই চ্যানেলে মেসেজ পাঠাতে পারবেন।', false);
      return;
    }

    sendChatMessage(
      activeChannel as 'GENERAL' | 'MODERATOR_ONLY',
      inputText.trim(),
      undefined,
      replyingToMessage
        ? {
            id: replyingToMessage.id,
            text: replyingToMessage.text,
            senderName: replyingToMessage.senderName,
          }
        : undefined
    );
    setInputText('');
    setReplyingToMessage(null);
    setShowMentions(false);
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestMode) {
      triggerGuestWarning('নতুন জরিপ তৈরি');
      return;
    }
    if (!pollQuestion.trim()) return;
    createPoll(activeChannel as 'GENERAL' | 'MODERATOR_ONLY', pollQuestion.trim(), pollOptions.filter((o) => o.trim()));
    setShowPollCreator(false);
    setPollQuestion('');
  };

  // Parse text and render clickable @mentions for full names
  const renderMessageContent = (text: string) => {
    const sorted = [...users].sort((a, b) => b.name.length - a.name.length);
    const escapedNames = sorted
      .map((u) => u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const pattern = new RegExp(`(@(?:${escapedNames}|[^\\s.,!?]+))`, 'g');
    const parts = text.split(pattern);

    return parts.map((chunk, idx) => {
      if (chunk.startsWith('@')) {
        const rawName = chunk.slice(1).trim();
        const matched = users.find(
          (u) =>
            u.name.toLowerCase() === rawName.toLowerCase() ||
            u.memberId.toLowerCase() === rawName.toLowerCase() ||
            u.name.toLowerCase().startsWith(rawName.toLowerCase())
        );

        return (
          <span
            key={idx}
            onClick={() => {
              if (matched) {
                setSelectedMemberForDetails(matched);
              }
            }}
            title={matched ? `${matched.name} (${matched.memberId}) এর সম্পূর্ণ প্রোফাইল বিবরণ দেখুন` : 'সদস্য প্রোফাইল'}
            className="font-bold text-emerald-300 bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-700/70 px-1.5 py-0.5 rounded-md cursor-pointer underline transition-all inline break-words mx-0.5 shadow-sm"
          >
            {chunk}
          </span>
        );
      }
      return <span key={idx}>{chunk}</span>;
    });
  };

  // Personal Messages filter
  const conversationMessages = selectedPersonalUser && currentUser
    ? privateMessages.filter(
        (m) =>
          (m.senderId === currentUser.id && m.receiverId === selectedPersonalUser.id) ||
          (m.senderId === selectedPersonalUser.id && m.receiverId === currentUser.id)
      )
    : [];

  // Gender Policy Enforcement in Personal Chat
  const isTargetFemale = selectedPersonalUser?.gender === 'FEMALE';
  const isRegularMaleUser = currentUser?.gender === 'MALE' && currentUser?.role === 'MEMBER';
  const femaleInitiatedPrior = selectedPersonalUser && currentUser
    ? privateMessages.some(
        (m) => m.senderId === selectedPersonalUser.id && m.receiverId === currentUser.id
      )
    : false;

  const isBlockedByGenderRule = isTargetFemale && isRegularMaleUser && !femaleInitiatedPrior;

  const handleSendPersonalMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestMode) {
      triggerGuestWarning('ব্যক্তিগত বার্তা প্রেরণ');
      return;
    }
    if (!personalInputText.trim() || !selectedPersonalUser) return;
    if (!currentUser) {
      triggerGuestWarning('ব্যক্তিগত বার্তা প্রেরণ');
      return;
    }

    if (isBlockedByGenderRule) {
      triggerWarning(
        'সদস্য সুরক্ষা নীতিমালা',
        'সদস্য সুরক্ষা নীতিমালার কারণে সাধারণ পুরুষ সদস্য কোনো নারী সদস্যকে প্রথম বার্তা দিতে পারবেন না।',
        false
      );
      return;
    }

    sendPrivateMessage(selectedPersonalUser.id, personalInputText.trim());
    setPersonalInputText('');
  };

  // Personal chat partners
  const personalPartners = realUsers
    .filter((u) => u.id !== currentUser?.id)
    .filter((u) =>
      personalSearch
        ? u.name.toLowerCase().includes(personalSearch.toLowerCase()) ||
          u.memberId.toLowerCase().includes(personalSearch.toLowerCase())
        : true
    );

  // Per-chatbox unseen counts
  const generalUnreadCount = getChannelUnreadCount('GENERAL');
  const moderatorUnreadCount = isModeratorOrAppMod ? getChannelUnreadCount('MODERATOR_ONLY') : 0;
  const totalPersonalUnreadCount = getPersonalUnreadCount();

  // Smart scroll helper inside chat scroll container
  const scrollChatContainer = (container: HTMLDivElement | null, targetMsgId?: string) => {
    if (!container) return;
    if (targetMsgId) {
      const targetEl = container.querySelector<HTMLElement>(`[data-msg-id="${targetMsgId}"]`);
      if (targetEl) {
        const targetTop = Math.max(0, targetEl.offsetTop - 16);
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
        return;
      }
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  // Smart scroll to First Unseen Message OR Latest Bottom Message + Scoped Seen Marking
  useEffect(() => {
    if (isGuestMode) return;
    const currentBoxKey =
      activeChannel === 'PERSONAL'
        ? `PERSONAL:${selectedPersonalUser?.id || ''}`
        : activeChannel;

    const isSwitchingBox = lastOpenedBoxKeyRef.current !== currentBoxKey;
    lastOpenedBoxKeyRef.current = currentBoxKey;

    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (activeChannel === 'GENERAL' || activeChannel === 'MODERATOR_ONLY') {
      const firstUnseen = isSwitchingBox
        ? filteredMessages.find(
            (m) =>
              !m.isDeleted &&
              m.senderId !== currentUser?.id &&
              !seenChatIdsRef.current.includes(m.id)
          )
        : undefined;

      const targetId = firstUnseen?.id;
      requestAnimationFrame(() => {
        scrollChatContainer(groupScrollRef.current, targetId);
      });
      timerId = setTimeout(() => {
        scrollChatContainer(groupScrollRef.current, targetId);
        markChannelSeen(activeChannel);
      }, 90);
    } else if (activeChannel === 'PERSONAL' && selectedPersonalUser) {
      const firstUnseenPm = isSwitchingBox
        ? conversationMessages.find(
            (pm) =>
              !pm.isDeleted &&
              pm.senderId === selectedPersonalUser.id &&
              (!pm.isRead || !seenChatIdsRef.current.includes(pm.id))
          )
        : undefined;

      const targetId = firstUnseenPm?.id;
      requestAnimationFrame(() => {
        scrollChatContainer(personalScrollRef.current, targetId);
      });
      timerId = setTimeout(() => {
        scrollChatContainer(personalScrollRef.current, targetId);
        markPersonalChatSeen(selectedPersonalUser.id);
      }, 90);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [
    activeChannel,
    selectedPersonalUser?.id,
    filteredMessages.length,
    conversationMessages.length,
    currentUser?.id,
    markChannelSeen,
    markPersonalChatSeen,
  ]);

  const renderPlusAttachmentMenu = (allowPoll: boolean) => (
    <div ref={plusMenuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setShowPlusMenu((v) => !v)}
        title="জরিপ ও কল অপশন"
        aria-label="জরিপ ও কল অপশন"
        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
          showPlusMenu
            ? 'bg-emerald-600 border-emerald-500 text-white rotate-45'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
        }`}
      >
        <Plus className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {showPlusMenu && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.14, delay: 0, ease: SMOOTH_EASE }}
            className="absolute bottom-full left-0 mb-2 z-40 min-w-[168px] bg-slate-900 border border-slate-700 rounded-2xl p-1.5 shadow-2xl space-y-1"
          >
            {allowPoll && (
              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  if (isGuestMode) {
                    triggerGuestWarning('নতুন জরিপ তৈরি');
                    return;
                  }
                  setShowPollCreator(true);
                }}
                className="w-full py-2 px-3 rounded-xl hover:bg-slate-800 text-ink text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <span className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Vote className="w-3.5 h-3.5" />
                </span>
                <span>নতুন জরিপ</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowPlusMenu(false);
                if (isGuestMode) {
                  triggerGuestWarning('অডিও/ভিডিও কল');
                  return;
                }
                onInitiateCall();
              }}
              className="w-full py-2 px-3 rounded-xl hover:bg-slate-800 text-ink text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <span className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <PhoneCall className="w-3.5 h-3.5" />
              </span>
              <span>অডিও/ভিডিও কল</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isGuestMode) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-ink">
              কমিউনিটি চ্যাট ও মেসেজ লক করা রয়েছে
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              গেস্ট মোডে সাধারণ চ্যাট, মডারেটর চ্যানেল, জরিপ এবং ব্যক্তিগত সকল বার্তা সম্পূর্ণভাবে গোপনীয় ও লকড রাখা হয়েছে। মেসেজ দেখতে ও অংশগ্রহণ করতে আপনার সদস্য একাউন্টে লগইন করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="btn-brand w-full py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer transition-all"
          >
            সদস্য একাউন্টে লগইন করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
      {/* Compact Inline 3-Option Channel Bar ('সদস্য', 'মডারেটর', 'পার্সোনাল') */}
      <div className="shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 sm:p-2 shadow-sm">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveChannel('GENERAL')}
            className={`relative min-h-9 py-1.5 px-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeChannel === 'GENERAL'
                ? 'text-white'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800/80'
            }`}
          >
            {activeChannel === 'GENERAL' && (
              <SlidingTabPill layoutId="chat-channel-pill" className="bg-emerald-600 shadow" />
            )}
            <MessageSquare className="relative z-10 w-3.5 h-3.5 shrink-0" />
            <span className="relative z-10 truncate">সদস্য</span>
            {generalUnreadCount > 0 && (
              <span className="relative z-10 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center shrink-0">
                {toBengaliNumerals(generalUnreadCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isModeratorOrAppMod) {
                triggerWarning(
                  'শুধুমাত্র মডারেটর চ্যানেল',
                  'এই গোপনীয় চ্যানেলটি শুধুমাত্র অনুমোদিত মডারেটরদের জন্য সংরক্ষিত।',
                  isGuestMode
                );
                return;
              }
              setActiveChannel('MODERATOR_ONLY');
            }}
            className={`relative min-h-9 py-1.5 px-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeChannel === 'MODERATOR_ONLY'
                ? 'text-white'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800/80'
            }`}
          >
            {activeChannel === 'MODERATOR_ONLY' && (
              <SlidingTabPill layoutId="chat-channel-pill" className="bg-blue-600 shadow" />
            )}
            <Lock className="relative z-10 w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="relative z-10 truncate">মডারেটর</span>
            {moderatorUnreadCount > 0 && (
              <span className="relative z-10 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center shrink-0">
                {toBengaliNumerals(moderatorUnreadCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel('PERSONAL')}
            className={`relative min-h-9 py-1.5 px-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeChannel === 'PERSONAL'
                ? 'text-white'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800/80'
            }`}
          >
            {activeChannel === 'PERSONAL' && (
              <SlidingTabPill layoutId="chat-channel-pill" className="bg-indigo-600 shadow" />
            )}
            <User className="relative z-10 w-3.5 h-3.5 shrink-0" />
            <span className="relative z-10 truncate">পার্সোনাল</span>
            {totalPersonalUnreadCount > 0 && (
              <span className="relative z-10 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center shrink-0">
                {toBengaliNumerals(totalPersonalUnreadCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Viewport-Fitted Chat Box (Zero Outer Scrolling — Only Inner Messages Scroll) */}
      <PageTabTransition
        tabKey={activeChannel}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        {activeChannel === 'PERSONAL' ? (
          <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:grid md:grid-cols-3 shadow-sm">
            {/* Partner Selector: Compact horizontal strip on mobile, full sidebar on desktop */}
            <div className="shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/70 p-2 sm:p-2.5 flex flex-col md:h-full overflow-hidden">
              <div className="relative mb-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="সদস্য সার্চ করুন..."
                  value={personalSearch}
                  onChange={(e) => setPersonalSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-[11px] text-ink placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-none md:flex-1 py-0.5">
                {personalPartners.map((u) => {
                  const isSelected = selectedPersonalUser?.id === u.id;
                  const partnerUnread = getPersonalUnreadCount(u.id);
                  const lastMsg = privateMessages
                    .filter(
                      (m) =>
                        (m.senderId === currentUser?.id && m.receiverId === u.id) ||
                        (m.senderId === u.id && m.receiverId === currentUser?.id)
                    )
                    .slice(-1)[0];

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedPersonalUser(u)}
                      className={`shrink-0 md:w-full px-2.5 py-1.5 md:p-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors text-left ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/50 text-ink'
                          : 'bg-slate-900/60 md:bg-transparent hover:bg-slate-900 text-slate-300 border border-slate-800/60 md:border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={u.avatarUrl} name={u.name} size="xs" />
                        <div className="min-w-0 max-w-[105px] md:max-w-none">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-[11px] truncate">{u.name}</span>
                            {u.role !== 'MEMBER' && (
                              <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-500 text-ink shrink-0" />
                            )}
                          </div>
                          <p className={`hidden md:block text-[10px] truncate ${partnerUnread > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                            {lastMsg ? lastMsg.text : `${u.gender === 'FEMALE' ? 'নারী' : 'পুরুষ'} • ${u.memberId}`}
                          </p>
                        </div>
                      </div>
                      {partnerUnread > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center shrink-0">
                          {toBengaliNumerals(partnerUnread)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 2 Columns: Selected 1-on-1 Conversation */}
            <div className="flex-1 min-h-0 md:col-span-2 flex flex-col md:h-full bg-slate-900/50 overflow-hidden">
              {selectedPersonalUser ? (
                <>
                  {/* Conversation Header */}
                  <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        src={selectedPersonalUser.avatarUrl}
                        name={selectedPersonalUser.name}
                        size="xs"
                        ringColor={
                          selectedPersonalUser.role !== 'MEMBER' ? 'ring-blue-500' : 'ring-emerald-500'
                        }
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-ink text-xs truncate">{selectedPersonalUser.name}</h4>
                          {selectedPersonalUser.role !== 'MEMBER' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30 shrink-0">
                              {selectedPersonalUser.role === 'APP_MODERATOR' ? 'অ্যাডমিন' : 'মডারেটর'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {selectedPersonalUser.memberId} • {selectedPersonalUser.gender === 'FEMALE' ? 'নারী' : 'পুরুষ'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMemberForDetails(selectedPersonalUser)}
                      className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      প্রোফাইল
                    </button>
                  </div>

                  {/* Messages Feed (ONLY scrollable region) */}
                  <div
                    ref={personalScrollRef}
                    className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-2.5 sm:p-3.5 space-y-2.5 bg-slate-900/40 relative"
                  >
                    {conversationMessages.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 text-xs space-y-1">
                        <p className="font-bold text-slate-400">{selectedPersonalUser.name} এর সাথে কোনো পূর্ববর্তী বার্তা নেই।</p>
                        <p className="text-[11px]">নিচের বক্স থেকে বার্তা লিখে প্রেরণ করুন।</p>
                      </div>
                    ) : (
                      conversationMessages.map((msg) => {
                        const isMe = currentUser ? msg.senderId === currentUser.id : false;
                        return (
                          <div
                            key={msg.id}
                            data-msg-id={msg.id}
                            className={`flex gap-2 min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[82%] sm:max-w-[76%] min-w-0 flex flex-col space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                              {msg.isDeleted ? (
                                <div className="px-3 py-2 rounded-2xl text-xs italic bg-slate-950/70 border border-slate-800 text-slate-400">
                                  <span className="flex items-center gap-1.5 text-[11px]">
                                    <Trash2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span>ব্যবহারকারী বার্তাটি ডিলিট করেছেন</span>
                                  </span>
                                </div>
                              ) : (
                                <div
                                  onContextMenu={(e) => {
                                    if (isMe) {
                                      e.preventDefault();
                                      setConfirmDeletePmId(msg.id);
                                    }
                                  }}
                                  className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words max-w-full ${
                                    isMe
                                      ? 'bg-indigo-600 text-white rounded-br-sm shadow-sm font-medium'
                                      : 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-bl-sm shadow-sm'
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1 flex-wrap">
                                <span>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {!msg.isDeleted && (
                                  <button
                                    type="button"
                                    onClick={() => setPersonalInputText(`↩ "${msg.text.slice(0, 30)}${msg.text.length > 30 ? '...' : ''}" `)}
                                    title="রিপ্লাই দিন"
                                    className="hover:text-indigo-400 text-slate-400 flex items-center gap-0.5 cursor-pointer font-bold"
                                  >
                                    <Reply className="w-2.5 h-2.5" />
                                    <span>রিপ্লাই</span>
                                  </button>
                                )}
                                {!msg.isDeleted && isMe && (
                                  confirmDeletePmId === msg.id ? (
                                    <span className="inline-flex items-center gap-1 ml-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          deletePrivateMessage(msg.id);
                                          setConfirmDeletePmId(null);
                                        }}
                                        className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-bold cursor-pointer"
                                      >
                                        নিশ্চিত মুছুন
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeletePmId(null)}
                                        className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 cursor-pointer"
                                      >
                                        না
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeletePmId(msg.id)}
                                      title="বার্তা ডিলিট করুন"
                                      className="hover:text-rose-400 text-slate-400 flex items-center gap-0.5 cursor-pointer font-bold transition-colors ml-1"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>ডিলিট</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bottom Input Bar with '+' Upward Call Menu */}
                  <div className="shrink-0 p-2 sm:p-2.5 bg-slate-950 border-t border-slate-800 relative">
                    {isBlockedByGenderRule ? (
                      <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-2 text-[11px] text-rose-300">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <p className="leading-snug">
                          <strong className="font-bold text-rose-200">সুরক্ষা নীতিমালা:</strong> কোনো পুরুষ সদস্য নারী সদস্যকে প্রথম বার্তা পাঠাতে পারবেন না।
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSendPersonalMessage} className="flex items-center gap-2">
                        {renderPlusAttachmentMenu(false)}

                        <input
                          type="text"
                          placeholder={`${selectedPersonalUser.name} কে বার্তা লিখুন...`}
                          value={personalInputText}
                          onChange={(e) => setPersonalInputText(e.target.value)}
                          className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={!personalInputText.trim()}
                          className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-500 text-xs">
                  তালিকা থেকে সদস্য নির্বাচন করুন
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Channels: GENERAL ('সদস্য') & MODERATOR_ONLY ('মডারেটর') */
          <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-sm relative">
            {/* Compact Overlay Poll Creator inside Chat Box so outer screen never scrolls */}
            <AnimatePresence>
              {showPollCreator && (
                <motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16, delay: 0, ease: SMOOTH_EASE }}
                  onSubmit={handleCreatePoll}
                  className="absolute top-2.5 left-2.5 right-2.5 z-30 bg-slate-950/95 backdrop-blur-md border border-emerald-500/40 p-3 rounded-2xl space-y-2.5 text-xs shadow-2xl"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-ink text-xs flex items-center gap-1.5">
                      <Vote className="w-4 h-4 text-emerald-400" />
                      <span>নতুন মতামত জরিপ শুরু করুন</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowPollCreator(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="জরিপের প্রশ্ন লিখুন..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPollCreator(false)}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                    >
                      জরিপ প্রকাশ করুন
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Messages Scroll Area (ONLY scrollable region — overflow-x-hidden prevents any horizontal shift) */}
            <div
              ref={groupScrollRef}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-2.5 sm:p-3.5 space-y-3 relative"
            >
              {/* Active Polls in this channel */}
              {filteredPolls.map((poll) => (
                <div
                  key={poll.id}
                  onContextMenu={(e) => {
                    if (isModeratorOrAppMod) {
                      e.preventDefault();
                      setConfirmDeletePollId(poll.id);
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs shadow-inner relative"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <Vote className="w-3.5 h-3.5 shrink-0" />
                      <span>চলমান জরিপ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 truncate max-w-[130px]">{poll.creatorName}</span>
                      {isModeratorOrAppMod && (
                        confirmDeletePollId === poll.id ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deletePoll(poll.id);
                                setConfirmDeletePollId(null);
                              }}
                              className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              মুছুন
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePollId(null)}
                              className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] cursor-pointer"
                            >
                              না
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePollId(poll.id)}
                            title="জরিপটি মুছুন"
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <p className="font-bold text-ink text-xs sm:text-sm leading-snug break-words">{poll.question}</p>

                  <div className="space-y-1.5">
                    {(poll.options || []).map((opt) => {
                      const optVotes = opt.votes || [];
                      const totalVotes = (poll.options || []).reduce((sum, o) => sum + (o.votes || []).length, 0);
                      const percent = totalVotes > 0 ? Math.round((optVotes.length / totalVotes) * 100) : 0;
                      const hasVotedThis = currentUser ? optVotes.includes(currentUser.id) : false;
                      const isEditingThis =
                        editingPollOption?.pollId === poll.id && editingPollOption?.optId === opt.id;

                      if (isEditingThis) {
                        return (
                          <div key={opt.id} className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-emerald-500">
                            <input
                              type="text"
                              value={editingPollOption.text}
                              onChange={(e) =>
                                setEditingPollOption({ ...editingPollOption, text: e.target.value })
                              }
                              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-ink focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editingPollOption.text.trim()) {
                                  updatePollOption(poll.id, opt.id, editingPollOption.text.trim());
                                }
                                setEditingPollOption(null);
                              }}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                              title="সংরক্ষণ করুন"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPollOption(null)}
                              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-ink cursor-pointer"
                              title="বাতিল"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div key={opt.id} className="flex items-center gap-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (!currentUser || isGuestMode) {
                                triggerGuestWarning('জরিপে ভোট প্রদান');
                                return;
                              }
                              votePoll(poll.id, opt.id);
                            }}
                            className={`flex-1 min-w-0 text-left px-2.5 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 relative overflow-hidden cursor-pointer ${
                              hasVotedThis
                                ? 'border-emerald-500 bg-emerald-950/40 font-bold text-ink'
                                : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 0.4, ease: SMOOTH_EASE }}
                              className="absolute left-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none"
                            />
                            <span className="relative z-10 flex items-center gap-1.5 truncate">
                              {hasVotedThis && <span className="text-emerald-400 font-bold">✓</span>}
                              <span className="truncate">{opt.text}</span>
                            </span>
                            <span className="relative z-10 font-mono text-[10px] font-bold text-slate-400 shrink-0">
                              {toBengaliNumerals(optVotes.length)} ({toBengaliNumerals(percent)}%)
                            </span>
                          </button>

                          {isModeratorOrAppMod && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPollOption({ pollId: poll.id, optId: opt.id, text: opt.text })
                              }
                              title="অপশন টেক্সট এডিট করুন"
                              className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {filteredMessages.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400">এই চ্যানেলে এখনও কোনো বার্তা নেই।</p>
                  <p className="text-[11px] text-slate-500">প্রথম বার্তা বা মতামত প্রদান করুন।</p>
                </div>
              )}

              {/* Messages Feed */}
              {filteredMessages.map((msg) => {
                const isMe = currentUser ? msg.senderId === currentUser.id : false;
                const senderUser = users.find((u) => u.id === msg.senderId);
                const isSenderMod = msg.senderRole !== 'MEMBER';
                const canDelete = isMe || isModeratorOrAppMod;

                return (
                  <div
                    key={msg.id}
                    data-msg-id={msg.id}
                    className={`flex gap-2 min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <Avatar
                        src={msg.senderAvatar || senderUser?.avatarUrl}
                        name={msg.senderName}
                        size="xs"
                        ringColor={isSenderMod ? 'ring-blue-500' : 'ring-slate-700'}
                      />
                    )}

                    <div className={`max-w-[82%] sm:max-w-[76%] min-w-0 flex flex-col space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <div className="flex items-center gap-1.5 text-[11px] max-w-full">
                          <span className="font-bold text-slate-300 truncate">{msg.senderName}</span>
                          {isSenderMod && (
                            <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-500 text-ink shrink-0" />
                          )}
                          {msg.senderRole !== 'MEMBER' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold shrink-0">
                              {msg.senderRole === 'APP_MODERATOR' ? 'অ্যাডমিন' : 'মডারেটর'}
                            </span>
                          )}
                        </div>
                      )}

                      {msg.isDeleted ? (
                        <div className="px-3 py-2 rounded-2xl text-xs italic bg-slate-950/70 border border-slate-800 text-slate-400">
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Trash2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>ব্যবহারকারী বার্তাটি ডিলিট করেছেন</span>
                          </span>
                        </div>
                      ) : (
                        <div
                          onTouchStart={() => handleTouchStart(msg.id)}
                          onTouchEnd={handleTouchEnd}
                          onMouseDown={() => handleTouchStart(msg.id)}
                          onMouseUp={handleTouchEnd}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setHoldReactionMessageId(msg.id);
                          }}
                          className={`px-3 py-2 rounded-2xl text-xs leading-relaxed select-text cursor-pointer relative break-words max-w-full ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-br-sm shadow-sm font-medium'
                              : 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-bl-sm shadow-sm'
                          }`}
                        >
                          {msg.replyToSender && (
                            <div
                              className={`mb-1.5 p-1.5 rounded-xl border-l-2 text-[10px] space-y-0.5 ${
                                isMe
                                  ? 'bg-black/20 border-white/60'
                                  : 'bg-slate-900/70 border-emerald-500'
                              }`}
                            >
                              <span
                                className={`font-bold flex items-center gap-1 ${
                                  isMe ? 'text-white/95' : 'text-emerald-400'
                                }`}
                              >
                                <Reply className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{msg.replyToSender} এর বার্তার উত্তর:</span>
                              </span>
                              <p
                                className={`line-clamp-1 italic break-words ${
                                  isMe ? 'text-white/85' : 'text-slate-300'
                                }`}
                              >
                                {msg.replyToText}
                              </p>
                            </div>
                          )}

                          <p className="whitespace-pre-wrap break-words">{renderMessageContent(msg.text)}</p>
                        </div>
                      )}

                      {/* Bounded Wrapping Reaction Bar — Never Overflows Horizontally */}
                      {holdReactionMessageId === msg.id && !msg.isDeleted && (
                        <div className="flex flex-wrap items-center gap-1 max-w-full p-1.5 rounded-2xl bg-slate-950 border border-slate-700 shadow-xl my-0.5">
                          {['👍', '❤️', '😂', '😮', '😢', '🔥', '🤲', '👏'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                toggleMessageReaction(msg.id, emoji);
                                setHoldReactionMessageId(null);
                              }}
                              className="text-sm leading-none hover:scale-110 transition-transform p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteMsgId(msg.id);
                                setHoldReactionMessageId(null);
                              }}
                              title="বার্তা ডিলিট করুন"
                              className="text-rose-400 hover:text-rose-300 px-1.5 py-0.5 text-[11px] font-bold flex items-center gap-1 border-l border-slate-800 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>মুছুন</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setHoldReactionMessageId(null)}
                            className="text-slate-400 hover:text-ink text-[11px] px-1.5 py-0.5 border-l border-slate-800 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1 flex-wrap max-w-full">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                        {!msg.isDeleted && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToMessage(msg);
                              if (inputRef.current) inputRef.current.focus();
                            }}
                            title="এই বার্তার রিপ্লাই দিন"
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
                          >
                            <Reply className="w-2.5 h-2.5" />
                            <span>রিপ্লাই</span>
                          </button>
                        )}

                        {!msg.isDeleted && (
                          <button
                            type="button"
                            onClick={() => setHoldReactionMessageId(holdReactionMessageId === msg.id ? null : msg.id)}
                            className="hover:text-amber-300 text-slate-400 flex items-center gap-0.5 cursor-pointer transition-colors"
                            title="রিয়েক্ট সিলেক্ট করুন"
                          >
                            <Smile className="w-3 h-3" />
                          </button>
                        )}

                        {!msg.isDeleted && canDelete && (
                          confirmDeleteMsgId === msg.id ? (
                            <span className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  deleteChatMessage(msg.id);
                                  setConfirmDeleteMsgId(null);
                                }}
                                className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-bold cursor-pointer"
                              >
                                নিশ্চিত মুছুন
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteMsgId(null)}
                                className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 cursor-pointer"
                              >
                                না
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteMsgId(msg.id)}
                              title="বার্তা ডিলিট করুন"
                              className="text-slate-500 hover:text-rose-400 flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>ডিলিট</span>
                            </button>
                          )
                        )}

                        {activeChannel === 'MODERATOR_ONLY' && isModeratorOrAppMod && !msg.isDeleted && (
                          <button
                            type="button"
                            onClick={() => forwardChatMessage(msg.id)}
                            title="এই বার্তাটি সাধারণ গ্রুপ চ্যাটে ফরোয়ার্ড করুন"
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
                          >
                            <Share2 className="w-2.5 h-2.5" />
                            <span>ফরোয়ার্ড</span>
                          </button>
                        )}

                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => toggleMessageReaction(msg.id, emoji)}
                                className="bg-slate-800/80 hover:bg-slate-700 px-1.5 py-0.5 rounded-full text-[10px] border border-slate-700 cursor-pointer text-ink"
                              >
                                {emoji} {userIds.length > 1 && toBengaliNumerals(userIds.length)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mention Suggestions Floating Dropdown (Triggered automatically by typing '@') */}
            {showMentions && (
              <div className="absolute bottom-14 left-3 right-3 sm:left-4 sm:w-80 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-2 z-30 space-y-1 max-h-44 overflow-y-auto">
                <div className="px-2 py-1 text-[11px] font-bold text-emerald-400 border-b border-slate-800">
                  {activeChannel === 'MODERATOR_ONLY'
                    ? 'মডারেটর মেনশন করুন'
                    : 'সদস্য মেনশন করুন'}
                </div>
                {mentionCandidates.length === 0 ? (
                  <p className="text-[11px] text-slate-500 p-2 italic">কোনো সদস্য পাওয়া যায়নি</p>
                ) : (
                  mentionCandidates.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => handleSelectMention(cand.name)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={cand.avatarUrl} name={cand.name} size="xs" />
                        <span className="font-bold text-ink truncate">{cand.name}</span>
                        {cand.role !== 'MEMBER' && (
                          <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-500 text-ink shrink-0" />
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 font-bold shrink-0">{cand.memberId}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Replying Banner Above Input */}
            {replyingToMessage && (
              <div className="shrink-0 px-3 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <Reply className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-emerald-300">{replyingToMessage.senderName}</span>
                    <span className="text-slate-300 text-[11px] ml-1.5 truncate">
                      "{replyingToMessage.text.slice(0, 40)}{replyingToMessage.text.length > 40 ? '...' : ''}"
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-ink cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Message Input Bar with '+' Upward Dropdown (Replaces '@', Poll & Call Header Buttons) */}
            <div className="shrink-0 p-2 sm:p-2.5 bg-slate-950 border-t border-slate-800 relative">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {renderPlusAttachmentMenu(true)}

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    activeChannel === 'MODERATOR_ONLY'
                      ? 'গোপনীয় বার্তা লিখুন (@ লিখে মেনশন)...'
                      : 'বার্তা লিখুন (@ লিখে মেনশন করুন)...'
                  }
                  value={inputText}
                  onChange={handleInputChange}
                  className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition-all flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </PageTabTransition>

      {/* Member Details Modal for @mentions */}
      {selectedMemberForDetails && (
        <MemberDetailsModal
          member={selectedMemberForDetails}
          onClose={() => setSelectedMemberForDetails(null)}
          onOpenReceipt={() => {}}
        />
      )}
    </div>
  );
};
