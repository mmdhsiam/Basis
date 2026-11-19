import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { UserProfile, PrivateMessage } from '../../types';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { toBengaliNumerals } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

interface PrivateChatModalProps {
  isOpen?: boolean;
  targetUser: UserProfile | null;
  onClose: () => void;
}

export const PrivateChatModal: React.FC<PrivateChatModalProps> = ({
  isOpen = true,
  targetUser,
  onClose,
}) => {
  const {
    currentUser,
    isGuestMode,
    setIsAuthModalOpen,
    privateMessages,
    sendPrivateMessage,
    seenChatIds,
    markPersonalChatSeen,
    triggerWarning,
  } = useApp();
  const [inputText, setInputText] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTargetIdRef = useRef<string>('');
  const seenChatIdsRef = useRef<string[]>(seenChatIds);
  seenChatIdsRef.current = seenChatIds;

  const showModal = Boolean(isOpen && targetUser);

  // Determine conversation messages
  const conversationMessages = showModal && targetUser
    ? privateMessages.filter(
        (m) =>
          (m.senderId === currentUser?.id && m.receiverId === targetUser.id) ||
          (m.senderId === targetUser.id && m.receiverId === currentUser?.id)
      )
    : [];

  // Smart scroll to first unseen or latest message & mark conversation seen
  useEffect(() => {
    if (!showModal || !targetUser || isGuestMode) {
      lastTargetIdRef.current = '';
      return;
    }

    const isOpeningTarget = lastTargetIdRef.current !== targetUser.id;
    lastTargetIdRef.current = targetUser.id;

    const firstUnseen = isOpeningTarget
      ? conversationMessages.find(
          (pm) =>
            !pm.isDeleted &&
            pm.senderId === targetUser.id &&
            (!pm.isRead || !seenChatIdsRef.current.includes(pm.id))
        )
      : undefined;

    const scrollNow = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (firstUnseen) {
        const el = container.querySelector<HTMLElement>(`[data-msg-id="${firstUnseen.id}"]`);
        if (el) {
          container.scrollTo({ top: Math.max(0, el.offsetTop - 20), behavior: 'smooth' });
          return;
        }
      }
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    };

    requestAnimationFrame(scrollNow);
    const timer = setTimeout(() => {
      scrollNow();
      markPersonalChatSeen(targetUser.id);
    }, 90);

    return () => clearTimeout(timer);
  }, [showModal, targetUser?.id, conversationMessages.length, markPersonalChatSeen]);

  const isTargetFemale = targetUser?.gender === 'FEMALE';
  const isRegularMaleUser = currentUser?.gender === 'MALE' && currentUser?.role === 'MEMBER';
  const femaleInitiatedPrior = targetUser
    ? privateMessages.some(
        (m) => m.senderId === targetUser.id && m.receiverId === currentUser?.id
      )
    : false;

  const isBlockedByGenderRule = isTargetFemale && isRegularMaleUser && !femaleInitiatedPrior;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !inputText.trim()) return;

    if (isBlockedByGenderRule) {
      triggerWarning(
        'বার্তা প্রেরণ সীমাবদ্ধ',
        'সদস্য সুরক্ষা নীতিমালার কারণে সাধারণ পুরুষ সদস্য কোনো নারী সদস্যকে প্রথম বার্তা দিতে পারবেন না। তবে নারী সদস্য আগে বার্তা দিলে উত্তর দেওয়া যাবে।',
        false
      );
      return;
    }

    sendPrivateMessage(targetUser.id, inputText.trim());
    setInputText('');
  };

  return (
    <AnimatePresence>
    {isOpen && targetUser && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: SMOOTH_EASE }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.26, ease: SMOOTH_EASE }}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full flex flex-col h-[580px] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              src={targetUser.avatarUrl}
              name={targetUser.name}
              size="md"
              ringColor={
                targetUser.role === 'APP_MODERATOR'
                  ? 'ring-amber-500'
                  : targetUser.role === 'MODERATOR'
                  ? 'ring-blue-500'
                  : 'ring-emerald-500'
              }
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-ink text-sm">{targetUser.name}</h3>
                {targetUser.role !== 'MEMBER' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {targetUser.role === 'APP_MODERATOR' ? 'অ্যাপ মডারেটর' : 'মডারেটর'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                আইডি: {targetUser.memberId} • লিঙ্গ:{' '}
                {targetUser.gender === 'MALE' ? 'পুরুষ' : targetUser.gender === 'FEMALE' ? 'নারী' : 'অন্যান্য'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Notice Bar */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800/80 text-[11px] flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-400">ব্যক্তিগত ও এনক্রিপ্টেড ১-অন-১ কনভার্সেশন</span>
        </div>

        {/* Message Thread */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/60 relative">
          {isGuestMode ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-ink">ব্যক্তিগত মেসেজ লক করা রয়েছে</h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                গেস্ট মোডে কোনো ব্যক্তিগত বার্তা দেখা বা পাঠানো যাবে না।
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsAuthModalOpen(true);
                }}
                className="btn-brand px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                সদস্য একাউন্টে লগইন করুন
              </button>
            </div>
          ) : conversationMessages.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400">এই কথোপকথনে এখনও কোনো বার্তা পাঠানো হয়নি।</p>
            </div>
          ) : (
            conversationMessages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;

              return (
                <motion.div
                  key={msg.id}
                  data-msg-id={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: SMOOTH_EASE }}
                  className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-none shadow'
                          : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none shadow'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 block px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Bottom Input Section with Gender-policy enforcement */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          {isBlockedByGenderRule ? (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-200 block">বার্তা প্রেরণ সীমাবদ্ধ:</strong>
                <p className="text-[11px] leading-relaxed mt-0.5">
                  নীতিমালা অনুযায়ী কোনো পুরুষ সদস্য কোনো নারী সদস্যকে প্রথম বার্তা পাঠাতে পারবেন না। তবে নারী সদস্য পূর্বে বার্তা পাঠিয়ে থাকলে কথোপকথন চালু রাখা যাবে।
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`${targetUser.name} কে বার্তা লিখুন...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all cursor-pointer"
              >
                <SpringIcon activeKey={Boolean(inputText.trim())}>
                  <Send className="w-4 h-4" />
                </SpringIcon>
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
