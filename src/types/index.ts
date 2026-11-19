/**
 * BASIS FOUNDATION - Type Definitions
 */

export type UserRole = 'APP_MODERATOR' | 'MODERATOR' | 'MEMBER';

export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'DISABLED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'ROCKET' | 'BKASH' | 'NAGAD' | 'BANK' | 'BANK_TRANSFER' | 'OTHER';

export interface UserProfile {
  id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  avatarUrl?: string;
  address?: string;
  joinDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  nomineeName?: string;
  nomineeRelation?: string;
  nomineePhone?: string;
  nidNumber?: string;
  signatureUrl?: string;
  signatureType?: 'NAME' | 'IMAGE';
  signatureImageUrl?: string;
  nidFrontImageUrl?: string;
  nidBackImageUrl?: string;
  customFields?: Record<string, string>;
  isPublicModerator?: boolean;
  moderatorTitle?: string;
  assignedDuties?: string;
  password?: string;
  plainPassword?: string;
  isIntegratedAccount?: boolean;
  activeDeviceId?: string;
  activeDeviceLastSeen?: string;
  updatedAt?: string;
}

export interface SavingsTransaction {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  savingsMonth: string; // "YYYY-MM"
  savingsYear: number;
  transactionDate: string; // ISO
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  evidenceUrl?: string;
  entryCreatorId: string;
  entryCreatorName: string;
  status: ApprovalStatus;
  approvingModerators: string[];
  rejectionReason?: string;
  receiptId?: string;
  isCorrection?: boolean;
  originalTransactionId?: string;
  notes?: string;
  updatedAt?: string;
}

export type ApprovalRequestType =
  | 'NEW_MEMBER'
  | 'MEMBER_DIRECT_ADD'
  | 'MEMBER_REMOVE'
  | 'PROFILE_CHANGE'
  | 'SAVINGS_ENTRY'
  | 'FINANCIAL_CORRECTION'
  | 'MODERATOR_APPOINTMENT'
  | 'RULE_ADD'
  | 'RULE_CHANGE'
  | 'NOTICE_ADD'
  | 'NOTICE_EDIT'
  | 'NOTICE_DELETE'
  | 'EXECUTIVE_ADD'
  | 'EXECUTIVE_EDIT'
  | 'EXECUTIVE_DELETE'
  | 'EXPENSE_ADD'
  | 'EXPENSE_DELETE'
  | 'BANK_CONFIG_CHANGE';

export interface ApprovalRequest {
  id: string;
  requestType: ApprovalRequestType;
  targetRecordId: string;
  requestingUserId: string;
  requestingUserName: string;
  requesterMemberId?: string;
  targetMemberId?: string;
  title: string;
  description: string;
  proposedChanges?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  payload?: Record<string, any>;
  createdAt: string;
  requiredApprovalCount: number;
  eligibleModeratorsCount: number;
  approvalVotes: string[]; // moderator userIds
  rejectionVotes: string[]; // moderator userIds
  status: ApprovalStatus;
  finalizedAt?: string;
  updatedAt?: string;
  sourceKey?: string;
}

export interface ElectronicReceipt {
  receiptNumber: string;
  transactionId: string;
  memberId: string;
  memberName: string;
  savingsMonth: string;
  savingsYear: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  transactionRef?: string;
  approvalStatus: ApprovalStatus;
  approvingModeratorNames: string[];
  generatedAt: string;
  verificationHash: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  priority: 'HIGH' | 'NORMAL' | 'URGENT';
  imageUrl?: string;
  isPinned?: boolean;
  showInTicker?: boolean; // Requirement 1: Toggle scrolling announcement for new notice
  updatedAt?: string;
}

export interface ComplaintItem {
  id: string;
  submitterId: string;
  submitterName: string;
  title: string;
  description: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
  assignedModeratorName?: string;
  moderatorNotes?: string;
  attachments?: string[];
}

