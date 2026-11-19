/**
 * BASIS FOUNDATION - Pure Business Logic and Financial Calculations
 * Decoupled from UI components for deterministic validation and unit testing.
 */

export type UserRole = 'APP_MODERATOR' | 'MODERATOR' | 'MEMBER';
export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'DISABLED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'ROCKET' | 'BKASH' | 'NAGAD' | 'BANK' | 'BANK_TRANSFER' | 'OTHER';

export interface SavingsTransaction {
  id: string;
  memberId: string;
  memberName: string;
  amount: number; // Stored in whole BDT currency units (or cents/paisa as integers)
  savingsMonth: string; // e.g. "2026-10"
  savingsYear: number;
  transactionDate: string; // ISO string
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  entryCreatorId: string;
  entryCreatorName: string;
  status: ApprovalStatus;
  approvingModerators: string[];
  rejectionReason?: string;
  receiptId?: string;
  isCorrection?: boolean;
  originalTransactionId?: string;
}

/**
 * Calculates the required approvals according to the 2/3rds ceiling rule.
 * Formula: Required approvals = CEILING(eligible moderators * 2 / 3)
 * @param eligibleModeratorsCount Total active eligible moderators
 */
export function calculateRequiredApprovals(eligibleModeratorsCount: number): number {
  if (eligibleModeratorsCount <= 0) return 1;
  return Math.ceil((eligibleModeratorsCount * 2) / 3);
}

/**
 * Checks if a proposed approval vote meets the threshold for finalization.
 */
export function evaluateApprovalState(
  eligibleCount: number,
  approvedVotes: string[],
  rejectedVotes: string[]
): {
  isFinalized: boolean;
  status: ApprovalStatus;
  requiredVotes: number;
  remainingVotes: number;
} {
  const required = calculateRequiredApprovals(eligibleCount);
  const approveCount = approvedVotes.length;
  const rejectCount = rejectedVotes.length;

  if (approveCount >= required) {
    return {
      isFinalized: true,
      status: 'APPROVED',
      requiredVotes: required,
      remainingVotes: 0,
    };
  }

  // Rejection also strictly requires the 2/3 ceiling majority threshold
  if (rejectCount >= required) {
    return {
      isFinalized: true,
      status: 'REJECTED',
      requiredVotes: required,
      remainingVotes: 0,
    };
  }

  return {
    isFinalized: false,
    status: 'PENDING',
    requiredVotes: required,
    remainingVotes: Math.max(0, required - approveCount),
  };
}

/**
 * Calculates financial aggregates strictly considering approved transactions only.
 * Pending transactions are isolated and do NOT inflate approved totals.
 */
export function calculateFinancialTotals(transactions: SavingsTransaction[]): {
  totalApproved: number;
  totalPending: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
} {
  let totalApproved = 0;
  let totalPending = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const tx of transactions) {
    if (tx.status === 'APPROVED') {
      totalApproved += Math.round(tx.amount);
      approvedCount += 1;
    } else if (tx.status === 'PENDING') {
      totalPending += Math.round(tx.amount);
      pendingCount += 1;
    } else if (tx.status === 'REJECTED') {
      rejectedCount += 1;
    }
  }

  return {
    totalApproved,
    totalPending,
    approvedCount,
    pendingCount,
    rejectedCount,
  };
}

/**
 * Aggregates savings by month for trend analysis and statements.
 */
export function aggregateSavingsByMonth(transactions: SavingsTransaction[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.status === 'APPROVED') {
      const monthKey = tx.savingsMonth; // "YYYY-MM"
      result[monthKey] = (result[monthKey] || 0) + Math.round(tx.amount);
    }
  }
  return result;
}

/**
 * Aggregates savings for an individual member.
 */
