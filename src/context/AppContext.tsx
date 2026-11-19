import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import {
  UserProfile,
  SavingsTransaction,
  ApprovalRequest,
  ElectronicReceipt,
  NoticeItem,
  ComplaintItem,
  FeatureRequestItem,
  FoundationRule,
  ChatMessage,
  ChatPoll,
  AuditLogItem,
  AppConfiguration,
  AppRelease,
  UserRole,
  PrivateMessage,
  FoundationExpense,
  ExecutiveMember,
  UserNotification,
  OverdueReminderEntry,
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_USERS,
  INITIAL_SAVINGS,
  INITIAL_APPROVALS,
  INITIAL_NOTICES,
  INITIAL_RULES,
  INITIAL_COMPLAINTS,
  INITIAL_FEATURE_REQUESTS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_POLLS,
  INITIAL_RELEASES,
  INITIAL_AUDIT_LOGS,
  INITIAL_EXPENSES,
} from '../data/initialData';
import {
  evaluateApprovalState,
  calculateFinancialTotals,
  calculateGrowthRate,
  generateReceiptNumber,
  aggregateSavingsByMonth,
  formatCurrencyBengali,
  toBengaliNumerals,
  stripRoleBasedTitles,
} from '../utils/calculations';
import {
  initRealtimeSync,
  syncConfigToFirestore,
  syncNoticeToFirestore,
  deleteNoticeFromFirestore,
  syncRuleToFirestore,
  syncExecutiveMemberToFirestore,
  deleteExecutiveMemberFromFirestore,
  syncSavingsTransactionToFirestore,
  syncReceiptToFirestore,
  syncApprovalToFirestore,
  syncUserToFirestore,
  deleteUserFromFirestore,
  syncChatMessageToFirestore,
  syncPollToFirestore,
  deletePollFromFirestore,
  syncPrivateMessageToFirestore,
  syncExpenseToFirestore,
  deleteExpenseFromFirestore,
  syncComplaintToFirestore,
  syncFeatureRequestToFirestore,
  syncUserNotificationToFirestore,
  performFullFirestoreSync,
  syncForceUpdateToFirestore,
  fetchLatestForceUpdateFromFirestore,
  subscribeForceUpdateListener,
  SyncStatus,
} from '../utils/firebaseSync';
import { ThemePreference, resolveSystemTheme } from '../utils/themeTransition';
import { hashPassword, isHashedPassword, sanitizeRegistrationText } from '../utils/passwordSecurity';
import { getOrCreateDeviceId } from '../utils/deviceSecurity';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../utils/firebase';

// Unified single guest identity for all unauthenticated visitors.
export const GUEST_USER: UserProfile = {
  id: '__guest__',
  memberId: 'GUEST',
  name: 'অতিথি দর্শক',
  email: '',
  phone: '',
  role: 'MEMBER',
  status: 'APPROVED',
  joinDate: '2026-01-01',
  gender: 'OTHER',
};

export interface AppWarningDialog {
  title: string;
  message: string;
  showLoginCta?: boolean;
}

function normalizeNavTabsOrder(tabs?: string[]): string[] {
  const base = tabs && tabs.length > 0 ? tabs : INITIAL_CONFIG.navTabsOrder || [];
  const mapped = base.map((t) => (t === 'settings' ? 'profile' : t));
  const unique = Array.from(new Set(mapped));
  if (!unique.includes('profile')) {
    const homeIdx = unique.indexOf('home');
    if (homeIdx >= 0) {
      unique.splice(homeIdx + 1, 0, 'profile');
    } else {
      unique.unshift('profile');
    }
  }
  return unique;
}

interface AppContextType {
  // Theme & System Settings (Persisted across native APK & web restarts)
  theme: 'dark' | 'light';
  themeMode: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  setThemeMode: (mode: ThemePreference) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  isDemoMode: boolean;
  setIsDemoMode: (demo: boolean) => void;
  showExitDialog: boolean;
  setShowExitDialog: (show: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
  pushNotificationsEnabled: boolean;
  togglePushNotifications: (enabled: boolean) => Promise<boolean>;
  storageAccessEnabled: boolean;
  toggleStorageAccess: (enabled: boolean) => Promise<boolean>;

  // Warning & Success Feedback
  warningDialog: AppWarningDialog | null;
  triggerWarning: (title: string, message: string, showLoginCta?: boolean) => void;
  triggerGuestWarning: (actionLabel?: string) => void;
  closeWarning: () => void;
  requireMemberAuth: (actionLabel?: string) => boolean;
  successMessage: string | null;
  triggerSuccess: (message: string) => void;
  closeSuccess: () => void;

  // Active User & Authentication
  currentUser: UserProfile;
  isGuestMode: boolean;
  setCurrentUser: (user: UserProfile | null) => void;
  logoutUser: () => void;
  maskPhoneForPrivacy: (phone: string, targetGender?: 'MALE' | 'FEMALE' | 'OTHER') => string;
  users: UserProfile[];
  updateUserProfile: (userId: string, partial: Partial<UserProfile>) => boolean;
  requestProfileChange: (userId: string, proposedChanges: { field: string; oldValue: any; newValue: any }[]) => boolean;
  registerNewAccount: (userData: Partial<UserProfile>) => void;
  addDirectUser: (userData: Partial<UserProfile>) => boolean;
  approveUserAccount: (userId: string) => void;
  integrateAndApproveUserAccount: (pendingUserId: string, targetExistingUserId: string) => void;
  rejectUserAccount: (userId: string) => void;
  updateUserDesignation: (userId: string, moderatorTitle: string, role?: UserRole) => boolean;
  removeUser: (userId: string) => boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authTransition: { id: number; type: 'LOGIN' | 'LOGOUT'; dir: 'UP' | 'DOWN' } | null;
  triggerAuthTransition: (type: 'LOGIN' | 'LOGOUT') => void;
  clearAuthTransition: (id: number) => void;

  // Reminders for Overdue
  overdueReminders: string[];
  overdueReminderMap: Record<string, OverdueReminderEntry>;
  sendOverdueReminder: (memberId: string, customPayload?: Partial<OverdueReminderEntry>) => void;

  // Direct 1-on-1 Private Messaging
  privateMessages: PrivateMessage[];
  sendPrivateMessage: (receiverId: string, text: string) => void;
  deletePrivateMessage: (messageId: string) => void;
  activePrivateChatUser: UserProfile | null;
  setActivePrivateChatUser: (user: UserProfile | null) => void;

  // Financial & Savings
  savings: SavingsTransaction[];
  createSavingsEntry: (data: {
    memberId: string;
    amount: number;
    savingsMonth: string;
    savingsYear: number;
    paymentMethod: any;
    transactionRef?: string;
    notes?: string;
  }) => boolean;
  reverseTransaction: (txId: string, reason: string) => boolean;

  // Approvals & Workflows
  approvals: ApprovalRequest[];
  findPendingApprovalForSource: (params: {
    requestTypes?: ApprovalRequest['requestType'][];
    targetRecordId?: string;
    sourceKey?: string;
  }) => ApprovalRequest | undefined;
  checkPendingRequestWarning: (
    params: {
      requestTypes?: ApprovalRequest['requestType'][];
      targetRecordId?: string;
      sourceKey?: string;
    },
    actionLabel?: string
  ) => boolean;
  voteOnApproval: (
    approvalId: string,
    vote: 'APPROVE' | 'REJECT',
    reason?: string,
    forceFinalize?: boolean
  ) => void;

  // Receipts & Print Modal
  receipts: ElectronicReceipt[];
  getReceiptForTransaction: (txId: string) => ElectronicReceipt | undefined;
  activePrintReceipt: ElectronicReceipt | null;
  setActivePrintReceipt: (receipt: ElectronicReceipt | null) => void;

  // Communication & Chat
  chatMessages: ChatMessage[];
  sendChatMessage: (
    channel: 'GENERAL' | 'MODERATOR_ONLY',
    text: string,
    imageUrl?: string,
    replyTo?: { id: string; text: string; senderName: string }
  ) => void;
  deleteChatMessage: (messageId: string) => void;
  forwardChatMessage: (messageId: string) => void;
  toggleMessageReaction: (messageId: string, emoji: string) => void;
  polls: ChatPoll[];
  votePoll: (pollId: string, optionId: string) => void;
  createPoll: (channel: 'GENERAL' | 'MODERATOR_ONLY', question: string, options: string[]) => void;
  deletePoll: (pollId: string) => void;
  updatePollOption: (pollId: string, optionId: string, text: string) => void;
  updatePollQuestion: (pollId: string, question: string) => void;
  seenChatIds: string[];
  chatUnreadCount: number;
  getChannelUnreadCount: (channel: 'GENERAL' | 'MODERATOR_ONLY') => number;
  getPersonalUnreadCount: (partnerUserId?: string) => number;
  markChannelSeen: (channel: 'GENERAL' | 'MODERATOR_ONLY') => void;
  markPersonalChatSeen: (partnerUserId: string) => void;
  markChatSeen: () => void;
  unreadNoticeCount: number;
  hasUnreadNotices: boolean;
  markNoticesSeen: () => void;

  // Calling Feature
  activeCall: {
    callId: string;
    callerId: string;
    callerName: string;
    targetName?: string;
    channel: string;
    startedAt: string;
    status: 'RINGING' | 'CONNECTED' | 'ENDED';
  } | null;
  startCall: (channel?: 'GENERAL' | 'MODERATOR_ONLY' | 'PERSONAL', targetName?: string) => void;
  endCall: (durationSec?: number) => void;

  // Executive Committee
  executiveMembers: ExecutiveMember[];
  addExecutiveMember: (member: Omit<ExecutiveMember, 'id'>) => boolean;
  removeExecutiveMember: (id: string) => boolean;
  updateExecutiveMember: (id: string, partial: Partial<ExecutiveMember>) => boolean;

  // Online Tracking
  onlineUserIds: string[];

  // Notices, Complaints, Rules, Features
  notices: NoticeItem[];
  addNotice: (notice: Omit<NoticeItem, 'id' | 'createdAt' | 'authorName' | 'authorRole'>) => boolean;
  proposeNoticeEdit: (
    noticeId: string,
    updates: Partial<Pick<NoticeItem, 'title' | 'content' | 'priority' | 'imageUrl' | 'isPinned' | 'showInTicker'>>
  ) => boolean;
  updateNotice: (noticeId: string, partial: Partial<NoticeItem>) => boolean;
  deleteNotice: (noticeId: string) => boolean;
  complaints: ComplaintItem[];
  submitComplaint: (title: string, description: string) => void;
  updateComplaintStatus: (id: string, status: ComplaintItem['status'], moderatorNotes?: string) => void;
  featureRequests: FeatureRequestItem[];
  submitFeatureRequest: (title: string, description: string) => void;
  voteFeatureRequest: (id: string) => void;
  rules: FoundationRule[];
  addRule: (title: string, description: string) => boolean;
  updateRule: (ruleId: string, title: string, description: string) => boolean;

  // App Moderator & Configuration
  config: AppConfiguration;
  updateConfig: (newConfig: Partial<AppConfiguration>) => void;
  proposeBankOrConfigChange: (
    title: string,
    description: string,
    configPatch: Partial<AppConfiguration>,
    proposedChanges?: { field: string; oldValue: any; newValue: any }[]
  ) => boolean;
  auditLogs: AuditLogItem[];
  deleteAuditLogs: (ids: string[]) => void;
  releases: AppRelease[];
  publishAppRelease: (release: Omit<AppRelease, 'id'>) => void;
  forceUpdateRelease: AppRelease | null;
  currentAppVersionCode: number;
  currentAppVersionName: string;
  pushForceUpdateRelease: (release: Omit<AppRelease, 'id'>) => Promise<boolean>;
  disableForceUpdate: () => Promise<boolean>;
  checkForAppUpdate: (manual?: boolean) => Promise<AppRelease | null>;
  activeUpdateDialog: AppRelease | null;
  setActiveUpdateDialog: (rel: AppRelease | null) => void;

  // Sync & Pull-to-Refresh (Moderator Only + Online Required)
  refreshAllData: () => Promise<void>;
  isRefreshing: boolean;

  // Backup & Restore
  exportBackupData: () => string;
  restoreFromBackup: (jsonData: string) => { success: boolean; message: string };
  resetToInitialDemo: () => void;

  // Foundation Expenses & Actual Balance
  expenses: FoundationExpense[];
  addExpense: (expense: Omit<FoundationExpense, 'id'>) => boolean;
  removeExpense: (id: string) => boolean;
  totalExpenses: number;
  netReserveBalance: number;

  // Universal Search Modal
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;

  // Real-time Cloud Synchronization (Firebase Firestore)
  cloudSyncStatus: SyncStatus;
  lastSyncTimestamp: string;
  triggerCloudSync: () => Promise<void>;

  // User Targeted Notifications & System Push
  userNotifications: UserNotification[];
  sendUserNotification: (
    targetUserId: string,
    title: string,
    message: string,
    type: UserNotification['type'],
    color: UserNotification['color']
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Pending Deposit duplicate submission prevention
  pendingDepositModalOpen: boolean;
  setPendingDepositModalOpen: (open: boolean) => void;
  checkUserHasPendingDeposit: (memberId: string) => boolean;

  // Aggregated summaries
  financialTotals: ReturnType<typeof calculateFinancialTotals>;
  growthRate: ReturnType<typeof calculateGrowthRate>;
  monthlyAggregates: Record<string, number>;
  eligibleModeratorsCount: number;
  unreadCount: number;
  uniqueDailyVisitors: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'basis_foundation_storage_v1';
const CUSTOM_FONT_STORAGE_KEY = 'basis_custom_font_v1';
const GOOGLE_SHEET_URL_STORAGE_KEY = 'basis_google_sheet_url_v1';
const DEMO_GOOGLE_SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
const IS_NATIVE_APK = import.meta.env.VITE_NATIVE_APK === 'true';

const getSavedCustomFont = (): { uploadedFontDataUrl?: string; uploadedFontName?: string } => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_FONT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      uploadedFontDataUrl: typeof parsed?.uploadedFontDataUrl === 'string' ? parsed.uploadedFontDataUrl : undefined,
      uploadedFontName: typeof parsed?.uploadedFontName === 'string' ? parsed.uploadedFontName : undefined,
    };
  } catch {
    return {};
  }
};

const isCustomGoogleSheetUrl = (url?: string): boolean =>
  Boolean(
    url &&
      url.trim().startsWith('https://docs.google.com/spreadsheets/') &&
      !url.includes(DEMO_GOOGLE_SHEET_ID)
  );

const getSavedCustomGoogleSheetUrl = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const saved = localStorage.getItem(GOOGLE_SHEET_URL_STORAGE_KEY);
    return isCustomGoogleSheetUrl(saved || undefined) ? saved!.trim() : undefined;
  } catch {
    return undefined;
  }
};

const persistCustomGoogleSheetUrl = (url?: string) => {
  if (typeof window === 'undefined' || !isCustomGoogleSheetUrl(url)) return;
  try {
    localStorage.setItem(GOOGLE_SHEET_URL_STORAGE_KEY, url!.trim());
  } catch {}
};

const NATIVE_BASE_CONFIG: AppConfiguration = {
  ...INITIAL_CONFIG,
  latestDepositTicker: undefined,
  jointBankAccountHolders: [],
};

interface LocalMutationMeta {
  configUpdatedAt: number;
  configPendingSync?: boolean;
  entityUpdatedAt: Record<string, number>;
  deletedIds: string[];
  pendingSyncIds: string[];
}

