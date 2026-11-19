import React from 'react';
import {
  Bell,
  PhoneCall,
  LogIn,
  Edit3,
  User,
  Megaphone,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toBengaliNumerals } from '../../utils/calculations';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { Avatar } from '../common/Avatar';
import { motion } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';
import { applyThemeWithTransition } from '../../utils/themeTransition';

interface HeaderProps {
  onOpenDrawer: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleProfile?: () => void;
  onInitiateCall: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  home: 'হোম ড্যাশবোর্ড',
  members: 'সদস্য তালিকা ও পদবি',
  savings: 'সঞ্চয় খাতা',
  receipts: 'রসিদ ও স্টেটমেন্ট',
  analytics: 'হিসাব বিশ্লেষণ',
  moderator: 'মডারেটর প্যানেল',
  'app-moderator': 'অ্যাপ মডারেটর অ্যাডমিন',
  chat: 'কমিউনিটি চ্যাট',
  notices: 'নোটিশ বোর্ড',
  executive: 'কার্যনির্বাহী পর্ষদ',
  rules: 'গঠনতন্ত্র ও বিধি',
  complaints: 'অভিযোগ প্রতিকার সেল',
  features: 'ফিচার প্রস্তাবনা',
  sheets: 'গুগল শিটস সিঙ্ক',
  profile: 'প্রোফাইল ও সেটিংস',
  bank: 'ব্যাংক ইনফরমেশন',
  'about-us': 'আমাদের সম্পর্কে',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onToggleProfile,
  onInitiateCall,
}) => {
  const {
    config,
    currentUser,
    isGuestMode,
    isOnline,
    setIsOnline,
    unreadNoticeCount,
    hasUnreadNotices,
    markNoticesSeen,
    setIsAuthModalOpen,
    theme,
    setThemeMode,
  } = useApp();

  const resolvedLogoUrl = extractDirectImageUrl(config.logoUrl) || config.logoUrl || '/logo.svg';

  const announcementText =
    config.scrollingAnnouncement ||
    '[জরুরি বিজ্ঞপ্তি] বেসিস ফাউন্ডেশন ডিজিটাল সঞ্চয় প্ল্যাটফর্মে স্বাগতম। প্রতি মাসের ১০ তারিখের মধ্যে আপনার নিয়মিত সঞ্চয় জমা সম্পন্ন করুন।';

  const tickerSpeed = config.tickerSpeed || 'normal';
  const baseSpeedSec = tickerSpeed === 'slow' ? 65 : tickerSpeed === 'fast' ? 22 : 38;
  const scaledSec = Math.round(
    baseSpeedSec * Math.max(1, announcementText.length / 120)
  );
  const marqueeDuration = `${scaledSec}s`;

  const logoSize = Math.min(Math.max(config.headerLogoSize || 44, 32), 46);
  const titleScale = config.headerTitleScale || 100;

  const urgentTag = '[জরুরি বিজ্ঞপ্তি]';
  const updateTag = '[হালনাগাদ বিজ্ঞপ্তি]';
  const renderAnnouncement = (text: string) => {
    const isUrgent = text.includes(urgentTag);
    const isUpdated = text.includes(updateTag);
    const cleanText = text
      .split(urgentTag)
      .join('')
      .split(updateTag)
      .join('')
      .trim();
    const colonIdx = cleanText.indexOf(':');
    const hasTitle = colonIdx > 0 && colonIdx < cleanText.length - 1;
    const noticeTitle = hasTitle ? cleanText.slice(0, colonIdx).trim() : '';
    const noticeBody = hasTitle ? cleanText.slice(colonIdx + 1).trim() : cleanText;

    return (
      <span className="inline-flex items-center gap-2">
        {isUrgent && (
          <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 rounded-md text-[10px] font-bold">
            জরুরি
          </span>
        )}
        {!isUrgent && isUpdated && (
          <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 rounded-md text-[10px] font-bold">
            হালনাগাদ
          </span>
        )}
        {hasTitle ? (
          <span>
            <strong className="font-bold text-amber-500 dark:text-amber-200 mr-1.5">
              {noticeTitle}:
            </strong>
            <span className="text-slate-200">{noticeBody}</span>
          </span>
        ) : (
          <span className="text-slate-200">{noticeBody}</span>
        )}
      </span>
    );
  };

  const iconBtn =
    'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border border-slate-800 bg-slate-900 text-slate-300 hover:text-ink hover:border-slate-700 active:scale-95';
  const iconBtnActive =
    'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 active:scale-95';

  const isDark = theme === 'dark';
  const ActiveModeIcon = isDark ? Moon : Sun;
  const activeModeLabel = isDark ? 'ডার্ক' : 'লাইট';

  const handleToggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nextMode = isDark ? 'light' : 'dark';
    applyThemeWithTransition(nextMode, theme, setThemeMode, e.currentTarget);
  };

  const handleProfileClick = () => {
    if (onToggleProfile) {
      onToggleProfile();
    } else {
      setActiveTab(activeTab === 'profile' ? 'home' : 'profile');
    }
  };

  return (
    <header className="sticky top-0 z-40 glass border-x-0 border-t-0 lg:ml-60 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-5 h-[60px] flex items-center justify-between gap-2">
        {/* Left: brand (mobile) / page title (desktop) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setActiveTab('home')}
            className="lg:hidden flex items-center gap-2 min-w-0 cursor-pointer text-left"
            aria-label="হোমে যান"
          >
            <span
              style={{ width: logoSize - 6, height: logoSize - 6 }}
              className="rounded-xl bg-emerald-600 p-[2px] flex items-center justify-center shrink-0 overflow-hidden"
            >
              <img
                src={resolvedLogoUrl}
                alt="Logo"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                }}
                className={`w-full h-full ${resolvedLogoUrl === '/logo.svg' ? 'object-contain' : 'object-cover'} rounded-[10px]`}
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span
                style={{ fontSize: `${(titleScale / 100) * 0.98}rem` }}
                className="block font-bold text-ink truncate"
              >
                {config.foundationName}
              </span>
              <span className="block text-[9px] font-bold tracking-[0.12em] text-emerald-400 uppercase truncate">
                Basis Foundation
              </span>
            </span>
          </button>

          {!isGuestMode && currentUser?.role === 'APP_MODERATOR' && (
            <button
              onClick={() => setActiveTab('app-moderator')}
              title="ফাউন্ডেশন টাইটেল ও লোগো সাইজ পরিবর্তন"
              aria-label="টাইটেল সম্পাদনা"
              className="hidden sm:flex lg:hidden p-1 rounded-lg text-amber-400 hover:bg-slate-800 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="hidden lg:block min-w-0">
            <motion.h1
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, delay: 0, ease: SMOOTH_EASE }}
              className="text-lg font-bold text-ink truncate leading-tight"
            >
              {PAGE_TITLES[activeTab] || config.foundationName}
            </motion.h1>
            <p className="text-[11px] text-slate-400 font-bold">{config.foundationName}</p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Single-Click Light/Dark Mode Toggle Icon (Point 1 — No Dropdown) */}
          <button
            data-theme-toggle="true"
            type="button"
            onClick={handleToggleTheme}
            aria-label={`থিম পরিবর্তন করুন (বর্তমান: ${activeModeLabel})`}
            title={`থিম মোড: ${activeModeLabel} — ক্লিক করলে ${isDark ? 'লাইট' : 'ডার্ক'} মোড চালু হবে`}
            className={iconBtn}
          >
            <SpringIcon activeKey={`mode-${theme}`}>
              <ActiveModeIcon
                className={`w-[18px] h-[18px] ${isDark ? 'text-amber-400' : 'text-amber-500'}`}
              />
            </SpringIcon>
          </button>

          <button
            onClick={() => setIsOnline(!isOnline)}
            title={isOnline ? 'ইন্টারনেট সক্রিয় (Online)' : 'ইন্টারনেট বিচ্ছিন্ন (Offline)'}
            aria-label="নেটওয়ার্ক অবস্থা"
            className="hidden md:flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-800 bg-slate-900 text-[11px] font-bold cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>{isOnline ? 'অনলাইন' : 'অফলাইন'}</span>
          </button>

          <button
            onClick={onInitiateCall}
            title="গ্রুপ কল শুরু করুন"
            aria-label="গ্রুপ কল"
            className={`${iconBtn} hidden sm:flex text-emerald-400`}
          >
            <SpringIcon activeKey="call">
              <PhoneCall className="w-[18px] h-[18px]" />
            </SpringIcon>
          </button>

          <button
            onClick={() => {
              markNoticesSeen();
              window.dispatchEvent(new CustomEvent('notices-reset-official'));
              setActiveTab('notices');
            }}
            aria-label="নোটিফিকেশন"
            className={activeTab === 'notices' ? iconBtnActive : iconBtn}
          >
            <SpringIcon activeKey={activeTab === 'notices' ? 'bell-on' : 'bell-off'}>
              <Bell className="w-[18px] h-[18px]" />
            </SpringIcon>
            {hasUnreadNotices && unreadNoticeCount > 0 && (
              <motion.span
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center ring-2 ring-slate-950 animate-pulse"
              >
                {toBengaliNumerals(unreadNoticeCount)}
              </motion.span>
            )}
          </button>

          {!isGuestMode && currentUser ? (
            <button
              onClick={handleProfileClick}
              className={`inline-flex items-center justify-center w-10 h-10 aspect-square rounded-full p-0 leading-none border-2 border-[#d5a23b] overflow-hidden shadow-[0_0_12px_rgba(213,162,59,0.32)] transition-all cursor-pointer shrink-0 active:scale-95 ${
                activeTab === 'profile'
                  ? 'ring-2 ring-[#f3cb68]/75'
                  : 'hover:border-[#f3cb68] hover:shadow-[0_0_16px_rgba(213,162,59,0.45)]'
              }`}
              title={
                activeTab === 'profile'
                  ? 'প্রোফাইল বন্ধ করে পূর্বের ট্যাবে ফিরুন'
                  : `${currentUser.name} - প্রোফাইল ও সেটিংস`
              }
              aria-label="প্রোফাইল"
            >
              <Avatar
                src={currentUser.avatarUrl}
                name={currentUser.name}
                size="md"
                className="!w-full !h-full"
                ringColor="ring-0"
              />
            </button>
          ) : (
            <>
              <button
                onClick={handleProfileClick}
                aria-label="প্রোফাইল ও সেটিংস"
                className={`relative w-10 h-10 rounded-full hidden sm:flex items-center justify-center transition-all cursor-pointer border-2 border-[#d5a23b] shadow-[0_0_10px_rgba(213,162,59,0.25)] active:scale-95 ${
                  activeTab === 'profile'
                    ? 'bg-emerald-500/15 text-[#f3cb68] ring-2 ring-[#f3cb68]/60'
                    : 'bg-slate-900 text-[#e7bd58] hover:border-[#f3cb68]'
                }`}
              >
                <User className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="btn-brand h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>লগইন</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Announcement ribbon */}
      <div className="border-t border-slate-800 bg-emerald-500/[0.06]">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 h-8 flex items-center gap-2.5 overflow-hidden">
          <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-grad text-[10px] font-bold text-amber-950">
            <Megaphone className="w-3 h-3" />
            ঘোষণা
          </span>
          <div className="overflow-hidden relative w-full text-[12px] flex">
            <div
              className="animate-marquee inline-flex items-center gap-10 whitespace-nowrap shrink-0"
              style={{ animationDuration: marqueeDuration }}
            >
              {renderAnnouncement(announcementText)}
              <span className="text-slate-600">•</span>
              {renderAnnouncement(announcementText)}
              <span className="text-slate-600">•</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
