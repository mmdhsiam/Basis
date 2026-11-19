import React, { useState, useEffect } from 'react';
import {
  User,
  Wallet,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
  Edit3,
  Save,
  Image as ImageIcon,
  Printer,
  Lock,
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Vibrate,
  Bell,
  HardDriveDownload,
  Flame,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrencyBengali, toBengaliNumerals, getUserDesignationList } from '../../utils/calculations';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { StatementPrintModal } from '../modals/StatementPrintModal';
import { motion, AnimatePresence } from 'motion/react';
import {
  AnimatedNumber,
  SlidingTabPill,
  SpringIcon,
  SMOOTH_EASE,
} from '../common/MotionPrimitives';
import { applyThemeWithTransition } from '../../utils/themeTransition';

interface ProfileViewProps {
  onOpenReceipt?: (txId: string) => void;
  onShowExitDialog?: () => void;
  onOpenFirebaseGuide?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenReceipt,
  onShowExitDialog,
  onOpenFirebaseGuide,
}) => {
  const {
    currentUser,
    isGuestMode,
    logoutUser,
    setIsAuthModalOpen,
    triggerGuestWarning,
    requestProfileChange,
    savings,
    overdueReminders,
    config,
    triggerSuccess,
    checkPendingRequestWarning,
    setActivePrintReceipt,
    getReceiptForTransaction,
    theme,
    themeMode,
    setThemeMode,
    soundEnabled,
    setSoundEnabled,
    hapticEnabled,
    setHapticEnabled,
    pushNotificationsEnabled,
    togglePushNotifications,
    storageAccessEnabled,
    toggleStorageAccess,
    executiveMembers,
  } = useApp();

  const isModerator =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  // Personal edit states
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [address, setAddress] = useState(currentUser.address || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [nomineeName, setNomineeName] = useState(currentUser.nomineeName || '');
  const [nomineeRelation, setNomineeRelation] = useState(currentUser.nomineeRelation || '');
  const [nomineePhone, setNomineePhone] = useState(currentUser.nomineePhone || '');
  const [signatureType, setSignatureType] = useState<'NAME' | 'IMAGE'>(
    currentUser.signatureType || 'NAME'
  );
  const [signatureImageUrl, setSignatureImageUrl] = useState(currentUser.signatureImageUrl || '');
  const [nidFrontImageUrl, setNidFrontImageUrl] = useState(currentUser.nidFrontImageUrl || '');
  const [nidBackImageUrl, setNidBackImageUrl] = useState(currentUser.nidBackImageUrl || '');

  // Statement modal state
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Sync local form fields when logged-in user changes or when approved profile updates arrive
  useEffect(() => {
    setIsEditing(false);
  }, [currentUser.id]);

  useEffect(() => {
    if (isEditing) return;
    setName(currentUser.name);
    setPhone(currentUser.phone);
    setEmail(currentUser.email);
    setAddress(currentUser.address || '');
    setAvatarUrl(currentUser.avatarUrl || '');
    setNomineeName(currentUser.nomineeName || '');
    setNomineeRelation(currentUser.nomineeRelation || '');
    setNomineePhone(currentUser.nomineePhone || '');
    setSignatureType(currentUser.signatureType || 'NAME');
    setSignatureImageUrl(currentUser.signatureImageUrl || '');
    setNidFrontImageUrl(currentUser.nidFrontImageUrl || '');
    setNidBackImageUrl(currentUser.nidBackImageUrl || '');
  }, [currentUser, isEditing]);

  // User's own savings transactions (Empty for unified Guest User)
  const userSavings = isGuestMode
    ? []
    : savings
        .filter((s) => s.memberId === currentUser.id || s.memberId === currentUser.memberId)
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const approvedSavings = userSavings.filter((s) => s.status === 'APPROVED');
  const pendingSavings = userSavings.filter((s) => s.status === 'PENDING');

  const totalApprovedAmount = approvedSavings.reduce((acc, s) => acc + s.amount, 0);
  const totalPendingAmount = pendingSavings.reduce((acc, s) => acc + s.amount, 0);

  // Point 1: Guest users NEVER get overdue reminder alerts
  const isOverdue = !isGuestMode && overdueReminders.includes(currentUser.memberId);

  const handleEditClick = () => {
    if (isGuestMode) {
      triggerGuestWarning('প্রোফাইল সম্পাদনা');
      return;
    }
    if (
      !isEditing &&
      checkPendingRequestWarning(
        {
          requestTypes: ['PROFILE_CHANGE', 'MODERATOR_APPOINTMENT', 'MEMBER_REMOVE'],
          targetRecordId: currentUser.id,
        },
        `প্রোফাইল সম্পাদনা (${currentUser.name})`
      )
    ) {
      return;
    }
    setIsEditing(!isEditing);
  };

  const handleStatementClick = () => {
    if (isGuestMode) {
      triggerGuestWarning('হিসাব স্টেটমেন্ট ডাউনলোড');
      return;
    }
    setIsStatementModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestMode) {
      triggerGuestWarning('প্রোফাইল সংরক্ষণ');
      return;
    }
    const cleanAvatar = extractDirectImageUrl(avatarUrl);
    const cleanSignature = extractDirectImageUrl(signatureImageUrl);
    const cleanNidFront = extractDirectImageUrl(nidFrontImageUrl);
    const cleanNidBack = extractDirectImageUrl(nidBackImageUrl);

    const nextFields: Record<string, any> = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim() || undefined,
      avatarUrl: cleanAvatar || undefined,
      nomineeName: nomineeName.trim() || undefined,
      nomineeRelation: nomineeRelation.trim() || undefined,
      nomineePhone: nomineePhone.trim() || undefined,
      signatureType,
      signatureImageUrl: cleanSignature || undefined,
      nidFrontImageUrl: cleanNidFront || undefined,
      nidBackImageUrl: cleanNidBack || undefined,
    };

    const proposedChanges: { field: string; oldValue: any; newValue: any }[] = [];
    Object.keys(nextFields).forEach((field) => {
      const prevVal = (currentUser as any)[field] ?? '';
      const nextVal = nextFields[field] ?? '';
      if (String(prevVal) !== String(nextVal)) {
        proposedChanges.push({
          field,
          oldValue: prevVal || 'খালি',
          newValue: nextFields[field] ?? '',
        });
      }
    });

    const ok = requestProfileChange(currentUser.id, proposedChanges);
    if (ok && proposedChanges.length > 0) {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Overdue Alert banner (Never shown to Guest users) */}
      {isOverdue && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-[22px] flex items-start gap-3.5">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-ink text-sm">সঞ্চয় বকেয়া তাগিদ বার্তা:</h4>
            <p className="text-xs leading-relaxed font-bold">
              আপনি এই মাসের টাকা এখনো জমা দেননি। যথাসময়ে টাকা জমা করার জন্য অনুরোধ করা হলো।
            </p>
          </div>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-[24px] p-5 sm:p-7 relative overflow-hidden">

        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative z-10 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              size="xl"
              expandable
              ringColor={
                isGuestMode
                  ? 'ring-slate-600'
                  : currentUser.role === 'APP_MODERATOR'
                  ? 'ring-amber-500'
                  : currentUser.role === 'MODERATOR'
                  ? 'ring-blue-500'
                  : 'ring-emerald-500'
              }
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-ink">{currentUser.name}</h2>
                {isGuestMode && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>লকড অতিথি মোড</span>
                  </span>
                )}
                {isModerator && (
                  <span title="ভেরিফাইড মডারেটর" className="inline-flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-500 text-ink" />
                  </span>
                )}
                {!isGuestMode && (
                  (() => {
                    const designations = getUserDesignationList(currentUser, executiveMembers);
                    if (designations.length === 0) return null;
                    return (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-normal">
                        {designations.join(', ')}
                      </span>
                    );
                  })()
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 font-medium flex-wrap">
                <span className="font-mono bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-emerald-400 font-bold">
                  {currentUser.memberId}
                </span>
                <span>•</span>
                <span>
                  {isGuestMode
                    ? 'একক অতিথি দর্শক (Read-Only)'
                    : getUserDesignationList(currentUser, executiveMembers).join(', ') || 'সাধারণ সদস্য'}
                </span>
                {!isGuestMode && (
                  <>
                    <span>•</span>
                    <span>
                      লিঙ্গ:{' '}
                      {currentUser.gender === 'FEMALE'
                        ? 'নারী'
                        : currentUser.gender === 'MALE'
                        ? 'পুরুষ'
                        : 'অন্যান্য'}
                    </span>
                    <span>•</span>
                    <span>যোগদান: {currentUser.joinDate || '২০২৫-০১-১০'}</span>
                  </>
                )}
              </div>

              {isGuestMode && (
                <p className="text-[11px] text-amber-300/90 font-bold">
                  অতিথি দর্শকের জন্য প্রোফাইল এডিট ও স্টেটমেন্ট ডাউনলোড লকড রয়েছে। নিচে অ্যাপ সেটিংস পরিবর্তন করতে পারবেন।
                </p>
              )}
            </div>
          </div>

          {/* Point 2: Profile Edit & Statement Download Locked for Guest Users */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
            <button
              onClick={handleEditClick}
              className={`min-h-12 px-5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 border-2 cursor-pointer ${
                isGuestMode
                  ? 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-amber-500/40'
                  : 'bg-transparent hover:bg-emerald-500/10 text-emerald-400 border-emerald-500'
              }`}
            >
              {isGuestMode ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Edit3 className="w-4 h-4 text-emerald-400" />
              )}
              <span>{isEditing ? 'সম্পাদনা বাতিল' : isGuestMode ? 'প্রোফাইল এডিট (লকড)' : 'প্রোফাইল এডিট'}</span>
            </button>

            <button
              onClick={handleStatementClick}
              className={`min-h-12 px-5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isGuestMode
                  ? 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:border-amber-500/40'
                  : 'btn-brand'
              }`}
            >
              {isGuestMode ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>{isGuestMode ? 'স্টেটমেন্ট (লকড)' : 'স্টেটমেন্ট ডাউনলোড'}</span>
            </button>

            {isGuestMode && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="min-h-12 px-5 rounded-2xl btn-brand text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>সদস্য লগইন</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form if editing (Never accessible in Guest Mode) */}
      <AnimatePresence initial={false}>
      {!isGuestMode && isEditing && (
        <motion.form
          initial={{ opacity: 0, y: -10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.26, ease: SMOOTH_EASE }}
          onSubmit={handleSaveProfile}
          className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-xs"
        >
          <h3 className="font-bold text-ink text-sm flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <span>ব্যক্তিগত তথ্য ও প্রোফাইল ছবি হালনাগাদ</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">পূর্ণ নাম:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">মোবাইল নম্বর:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">ইমেইল ঠিকানা:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">স্থায়ী ঠিকানা:</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                placeholder="গ্রাম/শহর, থানা, জেলা"
              />
            </div>

            {/* Profile Hosted Image Link with Auto Live Preview */}
            <div className="col-span-full space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>প্রোফাইল ছবি হোস্টেড লিংক (Viewer Link / Direct / HTML / BBCode সাপোর্ট):</span>
              </label>
              <div className="flex items-center gap-3">
                <Avatar src={avatarUrl} name={name} size="lg" ringColor="ring-emerald-500" />
                <HostedImageInput
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  placeholder="https://i.ibb.co/... অথবা গ্যালারি থেকে আপলোড করুন"
                  className="flex-1 min-w-0"
                  inputClassName="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                * হোস্টেড ছবির ডিরেক্ট বা ভিউয়ার লিংক দিলেই নামের পাশে সর্বত্র ছবি শো করবে।
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">নমিনীর নাম:</label>
              <input
                type="text"
                value={nomineeName}
                onChange={(e) => setNomineeName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">নমিনীর সাথে সম্পর্ক:</label>
              <input
                type="text"
                value={nomineeRelation}
                onChange={(e) => setNomineeRelation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
              />
            </div>

            <div className="col-span-full space-y-1">
              <label className="font-bold text-slate-300">নমিনীর মোবাইল নম্বর:</label>
              <input
                type="text"
                value={nomineePhone}
                onChange={(e) => setNomineePhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
              />
            </div>

            {/* Official Signature Settings */}
            <div className="col-span-full p-4 rounded-2xl bg-slate-950 border border-emerald-900/40 space-y-3">
              <label className="font-bold text-ink flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>অফিসিয়াল স্বাক্ষর সেটিংস (রসিদ ও স্টেটমেন্টের জন্য):</span>
              </label>

              <div className="flex items-center gap-6 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="signatureType"
                    value="NAME"
                    checked={signatureType === 'NAME'}
                    onChange={() => setSignatureType('NAME')}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span>আমার নাম ইনপুট হবে (টাইপোগ্রাফি)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="signatureType"
                    value="IMAGE"
                    checked={signatureType === 'IMAGE'}
                    onChange={() => setSignatureType('IMAGE')}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span>সিগনেচার ইমেজ হিসেবে সেট হবে</span>
                </label>
              </div>

              {signatureType === 'IMAGE' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <label className="font-medium text-slate-300 text-xs">সিগনেচার হোস্টেড ইমেজ লিংক:</label>
                  <div className="flex items-center gap-3">
                    <HostedImageInput
                      value={signatureImageUrl}
                      onChange={setSignatureImageUrl}
                      placeholder="https://i.ibb.co/.../my-signature.png"
                      className="flex-1 min-w-0"
                      inputClassName="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-ink font-mono"
                    />
                    {signatureImageUrl && (
                      <div className="w-24 h-10 bg-white rounded-lg p-1 border border-slate-700 flex items-center justify-center shrink-0">
                        <img
                          src={extractDirectImageUrl(signatureImageUrl)}
                          alt="Signature Preview"
                          className="max-h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* NID Card Front & Back Hosted Images */}
            <div className="col-span-full p-4 rounded-2xl bg-slate-950 border border-blue-900/40 space-y-3">
              <label className="font-bold text-ink flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>জাতীয় পরিচয়পত্র (NID) কার্ডের ছবি ও লিংক:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300">এনআইডি ফ্রন্ট সাইড (Front) লিংক:</span>
                  <HostedImageInput
                    value={nidFrontImageUrl}
                    onChange={setNidFrontImageUrl}
                    placeholder="https://i.ibb.co/.../nid-front.jpg"
                    inputClassName="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-ink font-mono"
                  />
                  {nidFrontImageUrl ? (
                    <div className="mt-2 h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
                      <img
                        src={extractDirectImageUrl(nidFrontImageUrl)}
                        alt="NID Front Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-14 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                      ফ্রন্ট প্রিভিউ নেই
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300">এনআইডি ব্যাক সাইড (Back) লিংক:</span>
                  <HostedImageInput
                    value={nidBackImageUrl}
                    onChange={setNidBackImageUrl}
                    placeholder="https://i.ibb.co/.../nid-back.jpg"
                    inputClassName="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-ink font-mono"
                  />
                  {nidBackImageUrl ? (
                    <div className="mt-2 h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
                      <img
                        src={extractDirectImageUrl(nidBackImageUrl)}
                        alt="NID Back Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-14 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                      ব্যাক প্রিভিউ নেই
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>সংরক্ষণ করুন</span>
            </button>
          </div>
        </motion.form>
      )}
      </AnimatePresence>

      {/* Personal Financial & Savings Summary Cards */}
      {!isGuestMode && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-[24px] p-4 grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-slate-800 gap-4 sm:gap-0">
            <div className="text-center px-2 space-y-0.5">
              <div className="text-[22px] font-bold text-emerald-400 leading-tight">
                <AnimatedNumber
                  value={totalApprovedAmount}
                  formatter={(v) => formatCurrencyBengali(Math.round(v))}
                />
              </div>
              <div className="text-[12px] text-slate-400 flex items-center justify-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> মোট অনুমোদিত সঞ্চয় জমা
              </div>
              <p className="text-[11px] text-slate-500">
                সর্বমোট{' '}
                <AnimatedNumber
                  value={approvedSavings.length}
                  formatter={(v) => toBengaliNumerals(Math.round(v))}
                />{' '}
                টি কিস্তি অনুমোদিত
              </p>
            </div>
            <div className="text-center px-2 space-y-0.5">
              <div className="text-[22px] font-bold text-amber-400 leading-tight">
                <AnimatedNumber
                  value={totalPendingAmount}
                  formatter={(v) => formatCurrencyBengali(Math.round(v))}
                />
              </div>
              <div className="text-[12px] text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" /> অনুমোদনাধীন জমা (Pending)
              </div>
              <p className="text-[11px] text-slate-500">
                <AnimatedNumber
                  value={pendingSavings.length}
                  formatter={(v) => toBengaliNumerals(Math.round(v))}
                />{' '}
                টি কিস্তি ভোটের অপেক্ষায়
              </p>
            </div>
            <div className="text-center px-2 space-y-1">
              <div className="text-[17px] font-bold text-ink leading-tight">
                প্রতি মাসের{' '}
                <AnimatedNumber
                  value={config.monthlyDueDay}
                  formatter={(v) => toBengaliNumerals(Math.round(v))}
                />{' '}
                তারিখ
              </div>
              <div className="text-[12px] text-slate-400 flex items-center justify-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> বকেয়া ও পরবর্তী জমাদান
              </div>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOverdue
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isOverdue ? 'চলতি মাসের কিস্তি বকেয়া' : 'হিসাব নিয়মিত ও পরিশোধিত'}
              </span>
            </div>
          </div>

          {/* Personal Info Grid Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>যোগাযোগ ও পারিবারিক তথ্য</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>মোবাইল নম্বর:</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">{currentUser.phone}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>ইমেইল:</span>
                </span>
                <span className="font-mono text-slate-200">{currentUser.email || 'N/A'}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>ঠিকানা:</span>
                </span>
                <span className="text-slate-200 truncate max-w-[200px]">{currentUser.address || 'তথ্য নেই'}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>মনোনীত নমিনী:</span>
                </span>
                <span className="text-slate-200 font-bold">
                  {currentUser.nomineeName || 'নির্ধারিত হয়নি'}{' '}
                  {currentUser.nomineeRelation ? `(${currentUser.nomineeRelation})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* User's Savings Ledger History with Receipt Print */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>
                  আমার ব্যক্তিগত জমা ও রসিদ খাতা (
                  <AnimatedNumber
                    value={userSavings.length}
                    formatter={(v) => toBengaliNumerals(Math.round(v))}
                  />{' '}
                  টি)
                </span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">রসিদ দেখতে ক্লিক করুন</span>
            </div>

            {userSavings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                আপনার অ্যাকাউন্টে এখনও কোনো জমার এন্ট্রি পাওয়া যায়নি।
              </div>
            ) : (
              <div className="space-y-2.5">
                {userSavings.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-ink text-sm">{tx.savingsMonth}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {tx.status === 'APPROVED' ? 'অনুমোদিত' : tx.status === 'PENDING' ? 'অপেক্ষমান' : 'প্রত্যাখ্যাত'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(tx.transactionDate).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        মাধ্যম: <strong className="text-slate-300">{tx.paymentMethod}</strong> • রেফারেন্স:{' '}
                        <span className="font-mono text-slate-300">{tx.transactionRef || 'N/A'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <div className="font-bold text-emerald-400 text-sm">
                          <AnimatedNumber value={tx.amount} formatter={formatCurrencyBengali} />
                        </div>
                      </div>

                      {tx.status === 'APPROVED' && (
                        <button
                          onClick={() => {
                            if (onOpenReceipt) {
                              onOpenReceipt(tx.id);
                            } else {
                              const rec = getReceiptForTransaction(tx.id);
                              if (rec) setActivePrintReceipt(rec);
                            }
                          }}
                          className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white transition-all font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          title="অফিসিয়াল ডিজিটাল রসিদ দেখুন ও ডাউনলোড করুন"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>রসিদ</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* Point 8, 9 & 19: Unified App Settings, Permissions & Preferences      */}
      {/* ===================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 text-xs">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>অ্যাপ সেটিংস, পারমিশন ও ব্যক্তিগত পছন্দসমূহ</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            সকল সেটিংস স্বয়ংক্রিয়ভাবে ডিভাইসে সংরক্ষিত থাকে — পুনরায় অ্যাপ চালু করলেও অপরিবর্তিত থাকবে।
          </p>
        </div>

        {/* 1. Native APK & Browser Permissions (Push Notifications & Phone Storage) */}
        <div className="space-y-3">
          <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">
            ডিভাইস ও নেটিভ APK পারমিশন নিয়ন্ত্রণ
          </h4>

          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <Bell className={`w-5 h-5 shrink-0 ${pushNotificationsEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div>
                <strong className="text-ink block font-bold">পুশ নোটিফিকেশন পারমিশন (Push Notification)</strong>
                <span className="text-[11px] text-slate-400">
                  নতুন নোটিশ, সঞ্চয় অনুমোদন ও জরুরি বার্তার ফোনের নোটিফিকেশন বার অ্যালার্ট সক্রিয় করুন।
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => togglePushNotifications(!pushNotificationsEnabled)}
              className={`py-1.5 px-4 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                pushNotificationsEnabled
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {pushNotificationsEnabled ? 'সক্রিয় (ON)' : 'অনুমোদন দিন'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <HardDriveDownload
                className={`w-5 h-5 shrink-0 ${storageAccessEnabled ? 'text-blue-400' : 'text-slate-500'}`}
              />
              <div>
                <strong className="text-ink block font-bold">নেটিভ স্টোরেজ ডাউনলোড অ্যাক্সেস (Phone Storage)</strong>
                <span className="text-[11px] text-slate-400">
                  রিসিট ও হিসাব স্টেটমেন্ট পিডিএফ সরাসরি ফোনের Downloads স্টোরেজে সংরক্ষণের পারমিশন।
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleStorageAccess(!storageAccessEnabled)}
              className={`py-1.5 px-4 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                storageAccessEnabled
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {storageAccessEnabled ? 'সক্রিয় (ON)' : 'অনুমোদন দিন'}
            </button>
          </div>
        </div>

        {/* 2. Sound & Haptic Vibration Settings */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wider">
            সাউন্ড ও হ্যাপটিক ফিডব্যাক
          </h4>

          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div>
                <strong className="text-ink block font-bold">অ্যাকশন সাউন্ড ইফেক্ট</strong>
                <span className="text-[11px] text-slate-400">
                  সঞ্চয় জমা, অনুমোদন ও সফল অ্যাকশনে সংক্ষিপ্ত নোটিফিকেশন টোন বাজবে।
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`py-1.5 px-4 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                soundEnabled ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {soundEnabled ? 'চালু' : 'বন্ধ'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <Vibrate className={`w-5 h-5 shrink-0 ${hapticEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
              <div>
                <strong className="text-ink block font-bold">হ্যাপটিক ভাইব্রেশন (Haptic)</strong>
                <span className="text-[11px] text-slate-400">
                  গুরুত্বপূর্ণ বাটন ও অ্যাকশনে স্পর্শ অনুভূতি প্রদান করবে।
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHapticEnabled(!hapticEnabled)}
              className={`py-1.5 px-4 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                hapticEnabled ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {hapticEnabled ? 'চালু' : 'বন্ধ'}
            </button>
          </div>
        </div>

        {/* 3. Theme, Guide, Account Logout & App Exit */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 py-1.5">
            <div className="flex items-center gap-2.5">
              <SpringIcon activeKey={theme}>
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-amber-400" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
              </SpringIcon>
              <div>
                <p className="font-bold text-slate-100">অ্যাপ থিম মোড (Theme)</p>
                <p className="text-[11px] text-slate-400">
                  ডিভাইসের সিস্টেম মোড অনুযায়ী অটো-সিলেক্টেড — ডার্ক অথবা লাইট থিম বেছে নিন
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
                  <SlidingTabPill layoutId="profile-theme-pill" className="bg-emerald-600 shadow" />
                )}
                <span className="relative z-10">ডার্ক</span>
              </button>
              <button
                type="button"
                onClick={(e) => applyThemeWithTransition('light', theme, setThemeMode, e.currentTarget)}
                className={`relative px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  theme === 'light' ? 'text-white' : 'text-slate-400 hover:text-ink'
                }`}
              >
                {theme === 'light' && (
                  <SlidingTabPill layoutId="profile-theme-pill" className="bg-emerald-600 shadow" />
                )}
                <span className="relative z-10">লাইট</span>
              </button>
            </div>
          </div>

          {onOpenFirebaseGuide && (
            <div className="flex items-center justify-between py-1.5 border-t border-slate-800">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="font-bold text-slate-100">ফায়ারবেজ ও Android Studio APK গাইড</p>
                  <p className="text-[11px] text-slate-400">কনফিগারেশন ও নেটিভ বিল্ড নির্দেশনা দেখুন</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenFirebaseGuide}
                className="py-1.5 px-3.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs transition-colors cursor-pointer"
              >
                গাইড খুলুন
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-start gap-2 pt-2 border-t border-slate-800">
            {!isGuestMode ? (
              <button
                type="button"
                onClick={logoutUser}
                className="py-2 px-4 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>অ্যাকাউন্ট লগআউট করুন</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>সদস্য অ্যাকাউন্টে লগইন করুন</span>
              </button>
            )}

            {onShowExitDialog && (
              <button
                type="button"
                onClick={onShowExitDialog}
                className="py-2 px-4 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 font-bold text-xs transition-colors cursor-pointer"
              >
                অ্যাপ থেকে প্রস্থান
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statement Modal for Logged-in Members Only */}
      {!isGuestMode && (
        <StatementPrintModal
          isOpen={isStatementModalOpen}
          member={currentUser}
          transactions={userSavings}
          periodLabel="ALL"
          config={config}
          onClose={() => setIsStatementModalOpen(false)}
        />
      )}
    </div>
  );
};