export function calculateMemberSavings(
  memberId: string,
  transactions: SavingsTransaction[]
): {
  approvedTotal: number;
  pendingTotal: number;
  approvedCount: number;
  history: SavingsTransaction[];
} {
  const memberTxs = transactions.filter((t) => t.memberId === memberId);
  const approvedTxs = memberTxs.filter((t) => t.status === 'APPROVED');
  const pendingTxs = memberTxs.filter((t) => t.status === 'PENDING');

  const approvedTotal = approvedTxs.reduce((sum, t) => sum + Math.round(t.amount), 0);
  const pendingTotal = pendingTxs.reduce((sum, t) => sum + Math.round(t.amount), 0);

  // Sort latest first
  const history = [...memberTxs].sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );

  return {
    approvedTotal,
    pendingTotal,
    approvedCount: approvedTxs.length,
    history,
  };
}

/**
 * Calculates month-over-month growth or decline percentage.
 */
export function calculateGrowthRate(currentMonthTotal: number, previousMonthTotal: number): {
  percentage: number;
  isPositive: boolean;
  formatted: string;
} {
  if (previousMonthTotal <= 0) {
    if (currentMonthTotal > 0) {
      return { percentage: 100, isPositive: true, formatted: '+100%' };
    }
    return { percentage: 0, isPositive: true, formatted: '0%' };
  }

  const diff = currentMonthTotal - previousMonthTotal;
  const pct = Math.round((diff / previousMonthTotal) * 100 * 10) / 10;
  const isPositive = pct >= 0;
  const formatted = `${isPositive ? '+' : ''}${pct}%`;

  return { percentage: pct, isPositive, formatted };
}

/**
 * Converts English digits to Bengali digits.
 */
export function toBengaliNumerals(value: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(value).replace(/\d/g, (d) => bengaliDigits[Number(d)]);
}

/**
 * Formats a currency amount in Bengali with Taka symbol (৳).
 */
export function formatCurrencyBengali(amount: number): string {
  const formattedNumber = new Intl.NumberFormat('en-IN').format(Math.round(amount));
  return `৳${toBengaliNumerals(formattedNumber)}`;
}

/**
 * Generates a unique, non-colliding receipt number.
 * Format: BF-{YYYYMM}-{MEMBER_ID_CLEAN}-{RANDOM_HEX}
 */
export function generateReceiptNumber(month: string, memberId: string, sequence: number = 1): string {
  const cleanMonth = month.replace(/[^0-9]/g, '');
  const cleanMember = memberId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  const seqPadded = String(sequence).padStart(4, '0');
  return `BF-REC-${cleanMonth}-${cleanMember}-${seqPadded}`;
}

/**
 * Computes the Bengali calendar equivalent date for Asia/Dhaka time.
 */