export interface FeatureRequestItem {
  id: string;
  submitterId: string;
  submitterName: string;
  memberId: string;
  title: string;
  description: string;
  createdAt: string;
  status: 'PENDING' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';
  votesCount: number;
  votedUserIds: string[];
  moderatorResponse?: string;
}

export interface FoundationRule {
  id: string;
  ruleNumber: number;
  title: string;
  description: string;
  lastUpdated: string;
  version: number;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  channel: 'GENERAL' | 'MODERATOR_ONLY';
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  imageUrl?: string;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  isDeleted?: boolean;
  deletedBy?: string;
  updatedAt?: string;
}

export interface ChatPoll {
  id: string;
  channel: 'GENERAL' | 'MODERATOR_ONLY';
  question: string;
  creatorName: string;
  options: {
    id: string;
    text: string;
    votes: string[]; // userIds
  }[];
  createdAt: string;
  isClosed?: boolean;
}

export interface PrivateMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  isDeleted?: boolean;
  deletedBy?: string;
  updatedAt?: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actionType:
    | 'MEMBER_REGISTRATION'
    | 'MEMBER_APPROVAL'
    | 'PROFILE_CHANGE'
    | 'SAVINGS_CREATED'
    | 'SAVINGS_APPROVED'
    | 'SAVINGS_REJECTED'
    | 'FINANCIAL_CORRECTION'
    | 'MODERATOR_APPOINTED'
    | 'CONFIG_UPDATED'
    | 'BACKUP_CREATED'
    | 'BACKUP_RESTORED'
    | 'APK_PUBLISHED'
    | 'EXPENSE_RECORDED'
    | 'EXPENSE_DELETED'
    | 'NOTICE_EDITED';
  targetType: string;
  targetId: string;
  timestamp: string;
  details: string;
  status: 'SUCCESS' | 'FAILURE';
}

export interface FoundationExpense {
  id: string;
  title: string;
  category: 'OFFICE' | 'EVENT' | 'BANK_CHARGE' | 'WELFARE' | 'MISC';
  amount: number;
  expenseDate: string;
  approvedBy: string;
  voucherRef?: string;
  notes?: string;
  updatedAt?: string;
}

export interface BankAccountDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string;
  routingNumber?: string;
  swiftCode?: string;
  qrCodeImageUrl?: string;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  instructions?: string;
}

export interface AppConfiguration {
  foundationName: string;
  foundationSlogan: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  footerText: string;
  developerAttribution: string;
  developerLink: string;
  receiptWatermarkText: string;
  receiptWatermarkImageUrl?: string;
  statementWatermarkText: string;
  statementWatermarkImageUrl?: string;
  customFontUrl?: string;
  customFontFamily?: string;
  scrollingAnnouncement: string;
  latestDepositTicker?: {
    depositorName: string;
    amount: number;
    month: string;
    time: string;
  };
  aboutUsContent?: {
    story: string;
    mission: string;
    vision: string;
    phone: string;
    email: string;
    address: string;
    bankDetails: string;
    badgeText?: string;
    establishedText?: string;
    registrationNo?: string;
    missionTitle?: string;
    missionDesc?: string;
    transparencyTitle?: string;
    transparencyDesc?: string;
    trustTitle?: string;
    trustDesc?: string;
    leadershipTitle?: string;
    leadershipSubtitle?: string;
    bankSectionTitle?: string;
    bankSectionSubtitle?: string;
    contactTitle?: string;
  };
  monthlyDueDay: number; // Day of the month when deposit is due (default 10)
  defaultMonthlyAmount: number; // Standard monthly deposit (e.g. 1000 BDT)
  googleSheetsUrl?: string;
  googleSheetsTitle?: string;

  // Requirement 10 & 13: Header clock, date, and expansion options
  clockPosition?: 'LEFT' | 'CENTER' | 'RIGHT';
  clockFont?: 'FONT_MONO' | 'FONT_SANS';
  dateOrder?: 'TIME_FIRST' | 'DATE_FIRST';
  headerMode?: 'REGULAR' | 'EXTENDED';
  clockScale?: 'SMALL' | 'MEDIUM' | 'LARGE';

