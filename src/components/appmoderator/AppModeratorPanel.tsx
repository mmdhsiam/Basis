import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldAlert,
  Settings,
  DownloadCloud,
  Database,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  ExternalLink,
  Save,
  FileText,
  Key,
  Smartphone,
  BookOpen,
  Code,
  Copy,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toBengaliNumerals } from '../../utils/calculations';
import { NativeAndroidSpecView } from '../android/NativeAndroidSpecView';
import { UserRole, AccountStatus } from '../../types';
import { UserCheck, Users, Building2, Trash2, Edit3, Type, UserPlus, Check, X, ArrowUp, ArrowDown, Layers, ListOrdered, Cloud, CloudCheck, HardDrive, ListPlus, ChevronDown, ChevronUp, Search } from 'lucide-react';
import {
  getMigrationStatus,
  executeLocalStorageToFirestoreMigration,
  createLocalBackup,
  MigrationResult,
  MigrationStatusInfo,
  MIGRATION_VERSION,
} from '../../utils/firestoreMigration';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { isHashedPassword, verifyPassword } from '../../utils/passwordSecurity';
import {
  PageTabTransition,
  SlidingTabPill,
  SpringIcon,
} from '../common/MotionPrimitives';

export const AppModeratorPanel: React.FC = () => {
  const {
    currentUser,
    config,
    updateConfig,
    users,
    updateUserProfile,
    updateUserDesignation,
    approveUserAccount,
    rejectUserAccount,
    removeUser,
    releases,
    publishAppRelease,
    forceUpdateRelease,
    currentAppVersionCode,
    currentAppVersionName,
    pushForceUpdateRelease,
    disableForceUpdate,
    checkForAppUpdate,
    setActiveUpdateDialog,
    exportBackupData,
    restoreFromBackup,
    auditLogs,
    deleteAuditLogs,
    resetToInitialDemo,
    triggerSuccess,
    triggerWarning,
  } = useApp();

  const realUsers = users.filter((u) => u.id !== '__guest__' && u.memberId !== 'GUEST');

  const [activeTab, setActiveTab] = useState<
    'BRANDING' | 'FORCE_UPDATE' | 'RELEASES' | 'FONTS' | 'TABS_ORDER' | 'USER_INFO' | 'BACKUP' | 'AUDIT' | 'SHEETS_APK_GUIDE' | 'ANDROID_SPEC'
  >('BRANDING');
  const [copiedGuideKey, setCopiedGuideKey] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [selectedAuditIds, setSelectedAuditIds] = useState<string[]>([]);
  const [confirmDeleteSelectedAudits, setConfirmDeleteSelectedAudits] = useState<boolean>(false);
  const [userInfoSearch, setUserInfoSearch] = useState<string>('');
  const [copiedUserInfoKey, setCopiedUserInfoKey] = useState<string | null>(null);

  // Local Storage to Firestore Migration State (Deliverable 2 & 10)
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatusInfo>(() => getMigrationStatus());
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [showMigrationLogs, setShowMigrationLogs] = useState<boolean>(false);
  const [showMigrationConfirm, setShowMigrationConfirm] = useState<boolean>(false);

  const handleRunCloudMigration = async () => {
    setIsMigrating(true);
    setShowMigrationConfirm(false);
    try {
      const res = await executeLocalStorageToFirestoreMigration(currentUser);
      setMigrationResult(res);
      setMigrationStatus(getMigrationStatus());
      if (res.success) {
        triggerSuccess('লোকাল স্টোরেজ থেকে ফায়ারবেস ক্লাউড মাইগ্রেশন সফলভাবে সম্পন্ন হয়েছে!');
      } else {
        triggerWarning('মাইগ্রেশন অসম্পূর্ণ', res.error || 'মাইগ্রেশন পরিচালনায় ত্রুটি ঘটেছে।');
      }
    } catch (err: any) {
      triggerWarning('মাইগ্রেশন ব্যর্থ', err.message || 'অপ্রত্যাশিত সমস্যা দেখা দিয়েছে।');
    } finally {
      setIsMigrating(false);
    }
  };

  const copyGuideCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGuideKey(key);
    setTimeout(() => setCopiedGuideKey(null), 2500);
  };

  const appsScriptSnippet = `// Google Apps Script (Webhook) - অটোমেটিক সঞ্চয় রো যুক্তকরণ
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  // নতুন সঞ্চয় এন্ট্রি রো যোগ করুন
  sheet.appendRow([
    new Date(),
    data.receiptId || "N/A",
    data.memberId,
    data.memberName,
    data.savingsMonth,
    data.amount,
    data.paymentMethod,
    data.transactionRef || "",
    "ভেরিফাইড (২/৩ অনুমোদিত)"
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const androidWebViewCookieSnippet = `// MainActivity.kt — Android APK WebView-এ Google Sheets সাপোর্ট
val cookieManager = android.webkit.CookieManager.getInstance()
cookieManager.setAcceptCookie(true)
cookieManager.setAcceptThirdPartyCookies(webView, true)
webView.settings.domStorageEnabled = true
webView.settings.javaScriptEnabled = true`;

  const DEFAULT_APP_TABS = [
    { id: 'home', label: 'হোম ড্যাশবোর্ড' },
    { id: 'profile', label: 'প্রোফাইল ও অ্যাপ সেটিংস' },
    { id: 'bank', label: 'ব্যাংক ইনফরমেশন ও হিসাব' },
    { id: 'about-us', label: 'আমাদের সম্পর্কে (About Us)' },
    { id: 'members', label: 'সদস্য তালিকা ও পদবি' },
    { id: 'savings', label: 'সঞ্চয় খাতা ও নতুন জমা' },
    { id: 'receipts', label: 'রসিদ ও পিডিএফ স্টেটমেন্ট' },
    { id: 'analytics', label: 'হিসাব বিশ্লেষণ ও গ্রাফ' },
    { id: 'moderator', label: 'মডারেটর প্যানেল' },
    { id: 'notices', label: 'নোটিশ বোর্ড' },
    { id: 'rules', label: 'ফাউন্ডেশন গঠনতন্ত্র ও বিধি' },
    { id: 'complaints', label: 'অভিযোগ প্রতিকার সেল' },
    { id: 'features', label: 'নতুন ফিচারের প্রস্তাবনা' },
    { id: 'sheets', label: 'গুগল শিটস ক্লাউড সিঙ্ক' },
  ];

  const DEFAULT_QUICK_SERVICES = [
    { id: 'members', label: 'সদস্য তালিকা' },
    { id: 'savings', label: 'জমার হিসাব' },
    { id: 'analytics', label: 'রিপোর্ট ও চার্ট' },
    { id: 'bank', label: 'ব্যাংক তথ্য' },
    { id: 'rules', label: 'গঠনতন্ত্র' },
    { id: 'all', label: 'সব সেবা (এক্সপান্ড ট্যাব)' },
    { id: 'receipts', label: 'ই-রসিদ ও স্টেটমেন্ট' },
    { id: 'chat', label: 'কমিউনিটি চ্যাট' },
    { id: 'notices', label: 'নোটিশ বোর্ড' },
    { id: 'executive', label: 'কার্যনির্বাহী পর্ষদ' },
    { id: 'complaints', label: 'অভিযোগ সেল' },
    { id: 'features', label: 'ফিচার ভোট' },
    { id: 'sheets', label: 'গুগল শীট' },
    { id: 'about-us', label: 'আমাদের সম্পর্কে' },
    { id: 'profile', label: 'প্রোফাইল ও সেটিংস' },
    { id: 'moderator', label: 'মডারেটর প্যানেল' },
  ];

  const normalizeQuickOrder = (incoming?: string[]) => {
    const allIds = DEFAULT_QUICK_SERVICES.map((s) => s.id);
    if (!incoming || incoming.length === 0) return allIds;
    const valid = incoming.filter((id) => allIds.includes(id));
    const missing = allIds.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  };

  const [tabsOrder, setTabsOrder] = useState<string[]>(() => {
    const base =
      config.navTabsOrder && config.navTabsOrder.length > 0
        ? config.navTabsOrder.filter((id) => id !== 'settings')
        : DEFAULT_APP_TABS.map((t) => t.id);
    return base.includes('profile') ? base : ['home', 'profile', ...base.filter((id) => id !== 'home')];
  });

  const [quickServicesOrder, setQuickServicesOrder] = useState<string[]>(() =>
    normalizeQuickOrder(config.quickServicesOrder)
  );

  const [customTitles, setCustomTitles] = useState<Record<string, string>>(() => {
    return config.customTabTitles || {};
  });

  // Local config form state
  const [foundationName, setFoundationName] = useState(config.foundationName);
  const [foundationSlogan, setFoundationSlogan] = useState(config.foundationSlogan);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '/logo.svg');
  const [footerText, setFooterText] = useState(config.footerText);
  const [developerAttribution, setDeveloperAttribution] = useState(config.developerAttribution);
  const [developerLink, setDeveloperLink] = useState(config.developerLink);
  const [scrollingAnnouncement, setScrollingAnnouncement] = useState(config.scrollingAnnouncement);
  const [receiptWatermarkText, setReceiptWatermarkText] = useState(config.receiptWatermarkText);
  const [receiptWatermarkImageUrl, setReceiptWatermarkImageUrl] = useState(config.receiptWatermarkImageUrl || '');
  const [statementWatermarkText, setStatementWatermarkText] = useState(config.statementWatermarkText);
  const [statementWatermarkImageUrl, setStatementWatermarkImageUrl] = useState(config.statementWatermarkImageUrl || '');
  const [moderatorPanelSignatureImageUrl, setModeratorPanelSignatureImageUrl] = useState(config.moderatorPanelSignatureImageUrl || '');
  const [generalSecretarySignatureImageUrl, setGeneralSecretarySignatureImageUrl] = useState(config.generalSecretarySignatureImageUrl || '');
  const [customFontUrl, setCustomFontUrl] = useState(config.customFontUrl || '');
  const [customFontFamily, setCustomFontFamily] = useState(config.customFontFamily || 'Hind Siliguri');
  const [fontSize, setFontSize] = useState(config.fontSize || 'medium');
  const [monthlyDueDay, setMonthlyDueDay] = useState(config.monthlyDueDay);

  // Requirement 10: Header Clock Position, Font, and Date/Weekday Order
  const [clockPosition, setClockPosition] = useState<'LEFT' | 'CENTER' | 'RIGHT'>(
    config.clockPosition || 'RIGHT'
  );
  const [clockFont, setClockFont] = useState<'FONT_MONO' | 'FONT_SANS'>(
    config.clockFont || 'FONT_MONO'
  );
  const [dateOrder, setDateOrder] = useState<'DATE_FIRST' | 'TIME_FIRST'>(
    config.dateOrder || 'DATE_FIRST'
  );
  const [headerMode, setHeaderMode] = useState<'REGULAR' | 'EXTENDED'>(
    config.headerMode || 'REGULAR'
  );
  const [clockScale, setClockScale] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>(
    config.clockScale || 'MEDIUM'
  );

  // Sync only fields that actually changed externally in persisted config so editing one item never resets other fields
  const prevConfigRef = useRef(config);
  useEffect(() => {
    const prev = prevConfigRef.current;
    if (prev === config) return;
    prevConfigRef.current = config;

    if (prev.foundationName !== config.foundationName) setFoundationName(config.foundationName);
    if (prev.foundationSlogan !== config.foundationSlogan) setFoundationSlogan(config.foundationSlogan);
    if (prev.logoUrl !== config.logoUrl) setLogoUrl(config.logoUrl || '/logo.svg');
    if (prev.footerText !== config.footerText) setFooterText(config.footerText);
    if (prev.developerAttribution !== config.developerAttribution) setDeveloperAttribution(config.developerAttribution);
    if (prev.developerLink !== config.developerLink) setDeveloperLink(config.developerLink);
    if (prev.scrollingAnnouncement !== config.scrollingAnnouncement) setScrollingAnnouncement(config.scrollingAnnouncement);
    if (prev.receiptWatermarkText !== config.receiptWatermarkText) setReceiptWatermarkText(config.receiptWatermarkText);
    if (prev.receiptWatermarkImageUrl !== config.receiptWatermarkImageUrl) setReceiptWatermarkImageUrl(config.receiptWatermarkImageUrl || '');
    if (prev.statementWatermarkText !== config.statementWatermarkText) setStatementWatermarkText(config.statementWatermarkText);
    if (prev.statementWatermarkImageUrl !== config.statementWatermarkImageUrl) setStatementWatermarkImageUrl(config.statementWatermarkImageUrl || '');
    if (prev.moderatorPanelSignatureImageUrl !== config.moderatorPanelSignatureImageUrl) setModeratorPanelSignatureImageUrl(config.moderatorPanelSignatureImageUrl || '');
    if (prev.generalSecretarySignatureImageUrl !== config.generalSecretarySignatureImageUrl) setGeneralSecretarySignatureImageUrl(config.generalSecretarySignatureImageUrl || '');
    if (prev.customFontUrl !== config.customFontUrl) setCustomFontUrl(config.customFontUrl || '');
    if (prev.customFontFamily !== config.customFontFamily) setCustomFontFamily(config.customFontFamily || 'Hind Siliguri');
    if (prev.fontSize !== config.fontSize) setFontSize(config.fontSize || 'medium');
    if (prev.monthlyDueDay !== config.monthlyDueDay) setMonthlyDueDay(config.monthlyDueDay);
    if (prev.clockPosition !== config.clockPosition) setClockPosition(config.clockPosition || 'RIGHT');
    if (prev.clockFont !== config.clockFont) setClockFont(config.clockFont || 'FONT_MONO');
    if (prev.dateOrder !== config.dateOrder) setDateOrder(config.dateOrder || 'DATE_FIRST');
    if (prev.headerMode !== config.headerMode) setHeaderMode(config.headerMode || 'REGULAR');
    if (prev.clockScale !== config.clockScale) setClockScale(config.clockScale || 'MEDIUM');
    if (
      prev.navTabsOrder !== config.navTabsOrder &&
      config.navTabsOrder &&
      config.navTabsOrder.length > 0
    ) {
      const base = config.navTabsOrder.filter((id) => id !== 'settings');
      setTabsOrder(base.includes('profile') ? base : ['home', 'profile', ...base.filter((id) => id !== 'home')]);
    }
    if (prev.quickServicesOrder !== config.quickServicesOrder) {
      setQuickServicesOrder(normalizeQuickOrder(config.quickServicesOrder));
    }
    if (prev.customTabTitles !== config.customTabTitles) {
      setCustomTitles(config.customTabTitles || {});
    }
  }, [config]);

  // New release publish state (Requirement 10: APK file input box)
  const [newVersionName, setNewVersionName] = useState('v1.3.0');
  const [newVersionCode, setNewVersionCode] = useState(130);
  const [apkDownloadUrl, setApkDownloadUrl] = useState(
    'https://github.com/mahmudul-siam/basis-foundation/releases/download/v1.3.0/basis-foundation.apk'
  );
  const [releaseNotes, setReleaseNotes] = useState('নতুন সঞ্চয় ক্যালেন্ডার, লাইভ আপডেট ও পার্সোনাল মেসেজিং ফিচার যুক্ত করা হয়েছে।');
  const [isMandatory, setIsMandatory] = useState(true);

  // App Force Update sub-tab state
  const [fuUrl, setFuUrl] = useState(() => forceUpdateRelease?.downloadUrl || '');
  const [fuVersionName, setFuVersionName] = useState(() => forceUpdateRelease?.versionName || '1.3.0');
  const [fuVersionCode, setFuVersionCode] = useState<number>(() =>
    forceUpdateRelease?.versionCode || Math.max(currentAppVersionCode + 10, 130)
  );
  const [fuIsMandatory, setFuIsMandatory] = useState<boolean>(() =>
    forceUpdateRelease?.isMandatory ?? true
  );
  const [fuNotes, setFuNotes] = useState<string>(
    () =>
      forceUpdateRelease?.releaseNotes ||
      'গুরুত্বপূর্ণ নিরাপত্তা ও পারফরম্যান্স আপডেট। নির্বিঘ্নে ব্যবহার চালিয়ে যেতে অনুগ্রহ করে নতুন ভার্সনটি ইনস্টল করুন।'
  );
  const [fuFeatures, setFuFeatures] = useState<string>(() =>
    (forceUpdateRelease?.featureList || ['দ্রুততর রিয়েল-টাইম ফায়ারস্টোর সিঙ্ক', 'নিরাপত্তা ও স্থায়িত্ব উন্নয়ন']).join('\n')
  );
  const [fuBugFixes, setFuBugFixes] = useState<string>(() =>
    (forceUpdateRelease?.bugFixList || ['ইউআই ও বাগ ফিক্স সমাধান']).join('\n')
  );
  const [fuFileSizeBytes, setFuFileSizeBytes] = useState<number>(
    () => forceUpdateRelease?.fileSizeBytes || 24500000
  );
  const [fuSha256, setFuSha256] = useState<string>(() => forceUpdateRelease?.apkSha256 || '');
  const [fuPushing, setFuPushing] = useState<boolean>(false);
  const [fuFetchingMeta, setFuFetchingMeta] = useState<boolean>(false);
  const [fuCheckingCloud, setFuCheckingCloud] = useState<boolean>(false);
  const [fuFetchMsg, setFuFetchMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!forceUpdateRelease) return;
    setFuUrl(forceUpdateRelease.downloadUrl || '');
    setFuVersionName(forceUpdateRelease.versionName || '1.3.0');
    setFuVersionCode(forceUpdateRelease.versionCode || currentAppVersionCode + 10);
    setFuIsMandatory(forceUpdateRelease.isMandatory ?? true);
    setFuNotes(forceUpdateRelease.releaseNotes || '');
    setFuFeatures((forceUpdateRelease.featureList || []).join('\n'));
    setFuBugFixes((forceUpdateRelease.bugFixList || []).join('\n'));
    setFuFileSizeBytes(forceUpdateRelease.fileSizeBytes || 24500000);
    setFuSha256(forceUpdateRelease.apkSha256 || '');
  }, [forceUpdateRelease, currentAppVersionCode]);

  // Member editing in Moderator Panel (Requirement 3)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState('');

  // Backup restore state
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  // Enforce Section 13: "The App Moderator Panel must be accessible only to APP_MODERATOR."
  if (!currentUser || currentUser.role !== 'APP_MODERATOR') {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl max-w-md mx-auto my-12 space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-ink">অননুমোদিত প্রবেশাধিকার</h3>
        <p className="text-xs text-slate-400">
          এই বিভাগটি শুধুমাত্র প্রধান অ্যাপ মডারেটর (APP_MODERATOR) এর জন্য সংরক্ষিত।
        </p>
      </div>
    );
  }

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedLogo = extractDirectImageUrl(logoUrl.trim()) || '/logo.svg';
    setLogoUrl(normalizedLogo);
    updateConfig({
      foundationName,
      foundationSlogan,
      logoUrl: normalizedLogo,
      footerText,
      developerAttribution,
      developerLink,
      scrollingAnnouncement,
      receiptWatermarkText,
      receiptWatermarkImageUrl: extractDirectImageUrl(receiptWatermarkImageUrl.trim()),
      statementWatermarkText,
      statementWatermarkImageUrl: extractDirectImageUrl(statementWatermarkImageUrl.trim()),
      moderatorPanelSignatureImageUrl: extractDirectImageUrl(moderatorPanelSignatureImageUrl.trim()),
      generalSecretarySignatureImageUrl: extractDirectImageUrl(generalSecretarySignatureImageUrl.trim()),
      customFontUrl,
      customFontFamily,
      fontSize: fontSize as any,
      monthlyDueDay: Number(monthlyDueDay),
      clockPosition,
      clockFont,
      dateOrder,
      headerMode,
      clockScale,
    });
    triggerSuccess('কনফিগারেশন, হোস্টেড লোগো ও ব্র্যান্ডিং তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
  };

  const handlePublishRelease = (e: React.FormEvent) => {
    e.preventDefault();
    const newRel = {
      versionName: newVersionName,
      versionCode: Number(newVersionCode),
      releaseDate: new Date().toISOString().split('T')[0],
      releaseNotes,
      featureList: ['নতুন সঞ্চয় ক্যালেন্ডার', 'পুশ আপডেট ডাউনলোড', '১-অন-১ চ্যাট'],
      bugFixList: ['ফন্ট রেন্ডারিং ও টেক্সট ব্রেক সমাধান', 'রসিদ প্রিভিউ ফিক্স'],
      isMandatory,
      minSupportedVersion: '1.0.0',
      downloadUrl: apkDownloadUrl.trim() || `https://github.com/mahmudul-siam/basis-foundation/releases/download/${newVersionName}/basis-foundation.apk`,
      fileSizeBytes: 24500000,
      apkSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    };
    publishAppRelease(newRel);
    setActiveUpdateDialog({ ...newRel, id: `rel-${Date.now()}` });
    triggerSuccess(`নতুন এপিকে সংস্করণ ${newVersionName} সফলভাবে পুশ করা হয়েছে!`);
  };

  const parseVersionFromUrlText = (rawText: string) => {
    const semverMatch = rawText.match(/v?(\d+)\.(\d+)\.(\d+)/i);
    if (semverMatch) {
      const maj = parseInt(semverMatch[1], 10);
      const min = parseInt(semverMatch[2], 10);
      const pat = parseInt(semverMatch[3], 10);
      const vName = `${maj}.${min}.${pat}`;
      const vCode = maj * 100 + min * 10 + pat;
      return { vName, vCode };
    }
    const vcMatch = rawText.match(/(?:vc|code|build)[-_]?(\d{2,6})/i);
    if (vcMatch) {
      return { vName: fuVersionName, vCode: parseInt(vcMatch[1], 10) };
    }
    return null;
  };

  const handleAutoFetchApkMeta = async () => {
    const cleanUrl = fuUrl.trim();
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
      triggerWarning('সঠিক ডাউনলোড লিংক দিন', 'অনুগ্রহ করে http:// বা https:// যুক্ত একটি বৈধ APK ডাউনলোড লিংক বা GitHub Release লিংক লিখুন।');
      return;
    }

    setFuFetchingMeta(true);
    setFuFetchMsg(null);
    let updatedAnything = false;

    try {
      // 1. Check if URL is a GitHub Release URL
      const ghDownloadMatch = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\//i);
      const ghTagMatch = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/([^/?#]+)/i);
      const ghLatestMatch = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);

      if (ghDownloadMatch || ghTagMatch || cleanUrl.includes('github.com/')) {
        const owner = ghDownloadMatch?.[1] || ghTagMatch?.[1] || ghLatestMatch?.[1];
        const repo = ghDownloadMatch?.[2] || ghTagMatch?.[2] || ghLatestMatch?.[2];
        const tag = ghDownloadMatch?.[3] || ghTagMatch?.[3];

        if (owner && repo) {
          const apiUrl = tag
            ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`
            : `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

          const ghRes = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github+json' } });
          if (ghRes.ok) {
            const ghData = await ghRes.json();
            if (ghData.tag_name) {
              const parsedTag = parseVersionFromUrlText(String(ghData.tag_name));
              if (parsedTag) {
                setFuVersionName(parsedTag.vName);
                setFuVersionCode(parsedTag.vCode);
              } else {
                setFuVersionName(String(ghData.tag_name).replace(/^v/i, ''));
              }
              updatedAnything = true;
            }
            if (Array.isArray(ghData.assets)) {
              const apkAsset =
                ghData.assets.find((a: any) => String(a.name || '').toLowerCase().endsWith('.apk')) ||
                ghData.assets[0];
              if (apkAsset?.browser_download_url && !ghDownloadMatch) {
                setFuUrl(apkAsset.browser_download_url);
              }
              if (typeof apkAsset?.size === 'number' && apkAsset.size > 0) {
                setFuFileSizeBytes(apkAsset.size);
              }
              updatedAnything = true;
            }
            if (ghData.body && !fuNotes.trim()) {
              setFuNotes(String(ghData.body).slice(0, 400));
            }
            setFuFetchMsg('GitHub Release API থেকে ভার্সন ও APK সাইজ তথ্য স্বয়ংক্রিয়ভাবে সংগ্রহ করা হয়েছে।');
          }
        }
      }

      // 2. Fallback URL pattern extraction if GitHub API did not match
      if (!updatedAnything) {
        const parsed = parseVersionFromUrlText(cleanUrl);
        if (parsed) {
          setFuVersionName(parsed.vName);
          setFuVersionCode(parsed.vCode);
          updatedAnything = true;
        }
        try {
          const headRes = await fetch(cleanUrl, { method: 'HEAD' });
          const lenHeader = headRes.headers.get('content-length');
          if (lenHeader) {
            const lenBytes = parseInt(lenHeader, 10);
            if (!Number.isNaN(lenBytes) && lenBytes > 0) {
              setFuFileSizeBytes(lenBytes);
              updatedAnything = true;
            }
          }
        } catch {
          // Ignore CORS HEAD blocks silently; manual fields remain editable
        }
        if (updatedAnything) {
          setFuFetchMsg('ডাউনলোড লিংক থেকে ভার্সন কোড ও নাম অটো-ডিটেক্ট করা হয়েছে। প্রয়োজনে ম্যানুয়ালি পরিবর্তন করতে পারেন।');
        } else {
          setFuFetchMsg('লিংকে সরাসরি ভার্সন কোড পাওয়া যায়নি—অনুগ্রহ করে নিচে ভার্সন নাম ও কোড ম্যানুয়ালি লিখুন।');
        }
      }
    } catch {
      const parsed = parseVersionFromUrlText(cleanUrl);
      if (parsed) {
        setFuVersionName(parsed.vName);
        setFuVersionCode(parsed.vCode);
        setFuFetchMsg('লিংক প্যাটার্ন থেকে ভার্সন নাম ও কোড নির্ধারণ করা হয়েছে।');
      } else {
        setFuFetchMsg('লিংক থেকে স্বয়ংক্রিয়ভাবে মেটাডাটা পড়া যায়নি; অনুগ্রহ করে ম্যানুয়ালি ইনপুট দিন।');
      }
    } finally {
      setFuFetchingMeta(false);
    }
  };

  const buildForceUpdatePayload = () => {
    const cleanUrl = fuUrl.trim();
    const cleanVerName = fuVersionName.trim().replace(/^v/i, '') || '1.3.0';
    const numericCode = Number(fuVersionCode) || 0;
    const features = fuFeatures
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    const bugs = fuBugFixes
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      versionName: cleanVerName,
      versionCode: numericCode,
      releaseDate: new Date().toISOString().split('T')[0],
      releaseNotes: fuNotes.trim() || 'নতুন সংস্করণ উপলভ্য রয়েছে।',
      featureList: features,
      bugFixList: bugs,
      isMandatory: fuIsMandatory,
      isActive: true,
      minSupportedVersion: currentAppVersionName,
      downloadUrl: cleanUrl,
      fileSizeBytes: Number(fuFileSizeBytes) || 24500000,
      apkSha256: fuSha256.trim() || 'verified-cloud-release',
    };
  };

  const handleSubmitForceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = fuUrl.trim();
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
      triggerWarning('ডাউনলোড লিংক আবশ্যক', 'অনুগ্রহ করে একটি বৈধ সরাসরি APK ডাউনলোড লিংক (https://...) প্রদান করুন।');
      return;
    }
    if (!fuVersionName.trim() || !fuVersionCode || Number(fuVersionCode) <= 0) {
      triggerWarning('ভার্সন তথ্য অসম্পূর্ণ', 'অনুগ্রহ করে সঠিক ভার্সন নাম (যেমন: 1.3.0) এবং ভার্সন কোড (যেমন: 130) দিন।');
      return;
    }
    setFuPushing(true);
    try {
      await pushForceUpdateRelease(buildForceUpdatePayload());
    } finally {
      setFuPushing(false);
    }
  };

  const handleExportBackup = () => {
    const dataStr = exportBackupData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `basis_foundation_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteRestore = () => {
    if (!restoreJsonInput.trim()) {
      triggerWarning('ব্যাকআপ JSON প্রয়োজন', 'অনুগ্রহ করে ব্যাকআপ JSON ডাটা বক্সে পেস্ট করুন।', false);
      return;
    }
    const result = restoreFromBackup(restoreJsonInput.trim());
    setRestoreFeedback(result.message);
    if (result.success) {
      triggerSuccess('ডাটাবেজ সফলভাবে রিস্টোর সম্পন্ন হয়েছে!');
      setRestoreJsonInput('');
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <SpringIcon activeKey={activeTab}>
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </SpringIcon>
              <h2 className="text-xl font-bold text-ink">অ্যাপ মডারেটর প্রশাসনিক কনসোল</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              অ্যাপ্লিকেশন ব্র্যান্ডিং, স্ক্রোলিং নোটিশ, এপিকে রিলিজ ম্যানেজমেন্ট, এবং ব্যাকআপ রিকভারি।
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 overflow-x-auto scrollbar-none">
          {[
            { id: 'BRANDING', label: 'ব্র্যান্ডিং ও টেক্সট কনফিগারেশন' },
            { id: 'FORCE_UPDATE', label: 'অ্যাপ ফোর্স আপডেট' },
            { id: 'FONTS', label: 'ফন্ট ও টাইপোগ্রাফি ওয়েট' },
            { id: 'TABS_ORDER', label: 'ট্যাব ও দ্রুত সেবা ব্যবস্থাপনা' },
            { id: 'USER_INFO', label: 'ইউজার ইনফো' },
            { id: 'BACKUP', label: 'ব্যাকআপ ও রিকভারি' },
            { id: 'AUDIT', label: 'অডিট লগ ও নিরাপত্তা ট্রেইল' },
            { id: 'SHEETS_APK_GUIDE', label: 'গুগল শিটস APK নির্দেশনা' },
            { id: 'ANDROID_SPEC', label: 'নেটিভ অ্যান্ড্রয়েড আর্কিটেকচার (APK)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative py-2 px-3.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {activeTab === tab.id && (
                <SlidingTabPill layoutId="app-mod-tab-pill" className="bg-amber-600 shadow-md" />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <PageTabTransition tabKey={activeTab}>
      {/* Tab 1: Branding & Settings */}
      {activeTab === 'BRANDING' && (
        <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <h3 className="font-bold text-ink text-base">ফাউন্ডেশন ব্র্যান্ডিং, লোগো ও ডায়নামিক টেক্সট</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ফাউন্ডেশনের পূর্ণ নাম:</label>
              <input
                type="text"
                value={foundationName}
                onChange={(e) => setFoundationName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ফাউন্ডেশনের স্লোগান:</label>
              <input
                type="text"
                value={foundationSlogan}
                onChange={(e) => setFoundationSlogan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Logo URL with Live Preview & Hosted Image Link Support (Point 13) */}
            <div className="col-span-full space-y-2.5 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="font-bold text-slate-200 text-xs">
                  অ্যাপ লোগো হোস্টেড ইমেজ ইউআরএল (ImgBB / PostImages / Google Drive / Direct / HTML / BBCode):
                </label>
                <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  প্রোফাইল ছবির মতো হোস্টেড লিংক সাপোর্ট
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                  <img
                    src={extractDirectImageUrl(logoUrl) || '/logo.svg'}
                    alt="Logo Preview"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                    }}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <HostedImageInput
                      placeholder="ImgBB / PostImages / Google Drive / HTML বা BBCode হোস্টেড ইমেজ লিংক পেস্ট করুন..."
                      value={logoUrl}
                      onChange={setLogoUrl}
                      onBlur={(e) => {
                        const direct = extractDirectImageUrl(e.target.value.trim());
                        if (direct) setLogoUrl(direct);
                      }}
                      inputClassName="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-2 shrink-0 self-start">
                      <button
                        type="button"
                        onClick={() => {
                          const cleaned = extractDirectImageUrl(logoUrl) || '/logo.svg';
                          setLogoUrl(cleaned);
                          updateConfig({ logoUrl: cleaned });
                          triggerSuccess('অ্যাপ লোগো সফলভাবে সংরক্ষিত ও সর্বত্র আপডেট হয়েছে!');
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        লোগো সেভ করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl('/logo.svg');
                          updateConfig({ logoUrl: '/logo.svg' });
                          triggerSuccess('ডিফল্ট ভেক্টর লোগো পুনরায় সেট করা হয়েছে।');
                        }}
                        className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                      >
                        ডিফল্ট লোগো
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    প্রোফাইল ছবির মতোই ImgBB, PostImages, Imgur, Google Drive, Dropbox এবং HTML/BBCode এম্বেড কোড পেস্ট করলেই স্বয়ংক্রিয়ভাবে ডিরেক্ট লোগো লিংক এক্সট্রাক্ট হয়ে অ্যাপের সর্বত্র আপডেট হবে।
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-full space-y-1">
              <label className="font-semibold text-slate-300">স্ক্রোলিং ঘোষণা টেক্সট (Marquee Announcement):</label>
              <textarea
                rows={2}
                value={scrollingAnnouncement}
                onChange={(e) => setScrollingAnnouncement(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Receipt Watermark Text & Image Link (Requirement 7) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">রসিদ ওয়াটারমার্ক টেক্সট:</label>
              <input
                type="text"
                value={receiptWatermarkText}
                onChange={(e) => setReceiptWatermarkText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">রসিদ ওয়াটারমার্ক হোস্টেড ইমেজ লিংক (ঐচ্ছিক):</label>
              <div className="flex items-center gap-2.5">
                <HostedImageInput
                  placeholder="https://.../watermark.png"
                  value={receiptWatermarkImageUrl}
                  onChange={setReceiptWatermarkImageUrl}
                  inputClassName="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
                {extractDirectImageUrl(receiptWatermarkImageUrl) && (
                  <div className="w-12 h-10 bg-white rounded-lg p-1 border border-slate-700 flex items-center justify-center shrink-0">
                    <img
                      src={extractDirectImageUrl(receiptWatermarkImageUrl)}
                      alt="Watermark Preview"
                      className="max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Statement Watermark Text & Image Link (Requirement 7) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">স্টেটমেন্ট ওয়াটারমার্ক টেক্সট:</label>
              <input
                type="text"
                value={statementWatermarkText}
                onChange={(e) => setStatementWatermarkText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">স্টেটমেন্ট ওয়াটারমার্ক হোস্টেড ইমেজ লিংক (ঐচ্ছিক):</label>
              <div className="flex items-center gap-2.5">
                <HostedImageInput
                  placeholder="https://.../statement-bg.png"
                  value={statementWatermarkImageUrl}
                  onChange={setStatementWatermarkImageUrl}
                  inputClassName="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
                {extractDirectImageUrl(statementWatermarkImageUrl) && (
                  <div className="w-12 h-10 bg-white rounded-lg p-1 border border-slate-700 flex items-center justify-center shrink-0">
                    <img
                      src={extractDirectImageUrl(statementWatermarkImageUrl)}
                      alt="Statement Watermark Preview"
                      className="max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Requirement 11: Moderator Panel & General Secretary Signature Images */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-900/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h4 className="font-bold text-amber-300 text-xs">রসিদ ও স্টেটমেন্টের অফিসিয়াল স্বাক্ষর ইমেজ সেটিংস (Requirement 11)</h4>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">"মডারেটর প্যানেল" এর সিগনেচার হোস্টেড ইমেজ লিংক:</label>
                <div className="flex items-center gap-3">
                  <HostedImageInput
                    placeholder="https://i.ibb.co/.../moderator-sign.png"
                    value={moderatorPanelSignatureImageUrl}
                    onChange={setModeratorPanelSignatureImageUrl}
                    inputClassName="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                  {extractDirectImageUrl(moderatorPanelSignatureImageUrl) && (
                    <div className="w-24 h-10 bg-white rounded-lg p-1 border border-slate-700 flex items-center justify-center shrink-0">
                      <img
                        src={extractDirectImageUrl(moderatorPanelSignatureImageUrl)}
                        alt="Preview"
                        className="max-h-full object-contain"
                      />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">* স্টেটমেন্টে প্রধান অ্যাপ মডারেটরের স্বাক্ষরের জায়গায় "মডারেটর প্যানেল" এবং এই ইমেজটি দৃশ্যমান হবে।</p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-900">
                <label className="font-semibold text-slate-300">সাধারণ সম্পাদক / নিরীক্ষক সিগনেচার হোস্টেড ইমেজ লিংক:</label>
                <div className="flex items-center gap-3">
                  <HostedImageInput
                    placeholder="https://i.ibb.co/.../sec-sign.png"
                    value={generalSecretarySignatureImageUrl}
                    onChange={setGeneralSecretarySignatureImageUrl}
                    inputClassName="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                  {extractDirectImageUrl(generalSecretarySignatureImageUrl) && (
                    <div className="w-24 h-10 bg-white rounded-lg p-1 border border-slate-700 flex items-center justify-center shrink-0">
                      <img
                        src={extractDirectImageUrl(generalSecretarySignatureImageUrl)}
                        alt="Preview"
                        className="max-h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Custom Font URL Injection (Requirement 8) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ম্যানুয়াল ফন্ট সিএসএস লিংক (Google Fonts / Webfont URL):</label>
              <input
                type="url"
                placeholder="https://fonts.googleapis.com/css2?family=Tiro+Bangla..."
                value={customFontUrl}
                onChange={(e) => setCustomFontUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ফন্ট ফ্যামিলির নাম (Font Family):</label>
              <input
                type="text"
                placeholder="Hind Siliguri (Default)"
                value={customFontFamily}
                onChange={(e) => setCustomFontFamily(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
              />
            </div>

            {/* Font Scale Control (Requirement 10) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ফন্ট সাইজ স্কেল (Font Scaling):</label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                      fontSize === sz
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {sz === 'small' ? 'ছোট (14px)' : sz === 'medium' ? 'স্বাভাবিক (16px)' : 'বড় (18px)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">মাসিক জমা ডিউ ডেট (তারিখ):</label>
              <input
                type="number"
                min="1"
                max="31"
                value={monthlyDueDay}
                onChange={(e) => setMonthlyDueDay(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ডেভেলপার স্বীকৃতি টেক্সট (Attribution):</label>
              <input
                type="text"
                value={developerAttribution}
                onChange={(e) => setDeveloperAttribution(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ডেভেলপার হাইপারলিংক:</label>
              <input
                type="text"
                value={developerLink}
                onChange={(e) => setDeveloperLink(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ফুটার কপিরাইট টেক্সট:</label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">মাসিক জমা ডিউ ডেট (তারিখ):</label>
              <input
                type="number"
                min="1"
                max="31"
                value={monthlyDueDay}
                onChange={(e) => setMonthlyDueDay(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 font-bold"
              />
            </div>

            {/* Requirement 4 & 6: Header Date Scale, Logo Size, Title Scale & Ticker Speed */}
            <div className="col-span-full p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="font-bold text-ink text-xs flex items-center gap-2 border-b border-slate-800 pb-2">
                <span>হেডার এলিমেন্ট সাইজ (+, -) ও স্ক্রোলিং স্পিড নিয়ন্ত্রণ</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Header Date & Day Scale */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">তারিখ ও বার স্কেল (Date Scale):</span>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => updateConfig({ headerDateScale: Math.max(70, (config.headerDateScale || 100) - 5) })}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-ink font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      {config.headerDateScale || 100}%
                    </span>
                    <button
                      type="button"
                      onClick={() => updateConfig({ headerDateScale: Math.min(160, (config.headerDateScale || 100) + 5) })}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-ink font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. Header Logo Size */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">হেডার লোগো সাইজ (Logo Size):</span>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => updateConfig({ headerLogoSize: Math.max(28, (config.headerLogoSize || 44) - 2) })}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-ink font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-amber-400 font-bold text-sm">
                      {config.headerLogoSize || 44}px
                    </span>
                    <button
                      type="button"
                      onClick={() => updateConfig({ headerLogoSize: Math.min(72, (config.headerLogoSize || 44) + 2) })}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-ink font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Header Title Scale */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">ফাউন্ডেশন নাম স্কেল (Title Scale):</span>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => updateConfig({ headerTitleScale: Math.max(70, (config.headerTitleScale || 100) - 5) })}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-ink font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-blue-400 font-bold text-sm">
                      {config.headerTitleScale || 100}%
                    </span>
                    <button
                      type="button"
                      onClick={() => updateConfig({ headerTitleScale: Math.min(160, (config.headerTitleScale || 100) + 5) })}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-ink font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. Ticker Scrolling Speed (Point 4) */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">ঘোষণা স্ক্রোলিং স্পিড (Ticker Speed):</span>
                  <div className="flex gap-1">
                    {(['slow', 'normal', 'fast'] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => updateConfig({ tickerSpeed: spd })}
                        className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          (config.tickerSpeed || 'normal') === spd
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {spd === 'slow' ? 'ধীর' : spd === 'normal' ? 'স্বাভাবিক' : 'দ্রুত'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Requirement 14: Joint Bank Account Holders Editor (3 Demo members & edit) */}
            <div className="col-span-full p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h4 className="font-bold text-ink text-xs flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>যৌথ ব্যাংক একাউন্ট হোল্ডারদের তালিকা (৩ জনের ডেমু ও এডিট)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    আমাদের সম্পর্কে ও ব্যাংক ইনফরমেশন উভয় ট্যাবে এই তালিকাটি সিংক থাকবে।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = config.jointBankAccountHolders || [
                      'তানভীর আহমেদ (সভাপতি)',
                      'সাবরিনা আক্তার (সাধারণ সম্পাদক)',
                      'রাশেদুল করিম (কোষাধ্যক্ষ)',
                    ];
                    updateConfig({ jointBankAccountHolders: [...current, 'নতুন হোল্ডার (পদবি)'] });
                  }}
                  className="py-1 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  + নতুন যোগ করুন
                </button>
              </div>

              <div className="space-y-2">
                {(config.jointBankAccountHolders || [
                  'তানভীর আহমেদ (সভাপতি)',
                  'সাবরিনা আক্তার (সাধারণ সম্পাদক)',
                  'রাশেদুল করিম (কোষাধ্যক্ষ)',
                ]).map((holder, idx) => {
                  const holderLabel =
                    typeof holder === 'string'
                      ? holder
                      : `${holder.name}${holder.role ? ` (${holder.role})` : ''}`;
                  return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono text-xs w-5">{idx + 1}.</span>
                    <input
                      type="text"
                      value={holderLabel}
                      onChange={(e) => {
                        const next = [...(config.jointBankAccountHolders || [
                          'তানভীর আহমেদ (সভাপতি)',
                          'সাবরিনা আক্তার (সাধারণ সম্পাদক)',
                          'রাশেদুল করিম (কোষাধ্যক্ষ)',
                        ])];
                        const val = e.target.value;
                        if (typeof holder === 'object' && holder !== null) {
                          const match = /^(.+?)\s*\((.+)\)\s*$/.exec(val);
                          next[idx] = match
                            ? { ...holder, name: match[1].trim(), role: match[2].trim() }
                            : { ...holder, name: val };
                        } else {
                          next[idx] = val;
                        }
                        updateConfig({ jointBankAccountHolders: next });
                      }}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current = config.jointBankAccountHolders || [
                          'তানভীর আহমেদ (সভাপতি)',
                          'সাবরিনা আক্তার (সাধারণ সম্পাদক)',
                          'রাশেদুল করিম (কোষাধ্যক্ষ)',
                        ];
                        const next = current.filter((_, i) => i !== idx);
                        updateConfig({ jointBankAccountHolders: next });
                      }}
                      className="p-2 rounded-xl bg-rose-950/60 text-rose-400 hover:bg-rose-900 border border-rose-900/50 cursor-pointer"
                      title="অপসারণ করুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>পরিবর্তন সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Application Releases & APK Management (Section 21) */}
      {activeTab === 'RELEASES' && (
        <div className="space-y-4">
          {/* Publish New Release Form */}
          <form onSubmit={handlePublishRelease} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-amber-400" />
              <span>নতুন এপিকে সংস্করণ প্রকাশ ও ডিস্ট্রিবিউশন (Publish APK)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">ভার্সন নাম (Version Name):</label>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  placeholder="v1.2.0"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">বিল্ড কোড (Version Code):</label>
                <input
                  type="number"
                  value={newVersionCode}
                  onChange={(e) => setNewVersionCode(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1 flex flex-col justify-center">
                <label className="font-semibold text-slate-300">বাধ্যতামূলক আপডেট:</label>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-slate-300">সকল গ্রাহকের জন্য বাধ্যতামূলক</span>
                </label>
              </div>

              <div className="col-span-full space-y-1">
                <label className="font-semibold text-slate-300">
                  এপিকে ফাইল ইনপুট / ডাউনলোড লিংক (APK File / Direct Hosted Download Link):
                </label>
                <input
                  type="url"
                  placeholder="https://.../basis-foundation-v1.3.0.apk বা ড্রাইভ/ড্রপবক্স ডিরেক্ট লিংক"
                  value={apkDownloadUrl}
                  onChange={(e) => setApkDownloadUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-ink font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  * এখানে এপিকে ডাউনলোড লিংক প্রদান করলে সকল ব্যবহারকারীর হোম স্ক্রিনে বাধ্যতামূলক/ঐচ্ছিক আপডেট পপআপ যাবে এবং ডিফল্ট ব্রাউজারে ডাউনলোড হবে।
                </p>
              </div>

              <div className="col-span-full space-y-1">
                <label className="font-semibold text-slate-300">রিলিজ নোট (Release Notes):</label>
                <textarea
                  rows={2}
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>এপিকে রিলিজ প্রকাশ করুন</span>
              </button>
            </div>
          </form>

          {/* Published Releases List */}
          <div className="space-y-3">
            <h4 className="font-bold text-ink text-sm">প্রকাশিত সংস্করণসমূহ ({toBengaliNumerals(releases.length)})</h4>
            {releases.map((rel) => (
              <div
                key={rel.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-base">{rel.versionName}</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      Code: {rel.versionCode}
                    </span>
                    {rel.isMandatory && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        বাধ্যতামূলক
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400">{rel.releaseNotes}</p>
                  <p className="font-mono text-[10px] text-slate-500">SHA256: {rel.apkSha256}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveUpdateDialog(rel)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs transition-colors flex items-center gap-1"
                  >
                    <span>আপডেট ডায়ালগ টেস্ট করুন</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: App Force Update Management */}
      {activeTab === 'FORCE_UPDATE' && (
        <div className="space-y-4 text-xs">
          {/* Current Device Version vs Live Cloud Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-base">অ্যাপ ফোর্স আপডেট ও রিলিজ কন্ট্রোল (OTA APK)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    নতুন APK ডাউনলোড লিংক ও ভার্সন কোড পুশ করলে পূর্ববর্তী ভার্সনের সকল APK-তে সরাসরি ইন-অ্যাপ আপডেট ডায়ালগ প্রদর্শিত হবে।
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={fuCheckingCloud}
                onClick={async () => {
                  setFuCheckingCloud(true);
                  try {
                    await checkForAppUpdate(true);
                  } finally {
                    setFuCheckingCloud(false);
                  }
                }}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${fuCheckingCloud ? 'animate-spin' : ''}`} />
                <span>ক্লাউড ভার্সন যাচাই করুন</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold">বর্তমান ইনস্টলকৃত অ্যাপ ভার্সন:</span>
                <div className="flex items-center gap-2">
                  <strong className="text-sm text-ink font-bold">v{currentAppVersionName}</strong>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
                    Code: {toBengaliNumerals(currentAppVersionCode)} ({currentAppVersionCode})
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold">লাইভ ক্লাউড ফোর্স আপডেট অবস্থা:</span>
                {forceUpdateRelease && forceUpdateRelease.isActive !== false ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>সক্রিয়: v{forceUpdateRelease.versionName}</span>
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                      Code: {forceUpdateRelease.versionCode}
                    </span>
                    {forceUpdateRelease.isMandatory && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        বাধ্যতামূলক
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 font-bold">বর্তমানে কোনো সক্রিয় ফোর্স আপডেট নেই</p>
                )}
              </div>
            </div>
          </div>

          {/* Force Update Configuration Form */}
          <form onSubmit={handleSubmitForceUpdate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 block">
                নতুন APK ডাউনলোড লিংক (Direct APK URL / GitHub Release Link):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={fuUrl}
                  onChange={(e) => setFuUrl(e.target.value)}
                  placeholder="https://github.com/username/repo/releases/download/v1.3.0/app-release.apk"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <button
                  type="button"
                  disabled={fuFetchingMeta}
                  onClick={handleAutoFetchApkMeta}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fuFetchingMeta ? 'animate-spin' : ''}`} />
                  <span>{fuFetchingMeta ? 'তথ্য খুঁজছে...' : 'লিংক থেকে অটো-ফেচ'}</span>
                </button>
              </div>
              {fuFetchMsg && (
                <p className="text-[11px] text-emerald-400 font-medium pt-0.5">{fuFetchMsg}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">ভার্সন নাম (Version Name):</label>
                <input
                  type="text"
                  value={fuVersionName}
                  onChange={(e) => setFuVersionName(e.target.value)}
                  placeholder="যেমন: 1.3.0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">ভার্সন কোড (Version Code):</label>
                <input
                  type="number"
                  min={1}
                  value={fuVersionCode}
                  onChange={(e) => setFuVersionCode(Number(e.target.value))}
                  placeholder="যেমন: 130"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">আনুমানিক সাইজ (Bytes):</label>
                <input
                  type="number"
                  min={1024}
                  value={fuFileSizeBytes}
                  onChange={(e) => setFuFileSizeBytes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-ink text-xs block">বাধ্যতামূলক ফোর্স আপডেট (Non-Dismissible Dialog)</span>
                <span className="text-[11px] text-slate-400">
                  সক্রিয় থাকলে ইউজার কোনোভাবেই (ব্যাক বাটন বা ক্লোজ বাটনে) আপডেট ডায়ালগ এড়িয়ে অ্যাপ ব্যবহার করতে পারবে না।
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={fuIsMandatory}
                onClick={() => setFuIsMandatory((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                  fuIsMandatory ? 'bg-rose-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                    fuIsMandatory ? 'translate-x-6.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">আপডেট নোট / রিলিজ বিবরণ:</label>
              <textarea
                rows={2}
                value={fuNotes}
                onChange={(e) => setFuNotes(e.target.value)}
                placeholder="নতুন ভার্সনে কী কী পরিবর্তন আনা হয়েছে লিখুন..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-emerald-400 block">নতুন ফিচারসমূহ (প্রতি লাইনে একটি):</label>
                <textarea
                  rows={3}
                  value={fuFeatures}
                  onChange={(e) => setFuFeatures(e.target.value)}
                  placeholder="রিয়েল-টাইম ক্লাউড সিঙ্ক&#10;উন্নত ডিজিটাল রসিদ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-amber-400 block">সমাধানকৃত বাগসমূহ (প্রতি লাইনে একটি):</label>
                <textarea
                  rows={3}
                  value={fuBugFixes}
                  onChange={(e) => setFuBugFixes(e.target.value)}
                  placeholder="পারফরম্যান্স অপটিমাইজেশন&#10;ক্র্যাশ সমাধান"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-400 block">APK SHA256 চেকসাম (ঐচ্ছিক):</label>
              <input
                type="text"
                value={fuSha256}
                onChange={(e) => setFuSha256(e.target.value)}
                placeholder="ঐচ্ছিক — খালি রাখলেও সমস্যা নেই"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="submit"
                disabled={fuPushing}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>{fuPushing ? 'ক্লাউডে পুশ হচ্ছে...' : 'ফোর্স আপডেট পুশ করুন'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const previewPayload = buildForceUpdatePayload();
                  setActiveUpdateDialog({
                    ...previewPayload,
                    isMandatory: false, // Preview mode allows closing in moderator panel so admin isn't locked
                    id: `preview-${Date.now()}`,
                  });
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>আপডেট ডায়ালগ প্রিভিউ</span>
              </button>

              {forceUpdateRelease && forceUpdateRelease.isActive !== false && (
                <button
                  type="button"
                  onClick={() => disableForceUpdate()}
                  className="py-2.5 px-4 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <X className="w-4 h-4" />
                  <span>ফোর্স আপডেট নিষ্ক্রিয় করুন</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Backup & Recovery (Section 20) */}
      {activeTab === 'BACKUP' && (
        <div className="space-y-4 text-xs">
          {/* Cloud Firestore Migration Management Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-base flex items-center gap-2">
                    <span>লোকাল স্টোরেজ ➔ ফায়ারবেস ফায়ারস্টোর ক্লাউড মাইগ্রেশন</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    মডারেটর লোকাল ডাটাকে ফায়ারবেস ক্লাউড ডাটাবেজে রূপান্তর ও মার্জ করুন (ভার্সন {MIGRATION_VERSION})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                    migrationStatus.isMigrated
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${migrationStatus.isMigrated ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                  <span>{migrationStatus.isMigrated ? `মাইগ্রেশন সক্রিয় (v${migrationStatus.version})` : 'মাইগ্রেশন অপেক্ষমান'}</span>
                </span>

                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                    migrationStatus.hasLocalBackup
                      ? 'bg-blue-950/70 border-blue-500/40 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>{migrationStatus.hasLocalBackup ? 'লোকাল ব্যাকআপ রক্ষিত' : 'ব্যাকআপ প্রস্তুত'}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px]">সিঙ্গেল সোর্স অব ট্রুথ</div>
                <div className="text-emerald-400 font-bold text-sm">Firebase Cloud Firestore</div>
                <div className="text-[10px] text-slate-400">রিয়েলটাইম স্ন্যাপশট ও ক্লাউড সিঙ্ক সক্রিয়</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px]">স্থানীয় স্টোরেজ অবস্থান</div>
                <div className="text-blue-300 font-bold text-sm">Offline Cache & Fallback</div>
                <div className="text-[10px] text-slate-400">ক্লাউড ডাটাকে কোনোভাবেই ওভাররাইট করবে না</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px]">কর্তৃত্ব ও অ্যাক্সেস রোল</div>
                <div className="text-amber-300 font-bold text-sm">মডারেটর দ্বারা নিয়ন্ত্রিত</div>
                <div className="text-[10px] text-slate-400">সাধারণ ইউজার বা গেস্ট ডাটা ক্লাউডে যাবে না</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {showMigrationConfirm ? (
                <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50">
                  <span className="text-[11px] text-amber-200 font-bold px-2">
                    ক্লাউড মাইগ্রেশন শুরু করতে নিশ্চিত? (পূর্বের লোকাল ব্যাকআপ স্বয়ংক্রিয় সংরক্ষিত হবে)
                  </span>
                  <button
                    onClick={handleRunCloudMigration}
                    disabled={isMigrating}
                    className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {isMigrating ? 'মাইগ্রেশন চলছে...' : 'হ্যাঁ, মাইগ্রেট করুন'}
                  </button>
                  <button
                    onClick={() => setShowMigrationConfirm(false)}
                    disabled={isMigrating}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    বাতিল
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMigrationConfirm(true)}
                  disabled={isMigrating}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                  <span>{isMigrating ? 'ফায়ারবেস ক্লাউডে স্থানান্তর হচ্ছে...' : 'লোকাল ডাটা ➔ ফায়ারবেস ক্লাউড মাইগ্রেশন চালান'}</span>
                </button>
              )}

              {(migrationResult || migrationStatus.isMigrated) && (
                <button
                  type="button"
                  onClick={() => setShowMigrationLogs(!showMigrationLogs)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>মাইগ্রেশন অডিট রিপোর্ট ও পরিসংখ্যান</span>
                  {showMigrationLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Migration detailed report */}
            {showMigrationLogs && (
              <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 font-sans font-bold border-b border-slate-800 pb-2">
                  <span className="text-emerald-400">মাইগ্রেশন এক্সিকিউশন রিপোর্ট (v{migrationResult?.version || migrationStatus.version})</span>
                  <span>অপারেটর: {migrationResult?.operator || migrationStatus.migratedBy || currentUser.name}</span>
                </div>

                {migrationResult?.counts && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    {Object.entries(migrationResult.counts).map(([col, cnt]) => (
                      <div key={col} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400 capitalize">{col.replace(/_/g, ' ')}</div>
                        <div className="text-emerald-400 font-bold text-xs">{toBengaliNumerals(cnt)} টি</div>
                      </div>
                    ))}
                  </div>
                )}

                {migrationResult?.logs && (
                  <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
                    {migrationResult.logs.map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap">{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>পূর্ণাঙ্গ ডাটাবেজ ব্যাকআপ ও রিস্টোর (Backup & Recovery)</span>
            </h3>
            <p className="text-slate-400 leading-relaxed">
              সদস্য প্রোফাইল, সঞ্চয় লেনদেন, ২/৩ সিলিং ভোট ইতিহাস, রসিদ এবং অডিট লগসমূহ একটি সম্পূর্ণ সুরক্ষিত ভেরিফাইড JSON ফাইলে এক্সপোর্ট করুন অথবা পূর্বের ব্যাকআপ থেকে রিস্টোর করুন।
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleExportBackup}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>সম্পূর্ণ ডাটাবেজ ব্যাকআপ ডাউনলোড (JSON)</span>
              </button>

              {showResetConfirm ? (
                <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50">
                  <span className="text-[11px] text-rose-300 font-bold px-2">
                    সকল ডেমো ডাটা ও হিসাব শূন্য করতে নিশ্চিত?
                  </span>
                  <button
                    onClick={() => {
                      resetToInitialDemo();
                      setShowResetConfirm(false);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    হ্যাঁ, রিসেট করুন
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    না
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="সকল ডেমো ডাটা, ডেমো সদস্য ও আর্থিক হিসাব মুছে শূন্য করুন"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>ডেমো ডাটা রিসেট ও হিসাব শূন্য করুন</span>
                </button>
              )}
            </div>
          </div>

          {/* Restore JSON input */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-ink text-sm">ব্যাকআপ থেকে ডাটা রিস্টোর (Restore from JSON)</h4>
            <textarea
              rows={4}
              placeholder="এখানে এক্সপোর্টকৃত ব্যাকআপ JSON কোড পেস্ট করুন..."
              value={restoreJsonInput}
              onChange={(e) => setRestoreJsonInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-amber-500"
            />
            {restoreFeedback && (
              <p className="text-xs text-amber-400 font-semibold">{restoreFeedback}</p>
            )}

            <button
              onClick={handleExecuteRestore}
              className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>ডাটা রিস্টোর প্রক্রিয়া সম্পন্ন করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: User Info (Plain Text User IDs & Passwords for APP_MODERATOR) */}
      {activeTab === 'USER_INFO' && (() => {
        const q = userInfoSearch.trim().toLowerCase();
        const filteredUsers = q
          ? realUsers.filter(
              (u) =>
                u.name.toLowerCase().includes(q) ||
                u.memberId.toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.phone || '').toLowerCase().includes(q)
            )
          : realUsers;

        const resolvePlainPassword = (u: typeof realUsers[number]): { text: string; isUnknownHash?: boolean } => {
          if (u.plainPassword && u.plainPassword.trim()) {
            return { text: u.plainPassword };
          }
          if (u.password && !isHashedPassword(u.password)) {
            return { text: u.password };
          }
          if (!u.password || verifyPassword('123456', u.password)) {
            return { text: '123456' };
          }
          return {
            text: 'পূর্বের এনক্রিপ্টেড পাসওয়ার্ড (পুনঃলগইনে প্লেইন টেক্সট আপডেট হবে)',
            isUnknownHash: true,
          };
        };

        const copyField = (text: string, key: string) => {
          navigator.clipboard.writeText(text);
          setCopiedUserInfoKey(key);
          setTimeout(() => setCopiedUserInfoKey((curr) => (curr === key ? null : curr)), 2000);
        };

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-ink text-base flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  <span>সকল ইউজার ইনফো (আইডি ও পাসওয়ার্ড - প্লেইন টেক্সট)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  সকল নিবন্ধিত সদস্য ও মডারেটরের ইউজার আইডি ও পাসওয়ার্ড প্লেইন টেক্সটে দেখুন।
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-800 text-amber-300 self-start sm:self-auto">
                মোট ইউজার: {toBengaliNumerals(realUsers.length)} জন
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userInfoSearch}
                onChange={(e) => setUserInfoSearch(e.target.value)}
                placeholder="নাম, ইউজার আইডি (BF-001), ইমেইল বা মোবাইল দিয়ে খুঁজুন..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                কোনো ইউজার পাওয়া যায়নি।
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredUsers.map((u) => {
                  const passInfo = resolvePlainPassword(u);
                  const roleLabel =
                    u.role === 'APP_MODERATOR'
                      ? 'অ্যাপ মডারেটর'
                      : u.role === 'MODERATOR'
                      ? 'মডারেটর'
                      : 'সাধারণ সদস্য';

                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={u.avatarUrl} name={u.name} size="md" />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-ink font-bold text-sm truncate">{u.name}</strong>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                              {roleLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {u.phone} {u.email ? `• ${u.email}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0 sm:min-w-[320px]">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block">ইউজার আইডি:</span>
                            <span className="font-mono font-bold text-emerald-400 text-xs select-all break-all">
                              {u.memberId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyField(u.memberId, `id-${u.id}`)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
                            title="আইডি কপি করুন"
                          >
                            {copiedUserInfoKey === `id-${u.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block">পাসওয়ার্ড (প্লেইন টেক্সট):</span>
                            <span
                              className={`font-mono font-bold text-xs select-all break-all ${
                                passInfo.isUnknownHash ? 'text-slate-400 text-[10px]' : 'text-amber-300'
                              }`}
                            >
                              {passInfo.text}
                            </span>
                          </div>
                          {!passInfo.isUnknownHash && (
                            <button
                              type="button"
                              onClick={() => copyField(passInfo.text, `pw-${u.id}`)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
                              title="পাসওয়ার্ড কপি করুন"
                            >
                              {copiedUserInfoKey === `pw-${u.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab 4: Audit Logs (Section 26) */}
      {activeTab === 'AUDIT' && (() => {
        const auditIdSet = new Set(auditLogs.map((l) => l.id));
        const validSelectedIds = selectedAuditIds.filter((id) => auditIdSet.has(id));
        const allSelected = auditLogs.length > 0 && validSelectedIds.length === auditLogs.length;

        const toggleSelectAllAudits = () => {
          setConfirmDeleteSelectedAudits(false);
          if (allSelected) {
            setSelectedAuditIds([]);
          } else {
            setSelectedAuditIds(auditLogs.map((l) => l.id));
          }
        };

        const toggleAuditSelection = (logId: string) => {
          setConfirmDeleteSelectedAudits(false);
          setSelectedAuditIds((prev) =>
            prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
          );
        };

        return (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
              <div>
                <h3 className="font-bold text-ink text-base">সিস্টেম অডিট ট্রেইল (Immutable Audit Logs)</h3>
                <span className="text-xs text-slate-400">
                  মোট {toBengaliNumerals(auditLogs.length)} টি রেকর্ড
                  {validSelectedIds.length > 0 && ` • ${toBengaliNumerals(validSelectedIds.length)} টি নির্বাচিত`}
                </span>
              </div>

              {auditLogs.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllAudits}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      readOnly
                      className="accent-amber-500 w-3.5 h-3.5 pointer-events-none"
                    />
                    <span>{allSelected ? 'নির্বাচন বাতিল করুন' : 'সব সিলেক্ট (Select All)'}</span>
                  </button>

                  {validSelectedIds.length > 0 &&
                    (confirmDeleteSelectedAudits ? (
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-rose-950/80 border border-rose-500/50">
                        <span className="text-[11px] font-bold text-rose-200 px-1.5">
                          {toBengaliNumerals(validSelectedIds.length)} টি মুছবেন?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteAuditLogs(validSelectedIds);
                            setSelectedAuditIds([]);
                            setConfirmDeleteSelectedAudits(false);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          নিশ্চিত ডিলিট
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSelectedAudits(false)}
                          className="py-1 px-2 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                        >
                          না
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSelectedAudits(true)}
                        className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>নির্বাচিত ডিলিট ({toBengaliNumerals(validSelectedIds.length)})</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                কোনো অডিট লগ রেকর্ড নেই।
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => {
                  const isSelected = validSelectedIds.includes(log.id);
                  return (
                    <div
                      key={log.id}
                      onClick={() => toggleAuditSelection(log.id)}
                      className={`p-3.5 rounded-xl border text-xs space-y-1 font-mono cursor-pointer transition-colors flex items-start gap-3 ${
                        isSelected
                          ? 'bg-amber-950/20 border-amber-500/60'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAuditSelection(log.id);
                        }}
                        className="mt-1 accent-amber-500 w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-[11px] gap-2">
                          <span className="text-emerald-400 font-bold">[{log.actionType}]</span>
                          <span className="shrink-0">{new Date(log.timestamp).toLocaleString('en-GB')}</span>
                        </div>
                        <p className="text-slate-200 font-sans">{log.details}</p>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>কর্তা: {log.actorName} ({log.actorRole})</span>
                          <span>•</span>
                          <span>টার্গেট: {log.targetType} #{log.targetId}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab: Font Selection & Weight Rules (Requirement 5) */}
      {activeTab === 'FONTS' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <Type className="w-5 h-5 text-amber-400" />
                <span>ফন্ট নির্বাচন ও টাইপোগ্রাফি ওয়েট কনফিগারেশন</span>
              </h3>
              <p className="text-slate-400 mt-0.5">
                ফন্টের লাইট (৩০০) ভার্সন বন্ধ রাখা হয়েছে। সংখ্যা ও টাকার অংক Hind Siliguri ফন্টে যাতে না ভাঙে সেজন্য সর্বদা বোল্ড ওয়েট প্রযুক্ত থাকবে।
              </p>
            </div>

            {/* Font Family Quick Presets */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <label className="font-bold text-slate-200 block text-xs">জনপ্রিয় বাংলা ফন্ট প্রিসেটসমূহ:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  {
                    name: 'Hind Siliguri (ডিফল্ট ফিক্সড)',
                    family: 'Hind Siliguri',
                    url: 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&display=swap',
                    desc: 'সবচেয়ে স্পষ্ট বাংলা সংখ্যা ও রসিদ টাইপোগ্রাফি',
                  },
                  {
                    name: 'Noto Sans Bengali',
                    family: 'Noto Sans Bengali',
                    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap',
                    desc: 'গুগলের সার্বজনীন স্ট্যান্ডার্ড বাংলা ফন্ট',
                  },
                  {
                    name: 'Tiro Bangla',
                    family: 'Tiro Bangla',
                    url: 'https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&display=swap',
                    desc: 'ঐতিহ্যবাহী ক্ল্যাসিক্যাল বুক স্টাইল বাংলা ফন্ট',
                  },
                  {
                    name: 'Anek Bangla',
                    family: 'Anek Bangla',
                    url: 'https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600;700;800&display=swap',
                    desc: 'আধুনিক জ্যামিতিক টেক্সটাইল ফন্ট',
                  },
                ].map((preset) => (
                  <button
                    key={preset.family}
                    type="button"
                    onClick={() => {
                      setCustomFontFamily(preset.family);
                      setCustomFontUrl(preset.url);
                      updateConfig({
                        uploadedFontDataUrl: undefined,
                        uploadedFontName: undefined,
                        customFontFamily: preset.family,
                        customFontUrl: preset.url,
                      });
                      triggerSuccess(`ফন্ট সফলভাবে "${preset.family}" এ পরিবর্তিত হয়েছে!`);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      customFontFamily === preset.family
                        ? 'bg-amber-600/20 border-amber-500 text-ink shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-ink">{preset.name}</div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Typography Weight Strategy Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="space-y-1">
                <span className="font-bold text-slate-300 block">১. সংখ্যা ও টাকার পরিমাণ:</span>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 font-bold text-xs">
                  সর্বদা Bold (৭০০/৮০০) — ফিক্সড
                </div>
                <p className="text-[10px] text-slate-400">১ ও বাংলা সংখ্যা কখনোই ভাঙবে না</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-300 block">২. সাধারণ টেক্সট ও বিবরণ:</span>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-ink font-bold text-xs">
                  Regular (৪০০) ও Medium (৫০০)
                </div>
                <p className="text-[10px] text-slate-400">লাইট ভার্সন (৩০০) চিরতরে নিষিদ্ধ</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-300 block">৩. হেডিং, টাইটেল ও বাটন:</span>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-xs">
                  Bold (৭০০) ও Black (৮০০)
                </div>
                <p className="text-[10px] text-slate-400">উচ্চ কনট্রাস্ট ও আধুনিক লুক</p>
              </div>
            </div>

            {/* Requirement 9: Manual Font File Upload (.ttf, .woff, .woff2, .otf) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-amber-300 block text-xs flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>ম্যানুয়াল ফন্ট ফাইল আপলোড (.ttf, .woff, .woff2, .otf):</span>
                </label>
                <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  ইনস্ট্যান্ট অ্যাপ্লাই
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                আপনার ডিভাইস থেকে যেকোনো কাস্টম বাংলা ফন্ট ফাইল (.ttf / .woff / .otf) সরাসরি নির্বাচন করুন। ফাইলটি নির্বাচন করার সাথে সাথে পুরো অ্যাপের ইন্টারফেসে স্বয়ংক্রিয়ভাবে কার্যকর (Apply) হবে।
              </p>

              <input
                type="file"
                accept=".ttf,.woff,.woff2,.otf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const dataUrl = event.target?.result as string;
                    const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '');
                    updateConfig({
                      uploadedFontDataUrl: dataUrl,
                      uploadedFontName: fontName,
                      customFontFamily: fontName,
                    });
                    triggerSuccess(`ফন্ট "${file.name}" সফলভাবে আপলোড ও অ্যাপে প্রয়োগ করা হয়েছে!`);
                  };
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
              />

              {config.uploadedFontDataUrl && (
                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold">সক্রিয় আপলোডকৃত ফন্ট: {config.uploadedFontName || 'CustomFont'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateConfig({
                        uploadedFontDataUrl: undefined,
                        uploadedFontName: undefined,
                        customFontFamily: 'Hind Siliguri',
                      });
                      triggerSuccess('আপলোডকৃত ফন্ট বাতিল করে ডিফল্ট Hind Siliguri ফন্টে ফিরিয়ে আনা হয়েছে।');
                    }}
                    className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer text-xs"
                  >
                    ডিফল্ট ফন্টে ফিরুন
                  </button>
                </div>
              )}
            </div>

            {/* Live Font Testing & Rendering Preview */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 text-xs">লাইভ ফন্ট ও সংখ্যা প্রিভিউ:</span>
                <span className="font-mono text-[11px] text-slate-400 font-bold">
                  ফন্ট ফ্যামিলি: {customFontFamily || 'Hind Siliguri'}
                </span>
              </div>
              <div className="space-y-1 text-ink">
                <p className="text-base font-bold text-ink">
                  বেসিস ফাউন্ডেশন সমবায় সঞ্চয় ও ব্যবস্থাপনা প্ল্যাটফর্ম
                </p>
                <p className="text-xs text-slate-300 font-medium">
                  ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য় ৎ ং ঃ ঁ
                </p>
                <div className="flex items-center gap-4 text-emerald-400 font-bold text-sm pt-1">
                  <span>বাংলা সংখ্যা: ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯ ০</span>
                  <span>•</span>
                  <span>নমুনা কিস্তি: ৳১,৫০০.০০</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tab Re-ordering, Custom Titles & Quick Services Rearrangement (Point 5) */}
      {activeTab === 'TABS_ORDER' && (
        <div className="space-y-5 text-xs">
          {/* Section A: Dashboard Quick Services (6 Primary Slots + Other Services) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-ink text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>দ্রুত সেবা (৬টি ট্যাব) ও অন্যান্য সেবা রি-অর্ডার</span>
                </h3>
                <p className="text-slate-400 mt-0.5">
                  প্রথম ৬টি সেবা সরাসরি ড্যাশবোর্ডের "দ্রুত সেবা" গ্রিডে শো করবে এবং বাকিগুলো "সব দেখুন" অংশে থাকবে।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const defQuick = DEFAULT_QUICK_SERVICES.map((s) => s.id);
                    setQuickServicesOrder(defQuick);
                    updateConfig({ quickServicesOrder: defQuick });
                    triggerSuccess('দ্রুত সেবার বিন্যাস ডিফল্ট অবস্থায় ফিরিয়ে আনা হয়েছে!');
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  ডিফল্ট অর্ডার
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateConfig({
                      quickServicesOrder,
                      customTabTitles: customTitles,
                    });
                    triggerSuccess('দ্রুত সেবার ৬টি ট্যাব ও অন্যান্য সেবার নতুন ক্রম সফলভাবে সংরক্ষিত হয়েছে!');
                  }}
                  className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>দ্রুত সেবা সংরক্ষণ</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {quickServicesOrder.map((serviceId, idx) => {
                const defSvc = DEFAULT_QUICK_SERVICES.find((s) => s.id === serviceId) || {
                  id: serviceId,
                  label: serviceId,
                };
                const isPrimarySix = idx < 6;
                const displayLabel =
                  customTitles[serviceId]?.trim() || defSvc.label;

                return (
                  <div
                    key={serviceId}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                      isPrimarySix
                        ? 'bg-emerald-950/20 border-emerald-500/35 hover:border-emerald-400/60'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${
                          isPrimarySix
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {toBengaliNumerals(idx + 1)}
                      </span>

                      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                        <strong className="text-ink font-bold text-xs sm:text-sm truncate">
                          {displayLabel}
                        </strong>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            isPrimarySix
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {isPrimarySix ? 'প্রাথমিক ৬টি দ্রুত সেবা' : 'অন্যান্য সেবা (সব দেখুন)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          if (idx === 0) return;
                          const next = [...quickServicesOrder];
                          const tmp = next[idx - 1];
                          next[idx - 1] = next[idx];
                          next[idx] = tmp;
                          setQuickServicesOrder(next);
                        }}
                        title="উপরে নিন"
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-ink transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === quickServicesOrder.length - 1}
                        onClick={() => {
                          if (idx === quickServicesOrder.length - 1) return;
                          const next = [...quickServicesOrder];
                          const tmp = next[idx + 1];
                          next[idx + 1] = next[idx];
                          next[idx] = tmp;
                          setQuickServicesOrder(next);
                        }}
                        title="নিচে নিন"
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-ink transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Expanded Menu Navigation Tabs Re-ordering & Custom Titles */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-ink text-base flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-amber-400" />
                  <span>মেনু ট্যাব রি-অর্ডার ও কাস্টম শিরোনাম ব্যবস্থাপনা</span>
                </h3>
                <p className="text-slate-400 mt-0.5">
                  মেনু এবং স্ক্রিনের ট্যাবের অবস্থান উপরে/নিচে স্থানান্তর করুন এবং পছন্দমতো বাংলা শিরোনাম লিখুন।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const defaultOrder = DEFAULT_APP_TABS.map((t) => t.id);
                    setTabsOrder(defaultOrder);
                    setCustomTitles({});
                    updateConfig({
                      navTabsOrder: defaultOrder,
                      customTabTitles: {},
                    });
                    triggerSuccess('ট্যাবের বিন্যাস ডিফল্ট অবস্থায় ফিরিয়ে আনা হয়েছে!');
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  ডিফল্ট অর্ডার
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateConfig({
                      navTabsOrder: tabsOrder,
                      quickServicesOrder,
                      customTabTitles: customTitles,
                    });
                    triggerSuccess('ট্যাব ও দ্রুত সেবার নতুন ক্রম এবং কাস্টম শিরোনাম সফলভাবে সংরক্ষিত হয়েছে!');
                  }}
                  className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>সংরক্ষণ করুন</span>
                </button>
              </div>
            </div>

            {/* List of tabs with up/down arrows and title editing */}
            <div className="space-y-2">
              {tabsOrder.map((tabId, index) => {
                const defaultTab = DEFAULT_APP_TABS.find((t) => t.id === tabId) || {
                  id: tabId,
                  label: tabId,
                };
                const currentLabel = customTitles[tabId] !== undefined ? customTitles[tabId] : defaultTab.label;

                return (
                  <div
                    key={tabId}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                        {toBengaliNumerals(index + 1)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={currentLabel}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomTitles((prev) => ({ ...prev, [tabId]: val }));
                          }}
                          placeholder={defaultTab.label}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-ink font-bold w-full max-w-sm focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-[10px] text-slate-500 font-mono ml-1">
                          কী: {tabId} (ডিফল্ট: {defaultTab.label})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          if (index === 0) return;
                          const next = [...tabsOrder];
                          const tmp = next[index - 1];
                          next[index - 1] = next[index];
                          next[index] = tmp;
                          setTabsOrder(next);
                        }}
                        title="উপরে নিন"
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-ink transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={index === tabsOrder.length - 1}
                        onClick={() => {
                          if (index === tabsOrder.length - 1) return;
                          const next = [...tabsOrder];
                          const tmp = next[index + 1];
                          next[index + 1] = next[index];
                          next[index] = tmp;
                          setTabsOrder(next);
                        }}
                        title="নিচে নিন"
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-ink transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Sub-Tab: Google Sheets APK & Apps Script Instructions ONLY (Point 9) */}
      {activeTab === 'SHEETS_APK_GUIDE' && (
        <div className="space-y-4">
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>APK ব্যবহারকারীদের জন্য নোট:</strong> নেটিভ APK-এর ভেতরে Google নিরাপত্তার কারণে সরাসরি Google Sign-In ব্লক করে। গুগল শিটস ট্যাবে লগইন চাইলে <strong>"ক্লিন গ্রিড ভিউ"</strong> চালু রাখুন অথবা এডিট করতে <strong>"গুগল শিটস অ্যাপে খুলুন / এডিট"</strong> বাটন ব্যবহার করুন।
            </span>
          </div>

          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Smartphone className="w-5 h-5 shrink-0" />
              <span>APK ইনস্টল করার পর শিট ভিউতে কেন লগইন করতে বলে এবং স্থায়ী সমাধান ও কনস্ট্রাকশন গাইড:</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-1.5 text-xs text-slate-300 leading-relaxed">
              <p className="font-bold text-amber-300">কেন ওয়েব অ্যাপে কাজ করলেও APK-তে আগে লগইন চাইতো?</p>
              <p>
                ১. <strong>আলাদা কুকি স্যান্ডবক্স (Isolated WebView Cookie Store):</strong> কম্পিউটার বা ফোনের Chrome ব্রাউজারে আপনার জিমেইল আগে থেকেই লগইন করা থাকে, তাই <code className="text-emerald-400">/edit?rm=minimal</code> লিংক ব্রাউজারের কুকি ব্যবহার করে সরাসরি খুলে যায়। কিন্তু Android APK-এর ভেতরের <code className="text-emerald-400">WebView</code> সম্পূর্ণ আলাদা স্যান্ডবক্স—এতে ফোনের ব্রাউজার বা Gmail অ্যাপের লগইন সেশন থাকে না।
              </p>
              <p>
                ২. <strong>Google OAuth WebView ব্লক নীতি (403 disallowed_useragent):</strong> নিরাপত্তার কারণে Google কোনো এমবেডেড Android WebView-এর ভেতরে সরাসরি Google একাউন্ট লগইন করতে দেয় না এবং থার্ড-পার্টি ফ্রেম কুকি ব্লক থাকলে লগইন স্ক্রিনে আটকে যায়।
              </p>
              <p>
                ৩. <strong>শিটের Restricted পারমিশন:</strong> গুগল শিটের শেয়ারিং যদি <em>"Restricted"</em> থাকে, তবে লগইন ছাড়া কোনো WebView ফ্রেমই শিট পড়তে পারে না।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  ১
                </div>
                <h4 className="font-bold text-ink text-xs">গুগল শিট "Anyone with the link" করুন</h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  গুগল স্প্রেডশিটে গিয়ে <strong>Share &gt; General access &gt; "Anyone with the link" (Viewer)</strong> চালু রাখুন (অথবা <strong>File &gt; Share &gt; Publish to web</strong> করুন)। নির্দিষ্ট মডারেটর ইমেইলগুলোকে আলাদাভাবে <strong>Editor</strong> দিন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  ২
                </div>
                <h4 className="font-bold text-ink text-xs">APK-এ ডিফল্ট `/htmlembed` ভিউ</h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  অ্যাপে এখন ডিফল্টভাবে <strong>ক্লিন গ্রিড ভিউ (<code className="text-emerald-400">/htmlembed</code>)</strong> সেট করা হয়েছে। এতে APK ইনস্টল করার পর কোনো লগইন ছাড়াই সকল সদস্য ও মডারেটর সরাসরি লাইভ শিট দেখতে পাবেন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  ৩
                </div>
                <h4 className="font-bold text-ink text-xs">APK থেকে শিট এডিট করার নিয়ম</h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  ফোনে APK থেকে শিট এডিট করতে গুগল শিটস ট্যাবের <strong>"গুগল শিটস অ্যাপে খুলুন / এডিট"</strong> বাটনে চাপুন—এটি ফোনের অফিসিয়াল <strong>Google Sheets App</strong>-এ আপনার লগইন থাকা জিমেইল দিয়ে সরাসরি এডিটর মোডে খুলবে।
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Android Studio `MainActivity.kt` থার্ড-পার্টি কুকি কনফিগারেশন:</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyGuideCode(androidWebViewCookieSnippet, 'cookie')}
                  className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedGuideKey === 'cookie' ? 'কপি সম্পন্ন!' : 'কোড কপি'}</span>
                </button>
              </div>
              <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                {androidWebViewCookieSnippet}
              </pre>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>স্বয়ংক্রিয় সঞ্চয় রো সিঙ্ক কোড (Google Apps Script Webhook)</span>
              </h4>

              <button
                type="button"
                onClick={() => copyGuideCode(appsScriptSnippet, 'script')}
                className="py-1 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedGuideKey === 'script' ? 'কপি সম্পন্ন!' : 'স্ক্রিপ্ট কপি'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              আপনার স্প্রেডশিটে গিয়ে <strong>Extensions &gt; Apps Script</strong>-এ এই কোডটি পেস্ট করে Deploy as Web App করলে যেকোনো অনুমোদিত সঞ্চয় অটোমেটিক নতুন সারিতে যোগ হবে।
            </p>

            <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto p-3.5 bg-slate-950 rounded-2xl border border-slate-800 leading-relaxed">
              {appsScriptSnippet}
            </pre>
          </div>
        </div>
      )}

      {/* Tab: Native Android Architecture Spec & APK Export */}
      {activeTab === 'ANDROID_SPEC' && (
        <div className="space-y-4">
          <NativeAndroidSpecView />
        </div>
      )}
      </PageTabTransition>
    </div>
  );
};
