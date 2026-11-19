import React, { useLayoutEffect, useRef } from 'react';
import {
  X,
  Home,
  Users,
  Wallet,
  Receipt,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Bell,
  BookOpen,
  FileText,
  Lightbulb,
  FileSpreadsheet,
  LogOut,
  Building2,
  User,
  Award,
  Search,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toBengaliNumerals } from '../../utils/calculations';
import { Avatar } from '../common/Avatar';
import { AnimatePresence, motion } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onShowExitDialog: () => void;
  onOpenFirebaseGuide?: () => void;
}

type Tone = 'emerald' | 'sky' | 'amber' | 'indigo' | 'rose' | 'violet' | 'teal';

/** Tailwind-safe tone → chip classes (literal strings so the compiler can see them) */
const TONES: Record<Tone, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-400',
  sky: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-emerald-500/15 text-emerald-400',
  indigo: 'bg-emerald-500/15 text-emerald-400',
  rose: 'bg-emerald-500/15 text-emerald-400',
  violet: 'bg-emerald-500/15 text-emerald-400',
  teal: 'bg-emerald-500/15 text-emerald-400',
};

interface NavDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  group: 'main' | 'finance' | 'community' | 'support' | 'admin';
  badge?: string | null;
  badgeClass?: string;
  roles: string[];
}

const GROUPS: { id: NavDef['group']; title: string }[] = [
  { id: 'main', title: 'মূল মেনু' },
  { id: 'finance', title: 'আর্থিক হিসাব' },
  { id: 'community', title: 'কমিউনিটি' },
  { id: 'support', title: 'নীতিমালা ও সহায়তা' },
  { id: 'admin', title: 'প্রশাসন' },
];

const ALL_ROLES = ['APP_MODERATOR', 'MODERATOR', 'MEMBER'];

/**
 * Shared navigation content. Used by the slide-over drawer (mobile / tablet)
 * and by the permanent sidebar (desktop ≥ lg).
 */
export const NavPanel: React.FC<
  Omit<NavigationDrawerProps, 'isOpen'> & { variant: 'drawer' | 'sidebar' }
