import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Users,
  Target,
  Award,
  Phone,
  Mail,
  MapPin,
  Building2,
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  Clock,
  Shield,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { toBengaliNumerals, maskPhoneForPrivacy } from '../../utils/calculations';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import {
  StaggerList,
  StaggerItem,
  SpringIcon,
  AnimatedNumber,
  SMOOTH_EASE,
} from '../common/MotionPrimitives';

interface AboutUsViewProps {
  onOpenFirebaseGuide?: () => void;
}

type AboutEditSection =
  | 'HERO'
  | 'MISSION_1'
  | 'MISSION_2'
  | 'MISSION_3'
  | 'LEADERSHIP'
  | 'BANK_SUMMARY'
  | 'JOINT_HOLDERS'
  | 'CONTACT'
  | 'FOOTER'
  | null;

interface JointHolderItem {
  name: string;
  role: string;
  memberId: string;
  phone: string;
  avatarUrl?: string;
}

export const AboutUsView: React.FC<AboutUsViewProps> = () => {
  const { config, users, currentUser, isGuestMode, proposeBankOrConfigChange, checkPendingRequestWarning } = useApp();

  const isModerator =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  const realUsers = users.filter((u) => u.id !== '__guest__' && u.memberId !== 'GUEST');
  const moderators = realUsers.filter(
    (u) => u.role === 'APP_MODERATOR' || u.role === 'MODERATOR'
  );
  const logoSrc = extractDirectImageUrl(config.logoUrl) || '/logo.svg';

  const about = config.aboutUsContent || {
    story: '',
    mission: '',
    vision: '',
    phone: '+880 1700-000000',
    email: 'contact.mahmudulhasan.bd@gmail.com',
    address: 'ধানমন্ডি, ঢাকা - ১২০৯, বাংলাদেশ',
    bankDetails: '',
  };

  const badgeText = about.badgeText || 'ডিজিটাল সমবায় সঞ্চয় ও কল্যাণ প্ল্যাটফর্ম';
  const establishedText = about.establishedText || 'জানুয়ারি ২০২৫';
  const registrationNo = about.registrationNo || 'BF-REG-2025/DH';

  const missionTitle = about.missionTitle || 'আমাদের উদ্দেশ্য ও লক্ষ্য';
  const missionDesc =
    about.missionDesc ||
    about.mission ||
    'সদস্যদের মধ্যে নিয়মানুবর্তিত সঞ্চয় অভ্যাস গড়ে তোলা, সুদমুক্ত আর্থিক শৃঙ্খলা নিশ্চিতকরণ এবং জরুরি প্রয়োজনে পারস্পরিক সহমর্মিতা ও সহায়তার আধুনিক প্রাতিষ্ঠানিক রূপদান।';

  const transparencyTitle = about.transparencyTitle || 'শতভাগ আর্থিক স্বচ্ছতা';
  const transparencyDesc =
    about.transparencyDesc ||
    'কোনো একক ব্যক্তির সিদ্ধান্তে লেনদেন অনুমোদন হয় না। গঠনতন্ত্র অনুযায়ী কমপক্ষে ২/৩ অংশ (Ceiling) যোগ্য মডারেটরের সরাসরি অনুমোদনের পরই অর্থ চূড়ান্ত হিসাবে যুক্ত ও রসিদ তৈরি হয়।';

  const trustTitle = about.trustTitle || 'পারস্পরিক আস্থা ও সমবায়';
  const trustDesc =
    about.trustDesc ||
    about.vision ||
    'প্রতিটি সদস্যের সঞ্চয় সুরক্ষিত ও ডিজিটাল অডিট ট্রেইল দ্বারা সংরক্ষিত। যেকোনো সময়ে ভেরিফাইড ব্যাংক-স্টাইল পিডিএফ বিবরণী ও অনলাইন লেজার পরীক্ষা করা যায়।';

  const leadershipTitle = about.leadershipTitle || 'পরিচালনা পর্ষদ ও দায়িত্বপ্রাপ্ত মডারেটরবৃন্দ';
  const leadershipSubtitle =
    about.leadershipSubtitle ||
    'ফাউন্ডেশনের সুষ্ঠু ব্যবস্থাপনা, আর্থিক হিসাব যাচাই ও সিদ্ধান্ত গ্রহণে নিয়োজিত পর্ষদ।';

  const bankSectionTitle = about.bankSectionTitle || 'অফিসিয়াল ব্যাংক একাউন্ট বিবরণী';
  const bankSectionSubtitle =
    about.bankSectionSubtitle ||
    'ব্যাংক ইনফরমেশন ও আমাদের সম্পর্কে ট্যাবে অভিন্ন অফিশিয়াল ব্যাংক বিবরণী';

  const contactTitle = about.contactTitle || 'যোগাযোগ ও কেন্দ্রীয় কার্যালয়';
  const contactEmail = about.email || 'contact.mahmudulhasan.bd@gmail.com';
  const contactPhone = about.phone || '+880 1700-000000';
  const contactAddress = about.address || 'ধানমন্ডি, ঢাকা - ১২০৯, বাংলাদেশ';

  const resolvedHolders: JointHolderItem[] = (
    config.jointBankAccountHolders || [
      {
        name: 'মাহমুদুল হাসান সিয়াম',
        role: 'প্রধান সমন্বয়ক ও একাউন্ট হোল্ডার ১',
        memberId: 'BF-001',
        phone: '০১৭০০-০০০০০১',
      },
      {
        name: 'তানভীর আহমেদ',
        role: 'যুগ্ম সমন্বয়ক ও একাউন্ট হোল্ডার ২',
        memberId: 'BF-002',
        phone: '০১৭০০-০০০০০২',
      },
      {
        name: 'সাবরিনা আক্তার',
        role: 'কোষাধ্যক্ষ ও একাউন্ট হোল্ডার ৩',
        memberId: 'BF-003',
        phone: '০১৭০০-০০০০০৩',
      },
    ]
  ).map((rawHolder, idx) => {
    const matchedFromRaw =
      typeof rawHolder === 'string'
        ? realUsers.find(
            (u) => rawHolder.includes(u.name) || u.id === rawHolder || u.memberId === rawHolder
          )
        : realUsers.find((u) => u.memberId === rawHolder.memberId || u.name === rawHolder.name);

    if (typeof rawHolder === 'string') {
      const match = rawHolder.match(/^(.+?)\s*\((.+)\)$/);
      const parsedName = match ? match[1].trim() : rawHolder.trim();
      const parsedRole = match ? match[2].trim() : `একাউন্ট হোল্ডার ${toBengaliNumerals(idx + 1)}`;
      return {
        name: matchedFromRaw?.name || parsedName,
        role: matchedFromRaw?.moderatorTitle || parsedRole,
        memberId: matchedFromRaw?.memberId || `BF-00${idx + 1}`,
        phone: matchedFromRaw?.phone || '০১৭০০-০০০০০' + (idx + 1),
        avatarUrl: matchedFromRaw?.avatarUrl,
      };
    }

    return {
      ...rawHolder,
      avatarUrl: rawHolder.avatarUrl || matchedFromRaw?.avatarUrl,
    };
  });

  // Modal state for editing any section
  const [editSection, setEditSection] = useState<AboutEditSection>(null);

  // Form draft states
  const [draftLogoUrl, setDraftLogoUrl] = useState('');
  const [draftBadgeText, setDraftBadgeText] = useState('');
  const [draftFoundationName, setDraftFoundationName] = useState('');
  const [draftFoundationSlogan, setDraftFoundationSlogan] = useState('');
  const [draftEstablished, setDraftEstablished] = useState('');
  const [draftRegNo, setDraftRegNo] = useState('');

  const [draftCardTitle, setDraftCardTitle] = useState('');
  const [draftCardDesc, setDraftCardDesc] = useState('');

  const [draftBankSecTitle, setDraftBankSecTitle] = useState('');
  const [draftBankSecSubtitle, setDraftBankSecSubtitle] = useState('');
  const [draftBankName, setDraftBankName] = useState('');
  const [draftBranchName, setDraftBranchName] = useState('');
  const [draftAccountName, setDraftAccountName] = useState('');
  const [draftAccountNumber, setDraftAccountNumber] = useState('');
  const [draftRoutingNumber, setDraftRoutingNumber] = useState('');

  const [draftHolders, setDraftHolders] = useState<JointHolderItem[]>([]);

  const [draftContactTitle, setDraftContactTitle] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftAddress, setDraftAddress] = useState('');

  const [draftFooterText, setDraftFooterText] = useState('');
  const [draftDevName, setDraftDevName] = useState('');
  const [draftDevLink, setDraftDevLink] = useState('');

  const openSectionEditor = (sec: AboutEditSection) => {
    if (!isModerator || !sec) return;
    const sourceKeyForSection =
      sec === 'BANK_SUMMARY'
        ? 'config-bankDetails'
        : sec === 'JOINT_HOLDERS'
        ? 'config-jointBankHolders'
        : sec === 'FOOTER'
        ? 'config-developerAttribution-developerLink-footerText'
        : 'config-aboutUsContent';
    if (
      checkPendingRequestWarning(
        { requestTypes: ['BANK_CONFIG_CHANGE'], sourceKey: sourceKeyForSection },
        'আমাদের সম্পর্কে / কনফিগারেশন সম্পাদনা'
      )
    ) {
      return;
    }
    if (sec === 'HERO') {
      setDraftLogoUrl(config.logoUrl || '');
      setDraftBadgeText(badgeText);
      setDraftFoundationName(config.foundationName || '');
      setDraftFoundationSlogan(config.foundationSlogan || '');
      setDraftEstablished(establishedText);
      setDraftRegNo(registrationNo);
    } else if (sec === 'MISSION_1') {
      setDraftCardTitle(missionTitle);
      setDraftCardDesc(missionDesc);
    } else if (sec === 'MISSION_2') {
      setDraftCardTitle(transparencyTitle);
      setDraftCardDesc(transparencyDesc);
    } else if (sec === 'MISSION_3') {
      setDraftCardTitle(trustTitle);
      setDraftCardDesc(trustDesc);
    } else if (sec === 'LEADERSHIP') {
      setDraftCardTitle(leadershipTitle);
      setDraftCardDesc(leadershipSubtitle);
    } else if (sec === 'BANK_SUMMARY') {
      setDraftBankSecTitle(bankSectionTitle);
      setDraftBankSecSubtitle(bankSectionSubtitle);
      setDraftBankName(config.bankDetails?.bankName || 'সোনালী ব্যাংক পিএলসি');
      setDraftBranchName(config.bankDetails?.branchName || 'উত্তরা মডেল টাউন শাখা, ঢাকা');
      setDraftAccountName(config.bankDetails?.accountName || 'বেসিস সমবায় সঞ্চয় তহবিল');
      setDraftAccountNumber(config.bankDetails?.accountNumber || '120.101.8892');
      setDraftRoutingNumber(config.bankDetails?.routingNumber || '200261572');
    } else if (sec === 'JOINT_HOLDERS') {
      setDraftHolders(resolvedHolders.map((h) => ({ ...h })));
    } else if (sec === 'CONTACT') {
      setDraftContactTitle(contactTitle);
      setDraftEmail(contactEmail);
      setDraftPhone(contactPhone);
      setDraftAddress(contactAddress);
    } else if (sec === 'FOOTER') {
      setDraftFooterText(config.footerText || '© ২০২৫-২০২৬ বেসিস ফাউন্ডেশন। সর্বস্বত্ব সংরক্ষিত।');
      setDraftDevName(config.developerAttribution || 'Mahmudul Hasan Siam');
      setDraftDevLink(config.developerLink || 'https://github.com/mahmudulhasan');
    }
    setEditSection(sec);
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSection) return;

    const baseAbout = {
      ...about,
      story: about.story || '',
      mission: about.mission || missionDesc,
      vision: about.vision || trustDesc,
      phone: contactPhone,
      email: contactEmail,
      address: contactAddress,
      bankDetails: about.bankDetails || '',
    };

    let ok = true;
    if (editSection === 'HERO') {
      const cleanLogo = extractDirectImageUrl(draftLogoUrl) || draftLogoUrl.trim();
      ok = proposeBankOrConfigChange(
        'আমাদের সম্পর্কে — ব্যানার ও পরিচিতি সম্পাদনা',
        `${currentUser.name} "আমাদের সম্পর্কে" ট্যাবের শীর্ষ ব্যানার ও পরিচিতি তথ্য হালনাগাদের প্রস্তাব দাখিল করেছেন।`,
        {
          foundationName: draftFoundationName.trim() || config.foundationName,
          foundationSlogan: draftFoundationSlogan.trim() || config.foundationSlogan,
          logoUrl: cleanLogo || config.logoUrl,
          aboutUsContent: {
            ...baseAbout,
            badgeText: draftBadgeText.trim(),
            establishedText: draftEstablished.trim(),
            registrationNo: draftRegNo.trim(),
          },
        },
        [
          { field: 'foundationName', oldValue: config.foundationName, newValue: draftFoundationName.trim() },
          { field: 'foundationSlogan', oldValue: config.foundationSlogan, newValue: draftFoundationSlogan.trim() },
          { field: 'establishedText', oldValue: establishedText, newValue: draftEstablished.trim() },
          { field: 'registrationNo', oldValue: registrationNo, newValue: draftRegNo.trim() },
        ]
      );
    } else if (editSection === 'MISSION_1') {
      ok = proposeBankOrConfigChange(
        'আমাদের সম্পর্কে — উদ্দেশ্য ও লক্ষ্য সম্পাদনা',
        `${currentUser.name} উদ্দেশ্য ও লক্ষ্য কার্ড সম্পাদনার প্রস্তাব দাখিল করেছেন।`,
        {
          aboutUsContent: {
            ...baseAbout,
            missionTitle: draftCardTitle.trim(),
            missionDesc: draftCardDesc.trim(),
            mission: draftCardDesc.trim(),
          },
        },
        [
          { field: 'missionTitle', oldValue: missionTitle, newValue: draftCardTitle.trim() },
          { field: 'missionDesc', oldValue: missionDesc, newValue: draftCardDesc.trim() },
        ]
      );
    } else if (editSection === 'MISSION_2') {
      ok = proposeBankOrConfigChange(
        'আমাদের সম্পর্কে — আর্থিক স্বচ্ছতা কার্ড সম্পাদনা',
        `${currentUser.name} শতভাগ আর্থিক স্বচ্ছতা কার্ড সম্পাদনার প্রস্তাব দাখিল করেছেন।`,
        {
          aboutUsContent: {
            ...baseAbout,
            transparencyTitle: draftCardTitle.trim(),
            transparencyDesc: draftCardDesc.trim(),
          },
        },
        [
          { field: 'transparencyTitle', oldValue: transparencyTitle, newValue: draftCardTitle.trim() },
          { field: 'transparencyDesc', oldValue: transparencyDesc, newValue: draftCardDesc.trim() },
        ]
      );
    } else if (editSection === 'MISSION_3') {
      ok = proposeBankOrConfigChange(
        'আমাদের সম্পর্কে — পারস্পরিক আস্থা ও সমবায় সম্পাদনা',
        `${currentUser.name} পারস্পরিক আস্থা ও সমবায় কার্ড সম্পাদনার প্রস্তাব দাখিল করেছেন।`,
        {
          aboutUsContent: {
            ...baseAbout,
            trustTitle: draftCardTitle.trim(),
            trustDesc: draftCardDesc.trim(),
            vision: draftCardDesc.trim(),
          },
        },
        [
          { field: 'trustTitle', oldValue: trustTitle, newValue: draftCardTitle.trim() },
          { field: 'trustDesc', oldValue: trustDesc, newValue: draftCardDesc.trim() },
        ]
      );
    } else if (editSection === 'LEADERSHIP') {
      ok = proposeBankOrConfigChange(
        'আমাদের সম্পর্কে — পরিচালনা পর্ষদ শিরোনাম সম্পাদনা',
        `${currentUser.name} পরিচালনা পর্ষদ সেকশনের শিরোনাম ও বিবরণ সম্পাদনার প্রস্তাব দাখিল করেছেন।`,
        {
          aboutUsContent: {
            ...baseAbout,
            leadershipTitle: draftCardTitle.trim(),
            leadershipSubtitle: draftCardDesc.trim(),
          },
        },
        [
          { field: 'leadershipTitle', oldValue: leadershipTitle, newValue: draftCardTitle.trim() },
          { field: 'leadershipSubtitle', oldValue: leadershipSubtitle, newValue: draftCardDesc.trim() },
        ]
      );
    } else if (editSection === 'BANK_SUMMARY') {
      const prevBank = config.bankDetails || {
        bankName: 'সোনালী ব্যাংক পিএলসি',
        accountName: 'বেসিস সমবায় সঞ্চয় তহবিল',
        accountNumber: '120.101.8892',
        branchName: 'উত্তরা মডেল টাউন শাখা, ঢাকা',
        routingNumber: '200261572',
      };
      ok = proposeBankOrConfigChange(
        'অফিসিয়াল ব্যাংক একাউন্ট বিবরণী সম্পাদনা',
        `${currentUser.name} অফিসিয়াল ব্যাংক একাউন্ট বিবরণী হালনাগাদের প্রস্তাব দাখিল করেছেন।`,
        {
          bankDetails: {
            ...prevBank,
            bankName: draftBankName.trim(),
            branchName: draftBranchName.trim(),
            accountName: draftAccountName.trim(),
            accountNumber: draftAccountNumber.trim(),
            routingNumber: draftRoutingNumber.trim(),
          },
          aboutUsContent: {
            ...baseAbout,
            bankSectionTitle: draftBankSecTitle.trim(),
            bankSectionSubtitle: draftBankSecSubtitle.trim(),
          },
        },
        [
          { field: 'bankName', oldValue: prevBank.bankName, newValue: draftBankName.trim() },
          { field: 'branchName', oldValue: prevBank.branchName, newValue: draftBranchName.trim() },
          { field: 'accountName', oldValue: prevBank.accountName, newValue: draftAccountName.trim() },
          { field: 'accountNumber', oldValue: prevBank.accountNumber, newValue: draftAccountNumber.trim() },
          { field: 'routingNumber', oldValue: prevBank.routingNumber || '-', newValue: draftRoutingNumber.trim() },
        ]
      );
    } else if (editSection === 'JOINT_HOLDERS') {
      const cleanedHolders = draftHolders.map((h) => ({
        name: h.name.trim(),
        role: h.role.trim(),
        memberId: h.memberId.trim(),
        phone: h.phone.trim(),
        avatarUrl: extractDirectImageUrl(h.avatarUrl || '') || h.avatarUrl?.trim() || undefined,
      }));
      ok = proposeBankOrConfigChange(
        'যৌথ ব্যাংক একাউন্ট হোল্ডার তালিকা সম্পাদনা',
        `${currentUser.name} যৌথ ব্যাংক একাউন্ট পরিচালনাকারী মডারেটর তালিকা হালনাগাদের প্রস্তাব দাখিল করেছেন।`,
        {
          jointBankAccountHolders: cleanedHolders,
        },
        cleanedHolders.map((h, i) => ({
          field: `স্বাক্ষরকারী #${toBengaliNumerals(i + 1)}`,
          oldValue: `${resolvedHolders[i]?.name || ''} (${resolvedHolders[i]?.memberId || ''})`,
          newValue: `${h.name} (${h.memberId}) — ${h.role}`,
        }))
      );
    } else if (editSection === 'CONTACT') {
      ok = proposeBankOrConfigChange(
        'আমাদের সম্পর্কে — যোগাযোগ ও কার্যালয় তথ্য সম্পাদনা',
        `${currentUser.name} যোগাযোগ ও কেন্দ্রীয় কার্যালয় তথ্য হালনাগাদের প্রস্তাব দাখিল করেছেন।`,
        {
          aboutUsContent: {
            ...baseAbout,
            contactTitle: draftContactTitle.trim(),
            email: draftEmail.trim(),
            phone: draftPhone.trim(),
            address: draftAddress.trim(),
          },
        },
        [
          { field: 'email', oldValue: contactEmail, newValue: draftEmail.trim() },
          { field: 'phone', oldValue: contactPhone, newValue: draftPhone.trim() },
          { field: 'address', oldValue: contactAddress, newValue: draftAddress.trim() },
        ]
      );
    } else if (editSection === 'FOOTER') {
      ok = proposeBankOrConfigChange(
        'আমাদের সম্পর্কে — ফুটার ও ডেভেলপার তথ্য সম্পাদনা',
        `${currentUser.name} ফুটার টেক্সট ও কারিগরি তথ্যের পরিবর্তনের প্রস্তাব দাখিল করেছেন।`,
        {
          footerText: draftFooterText.trim(),
          developerAttribution: draftDevName.trim(),
          developerLink: draftDevLink.trim(),
        },
        [
          { field: 'footerText', oldValue: config.footerText, newValue: draftFooterText.trim() },
          { field: 'developerAttribution', oldValue: config.developerAttribution, newValue: draftDevName.trim() },
        ]
      );
    }

    if (ok) {
      setEditSection(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* 1. Hero Banner with Official Logo */}
      <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {isModerator && (
          <button
            type="button"
            onClick={() => openSectionEditor('HERO')}
            title="ব্যানার ও পরিচিতি সম্পাদনা করুন"
            className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-900/85 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white transition-colors cursor-pointer shadow-md"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-8 text-center md:text-left">
          {/* Logo Badge */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-emerald-600 p-1 shrink-0 group hover:scale-105 transition-transform shadow-lg">
            <div className="w-full h-full rounded-[22px] flex items-center justify-center p-0 overflow-hidden">
              <img
                src={logoSrc}
                alt="BASIS Foundation Logo"
                className={`w-full h-full ${logoSrc === '/logo.svg' ? 'object-contain' : 'object-cover'} rounded-[22px]`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                }}
              />
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{badgeText}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-ink tracking-tight">
              {config.foundationName}
            </h1>
            <p className="text-emerald-300/90 font-bold text-sm sm:text-base max-w-2xl leading-relaxed">
              {config.foundationSlogan}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>প্রতিষ্ঠিত: {establishedText}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>স্বীকৃতি নং: {registrationNo}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-amber-400" />
                <span>
                  সদস্য সংখ্যা:{' '}
                  <AnimatedNumber
                    value={realUsers.length}
                    formatter={(v) => toBengaliNumerals(Math.round(v))}
                  />{' '}
                  জন
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mission & Core Values Grid */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* আমাদের লক্ষ্য (Mission) */}
        <StaggerItem hoverLift className="h-full">
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md space-y-3 h-full">
            {isModerator && (
              <button
                type="button"
                onClick={() => openSectionEditor('MISSION_1')}
                title="উদ্দেশ্য ও লক্ষ্য সম্পাদনা করুন"
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <SpringIcon>
                <Target className="w-6 h-6" />
              </SpringIcon>
            </div>
            <h3 className="text-lg font-bold text-ink pr-8">{missionTitle}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{missionDesc}</p>
          </div>
        </StaggerItem>

        {/* স্বচ্ছতা ও ২/৩ অনুমোদন */}
        <StaggerItem hoverLift className="h-full">
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md space-y-3 h-full">
            {isModerator && (
              <button
                type="button"
                onClick={() => openSectionEditor('MISSION_2')}
                title="আর্থিক স্বচ্ছতা কার্ড সম্পাদনা করুন"
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <SpringIcon>
                <ShieldCheck className="w-6 h-6" />
              </SpringIcon>
            </div>
            <h3 className="text-lg font-bold text-ink pr-8">{transparencyTitle}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{transparencyDesc}</p>
          </div>
        </StaggerItem>

        {/* ভ্রাতৃত্ববোধ ও কল্যাণ */}
        <StaggerItem hoverLift className="h-full">
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md space-y-3 h-full">
            {isModerator && (
              <button
                type="button"
                onClick={() => openSectionEditor('MISSION_3')}
                title="পারস্পরিক আস্থা কার্ড সম্পাদনা করুন"
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <SpringIcon>
                <HeartHandshake className="w-6 h-6" />
              </SpringIcon>
            </div>
            <h3 className="text-lg font-bold text-ink pr-8">{trustTitle}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{trustDesc}</p>
          </div>
        </StaggerItem>
      </StaggerList>

      {/* 3. Executive Committee & Leadership */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>{leadershipTitle}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{leadershipSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-800 text-slate-300">
              <AnimatedNumber
                value={moderators.length}
                formatter={(v) => toBengaliNumerals(Math.round(v))}
              />{' '}
              জন দায়িত্বশীল
            </span>
            {isModerator && (
              <button
                type="button"
                onClick={() => openSectionEditor('LEADERSHIP')}
                title="পরিচালনা পর্ষদ শিরোনাম সম্পাদনা করুন"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moderators.map((mod) => (
            <StaggerItem key={mod.id} hoverLift className="h-full">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 h-full">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={mod.avatarUrl}
                    name={mod.name}
                    size="lg"
                    ringColor={mod.role === 'APP_MODERATOR' ? 'ring-amber-500' : 'ring-emerald-500'}
                  />
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-ink truncate">{mod.name}</h4>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    </div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full mt-0.5 ${
                        mod.role === 'APP_MODERATOR'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {mod.moderatorTitle ||
                        (mod.role === 'APP_MODERATOR' ? 'প্রধান অ্যাপ মডারেটর' : 'মডারেটর ও নিরীক্ষক')}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">সদস্য আইডি: {mod.memberId}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900 text-xs space-y-1.5 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">মোবাইল:</span>
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{maskPhoneForPrivacy(mod.phone, mod.gender, currentUser?.role)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">দায়িত্ব:</span>
                    <span className="text-slate-300 font-medium text-[11px]">
                      {mod.assignedDuties ||
                        (mod.role === 'APP_MODERATOR'
                          ? 'অ্যাপ প্রশাসন ও নীতিনির্ধারণ'
                          : 'জমা অনুমোদন ও হিসাব নিরীক্ষা')}
                    </span>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>

      {/* 4. Official Bank Account Information (Synced with BankInformationView) */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-3xl p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">{bankSectionTitle}</h3>
              <p className="text-xs text-slate-400">{bankSectionSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              যৌথ ব্যাংক হিসাব (Joint Account)
            </span>
            {isModerator && (
              <button
                type="button"
                onClick={() => openSectionEditor('BANK_SUMMARY')}
                title="ব্যাংক একাউন্ট বিবরণী সম্পাদনা করুন"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 block">ব্যাংকের নাম:</span>
            <strong className="text-ink text-sm block">
              {config.bankDetails?.bankName || 'সোনালী ব্যাংক পিএলসি'}
            </strong>
            <span className="text-[10px] text-slate-400">
              {config.bankDetails?.branchName || 'উত্তরা মডেল টাউন শাখা, ঢাকা'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 block">হিসাবের নাম (A/C Name):</span>
            <strong className="text-emerald-400 text-sm block">
              {config.bankDetails?.accountName || 'বেসিস সমবায় সঞ্চয় তহবিল'}
            </strong>
            <span className="text-[10px] text-slate-400">Savings Account</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 block">হিসাব নম্বর (A/C No):</span>
            <strong className="text-amber-400 font-mono text-sm block">
              {config.bankDetails?.accountNumber || '120.101.8892'}
            </strong>
            <span className="text-[10px] text-slate-400">সঞ্চয়ী হিসাব নম্বর</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 block">রাউটিং নম্বর:</span>
            <strong className="text-slate-200 font-mono text-sm block">
              {config.bankDetails?.routingNumber || '200261572'}
            </strong>
            <span className="text-[10px] text-slate-400">ইএফটি / এনপিএসবি সাপোর্টেড</span>
          </div>
        </div>

        {/* Joint Bank Account Holders List */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>যৌথ ব্যাংক একাউন্ট পরিচালনাকারী ৩ জন মডারেটর তালিকা</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ব্যাংক হিসাব পরিচালনার জন্য অনুমোদিত যৌথ স্বাক্ষরকারী মডারেটর পরিষদ।
              </p>
            </div>
            {isModerator && (
              <button
                type="button"
                onClick={() => openSectionEditor('JOINT_HOLDERS')}
                title="যৌথ একাউন্ট হোল্ডার তালিকা সম্পাদনা করুন"
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>সম্পাদনা</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {resolvedHolders.map((holder, idx) => {
              const matchedFromRaw = realUsers.find(
                (u) => u.memberId === holder.memberId || u.name === holder.name
              );
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between space-y-2.5 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        স্বাক্ষরকারী #{toBengaliNumerals(idx + 1)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {holder.memberId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={holder.avatarUrl}
                        name={holder.name}
                        size="md"
                        ringColor="ring-emerald-500/60"
                      />
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-xs sm:text-sm text-ink truncate">
                          {holder.name}
                        </h5>
                        <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5 truncate">
                          {holder.role}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                    <span>ফোন:</span>
                    <span className="text-slate-300 font-mono font-bold">
                      {maskPhoneForPrivacy(
                        holder.phone,
                        matchedFromRaw?.gender ||
                          (holder.name.includes('সাবরিনা') ? 'FEMALE' : 'MALE'),
                        currentUser?.role
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Contact & Support */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <span>{contactTitle}</span>
          </h3>
          {isModerator && (
            <button
              type="button"
              onClick={() => openSectionEditor('CONTACT')}
              title="যোগাযোগ ও কার্যালয় তথ্য সম্পাদনা করুন"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 min-w-0">
            <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-500 text-[11px] block">ইমেইল:</span>
              <a
                href={`mailto:${contactEmail}`}
                className="text-ink font-bold hover:underline break-all"
              >
                {contactEmail}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 min-w-0">
            <Phone className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-500 text-[11px] block">হটলাইন / হেল্পডেস্ক:</span>
              <a
                href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                className="text-ink font-bold hover:underline"
              >
                {contactPhone}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 min-w-0">
            <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-500 text-[11px] block">ঠিকানা:</span>
              <span className="text-ink font-bold">{contactAddress}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer Attribution */}
      <div className="relative text-center text-xs text-slate-500 space-y-1 pt-4">
        <div className="inline-flex items-center justify-center gap-2">
          <p className="font-bold text-slate-400">
            {config.footerText || '© ২০২৫-২০২৬ বেসিস ফাউন্ডেশন। সর্বস্বত্ব সংরক্ষিত।'}
          </p>
          {isModerator && (
            <button
              type="button"
              onClick={() => openSectionEditor('FOOTER')}
              title="ফুটার তথ্য সম্পাদনা করুন"
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[11px]">
          কারিগরি উন্নয়ন ও রক্ষণাবেক্ষণ:{' '}
          <a
            href={config.developerLink || 'https://github.com/mahmudulhasan'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 font-bold hover:underline"
          >
            {config.developerAttribution || 'Mahmudul Hasan Siam'}
          </a>
        </p>
      </div>

      {/* Moderator Section Edit Modal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {editSection && isModerator && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, delay: 0, ease: SMOOTH_EASE }}
                onClick={() => setEditSection(null)}
                className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-hidden"
              >
                <motion.form
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.22, delay: 0, ease: SMOOTH_EASE }}
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={handleSaveSection}
                  className="my-auto bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[86dvh] flex flex-col shadow-2xl overflow-hidden text-xs"
                >
                  <div className="p-4 sm:p-5 shrink-0 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-emerald-400" />
                      <span>আমাদের সম্পর্কে — তথ্য সম্পাদনা</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditSection(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3.5">
                    {editSection === 'HERO' && (
                      <>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">ফাউন্ডেশনের নাম:</label>
                          <input
                            type="text"
                            value={draftFoundationName}
                            onChange={(e) => setDraftFoundationName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">স্লোগান:</label>
                          <input
                            type="text"
                            value={draftFoundationSlogan}
                            onChange={(e) => setDraftFoundationSlogan(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">টপ ব্যাজ টেক্সট:</label>
                          <input
                            type="text"
                            value={draftBadgeText}
                            onChange={(e) => setDraftBadgeText(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">প্রতিষ্ঠাকাল:</label>
                            <input
                              type="text"
                              value={draftEstablished}
                              onChange={(e) => setDraftEstablished(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">স্বীকৃতি নং:</label>
                            <input
                              type="text"
                              value={draftRegNo}
                              onChange={(e) => setDraftRegNo(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">অফিসিয়াল লোগো লিংক (ঐচ্ছিক):</label>
                          <div className="flex items-start gap-2.5">
                            {draftLogoUrl && extractDirectImageUrl(draftLogoUrl) && (
                              <img
                                src={extractDirectImageUrl(draftLogoUrl)}
                                alt="Logo Preview"
                                className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-700 shrink-0"
                              />
                            )}
                            <HostedImageInput
                              value={draftLogoUrl}
                              onChange={setDraftLogoUrl}
                              placeholder="https://i.ibb.co/... অথবা গ্যালারি থেকে আপলোড"
                              className="flex-1 min-w-0"
                              inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono text-xs"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {(editSection === 'MISSION_1' ||
                      editSection === 'MISSION_2' ||
                      editSection === 'MISSION_3' ||
                      editSection === 'LEADERSHIP') && (
                      <>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">শিরোনাম:</label>
                          <input
                            type="text"
                            value={draftCardTitle}
                            onChange={(e) => setDraftCardTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">বিস্তারিত বিবরণ:</label>
                          <textarea
                            rows={4}
                            value={draftCardDesc}
                            onChange={(e) => setDraftCardDesc(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                      </>
                    )}

                    {editSection === 'BANK_SUMMARY' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">সেকশন শিরোনাম:</label>
                            <input
                              type="text"
                              value={draftBankSecTitle}
                              onChange={(e) => setDraftBankSecTitle(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">সেকশন উপ-শিরোনাম:</label>
                            <input
                              type="text"
                              value={draftBankSecSubtitle}
                              onChange={(e) => setDraftBankSecSubtitle(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">ব্যাংকের নাম:</label>
                            <input
                              type="text"
                              value={draftBankName}
                              onChange={(e) => setDraftBankName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">শাখার নাম:</label>
                            <input
                              type="text"
                              value={draftBranchName}
                              onChange={(e) => setDraftBranchName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">হিসাবের নাম (A/C Name):</label>
                            <input
                              type="text"
                              value={draftAccountName}
                              onChange={(e) => setDraftAccountName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">হিসাব নম্বর (A/C No):</label>
                            <input
                              type="text"
                              value={draftAccountNumber}
                              onChange={(e) => setDraftAccountNumber(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
                              required
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="font-bold text-slate-300">রাউটিং নম্বর:</label>
                            <input
                              type="text"
                              value={draftRoutingNumber}
                              onChange={(e) => setDraftRoutingNumber(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {editSection === 'JOINT_HOLDERS' && (
                      <div className="space-y-3">
                        {draftHolders.map((h, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5"
                          >
                            <div className="font-bold text-emerald-400">
                              স্বাক্ষরকারী #{toBengaliNumerals(i + 1)}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <input
                                type="text"
                                placeholder="নাম"
                                value={h.name}
                                onChange={(e) => {
                                  const next = [...draftHolders];
                                  next[i] = { ...next[i], name: e.target.value };
                                  setDraftHolders(next);
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-ink"
                                required
                              />
                              <input
                                type="text"
                                placeholder="পদবী / ভূমিকা"
                                value={h.role}
                                onChange={(e) => {
                                  const next = [...draftHolders];
                                  next[i] = { ...next[i], role: e.target.value };
                                  setDraftHolders(next);
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-ink"
                                required
                              />
                              <input
                                type="text"
                                placeholder="সদস্য আইডি (যেমন: BF-001)"
                                value={h.memberId}
                                onChange={(e) => {
                                  const next = [...draftHolders];
                                  next[i] = { ...next[i], memberId: e.target.value };
                                  setDraftHolders(next);
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-ink font-mono"
                                required
                              />
                              <input
                                type="text"
                                placeholder="ফোন নম্বর"
                                value={h.phone}
                                onChange={(e) => {
                                  const next = [...draftHolders];
                                  next[i] = { ...next[i], phone: e.target.value };
                                  setDraftHolders(next);
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-ink font-mono"
                                required
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {editSection === 'CONTACT' && (
                      <>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">সেকশন শিরোনাম:</label>
                          <input
                            type="text"
                            value={draftContactTitle}
                            onChange={(e) => setDraftContactTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">অফিসিয়াল ইমেইল:</label>
                          <input
                            type="email"
                            value={draftEmail}
                            onChange={(e) => setDraftEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">হটলাইন / হেল্পডেস্ক নম্বর:</label>
                          <input
                            type="text"
                            value={draftPhone}
                            onChange={(e) => setDraftPhone(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">কেন্দ্রীয় কার্যালয়ের ঠিকানা:</label>
                          <input
                            type="text"
                            value={draftAddress}
                            onChange={(e) => setDraftAddress(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                      </>
                    )}

                    {editSection === 'FOOTER' && (
                      <>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">কপিরাইট / ফুটার টেক্সট:</label>
                          <input
                            type="text"
                            value={draftFooterText}
                            onChange={(e) => setDraftFooterText(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">কারিগরি উন্নয়ন / ডেভেলপার নাম:</label>
                          <input
                            type="text"
                            value={draftDevName}
                            onChange={(e) => setDraftDevName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">ডেভেলপার লিংক:</label>
                          <input
                            type="text"
                            value={draftDevLink}
                            onChange={(e) => setDraftDevLink(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
                          />
                        </div>
                      </>
                    )}

                    <p className="text-[11px] text-amber-400">
                      * সংরক্ষণের পর পরিবর্তনটি মডারেটর প্যানেলে অনুমোদনের জন্য পাঠানো হবে এবং অনুমোদনের পর অ্যাপে স্বয়ংক্রিয়ভাবে লাইভ হবে।
                    </p>
                  </div>

                  <div className="p-4 shrink-0 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSection(null)}
                      className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>অনুমোদনের জন্য জমা দিন</span>
                    </button>
                  </div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
