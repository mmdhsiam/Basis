import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getFirebaseDb, getFirebaseAuth, ensureUserFirebaseAuthSession } from './firebase';
import { hashPassword, isHashedPassword } from './passwordSecurity';
import {
  AppConfiguration,
  NoticeItem,
  FoundationRule,
  ExecutiveMember,
  SavingsTransaction,
  UserProfile,
  ApprovalRequest,
  ChatMessage,
  ChatPoll,
  PrivateMessage,
  ElectronicReceipt,
  FoundationExpense,
  ComplaintItem,
  FeatureRequestItem,
  UserNotification,
  AppRelease,
} from '../types';

export const IS_NATIVE_APK = import.meta.env.VITE_NATIVE_APK === 'true';
const envCol = (name: string) => (IS_NATIVE_APK ? `apk_${name}` : `web_${name}`);

let anonAuthAttempted = false;
let savedSessionRestorePromise: Promise<void> | null = null;

async function ensureFirestoreSession(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) return;
    if (auth.currentUser) return;

    if (!savedSessionRestorePromise && typeof window !== 'undefined') {
      savedSessionRestorePromise = (async () => {
        try {
          const rawSaved = localStorage.getItem('basis_saved_login_v1');
          if (rawSaved) {
            const parsed = JSON.parse(rawSaved);
            if (parsed?.identifier?.includes('@') && parsed?.password) {
              await ensureUserFirebaseAuthSession(parsed.identifier, parsed.password);
              return;
            }
            // Look up user email by userId in saved storage cache if identifier was phone/memberId
            const rawStore = localStorage.getItem('basis_foundation_storage_v1');
            if (rawStore && parsed?.password) {
              const store = JSON.parse(rawStore);
              const matched = Array.isArray(store?.users)
                ? store.users.find((u: any) => u?.id === parsed.userId || u?.memberId === parsed.memberId)
                : null;
              if (matched?.email && matched.email.includes('@')) {
                await ensureUserFirebaseAuthSession(matched.email, parsed.password);
                return;
              }
            }
          }
        } catch {
          // ignore
        } finally {
          savedSessionRestorePromise = null;
        }
      })();
    }

    if (savedSessionRestorePromise) {
      await savedSessionRestorePromise;
    }

    if (auth.currentUser) return;

    if (!anonAuthAttempted) {
      anonAuthAttempted = true;
      await signInAnonymously(auth);
    }
  } catch {
    // Ignore if anonymous auth is disabled on Firebase console; local pending queue protects writes
  }
}

/**
 * Recursively strips undefined values from objects and arrays so Firestore setDoc never fails.
 */
function cleanValue(val: any): any {
  if (val === undefined) return undefined;
  if (val === null || val instanceof Date || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val
      .map((item) => cleanValue(item))
      .filter((item) => item !== undefined);
  }
  const cleanedObj: Record<string, any> = {};
  for (const key of Object.keys(val)) {
    const cleanedProp = cleanValue(val[key]);
    if (cleanedProp !== undefined) {
      cleanedObj[key] = cleanedProp;
    }
  }
  return cleanedObj;
}

function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  return cleanValue(obj) as Record<string, any>;
}

export type SyncStatus = 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'LOCAL';

export interface RealtimeSyncCallbacks {
  onConfigChange?: (config: AppConfiguration) => void;
  onNoticesChange?: (notices: NoticeItem[]) => void;
  onRulesChange?: (rules: FoundationRule[]) => void;
  onExecutiveMembersChange?: (members: ExecutiveMember[]) => void;
  onSavingsChange?: (savings: SavingsTransaction[]) => void;
  onUsersChange?: (users: UserProfile[]) => void;
  onApprovalsChange?: (approvals: ApprovalRequest[]) => void;
  onChatChange?: (messages: ChatMessage[]) => void;
  onPollsChange?: (polls: ChatPoll[]) => void;
  onPrivateMessagesChange?: (messages: PrivateMessage[]) => void;
  onReceiptsChange?: (receipts: ElectronicReceipt[]) => void;
  onExpensesChange?: (expenses: FoundationExpense[]) => void;
  onComplaintsChange?: (complaints: ComplaintItem[]) => void;
  onFeaturesChange?: (features: FeatureRequestItem[]) => void;
  onNotificationsChange?: (notifications: UserNotification[]) => void;
  onStatusChange?: (status: SyncStatus, lastSyncedAt: string) => void;
}