export function getBengaliDateParts(date: Date = new Date()): {
  bengaliDay: string;
  bengaliMonth: string;
  bengaliYear: string;
  weekday: string;
  formatted: string;
} {
  // Asia/Dhaka offset is UTC+6
  const dhakaTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const d = dhakaTime.getDate();
  const m = dhakaTime.getMonth(); // 0-11
  const y = dhakaTime.getFullYear();

  const bengaliMonths = [
    'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
    'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'
  ];

  const bengaliDaysOfWeek = [
    'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
  ];

  const weekday = bengaliDaysOfWeek[dhakaTime.getDay()];

  // Approximate Bangla calendar mapping:
  // Pohela Boishakh is April 14 in modern revised Bangladeshi calendar.
  let bMonthIndex = 0;
  let bDay = 1;
  let bYear = y - 593;

  // Simple calendar mapping for month boundaries (Bangladeshi official standard:
  // Boishakh to Bhadro = 31 days each, Ashwin to Chaitra = 30 days, Falgun = 30 or 29)
  if (m === 3 && d >= 14) {
    bMonthIndex = 0; // Boishakh
    bDay = d - 13;
  } else if (m === 4 && d < 15) {
    bMonthIndex = 0;
    bDay = d + 17;
  } else if (m === 4 && d >= 15) {
    bMonthIndex = 1; // Joishtho
    bDay = d - 14;
  } else if (m === 5 && d < 16) {
    bMonthIndex = 1;
    bDay = d + 17;
  } else if (m === 5 && d >= 16) {
    bMonthIndex = 2; // Asharh
    bDay = d - 15;
  } else if (m === 6 && d < 17) {
    bMonthIndex = 2;
    bDay = d + 15;
  } else if (m === 6 && d >= 17) {
    bMonthIndex = 3; // Srabon
    bDay = d - 16;
  } else if (m === 7 && d < 17) {
    bMonthIndex = 3;
    bDay = d + 15;
  } else if (m === 7 && d >= 17) {
    bMonthIndex = 4; // Bhadro
    bDay = d - 16;
  } else if (m === 8 && d < 17) {
    bMonthIndex = 4;
    bDay = d + 15;
  } else if (m === 8 && d >= 17) {
    bMonthIndex = 5; // Ashwin
    bDay = d - 16;
  } else if (m === 9 && d < 17) {
    bMonthIndex = 5;
    bDay = d + 14;
  } else if (m === 9 && d >= 17) {
    bMonthIndex = 6; // Kartik
    bDay = d - 16;
  } else if (m === 10 && d < 16) {
    bMonthIndex = 6;
    bDay = d + 14;
  } else if (m === 10 && d >= 16) {
    bMonthIndex = 7; // Agrahayan
    bDay = d - 15;
  } else if (m === 11 && d < 16) {
    bMonthIndex = 7;
    bDay = d + 15;
  } else if (m === 11 && d >= 16) {
    bMonthIndex = 8; // Poush
    bDay = d - 15;
  } else if (m === 0 && d < 15) {
    bMonthIndex = 8;
    bDay = d + 16;
    bYear = y - 594;
  } else if (m === 0 && d >= 15) {
    bMonthIndex = 9; // Magh
    bDay = d - 14;
    bYear = y - 594;
  } else if (m === 1 && d < 14) {
    bMonthIndex = 9;
    bDay = d + 17;
    bYear = y - 594;
  } else if (m === 1 && d >= 14) {
    bMonthIndex = 10; // Falgun
    bDay = d - 13;
    bYear = y - 594;
  } else if (m === 2 && d < 15) {
    bMonthIndex = 10;
    bDay = d + 16;
    bYear = y - 594;
  } else {
    bMonthIndex = 11; // Choitro
    bDay = d >= 15 ? d - 14 : d + 16;
    bYear = y - 594;
  }

  const bengaliMonth = bengaliMonths[bMonthIndex];
  const bengaliDay = toBengaliNumerals(bDay);
  const bengaliYear = toBengaliNumerals(bYear);

  return {
    bengaliDay,
    bengaliMonth,
    bengaliYear,
    weekday,
    formatted: `${bengaliDay} ${bengaliMonth}, ${bengaliYear} বঙ্গাব্দ`,
  };
}

/**
 * Approximate Hijri date calculation for Asia/Dhaka
 */