const getInitialSaved = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored data', e);
  }
  return null;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialSaved = getInitialSaved();
  const useSavedEntities = !IS_NATIVE_APK || Boolean(initialSaved?.apkLiveSynced);
  const pendingRestoreUserIdRef = useRef<string | null>(
    IS_NATIVE_APK && !useSavedEntities && initialSaved?.currentUserId
      ? String(initialSaved.currentUserId)
      : null
  );

  // Persistent App Settings — Two modes ('light' | 'dark'), auto-selected by System Mode by default (Point 1)
  const [themeUserSelected, setThemeUserSelected] = useState<boolean>(() =>
    Boolean(initialSaved?.settings?.themeUserSelected)
  );
  const themeUserSelectedRef = React.useRef<boolean>(Boolean(initialSaved?.settings?.themeUserSelected));
  useEffect(() => {
    themeUserSelectedRef.current = themeUserSelected;
  }, [themeUserSelected]);

  const [themeMode, setThemeModeState] = useState<ThemePreference>(() => {
    const userPicked = Boolean(initialSaved?.settings?.themeUserSelected);
    const savedMode = initialSaved?.settings?.themeMode;
    if (userPicked && (savedMode === 'light' || savedMode === 'dark')) {
      return savedMode;
    }
    return resolveSystemTheme();
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!themeUserSelectedRef.current) {
        setThemeModeState(e.matches ? 'dark' : 'light');
      }
    };
    if (!themeUserSelectedRef.current) {
      setThemeModeState(mq.matches ? 'dark' : 'light');
    }
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
    mq.addListener(handleChange);
    return () => mq.removeListener(handleChange);
  }, []);

  const theme: 'dark' | 'light' = themeMode;
  const setThemeMode = useCallback((mode: ThemePreference) => {
    const resolved: ThemePreference = mode === 'light' ? 'light' : 'dark';
    themeUserSelectedRef.current = true;
    setThemeUserSelected(true);
    setThemeModeState(resolved);
  }, []);
  const setTheme = setThemeMode;
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => !IS_NATIVE_APK);
  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    typeof initialSaved?.settings?.soundEnabled === 'boolean' ? initialSaved.settings.soundEnabled : true
  );
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() =>
    typeof initialSaved?.settings?.hapticEnabled === 'boolean' ? initialSaved.settings.hapticEnabled : true
  );
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.hasNotificationPermission) {
      try {
        return Boolean(window.AndroidBridge.hasNotificationPermission());
      } catch {}
    }
    if (typeof initialSaved?.settings?.pushNotificationsEnabled === 'boolean') {
      return initialSaved.settings.pushNotificationsEnabled;
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });
  const [storageAccessEnabled, setStorageAccessEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.hasStoragePermission) {
      try {
        return Boolean(window.AndroidBridge.hasStoragePermission());
      } catch {}
    }
    if (typeof initialSaved?.settings?.storageAccessEnabled === 'boolean') {
      return initialSaved.settings.storageAccessEnabled;
    }
    return false;
  });

  useEffect(() => {
    const syncNativePerms = () => {
      if (typeof window === 'undefined' || !window.AndroidBridge) return;
      try {
        if (window.AndroidBridge.hasNotificationPermission) {
          setPushNotificationsEnabled(Boolean(window.AndroidBridge.hasNotificationPermission()));
        }
        if (window.AndroidBridge.hasStoragePermission) {
          setStorageAccessEnabled(Boolean(window.AndroidBridge.hasStoragePermission()));
        }
      } catch {}
    };
    window.addEventListener('android-permissions-updated', syncNativePerms);
    return () => window.removeEventListener('android-permissions-updated', syncNativePerms);
  }, []);

  // Persistent Seen IDs for Badges (Point 9)
  const [seenNoticeIds, setSeenNoticeIds] = useState<string[]>(() =>
    Array.isArray(initialSaved?.seenNoticeIds) ? initialSaved.seenNoticeIds : []
  );
  const [seenChatIds, setSeenChatIds] = useState<string[]>(() =>
    Array.isArray(initialSaved?.seenChatIds) ? initialSaved.seenChatIds : []
  );

  // Entities state with LocalStorage auto-restoration
  const [config, setConfig] = useState<AppConfiguration>(() => {
    const fallbackCfg = IS_NATIVE_APK ? NATIVE_BASE_CONFIG : INITIAL_CONFIG;
    const baseCfg =
      useSavedEntities && initialSaved?.config ? { ...fallbackCfg, ...initialSaved.config } : fallbackCfg;
    const savedFont = getSavedCustomFont();
    const resolvedFontUrl = baseCfg.uploadedFontDataUrl || savedFont.uploadedFontDataUrl;
    const resolvedFontName = baseCfg.uploadedFontName || savedFont.uploadedFontName;
    const savedCustomSheet = getSavedCustomGoogleSheetUrl();
    const resolvedSheetUrl = isCustomGoogleSheetUrl(baseCfg.googleSheetsUrl)
      ? baseCfg.googleSheetsUrl
      : savedCustomSheet || baseCfg.googleSheetsUrl;
    if (isCustomGoogleSheetUrl(resolvedSheetUrl)) {
      persistCustomGoogleSheetUrl(resolvedSheetUrl);
    }
    return {
      ...baseCfg,
      uploadedFontDataUrl: resolvedFontUrl,
      uploadedFontName: resolvedFontName,
      googleSheetsUrl: resolvedSheetUrl,
      navTabsOrder: normalizeNavTabsOrder(baseCfg.navTabsOrder),
    };
  });
  const configRef = useRef<AppConfiguration>(config);
  configRef.current = config;
  const [users, setUsers] = useState<UserProfile[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.users)
      ? initialSaved.users
      : IS_NATIVE_APK
      ? []
      : INITIAL_USERS
  );
  const [currentUser, setCurrentUserState] = useState<UserProfile>(() => {
    if (useSavedEntities && initialSaved?.currentUserId && initialSaved?.users) {
      const found = initialSaved.users.find((u: UserProfile) => u.id === initialSaved.currentUserId);
      if (found && found.id !== '__guest__' && found.status === 'APPROVED') return found;
    }
    return GUEST_USER;
  });

  const setCurrentUser = useCallback((user: UserProfile | null) => {
    const resolved =
      user && user.id !== '__guest__' && user.status === 'APPROVED' ? user : GUEST_USER;
    setCurrentUserState(resolved);
    if (resolved.id !== '__guest__') {
      const nowMs = Date.now();
      const updatedUser: UserProfile = {
        ...resolved,
        updatedAt: resolved.updatedAt || new Date(nowMs).toISOString(),
      };
      setUsers((prev) =>
        prev.some((u) => u.id === updatedUser.id)
          ? prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
          : [...prev, updatedUser]
      );
      if (IS_NATIVE_APK) {
        localMutationMetaRef.current = {
          ...localMutationMetaRef.current,
          entityUpdatedAt: {
            ...localMutationMetaRef.current.entityUpdatedAt,
            [updatedUser.id]: nowMs,
          },
          pendingSyncIds: Array.from(new Set([...localMutationMetaRef.current.pendingSyncIds, updatedUser.id])),
        };
        setLocalMutationMeta((prev) => ({
          ...prev,
          entityUpdatedAt: {
            ...prev.entityUpdatedAt,
            [updatedUser.id]: nowMs,
          },
          pendingSyncIds: Array.from(new Set([...(prev.pendingSyncIds || []), updatedUser.id])),
        }));
      }
    }
  }, []);
  const isGuestMode = currentUser.id === '__guest__';

  // Warning & Success dialogs
  const [warningDialog, setWarningDialog] = useState<AppWarningDialog | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const triggerWarning = useCallback(
    (title: string, message: string, showLoginCta = false) => {
      setWarningDialog({ title, message, showLoginCta });
      if (hapticEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([60, 40, 60]);
        } catch {}
      }
    },
    [hapticEnabled]
  );

  const triggerGuestWarning = useCallback(
    (actionLabel?: string) => {
      const label = actionLabel ? `"${actionLabel}"` : 'কোনো তথ্য সম্পাদনা বা সাবমিট';
      triggerWarning(
        'অতিথি মোড সীমাবদ্ধতা (Guest Mode)',
        `আপনি বর্তমানে অতিথি দর্শক হিসেবে অ্যাপটি ভিজিট করছেন। অতিথি ইউজার হিসেবে ${label} করার অনুমতি নেই। এই সুবিধাটি ব্যবহার করতে অনুগ্রহ করে আপনার সদস্য অ্যাকাউন্টে লগইন করুন।`,
        true
      );
    },
    [triggerWarning]
  );

  const closeWarning = useCallback(() => setWarningDialog(null), []);

  const requireMemberAuth = useCallback(
    (actionLabel?: string): boolean => {
      if (isGuestMode) {
        triggerGuestWarning(actionLabel);
        return false;
      }
      return true;
    },
    [isGuestMode, triggerGuestWarning]
  );

  const [authTransition, setAuthTransition] = useState<{
    id: number;
    type: 'LOGIN' | 'LOGOUT';
    dir: 'UP' | 'DOWN';
  } | null>(null);

  const triggerAuthTransition = useCallback((type: 'LOGIN' | 'LOGOUT') => {
    setAuthTransition({
      id: Date.now() + Math.random(),
      type,
      dir: type === 'LOGIN' ? 'UP' : 'DOWN',
    });
  }, []);

  const clearAuthTransition = useCallback((id: number) => {
    setAuthTransition((curr) => (curr && curr.id === id ? null : curr));
  }, []);

  const logoutUser = () => {
    triggerAuthTransition('LOGOUT');
    setCurrentUser(GUEST_USER);
    setActivePrivateChatUser(null);
    if (IS_NATIVE_APK) {
      try {
        const auth = getFirebaseAuth();
        if (auth?.currentUser) {
          signOut(auth).catch(() => {});
        }
      } catch {}
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        delete parsed.currentUserId;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch {}
  };

  const maskPhoneForPrivacy = (phone: string, targetGender?: 'MALE' | 'FEMALE' | 'OTHER') => {
    if (!phone) return '';
    const isPrivileged = !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');
    if (targetGender === 'FEMALE' && !isPrivileged) {
      const clean = phone.replace(/\s+/g, '');
      const prefix = clean.slice(0, 5);
      return `${prefix}**-****** (গোপনীয়)`;
    }
    return phone;
  };

  const [savings, setSavings] = useState<SavingsTransaction[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.savings)
      ? initialSaved.savings
      : IS_NATIVE_APK
      ? []
      : INITIAL_SAVINGS
  );
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.approvals)
      ? initialSaved.approvals
      : IS_NATIVE_APK
      ? []
      : INITIAL_APPROVALS
  );
  const [receipts, setReceipts] = useState<ElectronicReceipt[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.receipts) ? initialSaved.receipts : []
  );
  const [notices, setNotices] = useState<NoticeItem[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.notices)
      ? initialSaved.notices
      : IS_NATIVE_APK
      ? []
      : INITIAL_NOTICES
  );
  const [rules, setRules] = useState<FoundationRule[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.rules)
      ? initialSaved.rules
      : IS_NATIVE_APK
      ? []
      : INITIAL_RULES
  );
  const [complaints, setComplaints] = useState<ComplaintItem[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.complaints)
      ? initialSaved.complaints
      : IS_NATIVE_APK
      ? []
      : INITIAL_COMPLAINTS
  );
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestItem[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.featureRequests)
      ? initialSaved.featureRequests
      : IS_NATIVE_APK
      ? []
      : INITIAL_FEATURE_REQUESTS
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.chatMessages)
      ? initialSaved.chatMessages
      : IS_NATIVE_APK
      ? []
      : INITIAL_CHAT_MESSAGES
  );
  const [polls, setPolls] = useState<ChatPoll[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.polls)
      ? initialSaved.polls
      : IS_NATIVE_APK
      ? []
      : INITIAL_POLLS || []
  );
  const [releases, setReleases] = useState<AppRelease[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.releases)
      ? initialSaved.releases
      : IS_NATIVE_APK
      ? []
      : INITIAL_RELEASES
  );
  const [forceUpdateRelease, setForceUpdateRelease] = useState<AppRelease | null>(
    () => initialSaved?.forceUpdateRelease || null
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.auditLogs)
      ? initialSaved.auditLogs
      : IS_NATIVE_APK
      ? []
      : INITIAL_AUDIT_LOGS
  );
  const [activeUpdateDialog, setActiveUpdateDialog] = useState<AppRelease | null>(null);
  const currentAppVersionCode = useMemo(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.getAppVersionCode) {
      try {
        const code = Number(window.AndroidBridge.getAppVersionCode());
        if (Number.isFinite(code) && code > 0) return code;
      } catch {}
    }
    return 120;
  }, []);
  const currentAppVersionName = useMemo(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.getAppVersion) {
      try {
        const v = window.AndroidBridge.getAppVersion();
        if (v && String(v).trim()) return String(v).trim();
      } catch {}
    }
    return '1.2.0';
  }, []);
  const [uniqueDailyVisitors] = useState<number>(342);

  // Authentication & Registration state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Overdue reminders state (persisted locally + synced via config.overdueReminderDetails)
  const [localOverdueIds, setLocalOverdueIds] = useState<string[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.overdueReminders)
      ? initialSaved.overdueReminders
      : IS_NATIVE_APK
      ? []
      : ['BF-004']
  );

  const overdueReminderMap = useMemo<Record<string, OverdueReminderEntry>>(() => {
    const fromCfg = config.overdueReminderDetails || {};
    const merged: Record<string, OverdueReminderEntry> = { ...fromCfg };
    localOverdueIds.forEach((mId) => {
      if (!merged[mId]) {
        const u = users.find((usr) => usr.memberId === mId);
        merged[mId] = {
          memberId: mId,
          memberName: u?.name || 'সম্মানিত সদস্য',
          amount: config.defaultMonthlyAmount || 1500,
          monthKey: '2026-10',
          monthLabel: 'অক্টোবর ২০২৬',
          deadlineText: `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`,
          sentAt: '2026-10-01T00:00:00.000Z',
        };
      }
    });
    return merged;
  }, [config.overdueReminderDetails, config.defaultMonthlyAmount, config.monthlyDueDay, localOverdueIds, users]);

  const overdueReminders = useMemo<string[]>(() => {
    return Array.from(new Set([...localOverdueIds, ...Object.keys(config.overdueReminderDetails || {})]));
  }, [localOverdueIds, config.overdueReminderDetails]);

  // 1-on-1 Private Messaging state
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.privateMessages)
      ? initialSaved.privateMessages
      : IS_NATIVE_APK
      ? []
      : [
          {
            id: 'pm-1',
            conversationId: 'user-mod-2_user-mod-3',
            senderId: 'user-mod-3',
            senderName: 'সাবরিনা আক্তার',
            receiverId: 'user-mod-2',
            receiverName: 'তানভীর আহমেদ',
            text: 'আসসালামু আলাইকুম তানভীর ভাই, চলতি মাসের সঞ্চয় অডিট রিপোর্ট কি প্রস্তুত হয়েছে?',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            isRead: true,
          },
          {
            id: 'pm-2',
            conversationId: 'user-mod-2_user-mod-3',
            senderId: 'user-mod-2',
            senderName: 'তানভীর আহমেদ',
            receiverId: 'user-mod-3',
            receiverName: 'সাবরিনা আক্তার',
            text: 'ওয়ালাইকুমুস সালাম আপা। হ্যাঁ, আলহামদুলিল্লাহ প্রস্তুত হয়েছে। ড্যাশবোর্ডে আপডেট পেয়ে যাবেন।',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            isRead: true,
          },
        ]
  );
  const [activePrivateChatUser, setActivePrivateChatUserState] = useState<UserProfile | null>(null);
  const setActivePrivateChatUser = useCallback(
    (user: UserProfile | null) => {
      if (user && isGuestMode) {
        triggerGuestWarning('ব্যক্তিগত বার্তা প্রেরণ');
        return;
      }
      setActivePrivateChatUserState(user);
    },
    [isGuestMode, triggerGuestWarning]
  );

  // Printable receipt state
  const [activePrintReceipt, setActivePrintReceipt] = useState<ElectronicReceipt | null>(null);

  // Pull-to-refresh & auto refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Foundation Expenses state
  const [expenses, setExpenses] = useState<FoundationExpense[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.expenses)
      ? initialSaved.expenses
      : IS_NATIVE_APK
      ? []
      : INITIAL_EXPENSES
  );

  // Universal Search Modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Executive Committee state
  const [executiveMembers, setExecutiveMembers] = useState<ExecutiveMember[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.executiveMembers)
      ? initialSaved.executiveMembers
      : IS_NATIVE_APK
      ? []
      : [
          {
            id: 'exec-1',
            name: 'মাহমুদুল হাসান সিয়াম',
            designation: 'প্রধান অ্যাপ মডারেটর ও সমন্বয়ক',
            phone: '০১৭০০-০০০০০১',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            responsibilities: 'অ্যাপ্লিকেশনের প্রযুক্তিগত পরিচালনা, ডিজিটাল কোর ব্যাংকিং ও নিরাপত্তা নিয়ন্ত্রণ।',
            order: 1,
            approvedDate: '২০২৫-০১-১০',
          },
          {
            id: 'exec-2',
            name: 'তানভীর আহমেদ',
            designation: 'সভাপতি / প্রধান নির্বাহী',
            phone: '০১৭০০-০০০০০২',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            responsibilities: 'কার্যনির্বাহী পরিষদের সার্বিক তদারকি ও প্রাতিষ্ঠানিক প্রতিনিধিত্ব।',
            order: 2,
            approvedDate: '২০২৫-০১-১০',
          },
          {
            id: 'exec-3',
            name: 'সাবরিনা আক্তার',
            designation: 'সাধারণ সম্পাদক ও প্রধান অডিটর',
            phone: '০১৭০০-০০০০০৩',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            responsibilities: 'সদস্য সমন্বয়, সভার কার্যবিবরণী ও আর্থিক হিসাব অডিট অনুমোদন।',
            order: 3,
            approvedDate: '২০২৫-০১-১০',
          },
          {
            id: 'exec-4',
            name: 'রাশেদুল করিম',
            designation: 'কোষাধ্যক্ষ (Treasurer)',
            phone: '০১৭০০-০০০০০৪',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            responsibilities: 'যৌথ ব্যাংক হিসাব পরিচালনা ও মাসিক জমার হিসাবপত্র সংরক্ষণ।',
            order: 4,
            approvedDate: '২০২৫-০১-১০',
          },
        ]
  );

  // Real-time Cloud Synchronization (Firebase Firestore)
  const [cloudSyncStatus, setCloudSyncStatus] = useState<SyncStatus>('LOCAL');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(() => new Date().toLocaleTimeString('bn-BD'));
  const [pendingDepositModalOpen, setPendingDepositModalOpen] = useState<boolean>(false);

  // User Notifications state
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>(() =>
    useSavedEntities && Array.isArray(initialSaved?.userNotifications)
      ? initialSaved.userNotifications
      : IS_NATIVE_APK
      ? []
      : [
          {
            id: 'notif-welcome',
            userId: 'ALL',
            title: 'বেসিস ফাউন্ডেশনে স্বাগতম',
            message: 'ডিজিটাল সমবায় সঞ্চয় প্ল্যাটফর্মে আপনার স্বাগতম। প্রতি মাসের ১০ তারিখের মধ্যে আপনার সঞ্চয় জমা সম্পন্ন করুন।',
            type: 'GENERAL',
            color: 'emerald',
            createdAt: '2026-10-01T09:00:00.000Z',
            read: false,
          },
        ]
  );

  const [localMutationMeta, setLocalMutationMeta] = useState<LocalMutationMeta>(() => ({
    configUpdatedAt: Number(initialSaved?.localMutationMeta?.configUpdatedAt || 0),
    configPendingSync: Boolean(initialSaved?.localMutationMeta?.configPendingSync),
    entityUpdatedAt:
      initialSaved?.localMutationMeta?.entityUpdatedAt &&
      typeof initialSaved.localMutationMeta.entityUpdatedAt === 'object'
        ? initialSaved.localMutationMeta.entityUpdatedAt
        : {},
    deletedIds: Array.isArray(initialSaved?.localMutationMeta?.deletedIds)
      ? initialSaved.localMutationMeta.deletedIds
      : [],
    pendingSyncIds: Array.isArray(initialSaved?.localMutationMeta?.pendingSyncIds)
      ? initialSaved.localMutationMeta.pendingSyncIds
      : [],
  }));

  const localMutationMetaRef = useRef<LocalMutationMeta>(localMutationMeta);
  useEffect(() => {
    localMutationMetaRef.current = localMutationMeta;
  }, [localMutationMeta]);

  const deletedUserIdsRef = useRef<Set<string>>(
    new Set(Array.isArray(initialSaved?.localMutationMeta?.deletedIds) ? initialSaved.localMutationMeta.deletedIds : [])
  );

  const markEntityMutated = useCallback((id: string, ts: number = Date.now()) => {
    if (!id) return;
    localMutationMetaRef.current = {
      ...localMutationMetaRef.current,
      entityUpdatedAt: {
        ...localMutationMetaRef.current.entityUpdatedAt,
        [id]: ts,
      },
      pendingSyncIds: Array.from(new Set([...(localMutationMetaRef.current.pendingSyncIds || []), id])),
    };
    setLocalMutationMeta((prev) => ({
      ...prev,
      entityUpdatedAt: {
        ...prev.entityUpdatedAt,
        [id]: ts,
      },
      pendingSyncIds: Array.from(new Set([...(prev.pendingSyncIds || []), id])),
    }));
  }, []);

  const markEntitySynced = useCallback((id: string) => {
    if (!id) return;
    if (!(localMutationMetaRef.current.pendingSyncIds || []).includes(id)) return;
    localMutationMetaRef.current = {
      ...localMutationMetaRef.current,
      pendingSyncIds: (localMutationMetaRef.current.pendingSyncIds || []).filter((x) => x !== id),
    };
    setLocalMutationMeta((prev) => ({
      ...prev,
      pendingSyncIds: (prev.pendingSyncIds || []).filter((x) => x !== id),
    }));
  }, []);

  const trackSync = useCallback(
    (id: string, syncPromise: Promise<boolean>) => {
      syncPromise
        .then((ok) => {
          if (ok) markEntitySynced(id);
        })
        .catch(() => {});
    },
    [markEntitySynced]
  );

  const markEntityDeleted = useCallback((id: string) => {
    if (!id) return;
    deletedUserIdsRef.current.add(id);
    const nextDeleted = Array.from(new Set([...localMutationMetaRef.current.deletedIds, id]));
    localMutationMetaRef.current = {
      ...localMutationMetaRef.current,
      deletedIds: nextDeleted,
      pendingSyncIds: (localMutationMetaRef.current.pendingSyncIds || []).filter((x) => x !== id),
    };
    setLocalMutationMeta((prev) => ({
      ...prev,
      deletedIds: Array.from(new Set([...prev.deletedIds, id])),
      pendingSyncIds: (prev.pendingSyncIds || []).filter((x) => x !== id),
    }));
  }, []);

  const markConfigMutated = useCallback((ts: number = Date.now()) => {
    localMutationMetaRef.current = {
      ...localMutationMetaRef.current,
      configUpdatedAt: ts,
      configPendingSync: true,
    };
    setLocalMutationMeta((prev) => ({
      ...prev,
      configUpdatedAt: ts,
      configPendingSync: true,
    }));
  }, []);

  const markConfigSynced = useCallback(() => {
    if (!localMutationMetaRef.current.configPendingSync) return;
    localMutationMetaRef.current = {
      ...localMutationMetaRef.current,
      configPendingSync: false,
    };
    setLocalMutationMeta((prev) => ({
      ...prev,
      configPendingSync: false,
    }));
  }, []);

  const trackConfigSync = useCallback(
    (syncPromise: Promise<boolean>) => {
      syncPromise
        .then((ok) => {
          if (ok) markConfigSynced();
        })
        .catch(() => {});
    },
    [markConfigSynced]
  );

  const mergeRemoteListWithLocal = useCallback(
    <T extends { id: string; updatedAt?: string }>(
      prev: T[],
      remote: T[],
      sortFn?: (a: T, b: T) => number
    ): T[] => {
      const meta = localMutationMetaRef.current;
      const deletedSet = new Set([...meta.deletedIds, ...Array.from(deletedUserIdsRef.current)]);
      const pendingSet = new Set(meta.pendingSyncIds || []);
      const map = new Map<string, T>();

      if (IS_NATIVE_APK) {
        // In Native APK, Firestore onSnapshot is authoritative so moderator additions, edits,
        // and deletions propagate live without page refresh. Any unsynced local writes (in pendingSyncIds)
        // stay protected across offline/auth-restore delays until Firestore confirms write completion.
        const now = Date.now();
        const prevMap = new Map<string, T>();
        prev.forEach((item) => {
          if (item && item.id && !deletedSet.has(item.id)) {
            prevMap.set(item.id, item);
            const localMutTs = meta.entityUpdatedAt[item.id] || 0;
            if (pendingSet.has(item.id) || localMutTs > now - 5000) {
              map.set(item.id, item);
            }
          }
        });
        remote.forEach((remoteItem) => {
          if (!remoteItem || !remoteItem.id || deletedSet.has(remoteItem.id)) return;
          const localItem = prevMap.get(remoteItem.id);
          const localMutTs = meta.entityUpdatedAt[remoteItem.id] || 0;
          const remoteTs = remoteItem.updatedAt ? Date.parse(remoteItem.updatedAt) || 0 : 0;
          if (
            localItem &&
            (pendingSet.has(remoteItem.id) || (localMutTs > remoteTs && localMutTs > now - 5000))
          ) {
            map.set(remoteItem.id, localItem);
          } else {
            map.set(remoteItem.id, remoteItem);
          }
        });
      } else {
        prev.forEach((item) => {
          if (item && item.id && !deletedSet.has(item.id)) {
            map.set(item.id, item);
          }
        });

        remote.forEach((remoteItem) => {
          if (!remoteItem || !remoteItem.id || deletedSet.has(remoteItem.id)) return;
          const localItem = map.get(remoteItem.id);
          if (!localItem) {
            map.set(remoteItem.id, remoteItem);
            return;
          }
          const localTs =
            meta.entityUpdatedAt[remoteItem.id] ||
            (localItem.updatedAt ? Date.parse(localItem.updatedAt) || 0 : 0);
          const remoteTs = remoteItem.updatedAt ? Date.parse(remoteItem.updatedAt) || 0 : 0;
          if (localTs > remoteTs) {
            map.set(remoteItem.id, localItem);
          } else {
            map.set(remoteItem.id, remoteItem);
          }
        });
      }

      const merged = Array.from(map.values());
      return sortFn ? merged.sort(sortFn) : merged;
    },
    []
  );

  // Granular Per-Channel & Per-Partner Unread Counts (Requirement 4)
  const getChannelUnreadCount = useCallback(
    (channel: 'GENERAL' | 'MODERATOR_ONLY'): number => {
      if (isGuestMode) return 0;
      if (channel === 'MODERATOR_ONLY' && currentUser.role === 'MEMBER') {
        return 0;
      }
      return chatMessages.filter(
        (m) =>
          !m.isDeleted &&
          m.channel === channel &&
          m.senderId !== currentUser.id &&
          !seenChatIds.includes(m.id)
      ).length;
    },
    [chatMessages, seenChatIds, currentUser.id, currentUser.role, isGuestMode]
  );

  const getPersonalUnreadCount = useCallback(
    (partnerUserId?: string): number => {
      if (isGuestMode) return 0;
      return privateMessages.filter(
        (pm) =>
          !pm.isDeleted &&
          pm.receiverId === currentUser.id &&
          (!partnerUserId || pm.senderId === partnerUserId) &&
          !pm.isRead &&
          !seenChatIds.includes(pm.id)
      ).length;
    },
    [privateMessages, seenChatIds, currentUser.id, isGuestMode]
  );

  const chatUnreadCount = useMemo(() => {
    return (
      getChannelUnreadCount('GENERAL') +
      getChannelUnreadCount('MODERATOR_ONLY') +
      getPersonalUnreadCount()
    );
  }, [getChannelUnreadCount, getPersonalUnreadCount]);

  const markChannelSeen = useCallback(
    (channel: 'GENERAL' | 'MODERATOR_ONLY') => {
      const channelMsgIds = chatMessages.filter((m) => m.channel === channel).map((m) => m.id);
      if (channelMsgIds.length === 0) return;
      setSeenChatIds((prev) => {
        const existing = new Set(prev);
        let added = false;
        for (const id of channelMsgIds) {
          if (!existing.has(id)) {
            existing.add(id);
            added = true;
          }
        }
        return added ? Array.from(existing) : prev;
      });
    },
    [chatMessages]
  );

  const markPersonalChatSeen = useCallback(
    (partnerUserId: string) => {
      if (!partnerUserId) return;
      const convMsgs = privateMessages.filter(
        (pm) =>
          (pm.senderId === partnerUserId && pm.receiverId === currentUser.id) ||
          (pm.senderId === currentUser.id && pm.receiverId === partnerUserId)
      );
      if (convMsgs.length > 0) {
        const ids = convMsgs.map((pm) => pm.id);
        setSeenChatIds((prev) => {
          const existing = new Set(prev);
          let added = false;
          for (const id of ids) {
            if (!existing.has(id)) {
              existing.add(id);
              added = true;
            }
          }
          return added ? Array.from(existing) : prev;
        });
      }
      if (!isGuestMode) {
        const nowIso = new Date().toISOString();
        setPrivateMessages((prev) => {
          const hasUnread = prev.some(
            (pm) => pm.senderId === partnerUserId && pm.receiverId === currentUser.id && !pm.isRead
          );
          if (!hasUnread) return prev;
          return prev.map((pm) => {
            if (pm.senderId === partnerUserId && pm.receiverId === currentUser.id && !pm.isRead) {
              const updatedPm = { ...pm, isRead: true, updatedAt: nowIso };
              markEntityMutated(pm.id);
              trackSync(pm.id, syncPrivateMessageToFirestore(updatedPm));
              return updatedPm;
            }
            return pm;
          });
        });
      }
    },
    [privateMessages, currentUser.id, isGuestMode, markEntityMutated, trackSync]
  );

  const markChatSeen = useCallback(() => {
    const allChatIds = chatMessages.map((m) => m.id);
    const allPmIds = privateMessages
      .filter((pm) => pm.receiverId === currentUser.id || pm.senderId === currentUser.id)
      .map((pm) => pm.id);

    setSeenChatIds((prev) => {
      const existing = new Set(prev);
      let added = false;
      for (const id of allChatIds) {
        if (!existing.has(id)) {
          existing.add(id);
          added = true;
        }
      }
      for (const id of allPmIds) {
        if (!existing.has(id)) {
          existing.add(id);
          added = true;
        }
      }
      return added ? Array.from(existing) : prev;
    });

    if (!isGuestMode) {
      setPrivateMessages((prev) => {
        const hasUnread = prev.some((pm) => pm.receiverId === currentUser.id && !pm.isRead);
        if (!hasUnread) return prev;
        return prev.map((pm) => (pm.receiverId === currentUser.id && !pm.isRead ? { ...pm, isRead: true } : pm));
      });
    }
  }, [chatMessages, privateMessages, currentUser.id, isGuestMode]);

  const relevantNotifications = useMemo(() => {
    return userNotifications.filter(
      (n) =>
        n.userId === 'ALL' ||
        (!isGuestMode && (n.userId === currentUser.memberId || n.userId === currentUser.id))
    );
  }, [userNotifications, isGuestMode, currentUser.memberId, currentUser.id]);

  const unreadNoticeCount = useMemo(() => {
    const unseenBoardNotices = notices.filter((n) => !seenNoticeIds.includes(n.id)).length;
    const unseenUserNotifs = relevantNotifications.filter(
      (n) => !n.read && !seenNoticeIds.includes(n.id)
    ).length;
    return unseenBoardNotices + unseenUserNotifs;
  }, [notices, relevantNotifications, seenNoticeIds]);

  const hasUnreadNotices = unreadNoticeCount > 0;

  const markNoticesSeen = useCallback(() => {
    const noticeIds = notices.map((n) => n.id);
    const notifIds = relevantNotifications.map((n) => n.id);
    setSeenNoticeIds((prev) => {
      const existing = new Set(prev);
      let added = false;
      for (const id of noticeIds) {
        if (!existing.has(id)) {
          existing.add(id);
          added = true;
        }
      }
      for (const id of notifIds) {
        if (!existing.has(id)) {
          existing.add(id);
          added = true;
        }
      }
      return added ? Array.from(existing) : prev;
    });
    setUserNotifications((prev) => {
      const needsUpdate = prev.some(
        (n) =>
          !n.read &&
          (n.userId === 'ALL' ||
            (!isGuestMode && (n.userId === currentUser.memberId || n.userId === currentUser.id)))
      );
      if (!needsUpdate) return prev;
      return prev.map((n) =>
        n.userId === 'ALL' ||
        (!isGuestMode && (n.userId === currentUser.memberId || n.userId === currentUser.id))
          ? { ...n, read: true }
          : n
      );
    });
  }, [notices, relevantNotifications, isGuestMode, currentUser.memberId, currentUser.id]);

  // Permission handlers for Native APK & Browser (Point 8)
  const togglePushNotifications = async (enabled: boolean): Promise<boolean> => {
    if (!enabled) {
      setPushNotificationsEnabled(false);
      triggerSuccess('পুশ নোটিফিকেশন বন্ধ করা হয়েছে।');
      return false;
    }

    try {
      // 1. Native Android Studio WebView Bridge
      if (typeof window !== 'undefined' && window.AndroidBridge?.requestNotificationPermission) {
        const granted = window.AndroidBridge.requestNotificationPermission();
        if (granted !== false) {
          setPushNotificationsEnabled(true);
          triggerSuccess('পুশ নোটিফিকেশন পারমিশন সফলভাবে সক্রিয় হয়েছে!');
          return true;
        }
      }

      // 2. Standard Web Notification API
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          setPushNotificationsEnabled(true);
          triggerSuccess('পুশ নোটিফিকেশন সক্রিয় রয়েছে!');
          return true;
        }
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setPushNotificationsEnabled(true);
          triggerSuccess('পুশ নোটিফিকেশন পারমিশন সফলভাবে সক্রিয় হয়েছে!');
          return true;
        } else {
          setPushNotificationsEnabled(false);
          triggerWarning(
            'নোটিফিকেশন পারমিশন প্রয়োজন',
            'আপনার ব্রাউজার বা ফোনের অ্যাপ সেটিংস থেকে নোটিফিকেশন পারমিশন ব্লক করা আছে। অনুগ্রহ করে ফোনের Settings > Apps > Basis Foundation > Notifications থেকে Allow করুন।'
          );
          return false;
        }
      }

      // Fallback inside WebViews where Notification constructor is absent
      setPushNotificationsEnabled(true);
      triggerSuccess('অ্যাপ নোটিফিকেশন সক্রিয় করা হয়েছে!');
      return true;
    } catch (err) {
      console.warn('Notification permission request error:', err);
      setPushNotificationsEnabled(true);
      triggerSuccess('অ্যাপ নোটিফিকেশন প্রেফারেন্স সংরক্ষিত হয়েছে!');
      return true;
    }
  };

  const toggleStorageAccess = async (enabled: boolean): Promise<boolean> => {
    if (!enabled) {
      setStorageAccessEnabled(false);
      triggerSuccess('স্টোরেজ অটো- অ্যাক্সেস অপশন বন্ধ করা হয়েছে।');
      return false;
    }

    try {
      if (typeof window !== 'undefined' && window.AndroidBridge?.requestStoragePermission) {
        const res = window.AndroidBridge.requestStoragePermission();
        if (res === false) {
          triggerWarning(
            'স্টোরেজ পারমিশন প্রয়োজন',
            'ফোনের স্টোরেজে রিসিট ও স্টেটমেন্ট সংরক্ষণের জন্য ফোনের Settings থেকে Storage পারমিশন অনুমোদন করুন।'
          );
          return false;
        }
      }

      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }

      setStorageAccessEnabled(true);
      triggerSuccess('ডিভাইস স্টোরেজ অ্যাক্সেস সক্রিয় হয়েছে! রিসিট ও স্টেটমেন্ট সরাসরি ফোনের ডাউনলোড ফোল্ডারে সেভ হবে।');
      return true;
    } catch (err) {
      console.warn('Storage permission request error:', err);
      setStorageAccessEnabled(true);
      triggerSuccess('ডিভাইস স্টোরেজ ডাউনলোড মোড সক্রিয় হয়েছে!');
      return true;
    }
  };

  // Real-time call state
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    callerId: string;
    callerName: string;
    targetName?: string;
    channel: string;
    startedAt: string;
    status: 'RINGING' | 'CONNECTED' | 'ENDED';
  } | null>(null);

  const startCall = (channel: 'GENERAL' | 'MODERATOR_ONLY' | 'PERSONAL' = 'GENERAL', targetName?: string) => {
    if (!requireMemberAuth('অডিও/ভিডিও কল শুরু')) return;
    const callObj = {
      callId: `call-${Date.now()}`,
      callerId: currentUser.id,
      callerName: currentUser.name,
      targetName: targetName || (channel === 'GENERAL' ? 'সকল সাধারণ সদস্য' : 'মডারেটর প্যানেল'),
      channel,
      startedAt: new Date().toISOString(),
      status: 'RINGING' as const,
    };
    setActiveCall(callObj);
  };

  const endCall = (durationSec: number = 0) => {
    if (!activeCall) return;
    const durFormatted = durationSec > 0
      ? `${Math.floor(durationSec / 60)} মিনিট ${durationSec % 60} সেকেন্ড`
      : 'কয়েক সেকেন্ড';
    const msg = `📞 [কল সমাপ্ত]\n${activeCall.callerName} এর সাথে অডিও/ভিডিও কল সমাপ্ত হয়েছে। মোট স্থিতিকাল: ${durFormatted}`;
    if (!isGuestMode && (activeCall.channel === 'GENERAL' || activeCall.channel === 'MODERATOR_ONLY')) {
      sendChatMessage(activeCall.channel, msg);
    }
    setActiveCall(null);
  };

  const addExecutiveMember = (member: Omit<ExecutiveMember, 'id'>): boolean => {
    if (!requireMemberAuth('কার্যনির্বাহী সদস্য সংযোজন')) return false;
    const normName = member.name.trim().toLowerCase();
    const newExec: ExecutiveMember = {
      ...member,
      id: `exec-${Date.now()}`,
      order: executiveMembers.length + 1,
      approvedDate: new Date().toLocaleDateString('en-GB'),
    };
    const created = enqueueApprovalRequest({
      idPrefix: 'appr-exec-add',
      requestType: 'EXECUTIVE_ADD',
      targetRecordId: newExec.id,
      sourceKey: `exec-add-${normName}`,
      title: `কার্যনির্বাহী পর্ষদে সংযোজন (${newExec.name})`,
      description: `${currentUser.name} কার্যনির্বাহী পর্ষদে "${newExec.name}" (${newExec.designation}) সংযোজনের প্রস্তাব করেছেন।`,
      proposedChanges: [
        { field: 'name', oldValue: 'নতুন পর্ষদ সদস্য', newValue: newExec.name },
        { field: 'designation', oldValue: '-', newValue: newExec.designation },
      ],
      payload: { newExec },
    });
    if (!created) return false;
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে কার্যনির্বাহী পর্ষদে সদস্য সাথে সাথে লাইভ যুক্ত হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ কার্যনির্বাহী পর্ষদে সদস্য সংযোজনের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  const removeExecutiveMember = (id: string): boolean => {
    if (!requireMemberAuth('কার্যনির্বাহী সদস্য অপসারণ')) return false;
    const existing = executiveMembers.find((m) => m.id === id);
    if (!existing) return false;
    const created = enqueueApprovalRequest({
      idPrefix: 'appr-exec-del',
      requestType: 'EXECUTIVE_DELETE',
      duplicateCheckTypes: ['EXECUTIVE_EDIT', 'EXECUTIVE_DELETE'],
      targetRecordId: id,
      title: `কার্যনির্বাহী পর্ষদ থেকে অপসারণ (${existing.name})`,
      description: `${currentUser.name} কার্যনির্বাহী পর্ষদ থেকে "${existing.name}" (${existing.designation}) অপসারণের প্রস্তাব করেছেন।`,
      proposedChanges: [
        { field: 'designation', oldValue: `${existing.name} (${existing.designation})`, newValue: 'পর্ষদ থেকে অপসারণ' },
      ],
    });
    if (!created) return false;
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে সদস্য অপসারণ সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ কার্যনির্বাহী পর্ষদ থেকে অপসারণের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  const updateExecutiveMember = (id: string, partial: Partial<ExecutiveMember>): boolean => {
    if (!requireMemberAuth('কার্যনির্বাহী পর্ষদ সম্পাদনা')) return false;
    const existing = executiveMembers.find((m) => m.id === id);
    if (!existing) return false;
    if (
      checkPendingRequestWarning(
        { requestTypes: ['EXECUTIVE_EDIT', 'EXECUTIVE_DELETE'], targetRecordId: id },
        `কার্যনির্বাহী সদস্য (${existing.name}) সম্পাদনা`
      )
    ) {
      return false;
    }
    const proposedChanges: { field: string; oldValue: any; newValue: any }[] = [];
    (Object.keys(partial) as Array<keyof ExecutiveMember>).forEach((field) => {
      const nextVal = partial[field];
      const prevVal = existing[field];
      if (nextVal !== undefined && nextVal !== prevVal) {
        proposedChanges.push({
          field: String(field),
          oldValue: prevVal ?? '',
          newValue: nextVal,
        });
      }
    });
    if (proposedChanges.length === 0) {
      triggerWarning('কোনো পরিবর্তন নেই', 'কার্যনির্বাহী সদস্যের তথ্যে কোনো পরিবর্তন করা হয়নি।');
      return false;
    }
    const created = enqueueApprovalRequest({
      idPrefix: 'appr-exec-edit',
      requestType: 'EXECUTIVE_EDIT',
      duplicateCheckTypes: ['EXECUTIVE_EDIT', 'EXECUTIVE_DELETE'],
      targetRecordId: id,
      title: `কার্যনির্বাহী পর্ষদ তথ্য সম্পাদনা (${existing.name})`,
      description: `${currentUser.name} কার্যনির্বাহী পর্ষদের সদস্য "${existing.name}"-এর তথ্য হালনাগাদের প্রস্তাব করেছেন।`,
      proposedChanges,
      payload: { partial },
    });
    if (!created) return false;
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে কার্যনির্বাহী পর্ষদের পরিবর্তনটি সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ কার্যনির্বাহী পর্ষদ সম্পাদনার প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  const checkUserHasPendingDeposit = (memberId: string): boolean => {
    return savings.some((s) => s.memberId === memberId && s.status === 'PENDING');
  };

  const sendUserNotification = (
    targetUserId: string,
    title: string,
    message: string,
    type: UserNotification['type'],
    color: UserNotification['color']
  ) => {
    const newNotif: UserNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUserId,
      title,
      message,
      type,
      color,
      createdAt: new Date().toISOString(),
      read: false,
    };
    markEntityMutated(newNotif.id);
    setUserNotifications((prev) => [newNotif, ...prev]);
    trackSync(newNotif.id, syncUserNotificationToFirestore(newNotif));

    if (pushNotificationsEnabled && typeof window !== 'undefined') {
      if (window.AndroidBridge?.showNotification) {
        try {
          window.AndroidBridge.showNotification(title, message);
        } catch (err) {
          console.warn('Android notification delivery error:', err);
        }
      } else if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body: message,
            icon: '/logo.svg',
            badge: '/logo.svg',
            tag: newNotif.id,
          });
        } catch (err) {
          console.warn('Push notification delivery error:', err);
        }
      }
    }
  };

  const markNotificationRead = (id: string) => {
    setSeenNoticeIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setUserNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    const notifIds = relevantNotifications.map((n) => n.id);
    setSeenNoticeIds((prev) => Array.from(new Set([...prev, ...notifIds])));
    setUserNotifications((prev) =>
      prev.map((n) =>
        n.userId === 'ALL' ||
        (!isGuestMode && (n.userId === currentUser.memberId || n.userId === currentUser.id))
          ? { ...n, read: true }
          : n
      )
    );
  };

  // Real-time Firestore onSnapshot listener — strictly active ONLY in Native APK (disabled in Web App)
  useEffect(() => {
    if (!IS_NATIVE_APK) return;

    const unsubscribe = initRealtimeSync({
      onConfigChange: (remoteConfig) => {
        setConfig((prev) => {
          const meta = localMutationMetaRef.current;
          const remoteTs = remoteConfig.updatedAt ? Date.parse(remoteConfig.updatedAt) || 0 : 0;
          const localCfgTs =
            meta.configUpdatedAt || (prev.updatedAt ? Date.parse(prev.updatedAt) || 0 : 0);
          if (meta.configPendingSync || localCfgTs > remoteTs) {
            return prev;
          }
          const savedCustomSheet = getSavedCustomGoogleSheetUrl();
          const nextSheetUrl = isCustomGoogleSheetUrl(remoteConfig.googleSheetsUrl)
            ? remoteConfig.googleSheetsUrl
            : isCustomGoogleSheetUrl(prev.googleSheetsUrl)
            ? prev.googleSheetsUrl
            : savedCustomSheet || remoteConfig.googleSheetsUrl || prev.googleSheetsUrl;
          if (isCustomGoogleSheetUrl(nextSheetUrl)) {
            persistCustomGoogleSheetUrl(nextSheetUrl);
          }
          const keepLocalFontBlob =
            !remoteConfig.uploadedFontDataUrl &&
            Boolean(prev.uploadedFontDataUrl) &&
            Boolean(prev.uploadedFontName) &&
            remoteConfig.customFontFamily === prev.uploadedFontName;
          return {
            ...prev,
            ...remoteConfig,
            uploadedFontDataUrl: keepLocalFontBlob
              ? prev.uploadedFontDataUrl
              : remoteConfig.uploadedFontDataUrl,
            uploadedFontName: keepLocalFontBlob
              ? prev.uploadedFontName
              : remoteConfig.uploadedFontName,
            googleSheetsUrl: nextSheetUrl,
            bankDetails: remoteConfig.bankDetails
              ? { ...prev.bankDetails, ...remoteConfig.bankDetails }
              : prev.bankDetails,
            aboutUsContent: remoteConfig.aboutUsContent
              ? { ...(prev.aboutUsContent || {}), ...remoteConfig.aboutUsContent }
              : prev.aboutUsContent,
            customTexts: remoteConfig.customTexts ?? prev.customTexts,
            customTabTitles: remoteConfig.customTabTitles ?? prev.customTabTitles,
            navTabsOrder: normalizeNavTabsOrder(remoteConfig.navTabsOrder || prev.navTabsOrder),
          };
        });
      },
      onNoticesChange: (remoteNotices) => {
        setNotices((prev) =>
          mergeRemoteListWithLocal(
            prev,
            remoteNotices,
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      },
      onRulesChange: (remoteRules) => {
        setRules((prev) =>
          mergeRemoteListWithLocal(prev, remoteRules, (a, b) => (a.ruleNumber || 0) - (b.ruleNumber || 0))
        );
      },
      onExecutiveMembersChange: (remoteMembers) => {
        setExecutiveMembers((prev) =>
          mergeRemoteListWithLocal(prev, remoteMembers, (a, b) => (a.order || 0) - (b.order || 0))
        );
      },
      onSavingsChange: (remoteSavings) => {
        setSavings((prev) =>
          mergeRemoteListWithLocal(
            prev,
            remoteSavings,
            (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
          )
        );
      },
      onUsersChange: (remoteUsers) => {
        setUsers((prev) => {
          const cleanRemote = remoteUsers.filter((u) => u && u.id !== '__guest__');
          const cleanPrev = prev.filter((u) => u && u.id !== '__guest__');
          const merged = mergeRemoteListWithLocal(cleanPrev, cleanRemote);
          setCurrentUserState((curr) => {
            const targetRestoreId = curr.id === '__guest__' ? pendingRestoreUserIdRef.current : curr.id;
            if (!targetRestoreId || targetRestoreId === '__guest__') return GUEST_USER;
            const updatedSelf = merged.find((x) => x.id === targetRestoreId);
            if (!updatedSelf) return curr.id === '__guest__' ? GUEST_USER : curr;
            pendingRestoreUserIdRef.current = null;
            if (updatedSelf.status !== 'APPROVED') return GUEST_USER;
            // Single-device login enforcement (Deliverable 8): exempt APP_MODERATOR
            if (updatedSelf.role !== 'APP_MODERATOR' && updatedSelf.activeDeviceId) {
              const myDeviceId = getOrCreateDeviceId();
              if (updatedSelf.activeDeviceId !== myDeviceId) {
                return GUEST_USER;
              }
            }
            return updatedSelf;
          });
          return merged;
        });
      },
      onApprovalsChange: (remoteApprovals) => {
        setApprovals((prev) =>
          mergeRemoteListWithLocal(
            prev,
            remoteApprovals,
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      },
      onChatChange: (remoteChat) => {
        setChatMessages((prev) =>
          mergeRemoteListWithLocal(
            prev,
            remoteChat,
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        );
      },
      onPollsChange: (remotePolls) => {
        setPolls((prev) =>
          mergeRemoteListWithLocal(
            prev,
            remotePolls || [],
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      },
      onPrivateMessagesChange: (remotePMs) => {
        setPrivateMessages((prev) =>
          mergeRemoteListWithLocal(
            prev,
            remotePMs,
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        );
      },
      onReceiptsChange: (remoteReceipts) => {
        setReceipts((prev) => {
          const pendingSet = new Set(localMutationMetaRef.current.pendingSyncIds || []);
          const map = new Map<string, ElectronicReceipt>();
          prev.forEach((r) => {
            if (pendingSet.has(r.receiptNumber) || pendingSet.has(r.transactionId)) {
              map.set(r.receiptNumber, r);
            }
          });
          (remoteReceipts || []).forEach((r) => {
            if (r && r.receiptNumber && !map.has(r.receiptNumber)) {
              map.set(r.receiptNumber, r);
            }
          });
          return Array.from(map.values());
        });
      },
      onExpensesChange: (remoteExpenses) => {
        setExpenses((prev) =>
          mergeRemoteListWithLocal(
            prev,
            remoteExpenses,
            (a, b) =>
              new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
          )
        );
      },
      onComplaintsChange: (remoteComplaints) => {
        setComplaints((prev) =>
          mergeRemoteListWithLocal(
            prev,
            remoteComplaints || [],
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      },
      onFeaturesChange: (remoteFeatures) => {
        setFeatureRequests((prev) => mergeRemoteListWithLocal(prev, remoteFeatures || []));
      },
      onNotificationsChange: (remoteNotifs) => {
        setUserNotifications((prev) => {
          const readMap = new Map<string, boolean>();
          prev.forEach((n) => {
            if (n.read) readMap.set(n.id, true);
          });
          const merged = mergeRemoteListWithLocal(
            prev,
            remoteNotifs || [],
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return merged.map((n) => (readMap.get(n.id) ? { ...n, read: true } : n));
        });
      },
      onStatusChange: (status, timestamp) => {
        setCloudSyncStatus(status);
        setLastSyncTimestamp(timestamp);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [mergeRemoteListWithLocal]);

  // Ref snapshot of latest entity arrays & queue so pending offline/unauthenticated writes flush automatically
  const flushStateRef = useRef({
    config,
    users,
    savings,
    approvals,
    receipts,
    notices,
    rules,
    executiveMembers,
    expenses,
    complaints,
    featureRequests,
    chatMessages,
    polls,
    privateMessages,
    userNotifications,
  });
  flushStateRef.current = {
    config,
    users,
    savings,
    approvals,
    receipts,
    notices,
    rules,
    executiveMembers,
    expenses,
    complaints,
    featureRequests,
    chatMessages,
    polls,
    privateMessages,
    userNotifications,
  };

  const isFlushingRef = useRef(false);
  const flushPendingSyncs = useCallback(async () => {
    if (!IS_NATIVE_APK || isFlushingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const meta = localMutationMetaRef.current;
    const pending = [...(meta.pendingSyncIds || [])];
    const hasPendingConfig = Boolean(meta.configPendingSync);
    if (pending.length === 0 && !hasPendingConfig) return;

    isFlushingRef.current = true;
    try {
      const s = flushStateRef.current;
      if (hasPendingConfig) {
        trackConfigSync(syncConfigToFirestore(s.config));
      }
      if (pending.length === 0) return;

      const pendingSet = new Set(pending);
      s.users.filter((u) => pendingSet.has(u.id)).forEach((u) => trackSync(u.id, syncUserToFirestore(u)));
      s.savings.filter((tx) => pendingSet.has(tx.id)).forEach((tx) => trackSync(tx.id, syncSavingsTransactionToFirestore(tx)));
      s.approvals.filter((a) => pendingSet.has(a.id)).forEach((a) => trackSync(a.id, syncApprovalToFirestore(a)));
      s.receipts
        .filter((r) => pendingSet.has(r.receiptNumber))
        .forEach((r) => trackSync(r.receiptNumber, syncReceiptToFirestore(r)));
      s.notices.filter((n) => pendingSet.has(n.id)).forEach((n) => trackSync(n.id, syncNoticeToFirestore(n)));
      s.rules.filter((r) => pendingSet.has(r.id)).forEach((r) => trackSync(r.id, syncRuleToFirestore(r)));
      s.executiveMembers
        .filter((m) => pendingSet.has(m.id))
        .forEach((m) => trackSync(m.id, syncExecutiveMemberToFirestore(m)));
      s.expenses.filter((e) => pendingSet.has(e.id)).forEach((e) => trackSync(e.id, syncExpenseToFirestore(e)));
      s.complaints.filter((c) => pendingSet.has(c.id)).forEach((c) => trackSync(c.id, syncComplaintToFirestore(c)));
      s.featureRequests
        .filter((f) => pendingSet.has(f.id))
        .forEach((f) => trackSync(f.id, syncFeatureRequestToFirestore(f)));
      s.chatMessages.filter((m) => pendingSet.has(m.id)).forEach((m) => trackSync(m.id, syncChatMessageToFirestore(m)));
      s.polls.filter((p) => pendingSet.has(p.id)).forEach((p) => trackSync(p.id, syncPollToFirestore(p)));
      s.privateMessages
        .filter((pm) => pendingSet.has(pm.id))
        .forEach((pm) => trackSync(pm.id, syncPrivateMessageToFirestore(pm)));
      s.userNotifications
        .filter((n) => pendingSet.has(n.id))
        .forEach((n) => trackSync(n.id, syncUserNotificationToFirestore(n)));
    } finally {
      isFlushingRef.current = false;
    }
  }, [trackConfigSync, trackSync]);

  // Automatically flush queued offline/pending Firestore writes on network reconnect or Firebase Auth restoration (APK only)
  useEffect(() => {
    if (!IS_NATIVE_APK) return;
    const onOnline = () => {
      flushPendingSyncs();
    };
    window.addEventListener('online', onOnline);
    const auth = getFirebaseAuth();
    const unsubAuth = auth
      ? onAuthStateChanged(auth, (fbUser) => {
          if (fbUser) {
            flushPendingSyncs();
          }
        })
      : undefined;
    flushPendingSyncs();
    return () => {
      window.removeEventListener('online', onOnline);
      unsubAuth?.();
    };
  }, [flushPendingSyncs]);

  // Moderator-only + Online-only Cloud Sync (Point 14 & Point 18)
  const triggerCloudSync = async () => {
    const isMod = !isGuestMode && (currentUser.role === 'APP_MODERATOR' || currentUser.role === 'MODERATOR');
    if (!isMod) {
      triggerWarning(
        'অনুমতি সীমাবদ্ধ',
        'শুধুমাত্র অনুমোদিত মডারেটরগণ ফায়ারবেজ ক্লাউড সিংক পরিচালনা করতে পারবেন।',
        isGuestMode
      );
      return;
    }

    const actuallyOnline = typeof navigator !== 'undefined' ? navigator.onLine && isOnline : isOnline;
    if (!actuallyOnline) {
      setCloudSyncStatus('OFFLINE');
      triggerWarning(
        'ইন্টারনেট সংযোগ নেই!',
        'অ্যাপ সিংক করার জন্য ইন্টারনেট কানেক্টিভিটি আবশ্যক। অনুগ্রহ করে ইন্টারনেট কানেক্ট করে পুনরায় চেষ্টা করুন।'
      );
      return;
    }

    setCloudSyncStatus('SYNCING');
    setIsRefreshing(true);
    try {
      const ok = await performFullFirestoreSync(
        {
          config,
          users,
          savings,
          receipts,
          approvals,
          notices,
          rules,
          expenses,
          complaints,
          featureRequests,
        },
        {
          onConfigChange: (remoteCfg) =>
            setConfig((prev) => {
              const meta = localMutationMetaRef.current;
              const remoteTs = remoteCfg.updatedAt ? Date.parse(remoteCfg.updatedAt) || 0 : 0;
              const localCfgTs =
                meta.configUpdatedAt ||
                (prev.updatedAt ? Date.parse(prev.updatedAt) || 0 : 0);
              if (meta.configPendingSync || localCfgTs > remoteTs) return prev;
              const savedCustomSheet = getSavedCustomGoogleSheetUrl();
              const nextSheetUrl = isCustomGoogleSheetUrl(remoteCfg.googleSheetsUrl)
                ? remoteCfg.googleSheetsUrl
                : isCustomGoogleSheetUrl(prev.googleSheetsUrl)
                ? prev.googleSheetsUrl
                : savedCustomSheet || remoteCfg.googleSheetsUrl || prev.googleSheetsUrl;
              if (isCustomGoogleSheetUrl(nextSheetUrl)) {
                persistCustomGoogleSheetUrl(nextSheetUrl);
              }
              return {
                ...prev,
                ...remoteCfg,
                googleSheetsUrl: nextSheetUrl,
                bankDetails: remoteCfg.bankDetails
                  ? { ...prev.bankDetails, ...remoteCfg.bankDetails }
                  : prev.bankDetails,
                aboutUsContent: remoteCfg.aboutUsContent
                  ? { ...(prev.aboutUsContent || {}), ...remoteCfg.aboutUsContent }
                  : prev.aboutUsContent,
                navTabsOrder: normalizeNavTabsOrder(remoteCfg.navTabsOrder || prev.navTabsOrder),
              };
            }),
          onUsersChange: (remoteUsers) => {
            if (remoteUsers.length > 0) {
              setUsers((prev) =>
                mergeRemoteListWithLocal(
                  prev.filter((u) => u.id !== '__guest__'),
                  remoteUsers.filter((u) => u.id !== '__guest__')
                )
              );
            }
          },
          onSavingsChange: (remoteTx) => {
            if (remoteTx.length > 0) {
              setSavings((prev) =>
                mergeRemoteListWithLocal(
                  prev,
                  remoteTx,
                  (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
                )
              );
            }
          },
          onNoticesChange: (remoteNotices) => {
            if (remoteNotices.length > 0) {
              setNotices((prev) =>
                mergeRemoteListWithLocal(
                  prev,
                  remoteNotices,
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
              );
            }
          },
          onApprovalsChange: (remoteApprovals) => {
            if (remoteApprovals.length > 0) {
              setApprovals((prev) =>
                mergeRemoteListWithLocal(
                  prev,
                  remoteApprovals,
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
              );
            }
          },
          onRulesChange: (remoteRules) => {
            if (remoteRules.length > 0) {
              setRules((prev) =>
                mergeRemoteListWithLocal(prev, remoteRules, (a, b) => (a.ruleNumber || 0) - (b.ruleNumber || 0))
              );
            }
          },
          onStatusChange: (st, ts) => {
            setCloudSyncStatus(st);
            setLastSyncTimestamp(ts);
          },
        }
      );

      await Promise.all([
        syncConfigToFirestore(config),
        ...notices.map((n) => syncNoticeToFirestore(n)),
        ...rules.map((r) => syncRuleToFirestore(r)),
        ...executiveMembers.map((m) => syncExecutiveMemberToFirestore(m)),
        ...users.filter((u) => u.id !== '__guest__').map((u) => syncUserToFirestore(u)),
        ...savings.map((tx) => syncSavingsTransactionToFirestore(tx)),
        ...receipts.map((r) => syncReceiptToFirestore(r)),
        ...approvals.map((a) => syncApprovalToFirestore(a)),
        ...expenses.map((e) => syncExpenseToFirestore(e)),
        ...complaints.map((c) => syncComplaintToFirestore(c)),
        ...featureRequests.map((f) => syncFeatureRequestToFirestore(f)),
        ...chatMessages.map((m) => syncChatMessageToFirestore(m)),
        ...polls.map((p) => syncPollToFirestore(p)),
        ...privateMessages.map((pm) => syncPrivateMessageToFirestore(pm)),
        ...userNotifications.map((n) => syncUserNotificationToFirestore(n)),
      ]);
      markConfigSynced();
      setLocalMutationMeta((prev) => ({ ...prev, configPendingSync: false, pendingSyncIds: [] }));
      localMutationMetaRef.current = { ...localMutationMetaRef.current, configPendingSync: false, pendingSyncIds: [] };

      setIsRefreshing(false);
      if (ok) {
        setCloudSyncStatus('SYNCED');
        setLastSyncTimestamp(new Date().toLocaleTimeString('bn-BD'));
        triggerSuccess('ফায়ারবেজ ক্লাউডে সমস্ত ডাটা সফলভাবে সিংক সম্পন্ন হয়েছে!');
      } else {
        setCloudSyncStatus('LOCAL');
        triggerWarning('সিংক সম্পন্ন হয়নি', 'ফায়ারবেজ সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
      }
    } catch (err) {
      setIsRefreshing(false);
      setCloudSyncStatus('LOCAL');
      triggerWarning('সিংক ত্রুটি', 'ক্লাউড সিংক চলাকালীন একটি ত্রুটি ঘটেছে। অনুগ্রহ করে ইন্টারনেট কানেকশন যাচাই করুন।');
    }
  };

  // Online User Tracking
  const onlineUserIds = useMemo(() => {
    if (!isOnline) return [];
    return users.map((u) => u.id);
  }, [isOnline, users]);

  // Sync dark/light class and theme-color on HTML element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    document.documentElement.style.colorScheme = theme;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0d1513' : '#f4f7f5');
    }
  }, [theme]);

  // Sync font size scaling directly on document root
  useEffect(() => {
    const sizeMap: Record<string, string> = {
      small: '13.5px',
      medium: '16px',
      large: '18.5px',
      xlarge: '21px',
    };
    const targetSize = sizeMap[config.fontSize || 'medium'] || '16px';
    document.documentElement.style.fontSize = targetSize;
    document.documentElement.classList.remove('font-scale-small', 'font-scale-medium', 'font-scale-large', 'font-scale-xlarge');
    document.documentElement.classList.add(`font-scale-${config.fontSize || 'medium'}`);
  }, [config.fontSize]);

  // Inject manual custom font if provided
  useEffect(() => {
    if (config.customFontUrl && config.customFontUrl.trim() !== '') {
      const existing = document.getElementById('custom-font-link');
      if (existing) existing.remove();
      const link = document.createElement('link');
      link.id = 'custom-font-link';
      link.rel = 'stylesheet';
      link.href = config.customFontUrl;
      document.head.appendChild(link);
    }
    if (config.customFontFamily && config.customFontFamily.trim() !== '') {
      document.body.style.fontFamily = `'${config.customFontFamily}', var(--font-bengali)`;
    } else {
      document.body.style.fontFamily = `var(--font-bengali)`;
    }
  }, [config.customFontUrl, config.customFontFamily]);

  // Inject and apply uploaded TTF/WOFF/OTF font file dynamically
  useEffect(() => {
    if (config.uploadedFontDataUrl) {
      const fontName = config.uploadedFontName || 'UserCustomFont';
      let styleTag = document.getElementById('app-uploaded-font-style') as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'app-uploaded-font-style';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        @font-face {
          font-family: '${fontName}';
          src: url("${config.uploadedFontDataUrl}") format('truetype'),
               url("${config.uploadedFontDataUrl}") format('woff2'),
               url("${config.uploadedFontDataUrl}") format('woff'),
               url("${config.uploadedFontDataUrl}") format('opentype');
          font-weight: 100 900;
          font-display: swap;
        }
        body, html, input, button, select, textarea {
          font-family: '${fontName}', var(--font-bengali), system-ui, sans-serif !important;
        }
      `;
    } else {
      const existingTag = document.getElementById('app-uploaded-font-style');
      if (existingTag) existingTag.remove();
    }
  }, [config.uploadedFontDataUrl, config.uploadedFontName]);

  // Auto-sync ALL entity states, user settings & seen badges to LocalStorage (Point 9)
  useEffect(() => {
    try {
      if (config.uploadedFontDataUrl) {
        try {
          localStorage.setItem(
            CUSTOM_FONT_STORAGE_KEY,
            JSON.stringify({
              uploadedFontDataUrl: config.uploadedFontDataUrl,
              uploadedFontName: config.uploadedFontName,
            })
          );
        } catch {}
      } else {
        try {
          localStorage.removeItem(CUSTOM_FONT_STORAGE_KEY);
        } catch {}
      }

      const configForMainStore: AppConfiguration =
        config.uploadedFontDataUrl && config.uploadedFontDataUrl.length > 250000
          ? { ...config, uploadedFontDataUrl: undefined }
          : config;

      const buildPayload = (cfgToSave: AppConfiguration) => ({
        settings: {
          theme,
          themeMode,
          themeUserSelected,
          soundEnabled,
          hapticEnabled,
          pushNotificationsEnabled,
          storageAccessEnabled,
        },
        seenNoticeIds,
        seenChatIds,
        overdueReminders: localOverdueIds,
        config: cfgToSave,
        users,
        currentUserId: currentUser && currentUser.id !== '__guest__' ? currentUser.id : null,
        savings,
        approvals,
        receipts,
        notices,
        rules,
        complaints,
        featureRequests,
        chatMessages,
        polls,
        releases,
        forceUpdateRelease,
        auditLogs,
        expenses,
        privateMessages,
        executiveMembers,
        userNotifications,
        localMutationMeta,
        apkLiveSynced: IS_NATIVE_APK ? true : Boolean(initialSaved?.apkLiveSynced),
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(configForMainStore)));
      } catch (quotaErr) {
        // Fallback if storage quota is tight: strip font binary from main key so App Moderator config & entities never reset
        const leanCfg: AppConfiguration = { ...configForMainStore, uploadedFontDataUrl: undefined };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(leanCfg)));
      }
    } catch (e) {
      console.error('Failed to auto-save to localStorage', e);
    }
  }, [
    theme,
    themeMode,
    themeUserSelected,
    soundEnabled,
    hapticEnabled,
    pushNotificationsEnabled,
    storageAccessEnabled,
    seenNoticeIds,
    seenChatIds,
    localOverdueIds,
    config,
    users,
    currentUser?.id,
    savings,
    approvals,
    receipts,
    notices,
    rules,
    complaints,
    featureRequests,
    chatMessages,
    polls,
    releases,
    forceUpdateRelease,
    auditLogs,
    expenses,
    privateMessages,
    executiveMembers,
    userNotifications,
    localMutationMeta,
  ]);

  // Generate initial receipts for approved transactions if missing (idempotent)
  useEffect(() => {
    const existingApproved = savings.filter((t) => t.status === 'APPROVED');
    setReceipts((prev) => {
      const byTxId = new Map<string, ElectronicReceipt>();
      prev.forEach((r) => byTxId.set(r.transactionId, r));
      let added = false;
      existingApproved.forEach((tx, idx) => {
        if (!byTxId.has(tx.id)) {
          added = true;
          byTxId.set(tx.id, {
            receiptNumber: tx.receiptId || generateReceiptNumber(tx.savingsMonth, tx.memberId, idx + 1),
            transactionId: tx.id,
            memberId: tx.memberId,
            memberName: tx.memberName,
            savingsMonth: tx.savingsMonth,
            savingsYear: tx.savingsYear,
            amount: tx.amount,
            paymentMethod: tx.paymentMethod,
            transactionDate: tx.transactionDate,
            transactionRef: tx.transactionRef,
            approvalStatus: 'APPROVED',
            approvingModeratorNames: (tx.approvingModerators || []).map((id) => {
              const u = users.find((usr) => usr.id === id);
              return u ? u.name : 'Authorized Moderator';
            }),
            generatedAt: tx.transactionDate,
            verificationHash: `BF-HASH-${tx.id}-${tx.memberId}-${Math.floor(tx.amount * 3.1415)}`,
          });
        }
      });
      return added ? Array.from(byTxId.values()) : prev;
    });
  }, [savings, users]);

  // Eligible moderators count
  const eligibleModeratorsCount = useMemo(() => {
    return users.filter(
      (u) => (u.role === 'APP_MODERATOR' || u.role === 'MODERATOR') && u.status === 'APPROVED'
    ).length;
  }, [users]);

  // Financial aggregates
  const financialTotals = useMemo(() => {
    return calculateFinancialTotals(savings);
  }, [savings]);

  // Monthly aggregates
  const monthlyAggregates = useMemo(() => {
    return aggregateSavingsByMonth(savings);
  }, [savings]);

  // Month-over-month growth rate
  const growthRate = useMemo(() => {
    const currentMonth = '2026-10';
    const previousMonth = '2026-09';
    const currentTotal = monthlyAggregates[currentMonth] || 0;
    const prevTotal = monthlyAggregates[previousMonth] || 0;
    return calculateGrowthRate(currentTotal, prevTotal);
  }, [monthlyAggregates]);

  // Total Expenses & Net Reserve Balance
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const netReserveBalance = useMemo(() => {
    return financialTotals.totalApproved - totalExpenses;
  }, [financialTotals.totalApproved, totalExpenses]);

  const findPendingApprovalForSource = useCallback(
    (params: {
      requestTypes?: ApprovalRequest['requestType'][];
      targetRecordId?: string;
      sourceKey?: string;
    }): ApprovalRequest | undefined => {
      return approvals.find((a) => {
        if (a.status !== 'PENDING') return false;
        if (params.sourceKey && a.sourceKey) {
          return a.sourceKey === params.sourceKey;
        }
        if (params.sourceKey && !a.sourceKey) {
          // Match legacy/config requests by config key if sourceKey starts with 'config-'
          if (params.requestTypes && !params.requestTypes.includes(a.requestType)) {
            return false;
          }
          if (params.sourceKey === 'config-googleSheetsUrl') {
            return Boolean(a.payload?.configPatch?.googleSheetsUrl);
          }
          if (params.sourceKey === 'config-jointBankHolders') {
            return a.payload?.configPatch?.jointBankAccountHolders !== undefined;
          }
          if (params.sourceKey === 'config-bankDetails') {
            return a.payload?.configPatch?.bankDetails !== undefined;
          }
          if (params.sourceKey === 'config-aboutUsContent') {
            return a.payload?.configPatch?.aboutUsContent !== undefined;
          }
        }
        if (params.requestTypes && !params.requestTypes.includes(a.requestType)) {
          return false;
        }
        if (params.targetRecordId !== undefined) {
          return a.targetRecordId === params.targetRecordId;
        }
        return true;
      });
    },
    [approvals]
  );

  const checkPendingRequestWarning = useCallback(
    (
      params: {
        requestTypes?: ApprovalRequest['requestType'][];
        targetRecordId?: string;
        sourceKey?: string;
      },
      actionLabel?: string
    ): boolean => {
      const existing = findPendingApprovalForSource(params);
      if (existing) {
        triggerWarning(
          'অপেক্ষমাণ অনুরোধ বিদ্যমান!',
          `"${actionLabel || existing.title}"-এর জন্য ইতিমধ্যে একটি অনুরোধ (${existing.requestingUserName}) মডারেটর প্যানেলে অনুমোদনের অপেক্ষায় আছে। অনুরোধটি অনুমোদিত বা প্রত্যাখ্যাত না হওয়া পর্যন্ত একই জায়গা থেকে দ্বিতীয়বার অনুরোধ, পরিবর্তন, যুক্ত বা এডিট করা যাবে না।`
        );
        return true;
      }
      return false;
    },
    [findPendingApprovalForSource, triggerWarning]
  );

  const enqueueApprovalRequest = (params: {
    idPrefix?: string;
    requestType: ApprovalRequest['requestType'];
    duplicateCheckTypes?: ApprovalRequest['requestType'][];
    targetRecordId: string;
    sourceKey?: string;
    title: string;
    description: string;
    targetMemberId?: string;
    proposedChanges?: { field: string; oldValue: any; newValue: any }[];
    payload?: Record<string, any>;
    requiredApprovalCount?: number;
  }): ApprovalRequest | null => {
    const isDuplicate = checkPendingRequestWarning(
      {
        requestTypes: params.duplicateCheckTypes || [params.requestType],
        targetRecordId: params.sourceKey ? undefined : params.targetRecordId,
        sourceKey: params.sourceKey,
      },
      params.title
    );
    if (isDuplicate) {
      return null;
    }

    const modPool = Math.max(1, eligibleModeratorsCount);
    const reqCount =
      params.requiredApprovalCount ?? Math.max(1, Math.ceil((modPool * 2) / 3));
    const isSubmitterMod =
      !isGuestMode &&
      currentUser.status === 'APPROVED' &&
      (currentUser.role === 'MODERATOR' || currentUser.role === 'APP_MODERATOR');
    const initialApprovalVotes = isSubmitterMod ? [currentUser.id] : [];
    const autoApproved = isSubmitterMod && initialApprovalVotes.length >= reqCount;

    const nowIso = new Date().toISOString();
    const newApproval: ApprovalRequest = {
      id: `${params.idPrefix || 'appr'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      requestType: params.requestType,
      targetRecordId: params.targetRecordId,
      sourceKey: params.sourceKey,
      requestingUserId: currentUser.id,
      requestingUserName: currentUser.name,
      requesterMemberId: currentUser.memberId,
      targetMemberId: params.targetMemberId,
      title: params.title,
      description: params.description,
      proposedChanges: params.proposedChanges,
      payload: params.payload,
      createdAt: nowIso,
      updatedAt: nowIso,
      requiredApprovalCount: reqCount,
      eligibleModeratorsCount: modPool,
      approvalVotes: initialApprovalVotes,
      rejectionVotes: [],
      status: autoApproved ? 'APPROVED' : 'PENDING',
      finalizedAt: autoApproved ? nowIso : undefined,
    };
    markEntityMutated(newApproval.id);
    setApprovals((prev) => [newApproval, ...prev]);
    trackSync(newApproval.id, syncApprovalToFirestore(newApproval));
    if (autoApproved) {
      applyApprovedMutation(newApproval, initialApprovalVotes, nowIso);
    }
    return newApproval;
  };

  const addExpense = (expenseData: Omit<FoundationExpense, 'id'>): boolean => {
    if (!requireMemberAuth('ব্যয়ের হিসাব সংযোজন')) return false;
    const newExp: FoundationExpense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    const created = enqueueApprovalRequest({
      idPrefix: 'appr-exp-add',
      requestType: 'EXPENSE_ADD',
      targetRecordId: newExp.id,
      sourceKey: `expense-add-${newExp.title.trim().toLowerCase()}-${newExp.amount}`,
      title: `ব্যয়ের হিসাব সংযোজন (${newExp.title})`,
      description: `${currentUser.name} ৳${newExp.amount.toLocaleString()} পরিমাণের "${newExp.title}" ব্যয় সংযোজনের প্রস্তাব দাখিল করেছেন।`,
      proposedChanges: [
        { field: 'title', oldValue: 'নতুন ব্যয়', newValue: newExp.title },
        { field: 'amount', oldValue: '৳০', newValue: `৳${newExp.amount.toLocaleString()}` },
        { field: 'category', oldValue: '-', newValue: newExp.category },
      ],
      payload: { newExp },
    });
    if (!created) return false;
    logAudit('EXPENSE_RECORDED', 'FINANCE', newExp.id, `ব্যয় প্রস্তাব দাখিল: ${newExp.title} (৳${newExp.amount})`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে ব্যয়ের হিসাবটি সাথে সাথে লাইভ যুক্ত হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ ব্যয়ের হিসাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  const removeExpense = (id: string): boolean => {
    if (!requireMemberAuth('ব্যয়ের হিসাব অপসারণ')) return false;
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return false;
    const created = enqueueApprovalRequest({
      idPrefix: 'appr-exp-del',
      requestType: 'EXPENSE_DELETE',
      targetRecordId: id,
      title: `ব্যয়ের হিসাব অপসারণ (${existing.title})`,
      description: `${currentUser.name} "${existing.title}" (৳${existing.amount.toLocaleString()}) ব্যয় রেকর্ড অপসারণের প্রস্তাব দাখিল করেছেন।`,
      proposedChanges: [
        {
          field: 'expense',
          oldValue: `${existing.title} (৳${existing.amount.toLocaleString()})`,
          newValue: 'ব্যয় রেকর্ড বাতিল/অপসারণ',
        },
      ],
    });
    if (!created) return false;
    logAudit('EXPENSE_DELETED', 'FINANCE', id, `ব্যয় অপসারণের প্রস্তাব দাখিল করা হয়েছে।`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে ব্যয় অপসারণ সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ ব্যয় অপসারণের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Unread moderator workflow badge count
  const unreadCount = useMemo(() => {
    const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length;
    const pendingComplaints = complaints.filter((c) => c.status === 'SUBMITTED').length;
    return pendingApprovals + pendingComplaints;
  }, [approvals, complaints]);

  // Add an audit log entry
  const logAudit = (
    actionType: AuditLogItem['actionType'],
    targetType: string,
    targetId: string,
    details: string
  ) => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: currentUser?.id || 'system',
      actorName: currentUser?.name || 'অতিথি বা সিস্টেম',
      actorRole: currentUser?.role || 'MEMBER',
      actionType,
      targetType,
      targetId,
      timestamp: new Date().toISOString(),
      details,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const deleteAuditLogs = (ids: string[]) => {
    if (isGuestMode || currentUser.role !== 'APP_MODERATOR') {
      triggerWarning('অনুমতি সীমাবদ্ধ', 'শুধুমাত্র অ্যাপ মডারেটর অডিট লগ মুছে ফেলতে পারবেন।');
      return;
    }
    const targetSet = new Set(ids);
    if (targetSet.size === 0) return;
    setAuditLogs((prev) => prev.filter((l) => !targetSet.has(l.id)));
    triggerSuccess(`${toBengaliNumerals(targetSet.size)} টি অডিট লগ সফলভাবে ডিলিট করা হয়েছে।`);
  };

  // Create savings transaction — enters Moderator Panel as PENDING (submitting moderator vote auto-counted)
  const createSavingsEntry = (data: {
    memberId: string;
    amount: number;
    savingsMonth: string;
    savingsYear: number;
    paymentMethod: any;
    transactionRef?: string;
    notes?: string;
  }): boolean => {
    if (!requireMemberAuth('সঞ্চয় জমা এন্ট্রি দাখিল')) return false;

    const member = users.find((u) => u.memberId === data.memberId);
    if (!member) return false;

    const savingsSourceKey = `savings-${data.memberId}-${data.savingsYear}-${data.savingsMonth}`;
    const hasPendingSameDeposit =
      savings.some(
        (s) =>
          s.status === 'PENDING' &&
          s.memberId === data.memberId &&
          s.savingsMonth === data.savingsMonth &&
          s.savingsYear === data.savingsYear
      ) ||
      Boolean(
        findPendingApprovalForSource({
          requestTypes: ['SAVINGS_ENTRY'],
          sourceKey: savingsSourceKey,
        })
      );

    if (hasPendingSameDeposit) {
      triggerWarning(
        'অপেক্ষমাণ জমা বিদ্যমান!',
        `${member.name} (${data.memberId})-এর ${data.savingsMonth} মাসের একটি সঞ্চয় জমা ইতিমধ্যে মডারেটর প্যানেলে অনুমোদনের অপেক্ষায় আছে। সেটি অনুমোদিত বা প্রত্যাখ্যাত না হওয়া পর্যন্ত পুনরায় জমা দাখিল করা যাবে না।`
      );
      return false;
    }

    const txId = `tx-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const entryCreatorId = currentUser.id;
    const entryCreatorName = currentUser.name;
    const modPool = Math.max(1, eligibleModeratorsCount);
    const reqCount = Math.max(1, Math.ceil((modPool * 2) / 3));
    const isSubmitterMod =
      !isGuestMode &&
      currentUser.status === 'APPROVED' &&
      (currentUser.role === 'MODERATOR' || currentUser.role === 'APP_MODERATOR');
    const initialVotes = isSubmitterMod ? [currentUser.id] : [];
    const isInstantLive = isSubmitterMod && initialVotes.length >= reqCount;
    const receiptSeq = receipts.length + 1;
    const instantReceiptId = isInstantLive
      ? generateReceiptNumber(data.savingsMonth, data.memberId, receiptSeq)
      : undefined;

    const newTx: SavingsTransaction = {
      id: txId,
      memberId: data.memberId,
      memberName: member.name,
      amount: data.amount,
      savingsMonth: data.savingsMonth,
      savingsYear: data.savingsYear,
      transactionDate: nowIso,
      paymentMethod: data.paymentMethod,
      transactionRef: data.transactionRef,
      entryCreatorId,
      entryCreatorName,
      status: isInstantLive ? 'APPROVED' : 'PENDING',
      approvingModerators: initialVotes,
      receiptId: instantReceiptId,
      notes: data.notes,
      updatedAt: nowIso,
    };

    const approvalId = `appr-${Date.now()}`;
    const newApproval: ApprovalRequest = {
      id: approvalId,
      requestType: 'SAVINGS_ENTRY',
      targetRecordId: txId,
      sourceKey: savingsSourceKey,
      requestingUserId: entryCreatorId,
      requestingUserName: entryCreatorName,
      requesterMemberId: currentUser.memberId,
      targetMemberId: member.memberId,
      title: `সঞ্চয় জমা অনুমোদন (${member.name})`,
      description: `${member.name} (${data.memberId}) এর ${data.savingsMonth} মাসের ৳${data.amount.toLocaleString()} জমার অনুমোদন প্রক্রিয়া।`,
      createdAt: nowIso,
      updatedAt: nowIso,
      requiredApprovalCount: reqCount,
      eligibleModeratorsCount: modPool,
      approvalVotes: initialVotes,
      rejectionVotes: [],
      status: isInstantLive ? 'APPROVED' : 'PENDING',
      finalizedAt: isInstantLive ? nowIso : undefined,
    };

    markEntityMutated(newTx.id);
    markEntityMutated(newApproval.id);
    setSavings((prev) => [newTx, ...prev]);
    setApprovals((prev) => [newApproval, ...prev]);

    // Clear active overdue deposit reminder immediately once the user submits a deposit
    setLocalOverdueIds((prev) => prev.filter((id) => id !== data.memberId));
    if (configRef.current.overdueReminderDetails && configRef.current.overdueReminderDetails[data.memberId]) {
      const nextDetails = { ...configRef.current.overdueReminderDetails };
      delete nextDetails[data.memberId];
      updateConfig({ overdueReminderDetails: nextDetails });
    }

    trackSync(newTx.id, syncSavingsTransactionToFirestore(newTx));
    trackSync(newApproval.id, syncApprovalToFirestore(newApproval));

    if (isInstantLive) {
      const receipt: ElectronicReceipt = {
        receiptNumber: instantReceiptId!,
        transactionId: newTx.id,
        memberId: newTx.memberId,
        memberName: newTx.memberName,
        savingsMonth: newTx.savingsMonth,
        savingsYear: newTx.savingsYear,
        amount: newTx.amount,
        paymentMethod: newTx.paymentMethod,
        transactionDate: newTx.transactionDate,
        transactionRef: newTx.transactionRef,
        approvalStatus: 'APPROVED',
        approvingModeratorNames: initialVotes.map((id) => {
          const u = users.find((usr) => usr.id === id);
          return u ? u.name : 'মডারেটর';
        }),
        generatedAt: nowIso,
        verificationHash: `BF-HASH-${newTx.id}-${newTx.memberId}-${Math.floor(newTx.amount * 3.1415)}`,
      };
      markEntityMutated(receipt.receiptNumber);
      setReceipts((prev) => [receipt, ...prev.filter((r) => r.transactionId !== receipt.transactionId)]);
      trackSync(receipt.receiptNumber, syncReceiptToFirestore(receipt));

      updateConfig({
        latestDepositTicker: {
          depositorName: newTx.memberName,
          amount: newTx.amount,
          month: newTx.savingsMonth,
          time: 'এখনই অনুমোদিত',
        },
      });

      sendUserNotification(
        newTx.memberId,
        'সঞ্চয় জমা অনুমোদিত হয়েছে!',
        `আপনার ${newTx.savingsMonth} মাসের ${formatCurrencyBengali(newTx.amount)} সঞ্চয় জমা সফলভাবে অনুমোদিত হয়েছে এবং আপনার ব্যালেন্স ও রিসিটে যুক্ত হয়েছে।`,
        'DEPOSIT_APPROVED',
        'emerald'
      );

      logAudit(
        'SAVINGS_APPROVED',
        'APPROVAL_REQUEST',
        newApproval.id,
        `১-ভোট নিয়মে মডারেটরের স্বয়ংক্রিয় ভোটে সঞ্চয় জমা (${newTx.memberName}, ৳${newTx.amount}) তাৎক্ষণিক অনুমোদিত ও লাইভ হয়েছে।`
      );
      triggerSuccess('আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে যুক্ত হয়ে সঞ্চয় জমা সাথে সাথে অনুমোদিত ও লাইভ হয়েছে!');
    } else {
      sendUserNotification(
        member.memberId,
        'জমা দাখিল সম্পন্ন',
        `আপনার ${data.savingsMonth} মাসের ৳${data.amount.toLocaleString()} জমার তথ্য দাখিল হয়েছে, মডারেটর প্যানেলে অনুমোদনের জন্য অপেক্ষা করুন।`,
        'DEPOSIT_SUBMITTED',
        'purple'
      );

      logAudit(
        'SAVINGS_CREATED',
        'SAVINGS_TRANSACTION',
        txId,
        `${member.name} (${data.memberId}) এর জন্য ৳${data.amount} এর সঞ্চয় এন্ট্রি তৈরি করা হয়েছে।`
      );
    }
    return true;
  };

  // Finalize approved notice edit
  const finalizeApprovedNoticeEdit = (
    noticeId: string,
    changes?: { field: string; oldValue: any; newValue: any }[]
  ) => {
    if (!changes || changes.length === 0) return;
    const nowIso = new Date().toISOString();
    markEntityMutated(noticeId);

    let updatedNoticeObj: NoticeItem | undefined;
    const baseNotice = notices.find((n) => n.id === noticeId);
    if (baseNotice) {
      const copy: NoticeItem = { ...baseNotice, updatedAt: nowIso };
      for (const ch of changes) {
        (copy as any)[ch.field] = ch.newValue;
      }
      updatedNoticeObj = copy;
    }

    setNotices((prev) =>
      prev.map((n) => {
        if (n.id !== noticeId) return n;
        const copy: NoticeItem = { ...n, updatedAt: nowIso };
        for (const ch of changes) {
          (copy as any)[ch.field] = ch.newValue;
        }
        updatedNoticeObj = copy;
        return copy;
      })
    );

    if (updatedNoticeObj) {
      trackSync(updatedNoticeObj.id, syncNoticeToFirestore(updatedNoticeObj));
      if (updatedNoticeObj.showInTicker) {
        const prefix =
          updatedNoticeObj.priority === 'HIGH' || updatedNoticeObj.priority === 'URGENT'
            ? '[জরুরি বিজ্ঞপ্তি] '
            : '[হালনাগাদ বিজ্ঞপ্তি] ';
        const fullContent = updatedNoticeObj.content.replace(/\s+/g, ' ').trim();
        updateConfig({
          scrollingAnnouncement: `${prefix}${updatedNoticeObj.title}: ${fullContent}`,
        });
      }
      sendUserNotification(
        'ALL',
        `সংশোধিত নোটিশ: ${updatedNoticeObj.title}`,
        updatedNoticeObj.content.slice(0, 85) + '...',
        'NEW_NOTICE',
        'amber'
      );
      logAudit('NOTICE_EDITED', 'NOTICE', noticeId, `অনুমোদনের মাধ্যমে নোটিশ "${updatedNoticeObj.title}" লাইভ করা হয়েছে।`);
    }
  };

  // Apply an approved workflow mutation live across app state, Firestore & notifications
  const applyApprovedMutation = (
    appr: ApprovalRequest,
    newApprovals: string[],
    nowIso: string
  ) => {
    const resolvedRequesterMemberId =
      appr.requesterMemberId || users.find((u) => u.id === appr.requestingUserId)?.memberId;
    const resolvedTargetMemberId =
      appr.targetMemberId || users.find((u) => u.id === appr.targetRecordId)?.memberId;

    switch (appr.requestType) {
      case 'SAVINGS_ENTRY': {
        finalizeApprovedSavings(appr.targetRecordId, newApprovals);
        if (
          resolvedRequesterMemberId &&
          resolvedRequesterMemberId !== 'GUEST' &&
          resolvedRequesterMemberId !== resolvedTargetMemberId
        ) {
          sendUserNotification(
            resolvedRequesterMemberId,
            'অনুমোদন সম্পন্ন ও কার্যকর হয়েছে!',
            `আপনার দাখিলকৃত "${appr.title}" অনুমোদিত হয়েছে এবং অ্যাপে কার্যকর করা হয়েছে।`,
            'DEPOSIT_APPROVED',
            'emerald'
          );
        }
        break;
      }
      case 'FINANCIAL_CORRECTION': {
        const p = appr.payload || {};
        const origTx = savings.find((t) => t.id === appr.targetRecordId);
        const baseAmount = Number(p.amount ?? origTx?.amount ?? 0);
        const reversalRecord: SavingsTransaction = {
          id: `rev-${Date.now()}`,
          memberId: String(p.memberId || origTx?.memberId || ''),
          memberName: String(p.memberName || origTx?.memberName || 'সদস্য'),
          amount: -Math.abs(baseAmount),
          savingsMonth: String(p.savingsMonth || origTx?.savingsMonth || '2026-11'),
          savingsYear: Number(p.savingsYear || origTx?.savingsYear || 2026),
          transactionDate: nowIso,
          paymentMethod: (p.paymentMethod || origTx?.paymentMethod || 'CASH') as any,
          entryCreatorId: appr.requestingUserId,
          entryCreatorName: appr.requestingUserName,
          status: 'APPROVED',
          approvingModerators: newApprovals,
          isCorrection: true,
          originalTransactionId: appr.targetRecordId,
          notes: `সংশোধন/রিভার্সাল: ${p.reason || appr.description}`,
          updatedAt: nowIso,
        };
        markEntityMutated(reversalRecord.id);
        setSavings((prev) => [reversalRecord, ...prev]);
        trackSync(reversalRecord.id, syncSavingsTransactionToFirestore(reversalRecord));
        logAudit(
          'FINANCIAL_CORRECTION',
          'SAVINGS_TRANSACTION',
          appr.targetRecordId,
          `অনুমোদনের মাধ্যমে রিভার্সাল এন্ট্রি কার্যকর।`
        );
        break;
      }
      case 'NEW_MEMBER': {
        finalizeApprovedMember(appr.targetRecordId);
        break;
      }
      case 'MEMBER_DIRECT_ADD': {
        const newUser = appr.payload?.newUser as UserProfile | undefined;
        if (newUser) {
          const approvedNewUser: UserProfile = {
            ...newUser,
            status: 'APPROVED',
            updatedAt: nowIso,
          };
          markEntityMutated(approvedNewUser.id);
          setUsers((prev) =>
            prev.some((u) => u.id === approvedNewUser.id)
              ? prev.map((u) => (u.id === approvedNewUser.id ? approvedNewUser : u))
              : [...prev, approvedNewUser]
          );
          trackSync(approvedNewUser.id, syncUserToFirestore(approvedNewUser));
          logAudit(
            'MEMBER_REGISTRATION',
            'USER',
            approvedNewUser.id,
            `অনুমোদনের মাধ্যমে সদস্য ${approvedNewUser.name} (${approvedNewUser.memberId}) যুক্ত হয়েছেন।`
          );
        }
        break;
      }
      case 'MEMBER_REMOVE': {
        markEntityDeleted(appr.targetRecordId);
        setUsers((prev) => prev.filter((u) => u.id !== appr.targetRecordId));
        deleteUserFromFirestore(appr.targetRecordId);
        if (currentUser.id === appr.targetRecordId) {
          setCurrentUserState(GUEST_USER);
        }
        logAudit('PROFILE_CHANGE', 'USER', appr.targetRecordId, `অনুমোদনের মাধ্যমে সদস্য অপসারণ কার্যকর হয়েছে।`);
        break;
      }
      case 'PROFILE_CHANGE':
      case 'MODERATOR_APPOINTMENT': {
        finalizeApprovedProfileChange(appr.targetRecordId, appr.proposedChanges);
        break;
      }
      case 'NOTICE_ADD': {
        const newNotice = appr.payload?.newNotice as NoticeItem | undefined;
        if (newNotice) {
          const liveNotice: NoticeItem = {
            ...newNotice,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          markEntityMutated(liveNotice.id);
          setNotices((prev) => [liveNotice, ...prev.filter((n) => n.id !== liveNotice.id)]);
          trackSync(liveNotice.id, syncNoticeToFirestore(liveNotice));
          if (liveNotice.showInTicker) {
            const prefix =
              liveNotice.priority === 'HIGH' || liveNotice.priority === 'URGENT'
                ? '[জরুরি বিজ্ঞপ্তি] '
                : '';
            const fullContent = liveNotice.content.replace(/\s+/g, ' ').trim();
            updateConfig({
              scrollingAnnouncement: `${prefix}${liveNotice.title}: ${fullContent}`,
            });
          }
          sendUserNotification(
            'ALL',
            `নতুন নোটিশ: ${liveNotice.title}`,
            liveNotice.content.slice(0, 85) + '...',
            'NEW_NOTICE',
            'amber'
          );
          logAudit('CONFIG_UPDATED', 'NOTICE', liveNotice.id, `অনুমোদনের পর নতুন নোটিশ প্রকাশ: "${liveNotice.title}"`);
        }
        break;
      }
      case 'NOTICE_EDIT': {
        finalizeApprovedNoticeEdit(appr.targetRecordId, appr.proposedChanges);
        break;
      }
      case 'NOTICE_DELETE': {
        markEntityDeleted(appr.targetRecordId);
        setNotices((prev) => prev.filter((n) => n.id !== appr.targetRecordId));
        deleteNoticeFromFirestore(appr.targetRecordId);
        logAudit('CONFIG_UPDATED', 'NOTICE', appr.targetRecordId, `অনুমোদনের মাধ্যমে নোটিশ মুছে ফেলা হয়েছে।`);
        break;
      }
      case 'RULE_ADD': {
        const newRule = appr.payload?.newRule as FoundationRule | undefined;
        if (newRule) {
          setRules((prev) => {
            const nextNum =
              newRule.ruleNumber ||
              prev.reduce((max, r) => Math.max(max, r.ruleNumber || 0), 0) + 1;
            const liveRule: FoundationRule = {
              ...newRule,
              ruleNumber: nextNum,
              lastUpdated: nowIso.split('T')[0],
              updatedAt: nowIso,
            };
            markEntityMutated(liveRule.id);
            trackSync(liveRule.id, syncRuleToFirestore(liveRule));
            const filtered = prev.filter((r) => r.id !== liveRule.id);
            return [...filtered, liveRule].sort((a, b) => (a.ruleNumber || 0) - (b.ruleNumber || 0));
          });
          logAudit('CONFIG_UPDATED', 'FOUNDATION_RULE', newRule.id, `অনুমোদনের মাধ্যমে নতুন ধারা যুক্ত হয়েছে: "${newRule.title}"`);
        }
        break;
      }
      case 'RULE_CHANGE': {
        const nextTitle = String(
          appr.payload?.title ??
            appr.proposedChanges?.find((c) => c.field === 'title')?.newValue ??
            ''
        );
        const nextDesc = String(
          appr.payload?.description ??
            appr.proposedChanges?.find((c) => c.field === 'description')?.newValue ??
            ''
        );
        markEntityMutated(appr.targetRecordId);
        setRules((prev) =>
          prev.map((r) => {
            if (r.id !== appr.targetRecordId) return r;
            const updatedRule: FoundationRule = {
              ...r,
              title: nextTitle || r.title,
              description: nextDesc || r.description,
              version: (r.version || 1) + 1,
              lastUpdated: nowIso.split('T')[0],
              updatedAt: nowIso,
            };
            trackSync(updatedRule.id, syncRuleToFirestore(updatedRule));
            return updatedRule;
          })
        );
        logAudit('CONFIG_UPDATED', 'FOUNDATION_RULE', appr.targetRecordId, `অনুমোদনের মাধ্যমে গঠনতন্ত্রের ধারা হালনাগাদ।`);
        break;
      }
      case 'EXECUTIVE_ADD': {
        const newExec = appr.payload?.newExec as ExecutiveMember | undefined;
        if (newExec) {
          setExecutiveMembers((prev) => {
            const liveExec: ExecutiveMember = {
              ...newExec,
              order: prev.length + 1,
              approvedDate: new Date().toLocaleDateString('en-GB'),
              updatedAt: nowIso,
            };
            markEntityMutated(liveExec.id);
            trackSync(liveExec.id, syncExecutiveMemberToFirestore(liveExec));
            return [...prev.filter((m) => m.id !== liveExec.id), liveExec];
          });
        }
        break;
      }
      case 'EXECUTIVE_EDIT': {
        const partial = (appr.payload?.partial || {}) as Partial<ExecutiveMember>;
        markEntityMutated(appr.targetRecordId);
        setExecutiveMembers((prev) =>
          prev.map((m) => {
            if (m.id !== appr.targetRecordId) return m;
            const updatedExec: ExecutiveMember = { ...m, ...partial, updatedAt: nowIso };
            if (appr.proposedChanges) {
              appr.proposedChanges.forEach((ch) => {
                (updatedExec as any)[ch.field] = ch.newValue;
              });
            }
            trackSync(updatedExec.id, syncExecutiveMemberToFirestore(updatedExec));
            return updatedExec;
          })
        );
        break;
      }
      case 'EXECUTIVE_DELETE': {
        markEntityDeleted(appr.targetRecordId);
        setExecutiveMembers((prev) => prev.filter((m) => m.id !== appr.targetRecordId));
        deleteExecutiveMemberFromFirestore(appr.targetRecordId);
        break;
      }
      case 'EXPENSE_ADD': {
        const newExp = appr.payload?.newExp as FoundationExpense | undefined;
        if (newExp) {
          const liveExp: FoundationExpense = { ...newExp, updatedAt: nowIso };
          markEntityMutated(liveExp.id);
          setExpenses((prev) => [liveExp, ...prev.filter((e) => e.id !== liveExp.id)]);
          trackSync(liveExp.id, syncExpenseToFirestore(liveExp));
          logAudit('EXPENSE_RECORDED', 'FINANCE', liveExp.id, `অনুমোদিত ব্যয়: ${liveExp.title} (৳${liveExp.amount})`);
        }
        break;
      }
      case 'EXPENSE_DELETE': {
        markEntityDeleted(appr.targetRecordId);
        setExpenses((prev) => prev.filter((e) => e.id !== appr.targetRecordId));
        deleteExpenseFromFirestore(appr.targetRecordId);
        logAudit('EXPENSE_DELETED', 'FINANCE', appr.targetRecordId, `অনুমোদনের মাধ্যমে ব্যয় অপসারণ।`);
        break;
      }
      case 'BANK_CONFIG_CHANGE': {
        const configPatch = appr.payload?.configPatch as Partial<AppConfiguration> | undefined;
        if (configPatch) {
          updateConfig(configPatch);
        }
        break;
      }
    }

    // Send automatic approval confirmation notification to requesting user & affected target member
    if (appr.requestType !== 'SAVINGS_ENTRY') {
      const isProfileType =
        appr.requestType === 'PROFILE_CHANGE' ||
        appr.requestType === 'MODERATOR_APPOINTMENT' ||
        appr.requestType === 'NEW_MEMBER';

      if (resolvedRequesterMemberId && resolvedRequesterMemberId !== 'GUEST') {
        sendUserNotification(
          resolvedRequesterMemberId,
          'অনুমোদন সম্পন্ন ও কার্যকর হয়েছে!',
          `আপনার অনুরোধ "${appr.title}" মডারেটর প্যানেলে অনুমোদিত হয়েছে এবং অ্যাপে সফলভাবে কার্যকর হয়েছে।`,
          isProfileType ? 'PROFILE_APPROVED' : 'GENERAL',
          'emerald'
        );
      }

      if (
        resolvedTargetMemberId &&
        resolvedTargetMemberId !== 'GUEST' &&
        resolvedTargetMemberId !== resolvedRequesterMemberId &&
        appr.requestType !== 'MEMBER_REMOVE'
      ) {
        sendUserNotification(
          resolvedTargetMemberId,
          'আপনার প্রোফাইল/তথ্য অনুমোদিত হয়েছে!',
          `"${appr.title}" মডারেটর প্যানেলে অনুমোদিত হয়ে অ্যাপে কার্যকর হয়েছে।`,
          isProfileType ? 'PROFILE_APPROVED' : 'GENERAL',
          'blue'
        );
      }
    }

    logAudit(
      'SAVINGS_APPROVED',
      'APPROVAL_REQUEST',
      appr.id,
      `অনুমোদন নং ${appr.id} (${appr.requestType}) সফলভাবে অনুমোদিত ও কার্যকর হয়েছে।`
    );
  };

  // Vote on approval — applies ALL requestType mutations live & notifies requesting/target users
  const voteOnApproval = (
    approvalId: string,
    vote: 'APPROVE' | 'REJECT',
    reason?: string,
    forceFinalize?: boolean
  ) => {
    if (!requireMemberAuth('অনুমোদন প্যানেলে ভোট প্রদান')) return;
    if (currentUser.role !== 'APP_MODERATOR' && currentUser.role !== 'MODERATOR') {
      triggerWarning('অনুমতি সীমাবদ্ধ', 'শুধুমাত্র মডারেটরগণ অনুমোদন প্যানেলে সিদ্ধান্ত প্রদান করতে পারবেন।');
      return;
    }

    const appr = approvals.find((a) => a.id === approvalId);
    if (!appr || appr.status !== 'PENDING') return;

    const currentUserId = currentUser.id;
    const existingApprovals = appr.approvalVotes || [];
    const existingRejections = appr.rejectionVotes || [];
    const canForceFinalize = Boolean(forceFinalize && currentUser.role === 'APP_MODERATOR');

    if (
      !canForceFinalize &&
      (existingApprovals.includes(currentUserId) || existingRejections.includes(currentUserId))
    ) {
      return;
    }

    const newApprovals =
      vote === 'APPROVE'
        ? Array.from(new Set([...existingApprovals, currentUserId]))
        : existingApprovals.filter((id) => id !== currentUserId);
    const newRejections =
      vote === 'REJECT'
        ? Array.from(new Set([...existingRejections, currentUserId]))
        : existingRejections.filter((id) => id !== currentUserId);

    const liveModPool = Math.max(1, eligibleModeratorsCount);
    const totalModPool = Math.min(
      Math.max(1, appr.eligibleModeratorsCount || liveModPool),
      liveModPool
    );
    const effectiveReqCount = Math.min(
      Math.max(1, appr.requiredApprovalCount || 1),
      Math.max(1, Math.ceil((totalModPool * 2) / 3))
    );

    let evaluation: { status: ApprovalRequest['status']; isFinalized: boolean };
    if (canForceFinalize) {
      evaluation = {
        status: vote === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        isFinalized: true,
      };
    } else if (effectiveReqCount === 1) {
      evaluation = {
        status:
          newApprovals.length >= 1
            ? 'APPROVED'
            : newRejections.length >= 1
            ? 'REJECTED'
            : 'PENDING',
        isFinalized: newApprovals.length >= 1 || newRejections.length >= 1,
      };
    } else if (newApprovals.length >= effectiveReqCount) {
      evaluation = { status: 'APPROVED', isFinalized: true };
    } else if (newRejections.length >= effectiveReqCount) {
      evaluation = { status: 'REJECTED', isFinalized: true };
    } else {
      evaluation = evaluateApprovalState(totalModPool, newApprovals, newRejections);
    }

    const nowIso = new Date().toISOString();
    const updated: ApprovalRequest = {
      ...appr,
      approvalVotes: newApprovals,
      rejectionVotes: newRejections,
      status: evaluation.status,
      finalizedAt: evaluation.isFinalized ? nowIso : undefined,
      updatedAt: nowIso,
    };

    markEntityMutated(approvalId);
    setApprovals((prev) => prev.map((a) => (a.id === approvalId ? updated : a)));
    trackSync(approvalId, syncApprovalToFirestore(updated));

    const resolvedRequesterMemberId =
      appr.requesterMemberId || users.find((u) => u.id === appr.requestingUserId)?.memberId;
    const resolvedTargetMemberId =
      appr.targetMemberId || users.find((u) => u.id === appr.targetRecordId)?.memberId;

    if (evaluation.isFinalized && evaluation.status === 'APPROVED') {
      applyApprovedMutation(appr, newApprovals, nowIso);
      triggerSuccess('প্রস্তাবটি চূড়ান্তভাবে অনুমোদিত ও অ্যাপে কার্যকর হয়েছে!');
    } else if (evaluation.isFinalized && evaluation.status === 'REJECTED') {
      if (appr.requestType === 'SAVINGS_ENTRY') {
        markEntityMutated(appr.targetRecordId);
        setSavings((sPrev) =>
          sPrev.map((t) => {
            if (t.id === appr.targetRecordId) {
              const rejectedTx: SavingsTransaction = {
                ...t,
                status: 'REJECTED',
                rejectionReason: reason,
                updatedAt: nowIso,
              };
              trackSync(rejectedTx.id, syncSavingsTransactionToFirestore(rejectedTx));
              return rejectedTx;
            }
            return t;
          })
        );
      } else if (appr.requestType === 'NEW_MEMBER') {
        markEntityMutated(appr.targetRecordId);
        setUsers((uPrev) =>
          uPrev.map((u) => {
            if (u.id === appr.targetRecordId) {
              const rejUser: UserProfile = { ...u, status: 'REJECTED', updatedAt: nowIso };
              trackSync(rejUser.id, syncUserToFirestore(rejUser));
              return rejUser;
            }
            return u;
          })
        );
      }

      const notifyTarget = resolvedRequesterMemberId || resolvedTargetMemberId;
      if (notifyTarget && notifyTarget !== 'GUEST') {
        sendUserNotification(
          notifyTarget,
          'প্রস্তাব প্রত্যাখ্যাত হয়েছে',
          `আপনার "${appr.title}" মডারেটর প্যানেলে অনুমোদিত হয়নি।${reason ? ` কারণ: ${reason}` : ''}`,
          'DEPOSIT_REJECTED',
          'rose'
        );
      }

      logAudit(
        'SAVINGS_REJECTED',
        'APPROVAL_REQUEST',
        appr.id,
        `অনুমোদন নং ${appr.id} বাতিল/প্রত্যাখ্যাত হয়েছে। কারণ: ${reason || 'পর্যাপ্ত ভোট পাওয়া যায়নি'}`
      );
      triggerSuccess('প্রস্তাবটি প্রত্যাখ্যান করা হয়েছে।');
    } else {
      triggerSuccess(vote === 'APPROVE' ? 'আপনার অনুমোদন ভোট সংরক্ষিত হয়েছে!' : 'আপনার প্রত্যাখ্যান ভোট সংরক্ষিত হয়েছে।');
    }
  };

  // Finalize approved savings & generate official receipt + notify depositor immediately
  const finalizeApprovedSavings = (txId: string, approvingModIds: string[]) => {
    const nowIso = new Date().toISOString();
    markEntityMutated(txId);

    let capturedTx: SavingsTransaction | undefined = savings.find((tx) => tx.id === txId);
    const receiptSeq = receipts.length + 1;

    setSavings((prev) =>
      prev.map((tx) => {
        if (tx.id !== txId) return tx;
        const receiptId = generateReceiptNumber(tx.savingsMonth, tx.memberId, receiptSeq);
        const finalizedTx: SavingsTransaction = {
          ...tx,
          status: 'APPROVED',
          approvingModerators: approvingModIds,
          receiptId,
          updatedAt: nowIso,
        };
        capturedTx = finalizedTx;
        trackSync(finalizedTx.id, syncSavingsTransactionToFirestore(finalizedTx));
        return finalizedTx;
      })
    );

    if (!capturedTx) return;
    if (capturedTx.status !== 'APPROVED') {
      const receiptId = generateReceiptNumber(capturedTx.savingsMonth, capturedTx.memberId, receiptSeq);
      capturedTx = {
        ...capturedTx,
        status: 'APPROVED',
        approvingModerators: approvingModIds,
        receiptId,
        updatedAt: nowIso,
      };
      trackSync(capturedTx.id, syncSavingsTransactionToFirestore(capturedTx));
    }

    const receipt: ElectronicReceipt = {
      receiptNumber: capturedTx.receiptId || generateReceiptNumber(capturedTx.savingsMonth, capturedTx.memberId, receiptSeq),
      transactionId: capturedTx.id,
      memberId: capturedTx.memberId,
      memberName: capturedTx.memberName,
      savingsMonth: capturedTx.savingsMonth,
      savingsYear: capturedTx.savingsYear,
      amount: capturedTx.amount,
      paymentMethod: capturedTx.paymentMethod,
      transactionDate: capturedTx.transactionDate,
      transactionRef: capturedTx.transactionRef,
      approvalStatus: 'APPROVED',
      approvingModeratorNames: approvingModIds.map((id) => {
        const u = users.find((usr) => usr.id === id);
        return u ? u.name : 'মডারেটর';
      }),
      generatedAt: nowIso,
      verificationHash: `BF-HASH-${capturedTx.id}-${capturedTx.memberId}-${Math.floor(capturedTx.amount * 3.1415)}`,
    };
    markEntityMutated(receipt.receiptNumber);
    setReceipts((prev) => [receipt, ...prev.filter((r) => r.transactionId !== receipt.transactionId)]);
    trackSync(receipt.receiptNumber, syncReceiptToFirestore(receipt));

    updateConfig({
      latestDepositTicker: {
        depositorName: capturedTx.memberName,
        amount: capturedTx.amount,
        month: capturedTx.savingsMonth,
        time: 'এখনই অনুমোদিত',
      },
    });

    sendUserNotification(
      capturedTx.memberId,
      'সঞ্চয় জমা অনুমোদিত হয়েছে!',
      `আপনার ${capturedTx.savingsMonth} মাসের ${formatCurrencyBengali(capturedTx.amount)} সঞ্চয় জমা সফলভাবে অনুমোদিত হয়েছে এবং আপনার ব্যালেন্স ও রিসিটে যুক্ত হয়েছে।`,
      'DEPOSIT_APPROVED',
      'emerald'
    );
  };

  // Finalize member approval
  const finalizeApprovedMember = (userId: string) => {
    const nowIso = new Date().toISOString();
    markEntityMutated(userId);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated: UserProfile = { ...u, status: 'APPROVED', updatedAt: nowIso };
        trackSync(updated.id, syncUserToFirestore(updated));
        return updated;
      })
    );
    logAudit('MEMBER_APPROVAL', 'USER', userId, `নতুন সদস্যের আবেদন অনুমোদিত হয়েছে।`);
  };

  // Finalize profile change — applies live to users, currentUserState, and Firestore
  const finalizeApprovedProfileChange = (userId: string, changes?: { field: string; newValue: any }[]) => {
    if (!changes || changes.length === 0) return;
    const nowIso = new Date().toISOString();
    markEntityMutated(userId);

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated: UserProfile = { ...u, updatedAt: nowIso };
        const roleChanged = changes.some((c) => c.field === 'role');
        const hasExplicitTitleChange = changes.some((c) => c.field === 'moderatorTitle');
        for (const ch of changes) {
          (updated as any)[ch.field] = ch.newValue;
        }
        if (roleChanged) {
          updated.isPublicModerator = updated.role !== 'MEMBER';
          const sourceTitle = hasExplicitTitleChange ? updated.moderatorTitle : u.moderatorTitle;
          const preservedCustomTitles = stripRoleBasedTitles(sourceTitle);
          updated.moderatorTitle = preservedCustomTitles || undefined;
        }
        trackSync(updated.id, syncUserToFirestore(updated));
        setCurrentUserState((curr) => {
          if (curr.id !== userId) return curr;
          return updated.status === 'APPROVED' ? updated : GUEST_USER;
        });
        return updated;
      })
    );
    logAudit('PROFILE_CHANGE', 'USER', userId, `প্রোফাইল পরিবর্তনের আবেদন অনুমোদিত ও কার্যকর হয়েছে।`);
  };

  // Reversal / Correction routed through Moderator Panel Approval
  const reverseTransaction = (txId: string, reason: string): boolean => {
    if (!requireMemberAuth('আর্থিক লেনদেন সংশোধন')) return false;
    const target = savings.find((t) => t.id === txId);
    if (!target) return false;

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-rev',
      requestType: 'FINANCIAL_CORRECTION',
      targetRecordId: txId,
      targetMemberId: target.memberId,
      title: `সঞ্চয় লেনদেন রিভার্সাল/বাতিল (${target.memberName})`,
      description: `${target.memberName} (${target.memberId})-এর ${target.savingsMonth} মাসের ৳${target.amount.toLocaleString()} জমার রিভার্সাল প্রস্তাব। কারণ: ${reason}`,
      proposedChanges: [
        { field: 'amount', oldValue: `৳${target.amount.toLocaleString()}`, newValue: `-৳${target.amount.toLocaleString()} (রিভার্সাল)` },
        { field: 'reason', oldValue: target.notes || 'স্বাভাবিক জমা', newValue: reason },
      ],
      payload: {
        txId,
        reason,
        memberId: target.memberId,
        memberName: target.memberName,
        amount: target.amount,
        savingsMonth: target.savingsMonth,
        savingsYear: target.savingsYear,
        paymentMethod: target.paymentMethod,
      },
    });
    if (!created) return false;
    logAudit(
      'FINANCIAL_CORRECTION',
      'SAVINGS_TRANSACTION',
      txId,
      `ট্রানজেকশন ${txId} এর রিভার্সাল প্রস্তাব দাখিল। কারণ: ${reason}`
    );
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে লেনদেন রিভার্সাল সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ লেনদেন রিভার্সাল/সংশোধন প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Request a profile change (from user's own ProfileView or elsewhere)
  const requestProfileChange = (
    userId: string,
    proposedChanges: { field: string; oldValue: any; newValue: any }[]
  ): boolean => {
    if (!requireMemberAuth('প্রোফাইল সম্পাদনা প্রস্তাব দাখিল')) return false;
    const user = users.find((u) => u.id === userId);
    if (!user) return false;
    if (
      checkPendingRequestWarning(
        {
          requestTypes: ['PROFILE_CHANGE', 'MODERATOR_APPOINTMENT', 'MEMBER_REMOVE'],
          targetRecordId: userId,
        },
        `প্রোফাইল সম্পাদনা (${user.name})`
      )
    ) {
      return false;
    }
    if (!proposedChanges || proposedChanges.length === 0) {
      triggerWarning('কোনো পরিবর্তন নেই', 'আপনি প্রোফাইলে কোনো নতুন পরিবর্তন করেননি।');
      return false;
    }

    const sanitizedChanges: { field: string; oldValue: any; newValue: any }[] = [];
    for (const ch of proposedChanges) {
      if (ch.field === 'email' && ch.newValue) {
        const normalizedNextEmail = String(ch.newValue).trim().toLowerCase();
        const emailTaken = users.some(
          (u) =>
            u.id !== '__guest__' &&
            u.id !== userId &&
            (u.email || '').trim().toLowerCase() === normalizedNextEmail
        );
        if (emailTaken) {
          triggerWarning('ইমেইল ইতিমধ্যে ব্যবহৃত', 'এই ইমেইল ঠিকানা অন্য একজন সদস্যের অ্যাকাউন্টে নিবন্ধিত রয়েছে।');
          return false;
        }
        sanitizedChanges.push({ ...ch, newValue: normalizedNextEmail });
      } else if (ch.field === 'password' && ch.newValue) {
        const rawNextPass = String(ch.newValue).trim();
        sanitizedChanges.push({
          field: 'password',
          oldValue: '••••••••',
          newValue: isHashedPassword(rawNextPass) ? rawNextPass : hashPassword(rawNextPass),
        });
        if (!isHashedPassword(rawNextPass)) {
          sanitizedChanges.push({
            field: 'plainPassword',
            oldValue: '',
            newValue: rawNextPass,
          });
        }
      } else {
        sanitizedChanges.push(ch);
      }
    }

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-prof',
      requestType: 'PROFILE_CHANGE',
      duplicateCheckTypes: ['PROFILE_CHANGE', 'MODERATOR_APPOINTMENT', 'MEMBER_REMOVE'],
      targetRecordId: userId,
      targetMemberId: user.memberId,
      title: `প্রোফাইল পরিবর্তন অনুমোদন (${user.name})`,
      description: `${currentUser.name} প্রোফাইল তথ্য হালনাগাদের আবেদন দাখিল করেছেন। অনুমোদনের পর তা স্বয়ংক্রিয়ভাবে অ্যাপে কার্যকর হবে।`,
      proposedChanges: sanitizedChanges,
    });
    if (!created) return false;
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে প্রোফাইল পরিবর্তনটি সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'প্রোফাইল পরিবর্তনের অনুরোধ অনুমোদনের জন্য মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Moderator or user profile/role/status edit — routed to Moderator Panel Approval
  const updateUserProfile = (userId: string, partial: Partial<UserProfile>): boolean => {
    if (!requireMemberAuth('প্রোফাইল সম্পাদনা')) return false;
    if (userId === '__guest__') return false;
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return false;

    if (
      checkPendingRequestWarning(
        {
          requestTypes: ['PROFILE_CHANGE', 'MODERATOR_APPOINTMENT', 'MEMBER_REMOVE'],
          targetRecordId: userId,
        },
        `সদস্য তথ্য পরিবর্তন (${targetUser.name})`
      )
    ) {
      return false;
    }

    const safePartial: Partial<UserProfile> = { ...partial };
    if (currentUser.role !== 'APP_MODERATOR' && currentUser.role !== 'MODERATOR') {
      delete safePartial.role;
      delete safePartial.status;
    } else if (
      currentUser.role !== 'APP_MODERATOR' &&
      (safePartial.role === 'APP_MODERATOR' || targetUser.role === 'APP_MODERATOR')
    ) {
      delete safePartial.role;
    }
    if (safePartial.role && safePartial.role !== targetUser.role) {
      const cleanedCustom = stripRoleBasedTitles(
        safePartial.moderatorTitle !== undefined ? safePartial.moderatorTitle : targetUser.moderatorTitle
      );
      safePartial.moderatorTitle = cleanedCustom || '';
    }
    if (safePartial.email) {
      const normalizedNextEmail = safePartial.email.trim().toLowerCase();
      const emailTaken = users.some(
        (u) =>
          u.id !== '__guest__' &&
          u.id !== userId &&
          (u.email || '').trim().toLowerCase() === normalizedNextEmail
      );
      if (emailTaken) {
        triggerWarning('ইমেইল ইতিমধ্যে ব্যবহৃত', 'এই ইমেইল ঠিকানা অন্য একজন সদস্যের অ্যাকাউন্টে নিবন্ধিত রয়েছে।');
        return false;
      }
      safePartial.email = normalizedNextEmail;
    }
    if (safePartial.password) {
      const rawNextPass = String(safePartial.password).trim();
      if (!isHashedPassword(rawNextPass)) {
        safePartial.plainPassword = rawNextPass;
      }
      safePartial.password = hashPassword(rawNextPass);
    }

    const proposedChanges: { field: string; oldValue: any; newValue: any }[] = [];
    (Object.keys(safePartial) as Array<keyof UserProfile>).forEach((field) => {
      const nextVal = safePartial[field];
      const prevVal = targetUser[field];
      if (nextVal !== undefined && nextVal !== prevVal) {
        proposedChanges.push({
          field: String(field),
          oldValue: field === 'password' || field === 'plainPassword' ? '••••••••' : prevVal ?? '',
          newValue: nextVal,
        });
      }
    });

    if (proposedChanges.length === 0) {
      triggerWarning('কোনো পরিবর্তন নেই', 'তথ্যে কোনো পরিবর্তন সনাক্ত করা যায়নি।');
      return false;
    }

    const isRoleOrTitleEdit = proposedChanges.some(
      (c) => c.field === 'role' || c.field === 'moderatorTitle'
    );

    const created = enqueueApprovalRequest({
      idPrefix: isRoleOrTitleEdit ? 'appr-role' : 'appr-prof',
      requestType: isRoleOrTitleEdit ? 'MODERATOR_APPOINTMENT' : 'PROFILE_CHANGE',
      duplicateCheckTypes: ['PROFILE_CHANGE', 'MODERATOR_APPOINTMENT', 'MEMBER_REMOVE'],
      targetRecordId: userId,
      targetMemberId: targetUser.memberId,
      title: isRoleOrTitleEdit
        ? `সদস্যের রোল/পদবী পরিবর্তন (${targetUser.name})`
        : `সদস্য প্রোফাইল হালনাগাদ (${targetUser.name})`,
      description: `${currentUser.name} সদস্য "${targetUser.name}" (${targetUser.memberId})-এর তথ্য/স্ট্যাটাস পরিবর্তনের প্রস্তাব করেছেন।`,
      proposedChanges,
    });
    if (!created) return false;
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে পরিবর্তনটি সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ পরিবর্তনের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  const getReceiptForTransaction = (txId: string) => {
    return receipts.find((r) => r.transactionId === txId);
  };

  // Chat methods
  const sendChatMessage = (
    channel: 'GENERAL' | 'MODERATOR_ONLY',
    text: string,
    imageUrl?: string,
    replyTo?: { id: string; text: string; senderName: string }
  ) => {
    if (!requireMemberAuth('চ্যাটে বার্তা প্রেরণ')) return;
    const nowIso = new Date().toISOString();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      channel,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatarUrl,
      text,
      timestamp: nowIso,
      updatedAt: nowIso,
      imageUrl,
      replyToId: replyTo?.id,
      replyToText: replyTo?.text,
      replyToSender: replyTo?.senderName,
    };
    markEntityMutated(newMsg.id);
    setChatMessages((prev) => [...prev, newMsg]);
    setSeenChatIds((prev) => [...prev, newMsg.id]);
    trackSync(newMsg.id, syncChatMessageToFirestore(newMsg));
  };

  const deleteChatMessage = (messageId: string) => {
    if (!requireMemberAuth('বার্তা মুছে ফেলা')) return;
    const nowIso = new Date().toISOString();
    markEntityMutated(messageId);
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const deleted = {
          ...msg,
          isDeleted: true,
          text: 'ব্যবহারকারী বার্তাটি ডিলিট করেছেন',
          updatedAt: nowIso,
        };
        trackSync(messageId, syncChatMessageToFirestore(deleted));
        return deleted;
      })
    );
  };

  const toggleMessageReaction = (messageId: string, emoji: string) => {
    if (!requireMemberAuth('বার্তায় রিঅ্যাকশন প্রদান')) return;
    const nowIso = new Date().toISOString();
    markEntityMutated(messageId);
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = { ...(msg.reactions || {}) };
        const userList = reactions[emoji] || [];

        if (userList.includes(currentUser.id)) {
          reactions[emoji] = userList.filter((id) => id !== currentUser.id);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...userList, currentUser.id];
        }
        const updated = { ...msg, reactions, updatedAt: nowIso };
        trackSync(messageId, syncChatMessageToFirestore(updated));
        return updated;
      })
    );
  };

  const votePoll = (pollId: string, optionId: string) => {
    if (!requireMemberAuth('জরিপে ভোট প্রদান')) return;
    markEntityMutated(pollId);
    const nowIso = new Date().toISOString();
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const updated = {
          ...poll,
          updatedAt: nowIso,
          options: (poll.options || []).map((opt) => {
            const votes = opt.votes || [];
            const hasVoted = votes.includes(currentUser.id);
            if (opt.id === optionId) {
              return { ...opt, votes: hasVoted ? votes : [...votes, currentUser.id] };
            } else {
              return { ...opt, votes: votes.filter((id) => id !== currentUser.id) };
            }
          }),
        } as ChatPoll;
        trackSync(pollId, syncPollToFirestore(updated));
        return updated;
      })
    );
  };

  const createPoll = (channel: 'GENERAL' | 'MODERATOR_ONLY', question: string, optionTexts: string[]) => {
    if (!requireMemberAuth('জরিপ তৈরি')) return;
    const nowIso = new Date().toISOString();
    const newPoll = {
      id: `poll-${Date.now()}`,
      channel,
      question,
      creatorName: currentUser.name,
      options: optionTexts.map((txt, idx) => ({ id: `opt-${idx + 1}`, text: txt, votes: [] })),
      createdAt: nowIso,
      updatedAt: nowIso,
    } as ChatPoll;
    markEntityMutated(newPoll.id);
    setPolls((prev) => [newPoll, ...prev]);
    trackSync(newPoll.id, syncPollToFirestore(newPoll));
    triggerSuccess('নতুন জরিপ প্রকাশ করা হয়েছে!');
  };

  const deletePoll = (pollId: string) => {
    if (!requireMemberAuth('জরিপ মুছে ফেলা')) return;
    markEntityDeleted(pollId);
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
    deletePollFromFirestore(pollId);
    triggerSuccess('জরিপটি সফলভাবে মুছে ফেলা হয়েছে!');
  };

  const updatePollOption = (pollId: string, optionId: string, text: string) => {
    if (!requireMemberAuth('জরিপ সম্পাদনা')) return;
    markEntityMutated(pollId);
    const nowIso = new Date().toISOString();
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const updated = {
          ...poll,
          updatedAt: nowIso,
          options: poll.options.map((opt) => (opt.id === optionId ? { ...opt, text } : opt)),
        } as ChatPoll;
        trackSync(pollId, syncPollToFirestore(updated));
        return updated;
      })
    );
    triggerSuccess('জরিপের অপশন টেক্সট আপডেট করা হয়েছে!');
  };

  const updatePollQuestion = (pollId: string, question: string) => {
    if (!requireMemberAuth('জরিপ সম্পাদনা')) return;
    markEntityMutated(pollId);
    const nowIso = new Date().toISOString();
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const updated = { ...poll, question, updatedAt: nowIso } as ChatPoll;
        trackSync(pollId, syncPollToFirestore(updated));
        return updated;
      })
    );
    triggerSuccess('জরিপের প্রশ্ন আপডেট করা হয়েছে!');
  };

  // Notices — routed to Moderator Panel Approval
  const addNotice = (notice: Omit<NoticeItem, 'id' | 'createdAt' | 'authorName' | 'authorRole'>): boolean => {
    if (!requireMemberAuth('নতুন নোটিশ প্রকাশ')) return false;
    const authorName = currentUser?.name || 'বেসিস ফাউন্ডেশন প্রশাসন';
    const authorRole = currentUser?.role || 'APP_MODERATOR';
    const newNotice: NoticeItem = {
      ...notice,
      id: `notice-${Date.now()}`,
      authorName,
      authorRole,
      createdAt: new Date().toISOString(),
    };

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-notice-add',
      requestType: 'NOTICE_ADD',
      targetRecordId: newNotice.id,
      sourceKey: `notice-add-${newNotice.title.trim().toLowerCase()}`,
      title: `নতুন নোটিশ প্রকাশ অনুমোদন: "${newNotice.title}"`,
      description: `${currentUser.name} নতুন নোটিশ "${newNotice.title}" প্রকাশের প্রস্তাব দাখিল করেছেন। অনুমোদনের পর এটি সকল সদস্যের জন্য লাইভ হবে।`,
      proposedChanges: [
        { field: 'title', oldValue: 'নতুন বিজ্ঞপ্তি', newValue: newNotice.title },
        { field: 'priority', oldValue: '-', newValue: newNotice.priority },
        { field: 'content', oldValue: '-', newValue: newNotice.content },
      ],
      payload: { newNotice },
    });
    if (!created) return false;
    logAudit('CONFIG_UPDATED', 'NOTICE', newNotice.id, `নতুন নোটিশ প্রকাশের প্রস্তাব দাখিল: "${notice.title}"`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে নতুন নোটিশটি সাথে সাথে লাইভ প্রকাশিত হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ নতুন নোটিশ মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Propose Notice Edit by ANY Moderator — goes live ONLY after Moderator Panel Approval
  const proposeNoticeEdit = (
    noticeId: string,
    updates: Partial<Pick<NoticeItem, 'title' | 'content' | 'priority' | 'imageUrl' | 'isPinned' | 'showInTicker'>>
  ): boolean => {
    if (!requireMemberAuth('নোটিশ সম্পাদনা')) return false;
    if (currentUser.role !== 'MODERATOR' && currentUser.role !== 'APP_MODERATOR') {
      triggerWarning('অনুমতি সীমাবদ্ধ', 'শুধুমাত্র মডারেটর প্যানেলের সদস্যগণ নোটিশ সম্পাদনা করতে পারবেন।');
      return false;
    }

    const existing = notices.find((n) => n.id === noticeId);
    if (!existing) return false;

    if (
      checkPendingRequestWarning(
        { requestTypes: ['NOTICE_EDIT', 'NOTICE_DELETE'], targetRecordId: noticeId },
        `নোটিশ সম্পাদনা (${existing.title})`
      )
    ) {
      return false;
    }

    const proposedChanges: { field: string; oldValue: any; newValue: any }[] = [];
    (Object.keys(updates) as Array<keyof typeof updates>).forEach((field) => {
      const nextVal = updates[field];
      const prevVal = existing[field];
      if (nextVal !== undefined && nextVal !== prevVal) {
        proposedChanges.push({
          field,
          oldValue: prevVal ?? '',
          newValue: nextVal,
        });
      }
    });

    if (proposedChanges.length === 0) {
      triggerWarning('কোনো পরিবর্তন নেই', 'আপনি নোটিশে কোনো পরিবর্তন করেননি।');
      return false;
    }

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-notice',
      requestType: 'NOTICE_EDIT',
      duplicateCheckTypes: ['NOTICE_EDIT', 'NOTICE_DELETE'],
      targetRecordId: noticeId,
      title: `নোটিশ সম্পাদনা অনুমোদন: "${updates.title || existing.title}"`,
      description: `${currentUser.name} নোটিশ "${existing.title}" সম্পাদনার প্রস্তাব দাখিল করেছেন। মডারেটর প্যানেলের অনুমোদনের পর এটি লাইভ হবে।`,
      proposedChanges,
    });
    if (!created) return false;
    logAudit('CONFIG_UPDATED', 'NOTICE', noticeId, `নোটিশ "${existing.title}" সম্পাদনার অনুমোদন প্রস্তাব দাখিল করা হয়েছে।`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে নোটিশ সম্পাদনা সাথে সাথে লাইভ হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ নোটিশ সম্পাদনার প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  const updateNotice = (noticeId: string, partial: Partial<NoticeItem>): boolean => {
    return proposeNoticeEdit(noticeId, partial);
  };

  const deleteNotice = (noticeId: string): boolean => {
    if (!requireMemberAuth('নোটিশ মুছে ফেলা')) return false;
    const existing = notices.find((n) => n.id === noticeId);
    if (!existing) return false;

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-notice-del',
      requestType: 'NOTICE_DELETE',
      duplicateCheckTypes: ['NOTICE_EDIT', 'NOTICE_DELETE'],
      targetRecordId: noticeId,
      title: `নোটিশ বাতিল/মুছে ফেলার অনুমোদন: "${existing.title}"`,
      description: `${currentUser.name} নোটিশ "${existing.title}" মুছে ফেলার প্রস্তাব দাখিল করেছেন।`,
      proposedChanges: [
        { field: 'title', oldValue: existing.title, newValue: 'নোটিশ মুছে ফেলা হবে' },
      ],
    });
    if (!created) return false;
    logAudit('CONFIG_UPDATED', 'NOTICE', noticeId, `নোটিশ "${existing.title}" মুছে ফেলার প্রস্তাব দাখিল।`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে নোটিশটি সাথে সাথে মুছে ফেলা হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ নোটিশ মুছে ফেলার প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Complaints
  const submitComplaint = (title: string, description: string) => {
    if (!requireMemberAuth('অভিযোগ বা পরামর্শ দাখিল')) return;
    const nowIso = new Date().toISOString();
    const newComp = {
      id: `comp-${Date.now()}`,
      submitterId: currentUser.id,
      submitterName: currentUser.name,
      title,
      description,
      status: 'SUBMITTED',
      createdAt: nowIso,
      updatedAt: nowIso,
    } as ComplaintItem;
    markEntityMutated(newComp.id);
    setComplaints((prev) => [newComp, ...prev]);
    trackSync(newComp.id, syncComplaintToFirestore(newComp));
  };

  const updateComplaintStatus = (
    id: string,
    status: ComplaintItem['status'],
    moderatorNotes?: string
  ) => {
    if (!requireMemberAuth('অভিযোগের স্ট্যাটাস পরিবর্তন')) return;
    markEntityMutated(id);
    const nowIso = new Date().toISOString();
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = {
          ...c,
          status,
          assignedModeratorName: currentUser.name,
          moderatorNotes: moderatorNotes || c.moderatorNotes,
          updatedAt: nowIso,
        } as ComplaintItem;
        trackSync(id, syncComplaintToFirestore(updated));
        return updated;
      })
    );
  };

  // Feature Requests
  const submitFeatureRequest = (title: string, description: string) => {
    if (!requireMemberAuth('নতুন ফিচার প্রস্তাব দাখিল')) return;
    const nowIso = new Date().toISOString();
    const newReq = {
      id: `feat-${Date.now()}`,
      submitterId: currentUser.id,
      submitterName: currentUser.name,
      memberId: currentUser.memberId,
      title,
      description,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: 'PENDING',
      votesCount: 1,
      votedUserIds: [currentUser.id],
    } as FeatureRequestItem;
    markEntityMutated(newReq.id);
    setFeatureRequests((prev) => [newReq, ...prev]);
    trackSync(newReq.id, syncFeatureRequestToFirestore(newReq));
  };

  const voteFeatureRequest = (id: string) => {
    if (!requireMemberAuth('ফিচার প্রস্তাবে ভোট প্রদান')) return;
    markEntityMutated(id);
    const nowIso = new Date().toISOString();
    setFeatureRequests((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const votedIds = item.votedUserIds || [];
        const hasVoted = votedIds.includes(currentUser.id);
        const updatedUserIds = hasVoted
          ? votedIds.filter((uid) => uid !== currentUser.id)
          : [...votedIds, currentUser.id];
        const updated = {
          ...item,
          votedUserIds: updatedUserIds,
          votesCount: updatedUserIds.length,
          updatedAt: nowIso,
        } as FeatureRequestItem;
        trackSync(id, syncFeatureRequestToFirestore(updated));
        return updated;
      })
    );
  };

  // Add a new Foundation Rule (Moderator Only) — routed to Moderator Panel Approval (Deliverable 2)
  const addRule = (title: string, description: string): boolean => {
    if (!requireMemberAuth('নতুন ধারা সংযোজন')) return false;
    if (currentUser.role !== 'APP_MODERATOR' && currentUser.role !== 'MODERATOR') {
      triggerWarning('অনুমতি সীমাবদ্ধ', 'শুধুমাত্র অনুমোদিত মডারেটরগণ গঠনতন্ত্রে নতুন ধারা যুক্ত করতে পারবেন।');
      return false;
    }
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    if (!cleanTitle || !cleanDesc) {
      triggerWarning('অসম্পূর্ণ তথ্য', 'নতুন ধারার শিরোনাম এবং বিস্তারিত বিবরণ প্রদান করুন।');
      return false;
    }

    const pendingRuleAdds = approvals.filter(
      (a) => a.requestType === 'RULE_ADD' && a.status === 'PENDING'
    ).length;
    const nextRuleNum =
      rules.reduce((max, r) => Math.max(max, r.ruleNumber || 0), 0) + pendingRuleAdds + 1;
    const nowIso = new Date().toISOString();

    const newRule: FoundationRule = {
      id: `rule-${Date.now()}`,
      ruleNumber: nextRuleNum,
      title: cleanTitle,
      description: cleanDesc,
      version: 1,
      lastUpdated: nowIso.split('T')[0],
      updatedAt: nowIso,
    };

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-rule-add',
      requestType: 'RULE_ADD',
      targetRecordId: newRule.id,
      sourceKey: `rule-add-${cleanTitle.toLowerCase()}`,
      title: `গঠনতন্ত্রে নতুন ধারা সংযোজন (ধারা ${toBengaliNumerals(nextRuleNum)})`,
      description: `${currentUser.name} গঠনতন্ত্রে নতুন ধারা "${cleanTitle}" সংযোজনের প্রস্তাব দাখিল করেছেন।`,
      proposedChanges: [
        { field: 'title', oldValue: 'নতুন ধারা', newValue: cleanTitle },
        { field: 'description', oldValue: '-', newValue: cleanDesc },
      ],
      payload: { newRule },
    });
    if (!created) return false;
    logAudit('CONFIG_UPDATED', 'FOUNDATION_RULE', newRule.id, `গঠনতন্ত্রে নতুন ধারা "${cleanTitle}" সংযোজনের প্রস্তাব দাখিল।`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে গঠনতন্ত্রের নতুন ধারাটি সাথে সাথে লাইভ যুক্ত হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ নতুন ধারা সংযোজনের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Rules — routed to Moderator Panel Approval
  const updateRule = (ruleId: string, title: string, description: string): boolean => {
    if (!requireMemberAuth('নিয়মাবলী হালনাগাদ')) return false;
    if (currentUser.role !== 'APP_MODERATOR' && currentUser.role !== 'MODERATOR') {
      triggerWarning('অনুমতি সীমাবদ্ধ', 'শুধুমাত্র অনুমোদিত মডারেটরগণ গঠনতন্ত্রের ধারা সম্পাদনা করতে পারবেন।');
      return false;
    }
    const existing = rules.find((r) => r.id === ruleId);
    if (!existing) return false;

    if (
      checkPendingRequestWarning(
        { requestTypes: ['RULE_CHANGE'], targetRecordId: ruleId },
        `গঠনতন্ত্র ধারা ${toBengaliNumerals(existing.ruleNumber)} সংশোধন`
      )
    ) {
      return false;
    }

    const proposedChanges: { field: string; oldValue: any; newValue: any }[] = [];
    if (title !== existing.title) {
      proposedChanges.push({ field: 'title', oldValue: existing.title, newValue: title });
    }
    if (description !== existing.description) {
      proposedChanges.push({ field: 'description', oldValue: existing.description, newValue: description });
    }
    if (proposedChanges.length === 0) {
      triggerWarning('কোনো পরিবর্তন নেই', 'গঠনতন্ত্রের ধারায় কোনো পরিবর্তন করা হয়নি।');
      return false;
    }

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-rule',
      requestType: 'RULE_CHANGE',
      targetRecordId: ruleId,
      title: `গঠনতন্ত্র ধারা ${toBengaliNumerals(existing.ruleNumber)} সংশোধন অনুমোদন`,
      description: `${currentUser.name} গঠনতন্ত্রের ধারা "${existing.title}" সংশোধনের প্রস্তাব দাখিল করেছেন।`,
      proposedChanges,
      payload: { title, description },
    });
    if (!created) return false;
    logAudit('CONFIG_UPDATED', 'FOUNDATION_RULE', ruleId, `নিয়মাবলী নং ${ruleId} সংশোধনের প্রস্তাব দাখিল করা হয়েছে।`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে গঠনতন্ত্র সংশোধনটি সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ গঠনতন্ত্র সংশোধনের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Configuration update (direct internal/UI sync with nested object preservation)
  const updateConfig = (newConfig: Partial<AppConfiguration>) => {
    const nowIso = new Date().toISOString();
    markConfigMutated();
    if (isCustomGoogleSheetUrl(newConfig.googleSheetsUrl)) {
      persistCustomGoogleSheetUrl(newConfig.googleSheetsUrl);
    }
    const prev = configRef.current;
    const resolvedSheetUrl = isCustomGoogleSheetUrl(newConfig.googleSheetsUrl)
      ? newConfig.googleSheetsUrl
      : newConfig.googleSheetsUrl && !isCustomGoogleSheetUrl(prev.googleSheetsUrl)
      ? newConfig.googleSheetsUrl
      : prev.googleSheetsUrl || getSavedCustomGoogleSheetUrl();
    const merged: AppConfiguration = {
      ...prev,
      ...newConfig,
      googleSheetsUrl: resolvedSheetUrl,
      bankDetails: newConfig.bankDetails
        ? { ...prev.bankDetails, ...newConfig.bankDetails }
        : prev.bankDetails,
      aboutUsContent: newConfig.aboutUsContent
        ? { ...(prev.aboutUsContent || {}), ...newConfig.aboutUsContent }
        : prev.aboutUsContent,
      customTexts: newConfig.customTexts
        ? { ...(prev.customTexts || {}), ...newConfig.customTexts }
        : prev.customTexts,
      customTabTitles:
        newConfig.customTabTitles !== undefined
          ? Object.keys(newConfig.customTabTitles).length === 0
            ? {}
            : { ...(prev.customTabTitles || {}), ...newConfig.customTabTitles }
          : prev.customTabTitles,
      overdueReminderDetails:
        newConfig.overdueReminderDetails !== undefined
          ? newConfig.overdueReminderDetails
          : prev.overdueReminderDetails,
      navTabsOrder: normalizeNavTabsOrder(newConfig.navTabsOrder || prev.navTabsOrder),
      updatedAt: nowIso,
    };
    configRef.current = merged;
    setConfig(merged);
    trackConfigSync(syncConfigToFirestore(merged));
    logAudit('CONFIG_UPDATED', 'SYSTEM_CONFIG', 'app-config', 'সিস্টেম কনফিগারেশন ও ব্র্যান্ডিং আপডেট করা হয়েছে।');
  };

  // Propose Bank / Config / Joint Holder change routed to Moderator Panel Approval
  const proposeBankOrConfigChange = (
    title: string,
    description: string,
    configPatch: Partial<AppConfiguration>,
    proposedChanges?: { field: string; oldValue: any; newValue: any }[]
  ): boolean => {
    if (!requireMemberAuth(title)) return false;

    const patchSourceKey =
      configPatch.googleSheetsUrl !== undefined
        ? 'config-googleSheetsUrl'
        : configPatch.jointBankAccountHolders !== undefined
        ? 'config-jointBankHolders'
        : configPatch.bankDetails !== undefined
        ? 'config-bankDetails'
        : configPatch.aboutUsContent !== undefined
        ? 'config-aboutUsContent'
        : configPatch.defaultMonthlyAmount !== undefined || configPatch.monthlyDueDay !== undefined
        ? 'config-monthlyRules'
        : configPatch.foundationName !== undefined || configPatch.logoUrl !== undefined
        ? 'config-branding'
        : `config-${Object.keys(configPatch).sort().join('-')}`;

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-cfg',
      requestType: 'BANK_CONFIG_CHANGE',
      targetRecordId: 'app-config',
      sourceKey: patchSourceKey,
      title,
      description,
      proposedChanges,
      payload: { configPatch },
    });
    if (!created) return false;
    logAudit('CONFIG_UPDATED', 'SYSTEM_CONFIG', 'app-config', `কনফিগারেশন পরিবর্তনের প্রস্তাব: ${title}`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে পরিবর্তনটি সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ পরিবর্তনের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Publish App Release
  const publishAppRelease = (release: Omit<AppRelease, 'id'>) => {
    if (!requireMemberAuth('অ্যাপ রিলিজ প্রকাশ')) return;
    const newRelease: AppRelease = {
      ...release,
      id: `rel-${Date.now()}`,
    };
    setReleases((prev) => [newRelease, ...prev]);
    logAudit(
      'APK_PUBLISHED',
      'APP_RELEASE',
      newRelease.versionName,
      `নতুন অ্যাপ সংস্করণ ${newRelease.versionName} (Build ${newRelease.versionCode}) প্রকাশ করা হয়েছে।`
    );
  };

  // Backup export
  const exportBackupData = () => {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.email,
      foundation: config.foundationName,
      data: {
        config,
        users: users.map((u) =>
          u.password && u.password !== '123456' && !isHashedPassword(u.password)
            ? { ...u, password: hashPassword(u.password) }
            : u
        ),
        savings,
        approvals,
        receipts,
        notices,
        rules,
        complaints,
        featureRequests,
        auditLogs,
        expenses,
        executiveMembers,
      },
    };
    logAudit('BACKUP_CREATED', 'DATABASE', 'full-export', 'সম্পূর্ণ ডাটাবেজ ব্যাকআপ এক্সপোর্ট করা হয়েছে।');
    return JSON.stringify(backupObj, null, 2);
  };

  // Restore backup
  const restoreFromBackup = (jsonData: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.data || !parsed.data.savings || !parsed.data.users) {
        return { success: false, message: 'অকার্যকর ব্যাকআপ ফাইল: ডাটা স্কিমা সঠিক নয়।' };
      }
      if (parsed.data.config) {
        setConfig({
          ...parsed.data.config,
          navTabsOrder: normalizeNavTabsOrder(parsed.data.config.navTabsOrder),
        });
      }
      setUsers(parsed.data.users);
      setSavings(parsed.data.savings);
      setApprovals(parsed.data.approvals || []);
      setReceipts(parsed.data.receipts || []);
      setNotices(parsed.data.notices || []);
      setRules(parsed.data.rules || []);
      setComplaints(parsed.data.complaints || []);
      setFeatureRequests(parsed.data.featureRequests || []);
      setAuditLogs(parsed.data.auditLogs || []);
      if (parsed.data.expenses) setExpenses(parsed.data.expenses);
      if (parsed.data.executiveMembers) setExecutiveMembers(parsed.data.executiveMembers);

      logAudit('BACKUP_RESTORED', 'DATABASE', 'full-restore', 'ব্যাকআপ থেকে ডাটাবেজ সফলভাবে রিস্টোর করা হয়েছে।');
      return { success: true, message: 'সফলভাবে ডাটা রিস্টোর সম্পন্ন হয়েছে।' };
    } catch (e: any) {
      return { success: false, message: `রিস্টোর ব্যর্থ: ${e?.message || 'ত্রুটি'}` };
    }
  };

  // Trigger success celebration micro-animation
  const triggerSuccess = useCallback(
    (message: string) => {
      setSuccessMessage(message);
      if (soundEnabled && typeof window !== 'undefined' && 'AudioContext' in window) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.25);
        } catch {}
      }
      if (hapticEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch {}
      }
    },
    [soundEnabled, hapticEnabled]
  );

  const closeSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const checkForAppUpdate = useCallback(
    async (manual: boolean = false): Promise<AppRelease | null> => {
      try {
        const cloudRel = await fetchLatestForceUpdateFromFirestore();
        setForceUpdateRelease(cloudRel);
        const isAndroidRuntime =
          IS_NATIVE_APK ||
          (typeof window !== 'undefined' && Boolean(window.AndroidBridge?.getAppVersionCode));
        if (
          cloudRel &&
          cloudRel.isActive !== false &&
          Number(cloudRel.versionCode) > currentAppVersionCode
        ) {
          if (isAndroidRuntime || manual) {
            setActiveUpdateDialog(cloudRel);
          }
          return cloudRel;
        }
        if (manual) {
          triggerSuccess(`আপনার অ্যাপটি সর্বশেষ সংস্করণে (v${currentAppVersionName}) হালনাগাদ রয়েছে।`);
        }
        return cloudRel;
      } catch {
        return null;
      }
    },
    [currentAppVersionCode, currentAppVersionName, triggerSuccess]
  );

  // Startup background version check & live Force Update listener for Native APKs
  useEffect(() => {
    const isAndroidRuntime =
      IS_NATIVE_APK ||
      (typeof window !== 'undefined' && Boolean(window.AndroidBridge?.getAppVersionCode));
    let unsubForceUpdate: (() => void) | undefined;

    fetchLatestForceUpdateFromFirestore().then((cloudRel) => {
      if (cloudRel) {
        setForceUpdateRelease(cloudRel);
        if (
          isAndroidRuntime &&
          cloudRel.isActive !== false &&
          Number(cloudRel.versionCode) > currentAppVersionCode
        ) {
          setActiveUpdateDialog(cloudRel);
        }
      }
    });

    if (isAndroidRuntime) {
      unsubForceUpdate = subscribeForceUpdateListener((cloudRel) => {
        setForceUpdateRelease(cloudRel);
        if (
          cloudRel &&
          cloudRel.isActive !== false &&
          Number(cloudRel.versionCode) > currentAppVersionCode
        ) {
          setActiveUpdateDialog(cloudRel);
        } else if (!cloudRel || cloudRel.isActive === false) {
          setActiveUpdateDialog((prev) => (prev && prev.pushedAt ? null : prev));
        }
      });
    }

    return () => {
      unsubForceUpdate?.();
    };
  }, [currentAppVersionCode]);

  const pushForceUpdateRelease = async (release: Omit<AppRelease, 'id'>): Promise<boolean> => {
    if (isGuestMode || currentUser.role !== 'APP_MODERATOR') {
      triggerWarning('অনুমতি সীমাবদ্ধ', 'শুধুমাত্র অ্যাপ মডারেটর ফোর্স আপডেট পুশ করতে পারবেন।');
      return false;
    }
    const newRelease: AppRelease = {
      ...release,
      id: `rel-${Date.now()}`,
      isActive: true,
      pushedBy: currentUser.name,
      pushedAt: new Date().toISOString(),
    };
    const ok = await syncForceUpdateToFirestore(newRelease);
    setForceUpdateRelease(newRelease);
    setReleases((prev) => [newRelease, ...prev.filter((r) => r.versionCode !== newRelease.versionCode)]);
    logAudit(
      'APK_PUBLISHED',
      'APP_RELEASE',
      newRelease.versionName,
      `অ্যাপ ফোর্স আপডেট পুশ করা হয়েছে: v${newRelease.versionName} (Code ${newRelease.versionCode})`
    );
    if (ok) {
      triggerSuccess(
        `ফোর্স আপডেট v${newRelease.versionName} (Code ${toBengaliNumerals(newRelease.versionCode)}) সফলভাবে ক্লাউডে পুশ করা হয়েছে! পূর্ববর্তী সংস্করণের সকল অ্যাপে আপডেট ডায়ালগ প্রদর্শিত হবে।`
      );
      return true;
    }
    triggerWarning('ফায়ারবেজ সিঙ্ক সতর্কতা', 'লোকালি সেভ হয়েছে, তবে ফায়ারবেজ ক্লাউডে ফোর্স আপডেট পুশ করা যায়নি। ইন্টারনেট সংযোগ যাচাই করুন।');
    return false;
  };

  const disableForceUpdate = async (): Promise<boolean> => {
    if (isGuestMode || currentUser.role !== 'APP_MODERATOR') {
      triggerWarning('অনুমতি সীমাবদ্ধ', 'শুধুমাত্র অ্যাপ মডারেটর ফোর্স আপডেট নিষ্ক্রিয় করতে পারবেন।');
      return false;
    }
    const ok = await syncForceUpdateToFirestore(null);
    setForceUpdateRelease(null);
    setActiveUpdateDialog(null);
    logAudit('APK_PUBLISHED', 'APP_RELEASE', 'FORCE_UPDATE_OFF', 'চলমান ফোর্স আপডেট নিষ্ক্রিয় করা হয়েছে।');
    if (ok) {
      triggerSuccess('ফোর্স আপডেট সফলভাবে নিষ্ক্রিয় করা হয়েছে।');
      return true;
    }
    triggerWarning('ফায়ারবেজ সিঙ্ক সতর্কতা', 'ফায়ারবেজ থেকে ফোর্স আপডেট বন্ধ করা যায়নি।');
    return false;
  };

  // Register New Account — allows moderator-added unintegrated members to register & later integrate in Moderator Panel (Requirement 3)
  const registerNewAccount = (userData: Partial<UserProfile>) => {
    const cleanEmail = (sanitizeRegistrationText(userData.email, 80) || '').trim().toLowerCase();
    const cleanPhone = sanitizeRegistrationText(userData.phone, 20) || '';
    const phoneDigits10 = cleanPhone.replace(/\D/g, '').slice(-10);

    const isSelfRegisteredOrIntegrated = (u: UserProfile) =>
      u.id.startsWith('user-reg-') || Boolean(u.isIntegratedAccount) || u.status === 'PENDING';

    const duplicateEmail =
      cleanEmail &&
      users.some(
        (u) =>
          u.id !== '__guest__' &&
          isSelfRegisteredOrIntegrated(u) &&
          (u.email || '').trim().toLowerCase() === cleanEmail
      );
    if (duplicateEmail) {
      triggerWarning(
        'ইমেইল ইতিমধ্যে নিবন্ধিত',
        'একই ইমেইল ঠিকানা দিয়ে একাধিক অ্যাকাউন্ট নিবন্ধন করা যাবে না।'
      );
      return;
    }

    const duplicatePhone =
      phoneDigits10.length === 10 &&
      users.some(
        (u) =>
          u.id !== '__guest__' &&
          isSelfRegisteredOrIntegrated(u) &&
          (u.phone || '').replace(/\D/g, '').slice(-10) === phoneDigits10
      );
    if (duplicatePhone) {
      triggerWarning(
        'মোবাইল নম্বর ইতিমধ্যে নিবন্ধিত',
        'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি নিবন্ধিত বা পেন্ডিং অ্যাকাউন্ট রয়েছে।'
      );
      return;
    }

    const newId = `user-reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const maxMemberNum = users.reduce((max, u) => {
      const m = /^BF-(\d+)$/i.exec(String(u.memberId || '').trim());
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, users.filter((u) => u.id !== '__guest__').length);

    const rawPass = String((userData as any).password || '123456');
    const explicitPlain = sanitizeRegistrationText((userData as any).plainPassword, 64);
    const resolvedPlainPass = explicitPlain || (!isHashedPassword(rawPass) ? rawPass : undefined);
    const newUser: UserProfile = {
      id: newId,
      memberId: userData.memberId || `BF-${String(maxMemberNum + 1).padStart(3, '0')}`,
      name: sanitizeRegistrationText(userData.name, 80) || 'নতুন সদস্য',
      email: cleanEmail,
      phone: cleanPhone,
      role: 'MEMBER',
      status: 'PENDING',
      isPublicModerator: false,
      gender:
        userData.gender === 'FEMALE' || userData.gender === 'OTHER' ? userData.gender : 'MALE',
      joinDate: new Date().toISOString().split('T')[0],
      avatarUrl: sanitizeRegistrationText(userData.avatarUrl, 500),
      address: sanitizeRegistrationText(userData.address, 120),
      nomineeName: sanitizeRegistrationText(userData.nomineeName, 80),
      nomineeRelation: sanitizeRegistrationText(userData.nomineeRelation, 40),
      nomineePhone: sanitizeRegistrationText(userData.nomineePhone, 20),
      password: hashPassword(rawPass),
      plainPassword: resolvedPlainPass,
    };

    markEntityMutated(newUser.id);
    setUsers((prev) => [...prev, newUser]);
    trackSync(newUser.id, syncUserToFirestore(newUser));

    const newApproval: ApprovalRequest = {
      id: `appr-user-${Date.now()}`,
      requestType: 'NEW_MEMBER',
      targetRecordId: newId,
      requestingUserId: newId,
      requestingUserName: newUser.name,
      requesterMemberId: newUser.memberId,
      targetMemberId: newUser.memberId,
      title: `নতুন সদস্য অ্যাকাউন্ট নিবন্ধন অনুমোদন (${newUser.name})`,
      description: `${newUser.name} (${newUser.phone}) নতুন অ্যাকাউন্ট নিবন্ধনের আবেদন করেছেন।`,
      createdAt: new Date().toISOString(),
      requiredApprovalCount: 1,
      eligibleModeratorsCount: Math.max(1, eligibleModeratorsCount),
      approvalVotes: [],
      rejectionVotes: [],
      status: 'PENDING',
    };
    markEntityMutated(newApproval.id);
    setApprovals((prev) => [newApproval, ...prev]);
    trackSync(newApproval.id, syncApprovalToFirestore(newApproval));

    logAudit('MEMBER_REGISTRATION', 'USER', newId, `${newUser.name} নতুন অ্যাকাউন্ট নিবন্ধনের আবেদন দাখিল করেছেন।`);
    triggerSuccess('অ্যাকাউন্ট নিবন্ধন সফল হয়েছে! মডারেটরের অনুমোদনের অপেক্ষায় রয়েছে।');
  };

  // Add member/moderator from Moderator Panel — routed to Moderator Panel Approval (Requirement 2)
  const addDirectUser = (userData: Partial<UserProfile>): boolean => {
    if (!requireMemberAuth('নতুন সদস্য যুক্তকরণ')) return false;
    if (currentUser.role !== 'APP_MODERATOR' && currentUser.role !== 'MODERATOR') {
      triggerWarning('অনুমতি সীমাবদ্ধ', 'শুধুমাত্র মডারেটরগণ নতুন সদস্য বা মডারেটর যুক্ত করতে পারবেন।');
      return false;
    }

    const cleanName = sanitizeRegistrationText(userData.name, 80);
    const cleanPhone = sanitizeRegistrationText(userData.phone, 20) || '';
    const phoneDigits10 = cleanPhone.replace(/\D/g, '').slice(-10);
    if (!cleanName || phoneDigits10.length < 10) {
      triggerWarning('অসম্পূর্ণ তথ্য', 'সদস্যের পূর্ণ নাম এবং সঠিক মোবাইল নম্বর প্রদান করুন।');
      return false;
    }

    const pendingDirectCount = approvals.filter(
      (a) => a.requestType === 'MEMBER_DIRECT_ADD' && a.status === 'PENDING'
    ).length;

    const maxMemberNum = users.reduce((max, u) => {
      const m = /^BF-(\d+)$/i.exec(String(u.memberId || '').trim());
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, users.filter((u) => u.id !== '__guest__').length) + pendingDirectCount;
    const nextMemberId = userData.memberId || `BF-${String(maxMemberNum + 1).padStart(3, '0')}`;

    const rawEmail = (sanitizeRegistrationText(userData.email, 80) || '').trim().toLowerCase();
    const finalEmail = rawEmail || `${nextMemberId.toLowerCase()}@basisfoundation.org`;

    const duplicatePhone = users.some(
      (u) => u.id !== '__guest__' && (u.phone || '').replace(/\D/g, '').slice(-10) === phoneDigits10
    );
    if (duplicatePhone) {
      triggerWarning('মোবাইল নম্বর ইতিমধ্যে ব্যবহৃত', 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একজন সদস্য নিবন্ধিত রয়েছেন।');
      return false;
    }

    const duplicateEmail = users.some(
      (u) => u.id !== '__guest__' && (u.email || '').trim().toLowerCase() === finalEmail
    );
    if (duplicateEmail) {
      triggerWarning('ইমেইল ইতিমধ্যে ব্যবহৃত', 'একই ইমেইল ঠিকানা দিয়ে একাধিক সদস্য যুক্ত করা যাবে না।');
      return false;
    }

    const canAssignAppMod = currentUser.role === 'APP_MODERATOR';
    const assignedRole: UserRole =
      userData.role === 'APP_MODERATOR' && canAssignAppMod
        ? 'APP_MODERATOR'
        : userData.role === 'MODERATOR'
        ? 'MODERATOR'
        : 'MEMBER';
    const newId = `user-mod-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const rawPass = String(userData.password || '123456');

    const newUser: UserProfile = {
      id: newId,
      memberId: nextMemberId,
      name: cleanName,
      email: finalEmail,
      phone: cleanPhone,
      role: assignedRole,
      status: 'APPROVED',
      isPublicModerator: assignedRole !== 'MEMBER',
      moderatorTitle: sanitizeRegistrationText(userData.moderatorTitle, 60) || undefined,
      gender:
        userData.gender === 'FEMALE' || userData.gender === 'OTHER' ? userData.gender : 'MALE',
      joinDate: new Date().toISOString().split('T')[0],
      avatarUrl: sanitizeRegistrationText(userData.avatarUrl, 500) || undefined,
      address: sanitizeRegistrationText(userData.address, 120) || undefined,
      nomineeName: sanitizeRegistrationText(userData.nomineeName, 80) || undefined,
      nomineeRelation: sanitizeRegistrationText(userData.nomineeRelation, 40) || undefined,
      nomineePhone: sanitizeRegistrationText(userData.nomineePhone, 20) || undefined,
      nidNumber: sanitizeRegistrationText(userData.nidNumber, 30) || undefined,
      password: hashPassword(rawPass),
      plainPassword: !isHashedPassword(rawPass) ? rawPass : undefined,
      isIntegratedAccount: false,
    };

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-add-mem',
      requestType: 'MEMBER_DIRECT_ADD',
      targetRecordId: newId,
      sourceKey: `member-add-${phoneDigits10}`,
      targetMemberId: nextMemberId,
      title: `নতুন সদস্য সংযোজন অনুমোদন (${newUser.name} - ${nextMemberId})`,
      description: `${currentUser.name} নতুন সদস্য "${newUser.name}" (${nextMemberId}, মোবাইল: ${newUser.phone}) সংযোজনের প্রস্তাব দাখিল করেছেন।`,
      proposedChanges: [
        { field: 'name', oldValue: 'নতুন সদস্য', newValue: `${newUser.name} (${nextMemberId})` },
        { field: 'phone', oldValue: '-', newValue: newUser.phone },
        { field: 'role', oldValue: '-', newValue: assignedRole },
      ],
      payload: { newUser },
    });
    if (!created) return false;

    logAudit('MEMBER_REGISTRATION', 'USER', newId, `মডারেটর প্যানেল থেকে ${newUser.name} (${nextMemberId}) সংযোজনের প্রস্তাব দাখিল।`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? `আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে ${newUser.name} (${nextMemberId}) সাথে সাথে লাইভ যুক্ত হয়েছেন!`
        : `আপনার অনুমোদন ভোটসহ ${newUser.name} (${nextMemberId}) সংযোজনের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!`
    );
    return true;
  };

  // Approve User Account
  const approveUserAccount = (userId: string) => {
    if (!requireMemberAuth('অ্যাকাউন্ট অনুমোদন')) return;
    const nowIso = new Date().toISOString();
    markEntityMutated(userId);
    const foundUser = users.find((u) => u.id === userId);
    const approvedUser: UserProfile | undefined = foundUser
      ? { ...foundUser, status: 'APPROVED', updatedAt: nowIso }
      : undefined;

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'APPROVED', updatedAt: nowIso } : u))
    );
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.targetRecordId !== userId) return a;
        markEntityMutated(a.id);
        const updated: ApprovalRequest = {
          ...a,
          status: 'APPROVED',
          finalizedAt: nowIso,
          updatedAt: nowIso,
        };
        trackSync(a.id, syncApprovalToFirestore(updated));
        return updated;
      })
    );
    if (approvedUser) {
      trackSync(approvedUser.id, syncUserToFirestore(approvedUser));
      sendUserNotification(
        approvedUser.memberId,
        'অ্যাকাউন্ট অনুমোদন সফল!',
        'বেসিস ফাউন্ডেশনে আপনার সদস্যপদ অনুমোদিত হয়েছে। এখন আপনি সম্পূর্ণ সুবিধা ব্যবহার করতে পারবেন।',
        'PROFILE_APPROVED',
        'blue'
      );
    }
    logAudit('MEMBER_APPROVAL', 'USER', userId, `ব্যবহারকারী অ্যাকাউন্ট অনুমোদন প্রদান করা হয়েছে।`);
    triggerSuccess('সদস্য অ্যাকাউন্ট সফলভাবে অনুমোদিত হয়েছে!');
  };

  // Integrate newly registered pending account into an existing moderator-added member profile (Requirement 3)
  const integrateAndApproveUserAccount = (pendingUserId: string, targetExistingUserId: string) => {
    if (!requireMemberAuth('সদস্য প্রোফাইল ইন্টিগ্রেশন ও অনুমোদন')) return;
    if (!pendingUserId || !targetExistingUserId || pendingUserId === targetExistingUserId) {
      triggerWarning('সঠিক সদস্য নির্বাচন করুন', 'ইন্টিগ্রেট করার জন্য একটি বৈধ বিদ্যমান সদস্য প্রোফাইল নির্বাচন করুন।');
      return;
    }

    const pendingUser = users.find((u) => u.id === pendingUserId);
    const existingUser = users.find((u) => u.id === targetExistingUserId && u.id !== '__guest__');

    if (!pendingUser || !existingUser) {
      triggerWarning('সদস্য পাওয়া যায়নি', 'নির্বাচিত সদস্য প্রোফাইল খুঁজে পাওয়া যায়নি।');
      return;
    }

    const nowIso = new Date().toISOString();
    const mergedUser: UserProfile = {
      ...existingUser,
      name: existingUser.name || pendingUser.name,
      email: pendingUser.email || existingUser.email,
      phone: pendingUser.phone || existingUser.phone,
      password: pendingUser.password || existingUser.password,
      plainPassword: pendingUser.plainPassword || existingUser.plainPassword,
      gender: pendingUser.gender || existingUser.gender,
      avatarUrl: pendingUser.avatarUrl || existingUser.avatarUrl,
      address: pendingUser.address || existingUser.address,
      nomineeName: pendingUser.nomineeName || existingUser.nomineeName,
      nomineeRelation: pendingUser.nomineeRelation || existingUser.nomineeRelation,
      nomineePhone: pendingUser.nomineePhone || existingUser.nomineePhone,
      nidNumber: pendingUser.nidNumber || existingUser.nidNumber,
      status: 'APPROVED',
      isIntegratedAccount: true,
      updatedAt: nowIso,
    };

    markEntityDeleted(pendingUserId);
    markEntityMutated(targetExistingUserId);

    setUsers((prev) =>
      prev
        .filter((u) => u.id !== pendingUserId)
        .map((u) => (u.id === targetExistingUserId ? mergedUser : u))
    );

    trackSync(mergedUser.id, syncUserToFirestore(mergedUser));
    deleteUserFromFirestore(pendingUserId);

    setApprovals((prev) =>
      prev.map((a) => {
        if (a.targetRecordId !== pendingUserId) return a;
        markEntityMutated(a.id);
        const updated: ApprovalRequest = {
          ...a,
          status: 'APPROVED',
          approvalVotes: Array.from(new Set([...(a.approvalVotes || []), currentUser.id])),
          finalizedAt: nowIso,
          updatedAt: nowIso,
          description: `${a.description} [বিদ্যমান সদস্য ${mergedUser.name} (${mergedUser.memberId})-এর সাথে ইন্টিগ্রেটকৃত]`,
        };
        trackSync(a.id, syncApprovalToFirestore(updated));
        return updated;
      })
    );

    sendUserNotification(
      mergedUser.memberId,
      'অ্যাকাউন্ট ইন্টিগ্রেশন ও অনুমোদন সফল!',
      `আপনার নিবন্ধিত অ্যাকাউন্টটি আপনার বিদ্যমান সদস্য প্রোফাইল (${mergedUser.memberId}) এর সাথে সফলভাবে সংযুক্ত ও অনুমোদিত হয়েছে।`,
      'PROFILE_APPROVED',
      'emerald'
    );

    logAudit(
      'MEMBER_APPROVAL',
      'USER',
      mergedUser.id,
      `নিবন্ধিত অ্যাকাউন্ট (${pendingUser.name}) বিদ্যমান সদস্য ${mergedUser.name} (${mergedUser.memberId}) এর সাথে ইন্টিগ্রেট ও অনুমোদিত হয়েছে।`
    );
    triggerSuccess(
      `${mergedUser.name} (${mergedUser.memberId})-এর বিদ্যমান প্রোফাইলের সাথে নতুন অ্যাকাউন্ট সফলভাবে ইন্টিগ্রেট ও অনুমোদিত হয়েছে!`
    );
  };

  // Reject User Account
  const rejectUserAccount = (userId: string) => {
    if (!requireMemberAuth('অ্যাকাউন্ট প্রত্যাখ্যান')) return;
    const foundUser = users.find((u) => u.id === userId);
    const nowIso = new Date().toISOString();
    markEntityMutated(userId);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const rejected: UserProfile = { ...u, status: 'REJECTED', updatedAt: nowIso };
        trackSync(rejected.id, syncUserToFirestore(rejected));
        return rejected;
      })
    );
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.targetRecordId !== userId) return a;
        markEntityMutated(a.id);
        const updated: ApprovalRequest = {
          ...a,
          status: 'REJECTED',
          finalizedAt: nowIso,
          updatedAt: nowIso,
        };
        trackSync(a.id, syncApprovalToFirestore(updated));
        return updated;
      })
    );
    if (foundUser?.memberId && foundUser.memberId !== 'GUEST') {
      sendUserNotification(
        foundUser.memberId,
        'নিবন্ধন আবেদন প্রত্যাখ্যাত',
        'আপনার নতুন সদস্য অ্যাকাউন্ট নিবন্ধনের আবেদনটি মডারেটর প্যানেলে অনুমোদিত হয়নি।',
        'DEPOSIT_REJECTED',
        'rose'
      );
    }
    triggerSuccess('সদস্য অ্যাকাউন্ট প্রত্যাখ্যান করা হয়েছে।');
  };

  // Update Moderator Designation — routed to Moderator Panel Approval
  const updateUserDesignation = (userId: string, moderatorTitle: string, role?: UserRole): boolean => {
    if (!requireMemberAuth('পদবী পরিবর্তন')) return false;
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return false;

    if (
      checkPendingRequestWarning(
        {
          requestTypes: ['PROFILE_CHANGE', 'MODERATOR_APPOINTMENT', 'MEMBER_REMOVE'],
          targetRecordId: userId,
        },
        `পদবী ও দায়িত্ব হালনাগাদ (${targetUser.name})`
      )
    ) {
      return false;
    }

    const nextRole =
      role && (currentUser.role === 'APP_MODERATOR' || (role !== 'APP_MODERATOR' && targetUser.role !== 'APP_MODERATOR'))
        ? role
        : targetUser.role;
    const nextPublicMod = nextRole !== 'MEMBER';
    const sanitizedTitle =
      nextRole !== targetUser.role
        ? stripRoleBasedTitles(moderatorTitle)
        : stripRoleBasedTitles(moderatorTitle);
    const proposedChanges: { field: string; oldValue: any; newValue: any }[] = [];
    if (sanitizedTitle !== (targetUser.moderatorTitle || '')) {
      proposedChanges.push({
        field: 'moderatorTitle',
        oldValue: targetUser.moderatorTitle || 'সাধারণ সদস্য',
        newValue: sanitizedTitle,
      });
    }
    if (nextRole !== targetUser.role) {
      proposedChanges.push({
        field: 'role',
        oldValue: targetUser.role,
        newValue: nextRole,
      });
      proposedChanges.push({
        field: 'isPublicModerator',
        oldValue: Boolean(targetUser.isPublicModerator),
        newValue: nextPublicMod,
      });
    }

    if (proposedChanges.length === 0) {
      triggerWarning('কোনো পরিবর্তন নেই', 'পদবী বা রোলে কোনো পরিবর্তন করা হয়নি।');
      return false;
    }

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-desig',
      requestType: 'MODERATOR_APPOINTMENT',
      duplicateCheckTypes: ['PROFILE_CHANGE', 'MODERATOR_APPOINTMENT', 'MEMBER_REMOVE'],
      targetRecordId: userId,
      targetMemberId: targetUser.memberId,
      title: `পদবী ও দায়িত্ব হালনাগাদ (${targetUser.name})`,
      description: `${currentUser.name} সদস্য "${targetUser.name}" (${targetUser.memberId})-এর পদবী "${sanitizedTitle || nextRole}" হিসেবে নির্ধারণের প্রস্তাব করেছেন।`,
      proposedChanges,
    });
    if (!created) return false;
    logAudit('PROFILE_CHANGE', 'USER', userId, `মডারেটর পদবী পরিবর্তনের প্রস্তাব: "${sanitizedTitle}"`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে পদবী ও দায়িত্ব পরিবর্তন সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ পদবী ও দায়িত্ব পরিবর্তনের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Remove / Delete User — routed to Moderator Panel Approval
  const removeUser = (userId: string): boolean => {
    if (!requireMemberAuth('সদস্য অপসারণ')) return false;
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return false;

    const created = enqueueApprovalRequest({
      idPrefix: 'appr-rem-user',
      requestType: 'MEMBER_REMOVE',
      duplicateCheckTypes: ['PROFILE_CHANGE', 'MODERATOR_APPOINTMENT', 'MEMBER_REMOVE'],
      targetRecordId: userId,
      targetMemberId: targetUser.memberId,
      title: `সদস্য অপসারণ অনুমোদন (${targetUser.name} - ${targetUser.memberId})`,
      description: `${currentUser.name} সদস্য "${targetUser.name}" (${targetUser.memberId}) স্থায়ীভাবে অপসারণের প্রস্তাব দাখিল করেছেন।`,
      proposedChanges: [
        {
          field: 'member',
          oldValue: `${targetUser.name} (${targetUser.memberId})`,
          newValue: 'স্থায়ীভাবে অপসারণ',
        },
      ],
    });
    if (!created) return false;
    logAudit('PROFILE_CHANGE', 'USER', userId, `সদস্য অপসারণের প্রস্তাব দাখিল করা হয়েছে।`);
    triggerSuccess(
      created.status === 'APPROVED'
        ? 'আপনার অনুমোদন ভোট স্বয়ংক্রিয়ভাবে সাবমিট হয়ে সদস্য অপসারণ সাথে সাথে লাইভ কার্যকর হয়েছে!'
        : 'আপনার অনুমোদন ভোটসহ সদস্য অপসারণের প্রস্তাব মডারেটর প্যানেলে পাঠানো হয়েছে!'
    );
    return true;
  };

  // Send Overdue Reminder with customizable Name, Amount, Month & Deadline (Point 8)
  const sendOverdueReminder = (memberId: string, customPayload?: Partial<OverdueReminderEntry>) => {
    if (!requireMemberAuth('বকেয়া তাগিদ প্রেরণ')) return;
    const targetUser = users.find((u) => u.memberId === memberId);
    const defaultAmount = config.defaultMonthlyAmount || 1500;
    const entry: OverdueReminderEntry = {
      memberId,
      memberName: (customPayload?.memberName || targetUser?.name || 'সম্মানিত সদস্য').trim(),
      amount:
        typeof customPayload?.amount === 'number' && customPayload.amount > 0
          ? customPayload.amount
          : defaultAmount,
      monthKey: customPayload?.monthKey || '2026-10',
      monthLabel: (customPayload?.monthLabel || 'অক্টোবর ২০২৬').trim(),
      deadlineText: (
        customPayload?.deadlineText || `প্রতি মাসের ${toBengaliNumerals(config.monthlyDueDay || 10)}`
      ).trim(),
      sentAt: new Date().toISOString(),
    };

    setLocalOverdueIds((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]));
    updateConfig({
      overdueReminderDetails: {
        ...(config.overdueReminderDetails || {}),
        [memberId]: entry,
      },
    });
    sendUserNotification(
      memberId,
      'অফিসিয়াল বকেয়া সঞ্চয় নোটিশ',
      `সম্মানিত ${entry.memberName}, ${entry.monthLabel} মাসের নির্ধারিত ৳${toBengaliNumerals(entry.amount.toLocaleString('en-IN'))} ফান্ডের টাকা যথাসময়ে জমা দেওয়ার অনুরোধ করা হলো।`,
      'GENERAL',
      'rose'
    );
    triggerSuccess(`${entry.memberName}-কে বকেয়া তাগিদ পপআপ নোটিশ সফলভাবে পাঠানো হয়েছে!`);
  };

  // Direct 1-on-1 Private Messaging
  const sendPrivateMessage = (receiverId: string, text: string) => {
    if (!requireMemberAuth('ব্যক্তিগত বার্তা প্রেরণ')) return;
    const receiver = users.find((u) => u.id === receiverId);
    if (!receiver) return;

    const convId = [currentUser.id, receiverId].sort().join('_');
    const nowIso = new Date().toISOString();
    const newMsg: PrivateMessage = {
      id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: convId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId,
      receiverName: receiver.name,
      text,
      timestamp: nowIso,
      updatedAt: nowIso,
      isRead: false,
    };

    markEntityMutated(newMsg.id);
    setPrivateMessages((prev) => [...prev, newMsg]);
    setSeenChatIds((prev) => [...prev, newMsg.id]);
    trackSync(newMsg.id, syncPrivateMessageToFirestore(newMsg));
  };

  const deletePrivateMessage = (messageId: string) => {
    if (!requireMemberAuth('বার্তা মুছে ফেলা')) return;
    const nowIso = new Date().toISOString();
    markEntityMutated(messageId);
    setPrivateMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const deleted: PrivateMessage = {
          ...msg,
          isDeleted: true,
          text: 'ব্যবহারকারী বার্তাটি ডিলিট করেছেন',
          updatedAt: nowIso,
        };
        trackSync(messageId, syncPrivateMessageToFirestore(deleted));
        return deleted;
      })
    );
  };

  // Forward Message from Moderator-Only to General Chat
  const forwardChatMessage = (messageId: string) => {
    if (!requireMemberAuth('বার্তা ফরোয়ার্ড')) return;
    const targetMsg = chatMessages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    const forwardedText = `📢 [মডারেটর চ্যানেল থেকে ফরোয়ার্ডকৃত]\n${targetMsg.text}\n(মূল প্রেরক: ${targetMsg.senderName})`;
    sendChatMessage('GENERAL', forwardedText);
    triggerSuccess('বার্তাটি সাধারণ গ্রুপ চ্যাটে ফরোয়ার্ড করা হয়েছে!');
  };

  // Pull-to-Refresh / Manual Sync (Point 14: Moderator-only + Online-only)
  const refreshAllData = async () => {
    await triggerCloudSync();
  };

  // Network Connectivity Listener (Point 14)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setCloudSyncStatus('SYNCED');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setCloudSyncStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const resetToInitialDemo = () => {
    // Keep currently logged-in moderator if active, otherwise preserve single clean master admin
    const masterMod: UserProfile =
      currentUser && currentUser.id !== '__guest__' && (currentUser.role === 'APP_MODERATOR' || currentUser.role === 'MODERATOR')
        ? currentUser
        : {
            id: 'user-app-mod-1',
            memberId: 'BF-001',
            name: 'মাহমুদুল সিয়াম',
            email: 'contact.mahmudulhasan.bd@gmail.com',
            phone: '+8801712345678',
            role: 'APP_MODERATOR',
            status: 'APPROVED',
            joinDate: '2025-01-01',
            gender: 'MALE',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            address: 'ঢাকা, বাংলাদেশ',
            isPublicModerator: true,
            moderatorTitle: 'প্রধান প্রতিষ্ঠাতা ও অ্যাপ মডারেটর',
            assignedDuties: 'অ্যাপ ও সামগ্রিক প্রশাসনিক পরিচালনা',
          };

    const preservedSheetUrl =
      (isCustomGoogleSheetUrl(config.googleSheetsUrl) ? config.googleSheetsUrl : getSavedCustomGoogleSheetUrl()) ||
      INITIAL_CONFIG.googleSheetsUrl;
    const resetConfig: AppConfiguration = {
      ...INITIAL_CONFIG,
      googleSheetsUrl: preservedSheetUrl,
    };
    setConfig(resetConfig);

    // Remove all demo members/persons, leaving only the primary administrator with no transactions
    setUsers([masterMod]);
    setCurrentUserState(masterMod);

    // Completely wipe all financial transactions, expenses, receipts, approvals and calculations to ZERO
    setSavings([]);
    setExpenses([]);
    setReceipts([]);
    setApprovals([]);
    setComplaints([]);
    setFeatureRequests([]);
    setChatMessages([]);
    setPrivateMessages([]);
    setPolls([]);
    setLocalOverdueIds([]);
    setUserNotifications([]);
    setAuditLogs([]);
    setLocalMutationMeta({
      configUpdatedAt: Date.now(),
      configPendingSync: false,
      entityUpdatedAt: {},
      deletedIds: [],
      pendingSyncIds: [],
    });

    try {
      const emptySaved = {
        config: resetConfig,
        users: [masterMod],
        currentUserId: masterMod.id,
        savings: [],
        expenses: [],
        receipts: [],
        approvals: [],
        complaints: [],
        featureRequests: [],
        chatMessages: [],
        privateMessages: [],
        polls: [],
        releases: INITIAL_RELEASES,
        auditLogs: [],
        userNotifications: [],
        overdueReminders: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptySaved));
    } catch (e) {
      console.error('Failed to save reset state to localStorage', e);
    }

    try {
      localStorage.removeItem('basis_saved_login_v1');
      localStorage.removeItem('basis_auth_security_v1');
    } catch {}

    triggerSuccess('সকল ডেমো ডাটা ও ডেমো সদস্য সফলভাবে রিমুভ করা হয়েছে। সমস্ত আর্থিক হিসাব শূন্য (০) করা হয়েছে।');
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        themeMode,
        setTheme,
        setThemeMode,
        isOnline,
        setIsOnline,
        isDemoMode,
        setIsDemoMode,
        showExitDialog,
        setShowExitDialog,
        soundEnabled,
        setSoundEnabled,
        hapticEnabled,
        setHapticEnabled,
        pushNotificationsEnabled,
        togglePushNotifications,
        storageAccessEnabled,
        toggleStorageAccess,
        warningDialog,
        triggerWarning,
        triggerGuestWarning,
        closeWarning,
        requireMemberAuth,
        successMessage,
        triggerSuccess,
        closeSuccess,
        currentUser,
        isGuestMode,
        setCurrentUser,
        logoutUser,
        maskPhoneForPrivacy,
        users,
        updateUserProfile,
        requestProfileChange,
        registerNewAccount,
        addDirectUser,
        approveUserAccount,
        integrateAndApproveUserAccount,
        rejectUserAccount,
        updateUserDesignation,
        removeUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authTransition,
        triggerAuthTransition,
        clearAuthTransition,
        overdueReminders,
        overdueReminderMap,
        sendOverdueReminder,
        privateMessages,
        sendPrivateMessage,
        deletePrivateMessage,
        activePrivateChatUser,
        setActivePrivateChatUser,
        savings,
        createSavingsEntry,
        reverseTransaction,
        approvals,
        findPendingApprovalForSource,
        checkPendingRequestWarning,
        voteOnApproval,
        receipts,
        getReceiptForTransaction,
        activePrintReceipt,
        setActivePrintReceipt,
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
        updatePollQuestion,
        seenChatIds,
        chatUnreadCount,
        getChannelUnreadCount,
        getPersonalUnreadCount,
        markChannelSeen,
        markPersonalChatSeen,
        markChatSeen,
        unreadNoticeCount,
        hasUnreadNotices,
        markNoticesSeen,
        notices,
        addNotice,
        proposeNoticeEdit,
        updateNotice,
        deleteNotice,
        complaints,
        submitComplaint,
        updateComplaintStatus,
        featureRequests,
        submitFeatureRequest,
        voteFeatureRequest,
        rules,
        addRule,
        updateRule,
        config,
        updateConfig,
        proposeBankOrConfigChange,
        auditLogs,
        deleteAuditLogs,
        releases,
        publishAppRelease,
        forceUpdateRelease,
        currentAppVersionCode,
        currentAppVersionName,
        pushForceUpdateRelease,
        disableForceUpdate,
        checkForAppUpdate,
        activeUpdateDialog,
        setActiveUpdateDialog,
        refreshAllData,
        isRefreshing,
        exportBackupData,
        restoreFromBackup,
        resetToInitialDemo,
        expenses,
        addExpense,
        removeExpense,
        totalExpenses,
        netReserveBalance,
        isSearchModalOpen,
        setIsSearchModalOpen,
        activeCall,
        startCall,
        endCall,
        executiveMembers,
        addExecutiveMember,
        removeExecutiveMember,
        updateExecutiveMember,
        onlineUserIds,
        cloudSyncStatus,
        lastSyncTimestamp,
        triggerCloudSync,
        userNotifications,
        sendUserNotification,
        markNotificationRead,
        markAllNotificationsRead,
        pendingDepositModalOpen,
        setPendingDepositModalOpen,
        checkUserHasPendingDeposit,
        financialTotals,
        growthRate,
        monthlyAggregates,
        eligibleModeratorsCount,
        unreadCount,
        uniqueDailyVisitors,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
