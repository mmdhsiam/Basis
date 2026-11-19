import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Vibrate,
  ShieldCheck,
  Flame,
  Image,
  LogOut,
  Bell,
  Smartphone,
  Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { SlidingTabPill, SpringIcon } from '../common/MotionPrimitives';
import { applyThemeWithTransition } from '../../utils/themeTransition';

interface SettingsViewProps {
  onShowExitDialog: () => void;
  onOpenFirebaseGuide?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onShowExitDialog,
  onOpenFirebaseGuide,
}) => {
  const {
    theme,
    themeMode,
    setThemeMode,
    soundEnabled,
    setSoundEnabled,
    hapticEnabled,
    setHapticEnabled,
    currentUser,
    updateUserProfile,
    triggerSuccess,
  } = useApp();

  // Profile image URL editing state
  const [avatarUrlInput, setAvatarUrlInput] = useState(currentUser.avatarUrl || '');
  const [userNameInput, setUserNameInput] = useState(currentUser.name || '');
  const [userPhoneInput, setUserPhoneInput] = useState(currentUser.phone || '');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAvatar = extractDirectImageUrl(avatarUrlInput);
    const ok = updateUserProfile(currentUser.id, {
      name: userNameInput.trim(),
      phone: userPhoneInput.trim(),
      avatarUrl: cleanAvatar || undefined,
    });
    if (ok) {
      triggerSuccess('প্রোফাইল পরিবর্তনের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!');
    }
  };

  return (
    <div className="space-y-5 pb-20 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          <span>অ্যাপ্লিকেশন সেটিংস ও পছন্দসমূহ (Settings)</span>
        </h2>
        <p className="text-xs text-slate-400">
          প্রোফাইল ছবি হালনাগাদ, অডিও ও ভাইব্রেশন পছন্দ, ডিসপ্লে থিম এবং সিস্টেম নিয়ন্ত্রণ। (ফন্ট ও টাইপোগ্রাফি সংক্রান্ত পরিবর্তনসমূহ অ্যাপ মডারেটর অ্যাডমিন প্যানেল থেকে নিয়ন্ত্রিত হয়)
        </p>
      </div>

      {/* 1. Profile Information & Hosted Image Avatar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-ink text-base">
              ব্যবহারকারী প্রোফাইল ছবি ও তথ্য
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {currentUser.memberId}
          </span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            {/* Circular Avatar Auto-Loading Live Preview */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <Avatar
                src={avatarUrlInput}
                name={userNameInput || currentUser.name}
                size="2xl"
                ringColor="ring-4 ring-emerald-500/50"
              />
              <span className="text-[11px] text-slate-400 font-bold">লাইভ প্রিভিউ (সার্কেল)</span>
            </div>

            <div className="space-y-2 w-full">
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  হোস্টেড প্রোফাইল ইমেজ লিংক (Direct / Viewer / HTML / BBCode):
                </label>
                <HostedImageInput
                  value={avatarUrlInput}
                  onChange={setAvatarUrlInput}
                  placeholder="যেমন: https://i.ibb.co/... অথবা গ্যালারি থেকে বাছাই করুন"
                  inputClassName="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * যেকোনো পাবলিক ইমেজ লিংক দিন। এপের হেডার, ড্রয়ার, সদস্য তালিকা ও চ্যাট বক্সে আপনার এই ছবিটি সার্কেল আকারে অটো-লোড হবে।
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">পূর্ণ নাম:</label>
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">মোবাইল নম্বর:</label>
              <input
                type="tel"
                value={userPhoneInput}
                onChange={(e) => setUserPhoneInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>প্রোফাইল পরিবর্তন সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Notification Sounds & Haptic Feedback */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-ink text-base flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-400" />
          <span>সাউন্ড ও ভাইব্রেশন ফিডব্যাক</span>
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <strong className="text-ink block font-bold">অ্যাকশন সাউন্ড ইফেক্ট</strong>
                <span className="text-[11px] text-slate-400">
                  সঞ্চয় জমা, অনুমোদন ও বার্তা প্রেরণে সংক্ষিপ্ত নোটিফিকেশন টোন বাজবে।
                </span>
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`py-1.5 px-4 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {soundEnabled ? 'চালু' : 'বন্ধ'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <Vibrate className={`w-5 h-5 ${hapticEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
              <div>
                <strong className="text-ink block font-bold">হ্যাপটিক ভাইব্রেশন</strong>
                <span className="text-[11px] text-slate-400">
                  বাটন চাপলে স্পর্শ অনুভূতি ও কম্পন প্রদান করবে।
                </span>
              </div>
            </div>

            <button
              onClick={() => setHapticEnabled(!hapticEnabled)}
              className={`py-1.5 px-4 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                hapticEnabled
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {hapticEnabled ? 'চালু' : 'বন্ধ'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Display Theme & App Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-ink text-base">অ্যাপ ডিসপ্লে ও থিম মোড</h3>

        {/* Dark / Light mode (auto-selected from OS preference initially) */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <SpringIcon activeKey={theme}>
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-amber-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
            </SpringIcon>
            <div>
              <p className="font-bold text-slate-100">অ্যাপ থিম (Theme)</p>
              <p className="text-[11px] text-slate-400">
                ডিভাইসের সিস্টেম মোড অনুযায়ী অটো-সিলেক্টেড — ডার্ক মোড বা লাইট মোড নির্বাচন করুন
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={(e) => applyThemeWithTransition('dark', theme, setThemeMode, e.currentTarget)}
              className={`relative px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                theme === 'dark' ? 'text-white' : 'text-slate-400 hover:text-ink'
              }`}
            >
              {theme === 'dark' && (
                <SlidingTabPill layoutId="settings-theme-pill" className="bg-emerald-600 shadow" />
              )}
              <span className="relative z-10">ডার্ক মোড</span>
            </button>
            <button
              type="button"
              onClick={(e) => applyThemeWithTransition('light', theme, setThemeMode, e.currentTarget)}
              className={`relative px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                theme === 'light' ? 'text-white' : 'text-slate-400 hover:text-ink'
              }`}
            >
              {theme === 'light' && (
                <SlidingTabPill layoutId="settings-theme-pill" className="bg-emerald-600 shadow" />
              )}
              <span className="relative z-10">লাইট মোড</span>
            </button>
          </div>
        </div>

        {/* Firebase Setup Guide Launcher */}
        {onOpenFirebaseGuide && (
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-bold text-slate-100">ফায়ারবেজ লগইন ও কনফিগারেশন গাইড</p>
                <p className="text-[11px] text-slate-400">স্টেপ বাই স্টেপ সেটআপ নির্দেশনা দেখুন</p>
              </div>
            </div>

            <button
              onClick={onOpenFirebaseGuide}
              className="py-1.5 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs transition-colors cursor-pointer"
            >
              গাইড খুলুন
            </button>
          </div>
        )}

        {/* Exit App */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="font-bold text-rose-400">অ্যাপ্লিকেশন সেশন সমাপ্তি</p>
            <p className="text-[11px] text-slate-500">অ্যান্ড্রয়েড প্রস্থান নিশ্চিতকরণ ডায়ালগ</p>
          </div>

          <button
            onClick={onShowExitDialog}
            className="py-2 px-4 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 font-bold text-xs transition-colors cursor-pointer"
          >
            অ্যাপ থেকে প্রস্থান
          </button>
        </div>
      </div>
    </div>
  );
};