export function getHijriDate(date: Date = new Date(), offsetDays: number = 0): string {
  try {
    const adjustedDate = new Date(date.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    // Use Intl DateTimeFormat with islamic-umalqura calendar
    const formatter = new Intl.DateTimeFormat('bn-BD-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${formatter.format(adjustedDate)} হিজরি`;
  } catch {
    return 'রবিউস সানি, ১৪৪৮ হিজরি';
  }
}

/**
 * Permission checker based on Section 4: User Roles and Authorization
 */
export function checkPermission(
  role: UserRole,
  action:
    | 'ACCESS_APP_MODERATOR_PANEL'
    | 'APPOINT_MODERATOR'
    | 'CONFIGURE_APP'
    | 'MANAGE_BACKUP'
    | 'PUBLISH_APK'
    | 'CREATE_SAVINGS'
    | 'VOTE_APPROVAL'
    | 'VIEW_MODERATOR_CHAT'
    | 'MANAGE_NOTICES'
    | 'EXPORT_REPORTS'
    | 'VIEW_PRIVATE_DOCUMENTS'
    | 'DOWNLOAD_OWN_RECEIPT'
    | 'SUBMIT_SAVINGS_REQUEST'
    | 'VIEW_PUBLIC_DASHBOARD'
): boolean {
  switch (action) {
    case 'ACCESS_APP_MODERATOR_PANEL':
    case 'APPOINT_MODERATOR':
    case 'CONFIGURE_APP':
    case 'MANAGE_BACKUP':
    case 'PUBLISH_APK':
      return role === 'APP_MODERATOR';

    case 'CREATE_SAVINGS':
    case 'VOTE_APPROVAL':
    case 'VIEW_MODERATOR_CHAT':
    case 'MANAGE_NOTICES':
    case 'EXPORT_REPORTS':
    case 'VIEW_PRIVATE_DOCUMENTS':
      return role === 'APP_MODERATOR' || role === 'MODERATOR';

    case 'DOWNLOAD_OWN_RECEIPT':
    case 'SUBMIT_SAVINGS_REQUEST':
    case 'VIEW_PUBLIC_DASHBOARD':
      return true; // All authenticated members

    default:
      return false;
  }
}

/**
 * Requirement 10: Formats full date and time in Bengali without seconds.
 * Example: "১০/০২/২০২৫, ১০:৩০ AM" or "১০ ফেব্রুয়ারি ২০২৫, ১০:৩০ AM"
 */
export function formatDateTimeBengali(isoOrDate: string | Date = new Date()): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return '';

  const day = toBengaliNumerals(String(d.getDate()).padStart(2, '0'));
  const month = toBengaliNumerals(String(d.getMonth() + 1).padStart(2, '0'));
  const year = toBengaliNumerals(d.getFullYear());

  let hours = d.getHours();
  const minutes = toBengaliNumerals(String(d.getMinutes()).padStart(2, '0'));
  const isPm = hours >= 12;
  const ampm = isPm ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const hoursBn = toBengaliNumerals(String(hours).padStart(2, '0'));

  return `${day}/${month}/${year}, ${hoursBn}:${minutes} ${ampm}`;
}

/**
 * Returns Bengali month name from "YYYY-MM" or month number
 */
export function getMonthNameBengali(monthKey: string): string {
  const monthMap: Record<string, string> = {
    '01': 'জানুয়ারি',
    '02': 'ফেব্রুয়ারি',
    '03': 'মার্চ',
    '04': 'এপ্রিল',
    '05': 'মে',
    '06': 'জুন',
    '07': 'জুলাই',
    '08': 'আগস্ট',
    '09': 'সেপ্টেম্বর',
    '10': 'অক্টোবর',
    '11': 'নভেম্বর',
    '12': 'ডিসেম্বর',
    '2026-01': 'জানুয়ারি ২০২৬',
    '2026-02': 'ফেব্রুয়ারি ২০২৬',
    '2026-03': 'মার্চ ২০২৬',
    '2026-04': 'এপ্রিল ২০২৬',
    '2026-05': 'মে ২০২৬',
    '2026-06': 'জুন ২০২৬',
    '2026-07': 'জুলাই ২০২৬',
    '2026-08': 'আগস্ট ২০২৬',
    '2026-09': 'সেপ্টেম্বর ২০২৬',
    '2026-10': 'অক্টোবর ২০২৬',
    '2026-11': 'নভেম্বর ২০২৬',
    '2026-12': 'ডিসেম্বর ২০২৬',
  };
  return monthMap[monthKey] || monthKey;
}

/**
 * Privacy helper: masks phone number for female members/moderators
 * when viewed by ordinary male members or unauthenticated guests.
 */
export function maskPhoneForPrivacy(
  phone: string,
  targetGender?: 'MALE' | 'FEMALE' | 'OTHER',
  viewerRole?: string | null,
  viewerGender?: string | null
): string {
  if (!phone) return '';
  // If target is female and viewer is not moderator/admin (or is male member or guest)
  const isPrivileged = viewerRole === 'APP_MODERATOR' || viewerRole === 'MODERATOR';
  if (targetGender === 'FEMALE' && !isPrivileged) {
    // Mask middle digits: 017**-****** (গোপনীয়)
    const clean = phone.replace(/\s+/g, '');
    const prefix = clean.slice(0, 5);
    return `${prefix}**-****** (গোপনীয়)`;
  }
  return phone;
}

const ROLE_TITLE_EXACT_SET = new Set([
  'অ্যাপ মডারেটর',
  'প্রধান অ্যাপ মডারেটর',
  'মডারেটর',
  'সাধারণ সদস্য',
  'সদস্য',
  'app moderator',
  'app_moderator',
  'moderator',
  'member',
]);

export function getRoleDisplayTitle(role?: string): string {
  if (role === 'APP_MODERATOR') return 'অ্যাপ মডারেটর';
  if (role === 'MODERATOR') return 'মডারেটর';
  if (role === 'MEMBER') return 'সাধারণ সদস্য';
  return '';
}

export function isRoleBasedDesignation(title?: string): boolean {
  if (!title) return false;
  const norm = title.trim().toLowerCase();
  if (!norm) return false;
  if (ROLE_TITLE_EXACT_SET.has(norm)) return true;
  return (
    norm === 'প্রধান প্রতিষ্ঠাতা ও অ্যাপ মডারেটর' ||
    norm === 'প্রধান অ্যাপ মডারেটর ও সমন্বয়ক'
  );
}

/**
 * Strips role-based designation tokens when a user's role changes,
 * preserving any custom/non-role designations (e.g. সভাপতি, কোষাধ্যক্ষ).
 */
export function stripRoleBasedTitles(title?: string): string {
  if (!title || !title.trim()) return '';
  const parts = title
    .split(/[,、|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => !isRoleBasedDesignation(p));
  return parts.join(', ');
}

/**
 * Extracts and compiles all approved designations, roles, and executive responsibilities
 * for a member/moderator into a clean, unique list of title strings.
 * Other custom/executive designations stay applied first, and the current role-based
 * title always appears at the end.
 */
export function getUserDesignationList(
  user?: {
    id?: string;
    memberId?: string;
    name?: string;
    role?: string;
    moderatorTitle?: string;
  } | null,
  executiveMembers?: Array<{ name?: string; memberId?: string; designation?: string }>
): string[] {
  if (!user) return [];
  const list: string[] = [];
  const seen = new Set<string>();

  const addNonRole = (title?: string) => {
    if (!title) return;
    const parts = title.split(/[,、|]+/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (isRoleBasedDesignation(p)) continue;
      const lower = p.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(p);
      }
    }
  };

  // 1. Custom / non-role approved designation from Moderator Panel
  if (user.moderatorTitle && user.moderatorTitle.trim()) {
    addNonRole(user.moderatorTitle);
  }

  // 2. Executive Council designation (if any)
  if (Array.isArray(executiveMembers) && executiveMembers.length > 0) {
    const exec = executiveMembers.find(
      (em) =>
        (user.memberId && em.memberId && em.memberId === user.memberId) ||
        (user.name && em.name && em.name.trim().toLowerCase() === user.name.trim().toLowerCase())
    );
    if (exec?.designation && exec.designation.trim()) {
      addNonRole(exec.designation);
    }
  }

  // 3. Always show the current role-based designation at the end
  const roleLabel = getRoleDisplayTitle(user.role);
  if (roleLabel && !seen.has(roleLabel.toLowerCase())) {
    seen.add(roleLabel.toLowerCase());
    list.push(roleLabel);
  }

  return list;
}