export async function syncConfigToFirestore(config: AppConfiguration): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('app_configuration'), 'main');
    const safeCfg: AppConfiguration = { ...config };
    if (safeCfg.uploadedFontDataUrl && safeCfg.uploadedFontDataUrl.length > 450000) {
      delete safeCfg.uploadedFontDataUrl;
      delete safeCfg.uploadedFontName;
    }
    await setDoc(ref, cleanForFirestore({ ...safeCfg, updatedAt: safeCfg.updatedAt || new Date().toISOString() }));
    return true;
  } catch (err) {
    console.warn('Firestore config write warning:', err);
    return false;
  }
}

export async function syncNoticeToFirestore(notice: NoticeItem): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('notices'), notice.id);
    await setDoc(ref, cleanForFirestore({ ...notice, updatedAt: notice.updatedAt || new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore notice write warning:', err);
    return false;
  }
}

export async function deleteNoticeFromFirestore(noticeId: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    await deleteDoc(doc(db, envCol('notices'), noticeId));
    return true;
  } catch (err) {
    console.warn('Firestore notice delete warning:', err);
    return false;
  }
}

export async function syncRuleToFirestore(rule: FoundationRule): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('rules'), rule.id);
    await setDoc(ref, cleanForFirestore({ ...rule, updatedAt: rule.updatedAt || new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore rule write warning:', err);
    return false;
  }
}

export async function deleteRuleFromFirestore(ruleId: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    await deleteDoc(doc(db, envCol('rules'), ruleId));
    return true;
  } catch (err) {
    console.warn('Firestore rule delete warning:', err);
    return false;
  }
}

export async function syncExecutiveMemberToFirestore(member: ExecutiveMember): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('executive_members'), member.id);
    await setDoc(ref, cleanForFirestore({ ...member, updatedAt: member.updatedAt || new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore executive member write warning:', err);
    return false;
  }
}

export async function deleteExecutiveMemberFromFirestore(memberId: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    await deleteDoc(doc(db, envCol('executive_members'), memberId));
    return true;
  } catch (err) {
    console.warn('Firestore executive member delete warning:', err);
    return false;
  }
}

export async function syncSavingsTransactionToFirestore(tx: SavingsTransaction): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('savings_transactions'), tx.id);
    await setDoc(ref, cleanForFirestore({ ...tx, updatedAt: tx.updatedAt || new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore savings write warning:', err);
    return false;
  }
}

export async function syncReceiptToFirestore(receipt: ElectronicReceipt): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('receipts'), receipt.receiptNumber);
    await setDoc(ref, cleanForFirestore(receipt), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore receipt write warning:', err);
    return false;
  }
}

export async function syncApprovalToFirestore(appr: ApprovalRequest): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('approvals'), appr.id);
    await setDoc(ref, cleanForFirestore({ ...appr, updatedAt: appr.updatedAt || new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore approval write warning:', err);
    return false;
  }
}

export async function syncUserToFirestore(user: UserProfile): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db || user.id === '__guest__') return false;
    await ensureFirestoreSession();
    const safeUser: UserProfile =
      user.password &&
      (user.id.startsWith('user-reg-') || user.password !== '123456') &&
      !isHashedPassword(user.password)
        ? { ...user, password: hashPassword(user.password) }
        : user;
    const ref = doc(db, envCol('users'), safeUser.id);
    await setDoc(ref, cleanForFirestore({ ...safeUser, updatedAt: safeUser.updatedAt || new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore user write warning:', err);
    return false;
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    await deleteDoc(doc(db, envCol('users'), userId));
    return true;
  } catch (err) {
    console.warn('Firestore user delete warning:', err);
    return false;
  }
}

export async function fetchUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const db = getFirebaseDb();
    if (!db) return [];
    const snap = await getDocs(collection(db, envCol('users')));
    const list: UserProfile[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile;
      if (data && data.id && data.id !== '__guest__') {
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.warn('Firestore fetch users warning:', err);
    return [];
  }
}

export async function syncChatMessageToFirestore(msg: ChatMessage): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('chat_messages'), msg.id);
    await setDoc(ref, cleanForFirestore({ ...msg, updatedAt: msg.updatedAt || new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore chat write warning:', err);
    return false;
  }
}

export async function syncPollToFirestore(poll: ChatPoll): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('chat_polls'), poll.id);
    await setDoc(ref, cleanForFirestore(poll), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore poll write warning:', err);
    return false;
  }
}