> = ({ onClose, activeTab, setActiveTab, variant }) => {
  const {
    currentUser,
    isGuestMode,
    logoutUser,
    config,
    unreadCount,
    unreadNoticeCount,
    markNoticesSeen,
    setIsSearchModalOpen,
    setIsAuthModalOpen,
    markChatSeen,
  } = useApp();

  const navScrollRef = useRef<HTMLElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const normalizedActiveTab = activeTab === 'settings' ? 'profile' : activeTab;

  // Center active tab naturally within available scroll range without blank top/bottom padding
  useLayoutEffect(() => {
    const navEl = navScrollRef.current;
    const itemEl = activeItemRef.current;
    if (!navEl || !itemEl) return;

    const centerActiveItem = () => {
      const navRect = navEl.getBoundingClientRect();
      const itemRect = itemEl.getBoundingClientRect();
      const maxScroll = Math.max(0, navEl.scrollHeight - navEl.clientHeight);
      const targetScroll =
        navEl.scrollTop + (itemRect.top - navRect.top) - navRect.height / 2 + itemRect.height / 2;
      navEl.scrollTo({
        top: Math.min(maxScroll, Math.max(0, targetScroll)),
        behavior: 'auto',
      });
    };

    centerActiveItem();
    const raf = requestAnimationFrame(centerActiveItem);
    return () => cancelAnimationFrame(raf);
  }, [normalizedActiveTab, variant]);

  const navItems: NavDef[] = [
    { id: 'home', label: 'হোম ড্যাশবোর্ড', icon: Home, tone: 'emerald', group: 'main', roles: ALL_ROLES },
    { id: 'profile', label: 'প্রোফাইল ও অ্যাপ সেটিংস', icon: User, tone: 'sky', group: 'main', roles: ALL_ROLES },
    { id: 'savings', label: 'সঞ্চয় খাতা ও নতুন জমা', icon: Wallet, tone: 'emerald', group: 'finance', roles: ALL_ROLES },
    { id: 'receipts', label: 'রসিদ ও পিডিএফ স্টেটমেন্ট', icon: Receipt, tone: 'teal', group: 'finance', roles: ALL_ROLES },
    { id: 'analytics', label: 'হিসাব বিশ্লেষণ ও গ্রাফ', icon: BarChart3, tone: 'violet', group: 'finance', roles: ALL_ROLES },
    { id: 'bank', label: 'ব্যাংক ইনফরমেশন ও হিসাব', icon: Building2, tone: 'indigo', group: 'finance', roles: ALL_ROLES },
    { id: 'sheets', label: 'গুগল শিটস ক্লাউড সিঙ্ক', icon: FileSpreadsheet, tone: 'emerald', group: 'finance', roles: ALL_ROLES },
    { id: 'members', label: 'সদস্য তালিকা ও পদবি', icon: Users, tone: 'sky', group: 'community', roles: ALL_ROLES },
    { id: 'chat', label: 'কমিউনিটি চ্যাট ও ইনবক্স', icon: MessageSquare, tone: 'indigo', group: 'community', roles: ALL_ROLES },
    {
      id: 'notices',
      label: 'নোটিশ বোর্ড',
      icon: Bell,
      tone: 'amber',
      group: 'community',
      badge: unreadNoticeCount > 0 ? toBengaliNumerals(unreadNoticeCount) : null,
      badgeClass: 'bg-rose-500',
      roles: ALL_ROLES,
    },
    { id: 'executive', label: 'কার্যনির্বাহী পর্ষদ', icon: Award, tone: 'amber', group: 'community', roles: ALL_ROLES },
    { id: 'rules', label: 'ফাউন্ডেশন গঠনতন্ত্র ও বিধি', icon: FileText, tone: 'rose', group: 'support', roles: ALL_ROLES },
    { id: 'complaints', label: 'অভিযোগ প্রতিকার সেল', icon: FileText, tone: 'teal', group: 'support', roles: ALL_ROLES },
    { id: 'features', label: 'নতুন ফিচারের প্রস্তাবনা', icon: Lightbulb, tone: 'amber', group: 'support', roles: ALL_ROLES },
    { id: 'about-us', label: 'আমাদের সম্পর্কে (About Us)', icon: BookOpen, tone: 'emerald', group: 'support', roles: ALL_ROLES },
    {
      id: 'moderator',
      label: 'মডারেটর প্যানেল',
      icon: ShieldCheck,
      tone: 'amber',
      group: 'admin',
      badge: unreadCount > 0 ? toBengaliNumerals(unreadCount) : null,
      badgeClass: 'bg-rose-500',
      roles: ['APP_MODERATOR', 'MODERATOR'],
    },
    { id: 'app-moderator', label: 'অ্যাপ মডারেটর অ্যাডমিন', icon: ShieldAlert, tone: 'rose', group: 'admin', roles: ['APP_MODERATOR'] },
  ];

  const rawOrder = config.navTabsOrder || [];
  const customTitles = config.customTabTitles || {};

  const orderOf = (id: string) => {
    const i = rawOrder.indexOf(id);
    return i === -1 ? 999 : i;
  };

  const visibleItems = navItems
    .map((item) => ({ ...item, label: customTitles[item.id] || item.label }))
    .filter((item) =>
      !isGuestMode && currentUser ? item.roles.includes(currentUser.role) : item.roles.includes('MEMBER')
    );

  const handleSelect = (id: string) => {
    if (id === 'notices') markNoticesSeen();
    if (id === 'chat') markChatSeen();
    setActiveTab(id);
    if (variant === 'drawer') onClose();
  };

  const roleLabel =
    currentUser?.role === 'APP_MODERATOR' ? 'অ্যাপ মডারেটর' : currentUser?.role === 'MODERATOR' ? 'মডারেটর' : 'সাধারণ সদস্য';
  const roleChip =
    currentUser?.role === 'APP_MODERATOR'
      ? 'bg-[#d5a23b]/30 text-white border-white/30'
      : currentUser?.role === 'MODERATOR'
      ? 'bg-sky-300/30 text-white border-white/30'
      : 'bg-white/15 text-white border-white/25';

  return (
    <div data-nav-panel className="h-full flex flex-col bg-slate-900 text-slate-100">
      {/* Top: Compact Identity Card + Transparent Search Box (Point 1 & 4) */}
      <div className="p-2.5 pb-1.5 space-y-2 shrink-0">
        <div className="relative overflow-hidden rounded-2xl bg-hero p-3 text-white">
          <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full border-[18px] border-white/10" />

          <div className="relative flex items-start justify-between gap-2">
            {!isGuestMode && currentUser ? (
              <button
                onClick={() => handleSelect('profile')}
                className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
              >
                <Avatar
                  src={currentUser.avatarUrl}
                  name={currentUser.name}
                  size="md"
                  ringColor="ring-[#d5a23b]"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-xs truncate leading-tight max-w-[130px]">{currentUser.name}</h3>
                  <p className="text-[10px] text-white/90 font-mono mt-0.5">আইডি: {currentUser.memberId}</p>
                  <span className={`mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${roleChip}`}>
                    {roleLabel}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs leading-tight">অতিথি দর্শক</h3>
                  <button
                    onClick={() => {
                      onClose();
                      setIsAuthModalOpen(true);
                    }}
                    className="mt-0.5 text-[10px] text-white/90 hover:text-white font-bold underline underline-offset-2 cursor-pointer text-left"
                  >
                    লগইন / রেজিস্টার
                  </button>
                </div>
              </div>
            )}

            {variant === 'drawer' && (
              <button
                onClick={onClose}
                aria-label="মেনু বন্ধ করুন"
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Universal search at top of menu — strictly NO background color (Point 1) */}
        <button
          type="button"
          onClick={() => {
            onClose();
            setIsSearchModalOpen(true);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-transparent border border-slate-700/80 hover:border-emerald-500/70 text-ink text-xs font-bold transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate text-slate-400">সার্চ করুন...</span>
        </button>
      </div>

      {/* Scrollable Navigation Tabs + Logout as Final Scrollable Tab (Points 2, 4, 7) */}
      <nav
        ref={navScrollRef}
        className="flex-1 overflow-y-auto px-2.5 py-1.5 pb-4"
      >
        {GROUPS.map((group) => {
          const items = visibleItems
            .filter((i) => i.group === group.id)
            .sort((a, b) => orderOf(a.id) - orderOf(b.id));
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="mt-2.5 first:mt-0">
              <p className="px-1.5 pb-1 text-[10.5px] font-bold text-slate-500">
                {group.title}
              </p>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = normalizedActiveTab === item.id;
                  return (
                    <button
                      key={item.id}
                      ref={isActive ? activeItemRef : undefined}
                      onClick={() => handleSelect(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-[12.5px] min-h-10 transition-all cursor-pointer active:scale-[0.98] ${
                        isActive
                          ? 'nav-tab-active-card text-emerald-400 font-bold ring-1 ring-emerald-400/50 bg-emerald-500/15 shadow-sm'
                          : 'nav-tab-card text-slate-300 hover:bg-slate-800/80 font-bold'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId={`nav-active-pill-${variant}`}
                          transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.7 }}
                          className="absolute inset-0 rounded-xl glowing-nav-item-active pointer-events-none"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isActive ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40' : TONES[item.tone]
                          }`}
                        >
                          <SpringIcon activeKey={isActive ? `${item.id}-on` : `${item.id}-off`}>
                            <Icon className="w-3.5 h-3.5" />
                          </SpringIcon>
                        </span>
                        <span className="whitespace-nowrap text-left">{item.label}</span>
                      </span>

                      {item.badge ? (
                        <span
                          className={`relative z-10 text-[9.5px] px-1.5 py-0.5 rounded-full text-white font-bold shrink-0 ${
                            item.badgeClass || 'bg-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : !isActive ? (
                        <ChevronRight
                          className="relative z-10 w-3.5 h-3.5 shrink-0 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Point 2: Logout tab placed as the very last item inside the scrollable tab list */}
        {!isGuestMode && currentUser && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/70">
            <button
              type="button"
              onClick={() => {
                onClose();
                logoutUser();
              }}
              className="nav-tab-card relative group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-[12.5px] min-h-10 font-bold text-rose-400 hover:bg-rose-500/15 border border-rose-500/25 transition-all cursor-pointer active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <LogOut className="w-3.5 h-3.5" />
                </span>
                <span className="whitespace-nowrap text-left">লগ আউট</span>
              </span>
              <ChevronRight className="relative z-10 w-3.5 h-3.5 shrink-0 text-rose-400/70 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        )}
      </nav>
    </div>
  );
};

/** Slide-over drawer for phones & tablets — expands from the RIGHT side, sized tightly around tab text (Point 4) */
export const NavigationDrawer: React.FC<NavigationDrawerProps> = (props) => {
  const { isOpen, onClose } = props;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, delay: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, delay: 0, ease: SMOOTH_EASE }}
            style={{ willChange: 'transform' }}
            aria-label="প্রধান মেনু"
            className="relative w-max min-w-[13.25rem] max-w-[82vw] h-full border-l border-slate-800 shadow-2xl z-10 overflow-hidden"
          >
            <NavPanel {...props} variant="drawer" />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

/** Permanent sidebar for desktop (≥ lg) — compact w-60 width (Point 4) */
export const SidebarNav: React.FC<Omit<NavigationDrawerProps, 'isOpen'>> = (props) => (
  <aside
    aria-label="প্রধান মেনু"
    className="hidden lg:block fixed left-0 top-0 bottom-0 w-60 z-[45] border-r border-slate-800"
  >
    <NavPanel {...props} variant="sidebar" />
  </aside>
);