  // Requirement 11: Bank Information & Expenses
  bankDetails?: BankAccountDetails;
  dashboardBalanceDisplay?: 'GROSS' | 'NET_AFTER_EXPENSE';

  // Requirement 14 & 16: Tab Ordering & Title Customization
  navTabsOrder?: string[];
  quickServicesOrder?: string[];
  customTabTitles?: Record<string, string>;

  // Requirement 9: Uploaded TTF/WOFF/OTF font
  uploadedFontDataUrl?: string;
  uploadedFontName?: string;

  // Requirement 10 & 11: Moderator signatures and joint bank account holders
  moderatorPanelSignatureImageUrl?: string;
  generalSecretarySignatureImageUrl?: string;
  jointBankAccountHolders?: Array<
    string | { name: string; role: string; memberId: string; phone: string; avatarUrl?: string }
  >; // Array of moderator user names/IDs or structured holder entries
  executiveMembers?: ExecutiveMember[];
  customTexts?: Record<string, string>; // Requirement 12: direct text renames/edits by App Moderator

  // Points 4 & 6: Ticker speed control & Header sizing (+ / - controls)
  tickerSpeed?: 'slow' | 'normal' | 'fast';
  headerDateScale?: number; // percentage (e.g. 100 = 100%, step +/- 10%)
  headerLogoSize?: number;  // pixel size (e.g. 40, step +/- 4px)
  headerTitleScale?: number; // percentage (e.g. 100 = 100%, step +/- 10%)
  uploadedFontsList?: Array<{ name: string; url?: string; dataUrl?: string }>;

  // Customized Overdue Deposit Reminder payloads keyed by memberId (e.g. 'BF-004')
  overdueReminderDetails?: Record<string, OverdueReminderEntry>;
  updatedAt?: string;
}

export interface OverdueReminderEntry {
  memberId: string;
  memberName: string;
  amount: number;
  monthKey: string;
  monthLabel: string;
  deadlineText: string;
  sentAt: string;
}

export interface ExecutiveMember {
  id: string;
  name: string;
  designation: string;
  phone: string;
  avatarUrl?: string;
  responsibilities: string;
  order: number;
  approvedDate?: string;
  updatedAt?: string;
}

export interface AppRelease {
  id: string;
  versionName: string;
  versionCode: number;
  releaseDate: string;
  releaseNotes: string;
  featureList: string[];
  bugFixList: string[];
  isMandatory: boolean;
  isActive?: boolean;
  pushedBy?: string;
  pushedAt?: string;
  minSupportedVersion: string;
  downloadUrl: string;
  fileSizeBytes: number;
  apkSha256: string;
}

export interface UserNotification {
  id: string;
  userId: string; // Target member ID or 'ALL'
  title: string;
  message: string;
  type:
    | 'DEPOSIT_APPROVED'
    | 'DEPOSIT_REJECTED'
    | 'PROFILE_APPROVED'
    | 'NEW_NOTICE'
    | 'GENERAL'
    | 'DEPOSIT_SUBMITTED';
  color: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple';
  createdAt: string;
  read: boolean;
}

export interface AndroidBridgeInterface {
  exitApp?: () => void;
  saveBase64Pdf?: (base64Data: string, fileName: string, mimeType?: string) => boolean | void;
  requestNotificationPermission?: () => boolean | void;
  requestStoragePermission?: () => boolean | void;
  hasNotificationPermission?: () => boolean;
  hasStoragePermission?: () => boolean;
  showNotification?: (title: string, body: string) => void;
  printDocument?: (docTitle: string) => void;
  getAppVersion?: () => string;
  getAppVersionCode?: () => number;
  showToast?: (message: string) => void;
  downloadAndInstallApk?: (url: string, versionName: string) => boolean;
  triggerPendingApkInstall?: () => boolean;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    __handleAndroidBack?: () => boolean;
  }
}