export async function deletePollFromFirestore(pollId: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    await deleteDoc(doc(db, envCol('chat_polls'), pollId));
    return true;
  } catch (err) {
    console.warn('Firestore poll delete warning:', err);
    return false;
  }
}

export async function syncPrivateMessageToFirestore(pm: PrivateMessage): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('private_messages'), pm.id);
    await setDoc(ref, cleanForFirestore({ ...pm, updatedAt: pm.updatedAt || new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore private message write warning:', err);
    return false;
  }
}

export async function syncExpenseToFirestore(expense: FoundationExpense): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('expenses'), expense.id);
    await setDoc(ref, cleanForFirestore(expense), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore expense write warning:', err);
    return false;
  }
}

export async function deleteExpenseFromFirestore(expenseId: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    await deleteDoc(doc(db, envCol('expenses'), expenseId));
    return true;
  } catch (err) {
    console.warn('Firestore expense delete warning:', err);
    return false;
  }
}

export async function syncComplaintToFirestore(complaint: ComplaintItem): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('complaints'), complaint.id);
    await setDoc(ref, cleanForFirestore(complaint), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore complaint write warning:', err);
    return false;
  }
}

export async function syncFeatureRequestToFirestore(feature: FeatureRequestItem): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('feature_requests'), feature.id);
    await setDoc(ref, cleanForFirestore(feature), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore feature request write warning:', err);
    return false;
  }
}

export async function syncUserNotificationToFirestore(notif: UserNotification): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, envCol('user_notifications'), notif.id);
    await setDoc(ref, cleanForFirestore(notif), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore notification write warning:', err);
    return false;
  }
}

/**
 * Dedicated Force Update Channel (shared across Web App push -> installed Native APKs only).
 * Does NOT affect normal app data sync isolation between Web and APK.
 */
