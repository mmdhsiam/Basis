import React, { useState } from 'react';
import { Home, Users, MessageSquare, Plus, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { toBengaliNumerals } from '../../utils/calculations';
import { SpringIcon } from '../common/MotionPrimitives';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenDrawer: () => void;
  isDrawerOpen?: boolean;
  unreadCount: number;
  onNewDeposit?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenDrawer,
  isDrawerOpen = false,
  unreadCount,
  onNewDeposit,
}) => {
  const { chatUnreadCount, markChatSeen } = useApp();

  // Red dot stops blinking once the menu has been opened
  const [hasSeenMenu, setHasSeenMenu] = useState<boolean>(() => {
    try {
      return localStorage.getItem('basis_menu_seen') === 'true';
    } catch {
      return false;
    }
  });

  const handleOpenMenu = () => {
    setHasSeenMenu(true);
    try {
      localStorage.setItem('basis_menu_seen', 'true');
    } catch {
      /* ignore */
    }
    onOpenDrawer();
  };

  const item = (
    id: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    options?: { badgeCount?: number; onSelect?: () => void }
  ) => {
    const isActive = !isDrawerOpen && activeTab === id;
    const badgeCount = options?.badgeCount ?? 0;
    return (
      <button
        key={id}
        onClick={() => {
          if (options?.onSelect) {
            options.onSelect();
          } else {
            setActiveTab(id);
          }
        }}
        aria-current={isActive ? 'page' : undefined}
        className="relative flex-1 min-h-12 flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer select-none active:scale-95 transition-transform duration-100"
      >
        <span
          className={`relative flex items-center justify-center h-7 w-12 rounded-full transition-colors ${
            isActive ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {isActive && (
            <motion.span
              layoutId="bottom-dock-active-pill"
              transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }}
              className="absolute inset-0 rounded-full glowing-nav-item-active"
            />
          )}
          <SpringIcon activeKey={isActive ? `${id}-active` : `${id}-idle`} className="relative z-10">
            <Icon className="w-[20px] h-[20px]" />
          </SpringIcon>
          {badgeCount > 0 && (
            <span className="absolute -top-1 right-1 z-20 min-w-[17px] h-[17px] px-1 rounded-full bg-emerald-500 text-[10px] text-white font-bold flex items-center justify-center ring-2 ring-slate-950">
              {toBengaliNumerals(badgeCount)}
            </span>
          )}
        </span>
        <span
          className={`text-[11px] leading-none transition-colors ${
            isActive ? 'font-bold text-emerald-400' : 'font-normal text-slate-400'
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="নিচের নেভিগেশন"
      className="dock fixed bottom-0 left-0 right-0 z-30 lg:hidden select-none"
    >
      <div className="mx-auto max-w-md px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-end">
        {item('home', 'হোম', Home)}
        {item('members', 'সদস্য', Users)}

        {/* Primary action */}
        <div className="flex-1 flex flex-col items-center -mt-5">
          <motion.button
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 520, damping: 24 }}
            onClick={onNewDeposit}
            aria-label="নতুন সঞ্চয় জমা দিন"
            className="btn-brand w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-slate-900 cursor-pointer"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
          <span className="mt-0.5 text-[11px] font-bold text-emerald-400 leading-none py-1">জমা</span>
        </div>

        {item('chat', 'মেসেজ', MessageSquare, {
          badgeCount: chatUnreadCount,
          onSelect: () => {
            markChatSeen();
            setActiveTab('chat');
          },
        })}

        <button
          onClick={handleOpenMenu}
          aria-label="মেনু"
          aria-expanded={isDrawerOpen}
          className="relative flex-1 min-h-12 flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer group active:scale-95 transition-transform duration-100"
        >
          <span
            className={`relative flex items-center justify-center h-7 w-12 rounded-full transition-colors ${
              isDrawerOpen ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'
            }`}
          >
            {isDrawerOpen && (
              <motion.span
                layoutId="bottom-dock-active-pill"
                transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }}
                className="absolute inset-0 rounded-full glowing-nav-item-active"
              />
            )}
            <SpringIcon activeKey={isDrawerOpen ? 'drawer-open' : 'drawer-idle'} className="relative z-10">
              <LayoutGrid className="w-[20px] h-[20px]" />
            </SpringIcon>
          </span>
          <span
            className={`text-[11px] leading-none transition-colors ${
              isDrawerOpen ? 'font-bold text-emerald-400' : 'font-normal text-slate-400'
            }`}
          >
            মেনু
          </span>
          {unreadCount > 0 && !hasSeenMenu && (
            <span className="absolute top-1 right-4 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};

