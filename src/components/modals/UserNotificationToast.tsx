import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Bell, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { UserNotification } from '../../types';
import { SMOOTH_EASE } from '../common/MotionPrimitives';

const SHOWN_TOASTS_KEY = 'basis_shown_notif_toasts_v1';

function getShownMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(SHOWN_TOASTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

function saveShownId(memberKey: string, notifId: string) {
  try {
    const map = getShownMap();
    const list = Array.isArray(map[memberKey]) ? map[memberKey] : [];
    if (!list.includes(notifId)) {
      map[memberKey] = [...list.slice(-80), notifId];
      localStorage.setItem(SHOWN_TOASTS_KEY, JSON.stringify(map));
    }
  } catch {}
}

export const UserNotificationToast: React.FC = () => {
  const { userNotifications, currentUser, isGuestMode, markNotificationRead } = useApp();
  const [activeToasts, setActiveToasts] = useState<UserNotification[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const mountTimeRef = useRef<number>(Date.now());

  const dismissToast = (notifId: string) => {
    if (timersRef.current[notifId]) {
      clearTimeout(timersRef.current[notifId]);
      delete timersRef.current[notifId];
    }
    markNotificationRead(notifId);
    setActiveToasts((prev) => prev.filter((t) => t.id !== notifId));
  };

  useEffect(() => {
    if (isGuestMode || !currentUser || currentUser.memberId === 'GUEST') {
      setActiveToasts([]);
      return;
    }

    const memberKey = currentUser.memberId;
    const shownForMember = new Set(getShownMap()[memberKey] || []);

    const candidates = userNotifications.filter((n) => {
      if (!n || n.id === 'notif-welcome' || shownForMember.has(n.id)) return false;

      if (n.userId === memberKey) {
        // Always toast unread personal notifications (e.g. DEPOSIT_APPROVED, PROFILE_APPROVED, general approvals)
        if (!n.read) return true;
        // Or freshly created within this live session
        const createdMs = new Date(n.createdAt).getTime();
        return Number.isFinite(createdMs) && createdMs >= mountTimeRef.current - 3000;
      }

      if (n.userId === 'ALL') {
        const createdMs = new Date(n.createdAt).getTime();
        return Number.isFinite(createdMs) && createdMs >= mountTimeRef.current - 2000;
      }

      return false;
    });

    if (candidates.length === 0) return;

    const toShow = candidates.slice(0, 3);
    toShow.forEach((notif) => {
      saveShownId(memberKey, notif.id);
      if (!timersRef.current[notif.id]) {
        timersRef.current[notif.id] = setTimeout(() => {
          dismissToast(notif.id);
        }, 6500);
      }
    });

    setActiveToasts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const fresh = toShow.filter((n) => !existingIds.has(n.id));
      return fresh.length > 0 ? [...fresh, ...prev].slice(0, 3) : prev;
    });
  }, [userNotifications, currentUser, isGuestMode]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
      timersRef.current = {};
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed top-3 inset-x-0 z-[85] pointer-events-none flex flex-col items-center px-3 sm:px-5 gap-2">
      <AnimatePresence>
        {activeToasts.map((toast) => {
          const isRejected = toast.color === 'rose' || toast.type === 'DEPOSIT_REJECTED';
          const isAmber = toast.color === 'amber' || toast.type === 'NEW_NOTICE';
          const isBlue = toast.color === 'blue' || toast.type === 'PROFILE_APPROVED';

          const borderClass = isRejected
            ? 'border-rose-500/70 bg-slate-900/95'
            : isAmber
            ? 'border-amber-500/70 bg-slate-900/95'
            : isBlue
            ? 'border-sky-500/70 bg-slate-900/95'
            : 'border-emerald-500/80 bg-slate-900/95';

          const iconWrapClass = isRejected
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
            : isAmber
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            : isBlue
            ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ duration: 0.24, delay: 0, ease: SMOOTH_EASE }}
              className={`pointer-events-auto w-full max-w-md rounded-2xl border ${borderClass} backdrop-blur-xl shadow-2xl p-3.5 flex items-start gap-3`}
            >
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${iconWrapClass}`}
              >
                {isRejected ? (
                  <AlertCircle className="w-5 h-5" />
                ) : isAmber ? (
                  <Bell className="w-4 h-4" />
                ) : isBlue ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-ink leading-snug">
                  {toast.title}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mt-0.5">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="নোটিফিকেশন বন্ধ করুন"
                className="p-1.5 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
};