export async function syncForceUpdateToFirestore(release: AppRelease | null): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return false;
    await ensureFirestoreSession();
    const ref = doc(db, 'app_force_update', 'latest');
    if (!release) {
      await setDoc(
        ref,
        cleanForFirestore({
          isActive: false,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
      return true;
    }
    await setDoc(
      ref,
      cleanForFirestore({
        ...release,
        isActive: release.isActive !== false,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('Firestore force update write warning:', err);
    return false;
  }
}

export async function fetchLatestForceUpdateFromFirestore(): Promise<AppRelease | null> {
  try {
    const db = getFirebaseDb();
    if (!db) return null;
    const snap = await getDoc(doc(db, 'app_force_update', 'latest'));
    if (!snap.exists()) return null;
    const data = snap.data() as AppRelease;
    if (!data || data.isActive === false || !data.versionCode || !data.downloadUrl) {
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Firestore force update read warning:', err);
    return null;
  }
}

export function subscribeForceUpdateListener(
  callback: (release: AppRelease | null) => void
): () => void {
  try {
    const db = getFirebaseDb();
    if (!db) return () => {};
    return onSnapshot(
      doc(db, 'app_force_update', 'latest'),
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        const data = snapshot.data() as AppRelease;
        if (!data || data.isActive === false || !data.versionCode || !data.downloadUrl) {
          callback(null);
          return;
        }
        callback(data);
      },
      (err) => {
        console.warn('Force update listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Performs an active bidirectional pull/push sync with Firestore for Moderator Sync.
 */
export async function performFullFirestoreSync(
  localPayload: {
    config: AppConfiguration;
    users: UserProfile[];
    savings: SavingsTransaction[];
    receipts: ElectronicReceipt[];
    approvals: ApprovalRequest[];
    notices: NoticeItem[];
    rules: FoundationRule[];
    expenses: FoundationExpense[];
    complaints: ComplaintItem[];
    featureRequests: FeatureRequestItem[];
  },
  callbacks: RealtimeSyncCallbacks
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    callbacks.onStatusChange?.('SYNCING', new Date().toLocaleTimeString('bn-BD'));

    // Pull config first; if remote doesn't exist yet, push local config
    const cfgSnap = await getDoc(doc(db, envCol('app_configuration'), 'main'));
    if (cfgSnap.exists()) {
      callbacks.onConfigChange?.(cfgSnap.data() as AppConfiguration);
    } else {
      await syncConfigToFirestore(localPayload.config);
    }

    // Pull users; merge any local approved/moderator users that are missing remotely
    const usersSnap = await getDocs(collection(db, envCol('users')));
    if (!usersSnap.empty) {
      const remoteUsers: UserProfile[] = [];
      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u && u.id !== '__guest__') remoteUsers.push(u);
      });
      callbacks.onUsersChange?.(remoteUsers);
    } else {
      await Promise.all(
        localPayload.users
          .filter((u) => u.id !== '__guest__')
          .map((u) => syncUserToFirestore(u))
      );
    }

    // Pull savings
    const txSnap = await getDocs(collection(db, envCol('savings_transactions')));
    if (!txSnap.empty) {
      const remoteTx: SavingsTransaction[] = [];
      txSnap.forEach((d) => remoteTx.push(d.data() as SavingsTransaction));
      remoteTx.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      callbacks.onSavingsChange?.(remoteTx);
    } else {
      await Promise.all(localPayload.savings.map((tx) => syncSavingsTransactionToFirestore(tx)));
    }

    // Pull notices
    const noticesSnap = await getDocs(collection(db, envCol('notices')));
    if (!noticesSnap.empty) {
      const remoteNotices: NoticeItem[] = [];
      noticesSnap.forEach((d) => remoteNotices.push(d.data() as NoticeItem));
      remoteNotices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onNoticesChange?.(remoteNotices);
    } else {
      await Promise.all(localPayload.notices.map((n) => syncNoticeToFirestore(n)));
    }

    // Pull approvals
    const apprSnap = await getDocs(collection(db, envCol('approvals')));
    if (!apprSnap.empty) {
      const remoteAppr: ApprovalRequest[] = [];
      apprSnap.forEach((d) => remoteAppr.push(d.data() as ApprovalRequest));
      callbacks.onApprovalsChange?.(remoteAppr);
    } else {
      await Promise.all(localPayload.approvals.map((a) => syncApprovalToFirestore(a)));
    }

    // Pull rules
    const rulesSnap = await getDocs(collection(db, envCol('rules')));
    if (!rulesSnap.empty) {
      const remoteRules: FoundationRule[] = [];
      rulesSnap.forEach((d) => remoteRules.push(d.data() as FoundationRule));
      remoteRules.sort((a, b) => (a.ruleNumber ?? 0) - (b.ruleNumber ?? 0));
      callbacks.onRulesChange?.(remoteRules);
    } else {
      await Promise.all(localPayload.rules.map((r) => syncRuleToFirestore(r)));
    }

    callbacks.onStatusChange?.('SYNCED', new Date().toLocaleTimeString('bn-BD'));
    return true;
  } catch (err) {
    console.warn('Full Firestore sync error:', err);
    callbacks.onStatusChange?.('LOCAL', new Date().toLocaleTimeString('bn-BD'));
    return false;
  }
}

/**
 * Establishes real-time listeners on all Firestore collections.
 */
export function initRealtimeSync(callbacks: RealtimeSyncCallbacks): () => void {
  const unsubscribers: (() => void)[] = [];

  if (!IS_NATIVE_APK) {
    callbacks.onStatusChange?.('LOCAL', new Date().toLocaleTimeString('bn-BD'));
    return () => {};
  }

  try {
    const db = getFirebaseDb();
    if (!db) {
      callbacks.onStatusChange?.('LOCAL', new Date().toLocaleTimeString('bn-BD'));
      return () => {};
    }

    callbacks.onStatusChange?.('SYNCING', new Date().toLocaleTimeString('bn-BD'));

    let hasLoadedNotices = false;
    let hasLoadedRules = false;
    let hasLoadedExecutive = false;

    // 1. App Configuration (Global App Settings)
    unsubscribers.push(
      onSnapshot(
        doc(db, envCol('app_configuration'), 'main'),
        (snapshot) => {
          if (snapshot.exists()) {
            callbacks.onConfigChange?.(snapshot.data() as AppConfiguration);
            callbacks.onStatusChange?.('SYNCED', new Date().toLocaleTimeString('bn-BD'));
          }
        },
        (err) => {
          console.warn('Config snapshot listener warning:', err);
          callbacks.onStatusChange?.('LOCAL', new Date().toLocaleTimeString('bn-BD'));
        }
      )
    );

    // 2. Notices
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('notices')),
        (snapshot) => {
          const hadRemovals = snapshot.docChanges().some((c) => c.type === 'removed');
          if (IS_NATIVE_APK || !snapshot.empty || hasLoadedNotices || hadRemovals) {
            hasLoadedNotices = true;
            const list: NoticeItem[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as NoticeItem));
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            callbacks.onNoticesChange?.(list);
            callbacks.onStatusChange?.('SYNCED', new Date().toLocaleTimeString('bn-BD'));
          }
        },
        (err) => console.warn('Notices listener warning:', err)
      )
    );

    // 3. Rules
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('rules')),
        (snapshot) => {
          const hadRemovals = snapshot.docChanges().some((c) => c.type === 'removed');
          if (IS_NATIVE_APK || !snapshot.empty || hasLoadedRules || hadRemovals) {
            hasLoadedRules = true;
            const list: FoundationRule[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as FoundationRule));
            list.sort((a, b) => (a.ruleNumber ?? 0) - (b.ruleNumber ?? 0));
            callbacks.onRulesChange?.(list);
          }
        },
        (err) => console.warn('Rules listener warning:', err)
      )
    );

    // 4. Executive Members (Executive Council)
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('executive_members')),
        (snapshot) => {
          const hadRemovals = snapshot.docChanges().some((c) => c.type === 'removed');
          if (IS_NATIVE_APK || !snapshot.empty || hasLoadedExecutive || hadRemovals) {
            hasLoadedExecutive = true;
            const list: ExecutiveMember[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as ExecutiveMember));
            list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            callbacks.onExecutiveMembersChange?.(list);
            callbacks.onStatusChange?.('SYNCED', new Date().toLocaleTimeString('bn-BD'));
          }
        },
        (err) => console.warn('Executive members listener warning:', err)
      )
    );

    // 5. Savings Transactions
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('savings_transactions')),
        (snapshot) => {
          if (IS_NATIVE_APK || !snapshot.empty) {
            const list: SavingsTransaction[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as SavingsTransaction));
            list.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
            callbacks.onSavingsChange?.(list);
            callbacks.onStatusChange?.('SYNCED', new Date().toLocaleTimeString('bn-BD'));
          }
        },
        (err) => console.warn('Savings listener warning:', err)
      )
    );

    // 6. Users
    let hasLoadedUsers = false;
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('users')),
        (snapshot) => {
          const hadRemovals = snapshot.docChanges().some((c) => c.type === 'removed');
          if (IS_NATIVE_APK || !snapshot.empty || hasLoadedUsers || hadRemovals) {
            hasLoadedUsers = true;
            const list: UserProfile[] = [];
            snapshot.forEach((docSnap) => {
              const u = docSnap.data() as UserProfile;
              if (u && u.id !== '__guest__') list.push(u);
            });
            callbacks.onUsersChange?.(list);
          }
        },
        (err) => console.warn('Users listener warning:', err)
      )
    );

    // 7. Approvals
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('approvals')),
        (snapshot) => {
          if (IS_NATIVE_APK || !snapshot.empty) {
            const list: ApprovalRequest[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as ApprovalRequest));
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            callbacks.onApprovalsChange?.(list);
          }
        },
        (err) => console.warn('Approvals listener warning:', err)
      )
    );

    // 8. Chat Messages
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('chat_messages')),
        (snapshot) => {
          if (IS_NATIVE_APK || !snapshot.empty) {
            const list: ChatMessage[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as ChatMessage));
            list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            callbacks.onChatChange?.(list);
          }
        },
        (err) => console.warn('Chat listener warning:', err)
      )
    );

    // 9. Chat Polls
    let hasLoadedPolls = false;
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('chat_polls')),
        (snapshot) => {
          const hadRemovals = snapshot.docChanges().some((c) => c.type === 'removed');
          if (IS_NATIVE_APK || !snapshot.empty || hasLoadedPolls || hadRemovals) {
            hasLoadedPolls = true;
            const list: ChatPoll[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as ChatPoll));
            callbacks.onPollsChange?.(list);
          }
        },
        (err) => console.warn('Polls listener warning:', err)
      )
    );

    // 10. Private Messages
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('private_messages')),
        (snapshot) => {
          if (IS_NATIVE_APK || !snapshot.empty) {
            const list: PrivateMessage[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as PrivateMessage));
            list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            callbacks.onPrivateMessagesChange?.(list);
          }
        },
        (err) => console.warn('Private messages listener warning:', err)
      )
    );

    // 11. Receipts
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('receipts')),
        (snapshot) => {
          if (IS_NATIVE_APK || !snapshot.empty) {
            const list: ElectronicReceipt[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as ElectronicReceipt));
            callbacks.onReceiptsChange?.(list);
          }
        },
        (err) => console.warn('Receipts listener warning:', err)
      )
    );

    // 12. Expenses
    let hasLoadedExpenses = false;
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('expenses')),
        (snapshot) => {
          const hadRemovals = snapshot.docChanges().some((c) => c.type === 'removed');
          if (IS_NATIVE_APK || !snapshot.empty || hasLoadedExpenses || hadRemovals) {
            hasLoadedExpenses = true;
            const list: FoundationExpense[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as FoundationExpense));
            callbacks.onExpensesChange?.(list);
          }
        },
        (err) => console.warn('Expenses listener warning:', err)
      )
    );

    // 13. Complaints
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('complaints')),
        (snapshot) => {
          if (IS_NATIVE_APK || !snapshot.empty) {
            const list: ComplaintItem[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as ComplaintItem));
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            callbacks.onComplaintsChange?.(list);
          }
        },
        (err) => console.warn('Complaints listener warning:', err)
      )
    );

    // 14. Feature Requests
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('feature_requests')),
        (snapshot) => {
          if (IS_NATIVE_APK || !snapshot.empty) {
            const list: FeatureRequestItem[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as FeatureRequestItem));
            callbacks.onFeaturesChange?.(list);
          }
        },
        (err) => console.warn('Feature requests listener warning:', err)
      )
    );

    // 15. Targeted User Notifications
    unsubscribers.push(
      onSnapshot(
        collection(db, envCol('user_notifications')),
        (snapshot) => {
          if (IS_NATIVE_APK || !snapshot.empty) {
            const list: UserNotification[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as UserNotification));
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            callbacks.onNotificationsChange?.(list);
          }
        },
        (err) => console.warn('Notifications listener warning:', err)
      )
    );

    callbacks.onStatusChange?.('SYNCED', new Date().toLocaleTimeString('bn-BD'));
  } catch (err) {
    console.warn('Realtime sync setup error (using local resilience):', err);
    callbacks.onStatusChange?.('LOCAL', new Date().toLocaleTimeString('bn-BD'));
  }

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
  };
}
