import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { getFirebaseAuth, ensureUserFirebaseAuthSession } from '../../utils/firebase';
import { fetchUsersFromFirestore, syncUserToFirestore } from '../../utils/firebaseSync';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { AnimatePresence, motion } from 'motion/react';
import {
  hashPassword,
  verifyPassword,
  isHashedPassword,
  sanitizeRegistrationText,
} from '../../utils/passwordSecurity';
import { getOrCreateDeviceId } from '../../utils/deviceSecurity';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AUTH_SECURITY_STORAGE_KEY = 'basis_auth_security_v1';
const SAVED_LOGIN_STORAGE_KEY = 'basis_saved_login_v1';
const MAX_FAILED_ATTEMPTS = 5;
const SUBMIT_COOLDOWN_MS = 1500;

interface SavedLoginCredentials {
  identifier: string;
  password: string;
  userId: string;
  memberId: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  savedAt: string;
}

function getSavedLoginCredentials(): SavedLoginCredentials | null {
  try {
    const raw = localStorage.getItem(SAVED_LOGIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.identifier && parsed.password && parsed.name) {
      return parsed as SavedLoginCredentials;
    }
  } catch {}
  return null;
}

interface AuthSecurityState {
  failedAttempts: number;
  lockUntil: number;
  lockoutTier: number;
  lastAttemptAt: number;
}

function getSavedSecurityState(): AuthSecurityState {
  try {
    const raw = localStorage.getItem(AUTH_SECURITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        failedAttempts: Number(parsed.failedAttempts) || 0,
        lockUntil: Number(parsed.lockUntil) || 0,
        lockoutTier: Number(parsed.lockoutTier) || 0,
        lastAttemptAt: Number(parsed.lastAttemptAt) || 0,
      };
    }
  } catch {}
  return { failedAttempts: 0, lockUntil: 0, lockoutTier: 0, lastAttemptAt: 0 };
}

function saveSecurityState(state: AuthSecurityState) {
  try {
    localStorage.setItem(AUTH_SECURITY_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
}

function extractPhoneLast10(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return '';
}

function containsMaliciousInput(str: string): boolean {
  if (str.length > 140) return true;
  return /<script|javascript:|onerror=|onload=|\$where|\$ne/i.test(str);
}

function matchUsersByIdentifier(list: UserProfile[], rawIdentifier: string): UserProfile[] {
  const normalized = toAsciiDigits(rawIdentifier).trim().toLowerCase();
  if (!normalized) return [];

  const compactMemberId = normalized.replace(/\s+/g, '');
  const queryPhone10 = extractPhoneLast10(rawIdentifier);

  return list.filter((u) => {
    if (!u || u.id === '__guest__') return false;
    const uEmail = (u.email || '').trim().toLowerCase();
    const uMemberId = toAsciiDigits(u.memberId || '').trim().toLowerCase();
    const uMemberIdCompact = uMemberId.replace(/[-_\s]/g, '');
    const queryMemberCompact = compactMemberId.replace(/[-_\s]/g, '');
    const uPhone10 = extractPhoneLast10(u.phone || '');

    if (uEmail && uEmail === normalized) return true;
    if (uMemberId && (uMemberId === compactMemberId || uMemberIdCompact === queryMemberCompact)) return true;
    if (u.id.toLowerCase() === normalized) return true;
    if (queryPhone10.length === 10 && uPhone10.length === 10 && queryPhone10 === uPhone10) return true;
    return false;
  });
}

function matchUserByIdentifier(list: UserProfile[], rawIdentifier: string): UserProfile | undefined {
  return matchUsersByIdentifier(list, rawIdentifier)[0];
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { users, config, setCurrentUser, registerNewAccount, triggerAuthTransition } = useApp();

  const resolvedLogoUrl = extractDirectImageUrl(config.logoUrl) || config.logoUrl || '/logo.svg';

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sweep, setSweep] = useState<{
    id: number;
    from: 'LOGIN' | 'REGISTER';
    to: 'LOGIN' | 'REGISTER';
    dir: 'TOP_TO_BOTTOM' | 'BOTTOM_TO_TOP';
  } | null>(null);
  const loginPanelRef = useRef<HTMLDivElement | null>(null);
  const registerPanelRef = useRef<HTMLDivElement | null>(null);

  // Reset to clean state when modal closes/reopens
  useEffect(() => {
    if (!isOpen) {
      setSweep(null);
    }
  }, [isOpen]);

  const switchToRegisterFromBottom = () => {
    if (mode === 'REGISTER' || sweep) return;
    setRegError(null);
    setRegSuccess(null);
    if (registerPanelRef.current) {
      registerPanelRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    setSweep({
      id: Date.now(),
      from: 'LOGIN',
      to: 'REGISTER',
      dir: 'TOP_TO_BOTTOM',
    });
    setMode('REGISTER');
  };

  const switchToLoginFromTop = () => {
    if (mode === 'LOGIN' || sweep) return;
    setLoginError(null);
    if (loginPanelRef.current) {
      loginPanelRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    setSweep({
      id: Date.now(),
      from: 'REGISTER',
      to: 'LOGIN',
      dir: 'BOTTOM_TO_TOP',
    });
    setMode('LOGIN');
  };

  // Bot honeypot field (Anti-DDoS / Automated Bot Trap)
  const [honeypot, setHoneypot] = useState('');

  // Security lockout countdown
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState(0);

  // Eye toggle state for password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Login form state + Saved One-Click Login state (Deliverable 6)
  const [savedLogin, setSavedLogin] = useState<SavedLoginCredentials | null>(() =>
    getSavedLoginCredentials()
  );
  const [rememberLogin, setRememberLogin] = useState<boolean>(() => Boolean(getSavedLoginCredentials()));
  const [loginIdentifier, setLoginIdentifier] = useState(() => getSavedLoginCredentials()?.identifier || '');
  const [loginPassword, setLoginPassword] = useState(() => getSavedLoginCredentials()?.password || '');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pendingTransferUser, setPendingTransferUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPendingTransferUser(null);
      const latestSaved = getSavedLoginCredentials();
      setSavedLogin(latestSaved);
      if (latestSaved) {
        setRememberLogin(true);
        setLoginIdentifier(latestSaved.identifier);
        setLoginPassword(latestSaved.password);
      }
    }
  }, [isOpen]);

  const clearSavedLogin = () => {
    try {
      localStorage.removeItem(SAVED_LOGIN_STORAGE_KEY);
    } catch {}
    setSavedLogin(null);
    setRememberLogin(false);
  };

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhoneDigits, setRegPhoneDigits] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regGender, setRegGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [regAddress, setRegAddress] = useState('');
  const [regNomineeName, setRegNomineeName] = useState('');
  const [regNomineePhone, setRegNomineePhone] = useState('');
  const [regNomineeRelation, setRegNomineeRelation] = useState('পিতা');
  const [regAvatarUrl, setRegAvatarUrl] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const updateCountdown = () => {
      const sec = getSavedSecurityState();
      const diff = Math.ceil((sec.lockUntil - Date.now()) / 1000);
      setLockSecondsRemaining(diff > 0 ? diff : 0);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const handlePhoneInputChange = (raw: string) => {
    const en = toAsciiDigits(raw);
    let clean = en.replace(/\D/g, '');
    if (clean.startsWith('880')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);
    if (clean.length > 10) clean = clean.slice(0, 10);
    setRegPhoneDigits(clean);
  };

  const CURTAIN_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];

  const recordFailedAttempt = () => {
    const current = getSavedSecurityState();
    const nextFailed = current.failedAttempts + 1;
    if (nextFailed >= MAX_FAILED_ATTEMPTS) {
      const nextTier = Math.min(current.lockoutTier + 1, 3);
      const lockDurationSec = nextTier === 1 ? 60 : nextTier === 2 ? 180 : 600;
      const lockUntil = Date.now() + lockDurationSec * 1000;
      saveSecurityState({
        failedAttempts: 0,
        lockUntil,
        lockoutTier: nextTier,
        lastAttemptAt: Date.now(),
      });
      setLockSecondsRemaining(lockDurationSec);
      setLoginError(
        `একাধিকবার ভুল চেষ্টার কারণে ব্রুট-ফোর্স ও অ্যান্টি-ডিডস নিরাপত্তা লক সক্রিয় হয়েছে। অনুগ্রহ করে ${lockDurationSec} সেকেন্ড পর আবার চেষ্টা করুন।`
      );
    } else {
      saveSecurityState({
        ...current,
        failedAttempts: nextFailed,
        lastAttemptAt: Date.now(),
      });
    }
  };

  const resetSecurityLock = () => {
    saveSecurityState({ failedAttempts: 0, lockUntil: 0, lockoutTier: 0, lastAttemptAt: Date.now() });
    setLockSecondsRemaining(0);
  };

  const executeCredentialsLogin = async (
    rawIdentifierInput: string,
    rawPasswordInput: string,
    shouldPersistLogin: boolean,
    allowDeviceSwitch: boolean = false
  ) => {
    setLoginError(null);

    if (honeypot.trim() !== '') {
      setLoginError('নিরাপত্তা যাচাইকরণ ব্যর্থ হয়েছে।');
      return;
    }

    const sec = getSavedSecurityState();
    const now = Date.now();
    if (sec.lockUntil > now) {
      const waitSec = Math.ceil((sec.lockUntil - now) / 1000);
      setLockSecondsRemaining(waitSec);
      setLoginError(`নিরাপত্তা লক সক্রিয় রয়েছে। অনুগ্রহ করে আরও ${waitSec} সেকেন্ড অপেক্ষা করুন।`);
      return;
    }

    if (now - sec.lastAttemptAt < SUBMIT_COOLDOWN_MS) {
      setLoginError('খুব দ্রুত রিকোয়েস্ট পাঠানো হচ্ছে! অনুগ্রহ করে ২ সেকেন্ড অপেক্ষা করে চেষ্টা করুন।');
      return;
    }
    saveSecurityState({ ...sec, lastAttemptAt: now });

    if (containsMaliciousInput(rawIdentifierInput) || containsMaliciousInput(rawPasswordInput)) {
      recordFailedAttempt();
      setLoginError('অবৈধ ইনপুট শনাক্ত হয়েছে। সঠিক ফোন নম্বর, ইমেইল বা সদস্য আইডি লিখুন।');
      return;
    }

    const cleanIdentifier = rawIdentifierInput.trim();
    const cleanPass = toAsciiDigits(rawPasswordInput.trim());
    if (!cleanIdentifier || !cleanPass) {
      setLoginError('অনুগ্রহ করে আপনার ফোন/আইডি/ইমেইল এবং পাসওয়ার্ড উভয়ই লিখুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      let candidatePool: UserProfile[] = [...users];
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const remoteUsers = await fetchUsersFromFirestore();
        if (remoteUsers.length > 0) {
          const mergedMap = new Map<string, UserProfile>();
          users.forEach((u) => {
            if (u.id !== '__guest__') mergedMap.set(u.id, u);
          });
          remoteUsers.forEach((u) => {
            if (u.id !== '__guest__') mergedMap.set(u.id, u);
          });
          candidatePool = Array.from(mergedMap.values());
        }
      }

      const matchedCandidates = matchUsersByIdentifier(candidatePool, cleanIdentifier);

      let verifiedViaFirebaseAuth = false;
      if (
        matchedCandidates.length === 1 &&
        cleanIdentifier.includes('@') &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        const auth = getFirebaseAuth();
        if (auth) {
          try {
            const cred = await signInWithEmailAndPassword(auth, cleanIdentifier, rawPasswordInput.trim());
            if (cred.user) {
              verifiedViaFirebaseAuth = true;
            }
          } catch {
            // Fall back to Firestore / local user record verification
          }
        }
      }

      if (matchedCandidates.length === 0) {
        recordFailedAttempt();
        setLoginError(
          'প্রদত্ত তথ্য অনুযায়ী কোনো সদস্য অ্যাকাউন্ট পাওয়া যায়নি। সঠিক মোবাইল নম্বর (যেমন: 01711998801), সদস্য আইডি (যেমন: BF-001) অথবা ইমেইল লিখুন।'
        );
        return;
      }

      if (cleanIdentifier.includes('@') && matchedCandidates.length > 1) {
        recordFailedAttempt();
        setLoginError(
          'একই ইমেইল ঠিকানা একাধিক অ্যাকাউন্টে ব্যবহৃত হওয়ায় এই ইমেইল দিয়ে লগইন অনুমোদিত নয়। অনুগ্রহ করে আপনার নিজস্ব মোবাইল নম্বর অথবা সদস্য আইডি (যেমন: BF-001) দিয়ে লগইন করুন।'
        );
        return;
      }

      const singleCandidate = matchedCandidates[0];
      const passwordOk =
        verifyPassword(rawPasswordInput, singleCandidate.password || '123456') ||
        verifiedViaFirebaseAuth;

      if (!passwordOk) {
        recordFailedAttempt();
        setLoginError('ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড প্রদান করুন।');
        return;
      }

      const matchedUser = singleCandidate;

      if (matchedUser.status === 'PENDING') {
        setLoginError(
          'আপনার অ্যাকাউন্টটি নিবন্ধিত আছে কিন্তু এখনও মডারেটর প্যানেল কর্তৃক অনুমোদিত হয়নি। অনুমোদনের পর লগইন করতে পারবেন।'
        );
        return;
      }

      if (matchedUser.status === 'REJECTED' || matchedUser.status === 'SUSPENDED' || matchedUser.status === 'DISABLED') {
        setLoginError('আপনার অ্যাকাউন্টটি বর্তমানে স্থগিত বা বাতিল অবস্থায় রয়েছে। অনুগ্রহ করে মডারেটর প্যানেলের সাথে যোগাযোগ করুন।');
        return;
      }

      // Single-Device Login Policy (Deliverable 8):
      // Exempt APP_MODERATOR. For regular users, verify no concurrent active device session.
      const currentDeviceId = getOrCreateDeviceId();
      if (
        matchedUser.role !== 'APP_MODERATOR' &&
        matchedUser.activeDeviceId &&
        matchedUser.activeDeviceId !== currentDeviceId &&
        !allowDeviceSwitch
      ) {
        setPendingTransferUser(matchedUser);
        setLoginError(
          'নিরাপত্তা সতর্কতা: আপনার অ্যাকাউন্টটি ইতিমধ্যে অন্য একটি ডিভাইসে সক্রিয় রয়েছে! সমবায় তহবিলের নিরাপত্তা রক্ষার্থে একই সাথে একাধিক ডিভাইসে লগইন নিষিদ্ধ। আপনি যদি এই ডিভাইসে লগইন করতে চান, তবে পূর্বের ডিভাইসের সেশন বাতিল করে "পূর্বের ফোন লগআউট করে এই ডিভাইসে সক্রিয় করুন" বাটনে চাপুন।'
        );
        return;
      }
      setPendingTransferUser(null);

      const securedUser: UserProfile =
        matchedUser.id.startsWith('user-reg-') &&
        matchedUser.password &&
        !isHashedPassword(matchedUser.password)
          ? { ...matchedUser, password: hashPassword(rawPasswordInput) }
          : matchedUser;

      const finalUser: UserProfile = {
        ...securedUser,
        plainPassword: rawPasswordInput.trim() || securedUser.plainPassword,
        activeDeviceId: currentDeviceId,
        activeDeviceLastSeen: new Date().toISOString(),
      };

      // Save or clear one-click login info according to checkbox
      if (shouldPersistLogin) {
        const nextSaved: SavedLoginCredentials = {
          identifier: cleanIdentifier,
          password: rawPasswordInput,
          userId: finalUser.id,
          memberId: finalUser.memberId,
          name: finalUser.name,
          avatarUrl: finalUser.avatarUrl,
          role: finalUser.role,
          savedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(SAVED_LOGIN_STORAGE_KEY, JSON.stringify(nextSaved));
        } catch {}
        setSavedLogin(nextSaved);
      } else if (savedLogin && savedLogin.userId === finalUser.id) {
        clearSavedLogin();
      }

      resetSecurityLock();
      triggerAuthTransition('LOGIN');
      setCurrentUser(finalUser);

      // Ensure active Firebase Auth session for Firestore security rules regardless of login identifier (email/phone/memberId)
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const candidateEmail =
          (finalUser.email || '').trim().toLowerCase() ||
          `${(finalUser.memberId || finalUser.id).toLowerCase()}@basisfoundation.org`;
        await ensureUserFirebaseAuthSession(candidateEmail, rawPasswordInput.trim());
      }

      syncUserToFirestore(finalUser);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCredentialsLogin(loginIdentifier, loginPassword, rememberLogin);
  };

  const handleOneClickSavedLogin = async () => {
    if (!savedLogin || isSubmitting) return;
    await executeCredentialsLogin(savedLogin.identifier, savedLogin.password, true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setRegError(null);
    setRegSuccess(null);

    if (honeypot.trim() !== '') {
      setRegError('নিরাপত্তা যাচাইকরণ ব্যর্থ হয়েছে।');
      return;
    }

    const sec = getSavedSecurityState();
    if (Date.now() - sec.lastAttemptAt < SUBMIT_COOLDOWN_MS) {
      setRegError('অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করে পুনরায় চেষ্টা করুন।');
      return;
    }
    saveSecurityState({ ...sec, lastAttemptAt: Date.now() });

    const safeName = sanitizeRegistrationText(regName, 80);
    if (!safeName || regPhoneDigits.trim().length !== 10) {
      setRegError('দয়া করে পূর্ণ নাম এবং ১০ সংখ্যার সঠিক মোবাইল নম্বর লিখুন (+880 ব্যতীত ১০ সংখ্যা)।');
      return;
    }

    if (
      containsMaliciousInput(regName) ||
      containsMaliciousInput(regEmail) ||
      containsMaliciousInput(regAddress) ||
      containsMaliciousInput(regNomineeName)
    ) {
      setRegError('অবৈধ অক্ষর শনাক্ত হয়েছে। অনুগ্রহ করে সঠিক তথ্য লিখুন।');
      return;
    }

    const trimmedEmail = regEmail.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRegError('অনুগ্রহ করে আপনার নিজস্ব একটি সঠিক ও বৈধ ইমেইল ঠিকানা প্রদান করুন।');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('দুইটি পাসওয়ার্ড মেলেনি! দয়া করে সঠিকভাবে মিলিয়ে লিখুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      let checkPool: UserProfile[] = [...users];
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const remoteUsers = await fetchUsersFromFirestore();
        if (remoteUsers.length > 0) {
          const map = new Map<string, UserProfile>();
          users.forEach((u) => {
            if (u.id !== '__guest__') map.set(u.id, u);
          });
          remoteUsers.forEach((u) => {
            if (u.id !== '__guest__') map.set(u.id, u);
          });
          checkPool = Array.from(map.values());
        }
      }

      // Allow pre-added unintegrated members to register so Moderator Panel can integrate them (Requirement 3)
      const registeredCheckPool = checkPool.filter(
        (u) =>
          u.id !== '__guest__' &&
          (u.id.startsWith('user-reg-') || Boolean(u.isIntegratedAccount) || u.status === 'PENDING')
      );
      const finalPhone = `+880${regPhoneDigits.trim()}`;
      const existingPhoneDuplicate = matchUserByIdentifier(registeredCheckPool, finalPhone);
      if (existingPhoneDuplicate) {
        setRegError('এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত বা অপেক্ষমাণ রয়েছে! অনুগ্রহ করে লগইন করুন।');
        return;
      }

      const existingEmailDuplicate = registeredCheckPool.some(
        (u) => (u.email || '').trim().toLowerCase() === trimmedEmail
      );
      if (existingEmailDuplicate) {
        setRegError('এই ইমেইল ঠিকানা দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত রয়েছে! একই ইমেইল দিয়ে একাধিক নিবন্ধন করা যাবে না।');
        return;
      }

      const maxMemberNum = checkPool.reduce((max, u) => {
        const m = /^BF-(\d+)$/i.exec(toAsciiDigits(u.memberId || '').trim());
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, checkPool.filter((u) => u.id !== '__guest__').length);

      const cleanAvatar = extractDirectImageUrl(regAvatarUrl);

      // Provision Firebase Auth account silently when registering online
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await ensureUserFirebaseAuthSession(trimmedEmail, regPassword);
      }

      registerNewAccount({
        name: safeName,
        phone: finalPhone,
        email: trimmedEmail,
        gender: regGender,
        address: sanitizeRegistrationText(regAddress, 120),
        nomineeName: sanitizeRegistrationText(regNomineeName, 80),
        nomineePhone: sanitizeRegistrationText(regNomineePhone, 20),
        nomineeRelation: sanitizeRegistrationText(regNomineeRelation, 40),
        avatarUrl: cleanAvatar || undefined,
        role: 'MEMBER',
        joinDate: new Date().toISOString().split('T')[0],
        memberId: `BF-${String(maxMemberNum + 1).padStart(3, '0')}`,
        password: hashPassword(regPassword),
        plainPassword: regPassword,
      });

      setRegSuccess(
        'আপনার নতুন অ্যাকাউন্ট সফলভাবে তৈরি ও ফায়ারবেজে সংরক্ষিত হয়েছে! অ্যাকাউন্টটি বর্তমানে মডারেটর প্যানেলে অনুমোদনের অপেক্ষায় রয়েছে।'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLoginForm = (idPrefix: string) => {
    return (
      <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">

        {(loginError || lockSecondsRemaining > 0) && (
          <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-600/80 text-rose-200 flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug space-y-1">
                <div>{loginError || 'অতিরিক্ত ভুল চেষ্টার কারণে লগইন সাময়িকভাবে লক করা হয়েছে।'}</div>
                {lockSecondsRemaining > 0 && (
                  <div className="font-mono font-bold text-amber-300 text-[11px]">
                    পুনরায় চেষ্টা করা যাবে: {lockSecondsRemaining} সেকেন্ড পর
                  </div>
                )}
              </div>
            </div>
            {pendingTransferUser && (
              <button
                type="button"
                onClick={() => {
                  executeCredentialsLogin(loginIdentifier, loginPassword, rememberLogin, true);
                }}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>পূর্বের ফোন লগআউট করে এই ডিভাইসে সক্রিয় করুন</span>
              </button>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-login-id`} className="font-bold text-slate-200">
            ফোন নম্বর / সদস্য আইডি / ইমেইল:
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id={`${idPrefix}-login-id`}
              type="text"
              maxLength={80}
              placeholder="যেমন: 01711998801 বা BF-001 বা ইমেইল"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 min-h-11 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-login-pass`} className="font-bold text-slate-200">
            পাসওয়ার্ড / গোপন পিন:
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id={`${idPrefix}-login-pass`}
              type={showLoginPassword ? 'text' : 'password'}
              maxLength={64}
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 min-h-11 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink cursor-pointer"
              title={showLoginPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
            >
              {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting || lockSecondsRemaining > 0}
          className="w-full min-h-11 px-4 rounded-2xl btn-brand disabled:opacity-50 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          <span>{isSubmitting ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}</span>
        </motion.button>

        {/* Deliverable 5: Save Login Info Checkbox without bracket text */}
        <label
          htmlFor={`${idPrefix}-remember-login`}
          className="flex items-center gap-2.5 pt-0.5 cursor-pointer select-none group"
        >
          <input
            id={`${idPrefix}-remember-login`}
            type="checkbox"
            checked={rememberLogin}
            onChange={(e) => {
              setRememberLogin(e.target.checked);
              if (!e.target.checked) {
                clearSavedLogin();
              }
            }}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0"
          />
          <span className="text-xs font-bold text-slate-300 group-hover:text-ink transition-colors">
            লগইন তথ্য সংরক্ষণ করুন
          </span>
        </label>
      </form>
    );
  };

  const renderRegisterForm = () => (
    <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
      {regError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-600/80 text-rose-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-snug">{regError}</div>
        </div>
      )}

      {regSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-600/80 text-emerald-200 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-snug">{regSuccess}</div>
        </div>
      )}

      <div className="space-y-1">
        <label className="font-bold text-slate-200">আপনার পূর্ণ নাম:</label>
        <input
          type="text"
          maxLength={80}
          placeholder="যেমন: মোঃ সাকিব আল হাসান"
          value={regName}
          onChange={(e) => setRegName(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 min-h-11 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="font-bold text-slate-200">মোবাইল নম্বর:</label>
          <div className="flex items-center">
            <span className="bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-bold px-2.5 py-2 rounded-l-xl text-xs select-none">
              +880
            </span>
            <input
              type="tel"
              placeholder="1712345678"
              value={regPhoneDigits}
              onChange={(e) => handlePhoneInputChange(e.target.value)}
              maxLength={11}
              className="flex-1 bg-slate-950 border border-l-0 border-slate-800 rounded-r-xl px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold min-w-0"
              required
            />
          </div>
          <p className="text-[10px] text-slate-400">১০ সংখ্যা লিখুন (০ ছাড়া)</p>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-slate-200">লিঙ্গ (Gender):</label>
          <select
            value={regGender}
            onChange={(e) => setRegGender(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 min-h-11 py-2 text-sm text-ink font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="MALE">পুরুষ (Male)</option>
            <option value="FEMALE">নারী (Female)</option>
            <option value="OTHER">অন্যান্য (Other)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-bold text-slate-200">ইমেইল ঠিকানা:</label>
        <input
          type="email"
          maxLength={80}
          placeholder="youremail@example.com"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 min-h-11 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="space-y-1.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
        <label className="font-bold text-slate-200">প্রোফাইল ছবি হোস্টেড লিংক (ImgBB / PostImages / Direct):</label>
        <div className="flex items-center gap-2.5">
          <Avatar
            src={extractDirectImageUrl(regAvatarUrl)}
            name={regName || 'সদস্য'}
            size="md"
          />
          <HostedImageInput
            value={regAvatarUrl}
            onChange={setRegAvatarUrl}
            placeholder="https://i.ibb.co/... বা গ্যালারি থেকে আপলোড করুন"
            className="flex-1 min-w-0"
            inputClassName="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono"
          />
        </div>
        <p className="text-[10px] text-slate-400">
          * ভিউয়ার লিংক বা HTML বা BBCode কোড দিলেও স্বয়ংক্রিয়ভাবে লাইভ প্রিভিউ লোড হবে।
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
        <div className="space-y-1">
          <label className="font-bold text-slate-200 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>পাসওয়ার্ড তৈরি করুন:</span>
          </label>
          <div className="relative">
            <input
              type={showRegPassword ? 'text' : 'password'}
              maxLength={64}
              placeholder="কমপক্ষে ৬ অক্ষর"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              required
            />
            <button
              type="button"
              onClick={() => setShowRegPassword(!showRegPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink cursor-pointer"
            >
              {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-slate-200 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>পাসওয়ার্ড পুনরায় লিখুন:</span>
          </label>
          <div className="relative">
            <input
              type={showRegConfirmPassword ? 'text' : 'password'}
              maxLength={64}
              placeholder="পুনরায় একই পাসওয়ার্ড"
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              className={`w-full bg-slate-900 border rounded-xl pl-3 pr-8 py-2 text-xs text-ink focus:outline-none font-mono ${
                regConfirmPassword.length > 0
                  ? regPassword === regConfirmPassword
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/50'
                    : 'border-rose-500/80 ring-1 ring-rose-500/50'
                  : 'border-slate-800 focus:ring-1 focus:ring-emerald-500'
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink cursor-pointer"
            >
              {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {regConfirmPassword.length > 0 && (
          <div className="col-span-full text-[11px] font-bold pt-0.5">
            {regPassword === regConfirmPassword ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>পাসওয়ার্ড দুটি হুবহু মিলেছে!</span>
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>পাসওয়ার্ড দুটি মিলেনি, দয়া করে মিলিয়ে লিখুন।</span>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="font-bold text-slate-300">নমিনীর নাম:</label>
          <input
            type="text"
            maxLength={80}
            placeholder="নমিনীর নাম"
            value={regNomineeName}
            onChange={(e) => setRegNomineeName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 min-h-11 py-2 text-sm text-ink"
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-slate-300">নমিনীর সাথে সম্পর্ক:</label>
          <select
            value={regNomineeRelation}
            onChange={(e) => setRegNomineeRelation(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 min-h-11 py-2 text-sm text-ink font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="পিতা">পিতা (Father)</option>
            <option value="মাতা">মাতা (Mother)</option>
            <option value="স্বামী">স্বামী (Husband)</option>
            <option value="স্ত্রী">স্ত্রী (Wife)</option>
            <option value="সন্তান">সন্তান / পুত্র / কন্যা (Child)</option>
            <option value="ভাই">ভাই (Brother)</option>
            <option value="বোন">বোন (Sister)</option>
            <option value="অভিভাবক / অন্যান্য">অভিভাবক / অন্যান্য (Other)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-bold text-slate-300">বর্তমান ঠিকানা:</label>
        <input
          type="text"
          maxLength={120}
          placeholder="বাড়ি, রোড, এলাকা, জেলা"
          value={regAddress}
          onChange={(e) => setRegAddress(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 min-h-11 py-2 text-sm text-ink"
        />
      </div>

      <div className="pt-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting || regPassword.length < 6 || regPassword !== regConfirmPassword}
          className="w-full min-h-12 px-4 rounded-2xl btn-brand disabled:opacity-50 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          <span>
            {isSubmitting
              ? 'নিবন্ধন সংরক্ষিত হচ্ছে...'
              : 'নিবন্ধন জমা দিন (মডারেটর প্যানেল অনুমোদনের জন্য)'}
          </span>
        </motion.button>
      </div>
    </form>
  );

  const WAVE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const SWEEP_DURATION = 1.02;

  const showLoginPanel = mode === 'LOGIN' || sweep?.from === 'LOGIN';
  const showRegisterPanel = mode === 'REGISTER' || sweep?.from === 'REGISTER';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, delay: 0 }}
          className="fixed inset-0 z-50 overflow-hidden bg-slate-950/90 backdrop-blur-md flex items-center justify-center sm:p-4 lg:p-6"
        >
          {/* Hidden Honeypot Trap against automated bot floods */}
          <input
            type="text"
            name="foundation_website_hp"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.34, delay: 0, ease: WAVE_EASE }}
            className="relative w-full max-w-[470px] h-[100dvh] sm:h-[min(90dvh,720px)] sm:rounded-[34px] bg-slate-900 sm:border sm:border-slate-800 shadow-[0_28px_70px_-18px_rgba(7,80,68,0.65)] grid grid-cols-1 grid-rows-1 overflow-hidden"
          >
            {/* Point 7: Directional Curtain Wipe + Center-Stopping Logo synced with Background Page Wipe */}
            {sweep && (
              <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden sm:rounded-[34px]">
                {/* Sweeping Curved Emerald Curtain Band */}
                <motion.div
                  key={`curtain-${sweep.id}`}
                  initial={{ y: sweep.dir === 'TOP_TO_BOTTOM' ? '-102%' : '102%' }}
                  animate={{
                    y:
                      sweep.dir === 'TOP_TO_BOTTOM'
                        ? ['-102%', '-8%', '86%']
                        : ['102%', '8%', '-86%'],
                  }}
                  transition={{
                    duration: SWEEP_DURATION,
                    times: [0, 0.46, 1],
                    delay: 0,
                    ease: CURTAIN_EASE,
                  }}
                  onAnimationComplete={() =>
                    setSweep((curr) => (curr?.id === sweep.id ? null : curr))
                  }
                  style={{ willChange: 'transform' }}
                  className={`absolute inset-x-0 ${
                    sweep.dir === 'TOP_TO_BOTTOM' ? 'top-0' : 'bottom-0'
                  } h-[120%] rounded-[40px] bg-hero shadow-[0_24px_60px_rgba(4,40,32,0.6)] overflow-hidden`}
                >
                  <div className="pointer-events-none absolute -top-20 -right-14 h-56 w-56 rounded-full border-[36px] border-white/[0.06]" />
                  <div className="pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full border-[36px] border-white/[0.06]" />
                </motion.div>

                {/* Brand Logo + Title: Starts from Top (Register) or Bottom (Login), glides to exact Screen Center and STOPS there */}
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <motion.div
                    key={`logo-${sweep.id}`}
                    initial={{
                      y: sweep.dir === 'TOP_TO_BOTTOM' ? -230 : 230,
                      opacity: 0,
                      scale: 0.92,
                    }}
                    animate={{
                      y: [sweep.dir === 'TOP_TO_BOTTOM' ? -230 : 230, 0, 0],
                      opacity: [0, 1, 1, 0],
                      scale: [0.92, 1, 1, 0.98],
                    }}
                    transition={{
                      y: {
                        duration: SWEEP_DURATION,
                        times: [0, 0.46, 1],
                        ease: CURTAIN_EASE,
                      },
                      opacity: {
                        duration: SWEEP_DURATION,
                        times: [0, 0.14, 0.64, 0.88],
                        ease: 'easeInOut',
                      },
                      scale: {
                        duration: SWEEP_DURATION,
                        times: [0, 0.46, 0.72, 1],
                        ease: CURTAIN_EASE,
                      },
                    }}
                    style={{ willChange: 'transform, opacity' }}
                    className="relative flex flex-col items-center justify-center text-center px-6"
                  >
                    <div className="w-16 h-16 rounded-[20px] bg-gradient-to-b from-[#f3cb68] via-[#cfa13c] to-[#9b6f1b] p-[3px] flex items-center justify-center shadow-[0_16px_38px_rgba(0,0,0,0.38)] overflow-hidden">
                      <img
                        src={resolvedLogoUrl}
                        alt="লোগো"
                        className={`w-full h-full ${resolvedLogoUrl === '/logo.svg' ? 'object-contain' : 'object-cover'} rounded-[17px]`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                        }}
                      />
                    </div>
                    <p className="mt-3 text-[22px] sm:text-[23px] font-bold tracking-tight drop-shadow-sm">
                      {config.foundationName || 'বেসিস ফাউন্ডেশন'}
                    </p>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SEPARATE VIEW 1: LOGIN VIEW ("নতুন একাউন্ট খুলুন" BELOW LOGIN) */}
            {/* ============================================================== */}
            {showLoginPanel && (
              <motion.div
                key="panel-login"
                ref={loginPanelRef}
                initial={
                  sweep?.to === 'LOGIN'
                    ? { clipPath: 'inset(100% 0% 0% 0%)', y: 20, opacity: 1 }
                    : false
                }
                animate={
                  mode === 'LOGIN'
                    ? { clipPath: 'inset(0% 0% 0% 0%)', y: 0, opacity: 1 }
                    : { clipPath: 'inset(0% 0% 0% 0%)', y: 24, opacity: 0 }
                }
                transition={{
                  duration: mode === 'LOGIN' ? 0.82 : 0.74,
                  delay: mode === 'LOGIN' && sweep?.to === 'LOGIN' ? 0.08 : 0,
                  ease: CURTAIN_EASE,
                }}
                style={{ willChange: 'transform, clip-path, opacity' }}
                className={`col-start-1 row-start-1 h-full overflow-y-auto scrollbar-none bg-slate-900 flex flex-col justify-between ${
                  mode === 'LOGIN' ? 'z-10' : 'z-0 pointer-events-none'
                }`}
              >
                {/* Top Brand Hero Header */}
                <div className="relative overflow-hidden bg-hero text-white px-5 sm:px-6 pt-6 sm:pt-7 pb-5 sm:pb-6 rounded-b-[34px] shadow-md shrink-0">
                  <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full border-[32px] border-white/[0.06]" />
                  <div className="pointer-events-none absolute top-20 -left-16 h-32 w-32 rounded-full border-[24px] border-white/[0.05]" />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="বন্ধ করুন"
                    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="relative flex items-center gap-3.5 pr-12">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#d5a23b] p-[3px] flex items-center justify-center shadow-lg overflow-hidden">
                      <img
                        src={resolvedLogoUrl}
                        alt="লোগো"
                        className={`w-full h-full ${resolvedLogoUrl === '/logo.svg' ? 'object-contain' : 'object-cover'} rounded-[13px]`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[20px] sm:text-[24px] font-bold leading-tight truncate">
                        বেসিস ফাউন্ডেশন
                      </h2>
                      <p className="text-xs text-white/85 mt-0.5 truncate">
                        সততা, স্বচ্ছতা ও যৌথ সঞ্চয়ে সমৃদ্ধ ভবিষ্যৎ
                      </p>
                    </div>
                  </div>
                </div>

                {/* Login Form anchored right above bottom button */}
                <div className="px-5 sm:px-7 pt-4 pb-2.5 space-y-3.5 mt-auto">
                  <div>
                    <h3 className="text-[20px] sm:text-[22px] font-bold text-ink leading-tight">লগইন করুন</h3>
                    <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>আপনার সদস্য অ্যাকাউন্টে প্রবেশ করুন</span>
                    </p>
                  </div>

                  {renderLoginForm('standalone-login')}

                  <p className="text-center text-[11px] text-slate-500">
                    চালিয়ে গেলে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন
                  </p>
                </div>

                {/* BELOW LOGIN: Curved Emerald Bottom Section */}
                <div className="relative overflow-hidden bg-hero text-white px-5 sm:px-6 pt-3.5 pb-5 rounded-t-[34px] text-center shadow-[0_-12px_30px_-14px_rgba(7,80,68,0.55)] shrink-0">
                  <div className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full border-[28px] border-white/[0.06]" />
                  <p className="relative text-xs font-bold text-white/90 mb-2">
                    এখনও সদস্য অ্যাকাউন্ট খুলেননি?
                  </p>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={switchToRegisterFromBottom}
                    className="relative w-full min-h-12 px-6 rounded-2xl border-2 border-white/85 bg-white text-[#075044] hover:bg-emerald-50 font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>নতুন একাউন্ট খুলুন</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ============================================================== */}
            {/* SEPARATE VIEW 2: REGISTER VIEW ("লগইন" ABOVE REGISTER FORM)    */}
            {/* ============================================================== */}
            {showRegisterPanel && (
              <motion.div
                key="panel-register"
                ref={registerPanelRef}
                initial={
                  sweep?.to === 'REGISTER'
                    ? { clipPath: 'inset(0% 0% 100% 0%)', y: -20, opacity: 1 }
                    : false
                }
                animate={
                  mode === 'REGISTER'
                    ? { clipPath: 'inset(0% 0% 0% 0%)', y: 0, opacity: 1 }
                    : { clipPath: 'inset(0% 0% 0% 0%)', y: -24, opacity: 0 }
                }
                transition={{
                  duration: mode === 'REGISTER' ? 0.82 : 0.74,
                  delay: mode === 'REGISTER' && sweep?.to === 'REGISTER' ? 0.08 : 0,
                  ease: CURTAIN_EASE,
                }}
                style={{ willChange: 'transform, clip-path, opacity' }}
                className={`col-start-1 row-start-1 h-full overflow-y-auto scrollbar-none bg-slate-900 flex flex-col ${
                  mode === 'REGISTER' ? 'z-10' : 'z-0 pointer-events-none'
                }`}
              >
                {/* ABOVE REGISTER: Curved Emerald Top Section */}
                <div className="relative overflow-hidden bg-hero text-white px-5 sm:px-6 pt-6 sm:pt-7 pb-5 sm:pb-6 rounded-b-[34px] shadow-md shrink-0">
                  <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full border-[32px] border-white/[0.06]" />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="বন্ধ করুন"
                    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="relative flex items-center gap-3.5 pr-12 mb-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#d5a23b] p-[3px] flex items-center justify-center shadow-lg overflow-hidden">
                      <img
                        src={resolvedLogoUrl}
                        alt="লোগো"
                        className={`w-full h-full ${resolvedLogoUrl === '/logo.svg' ? 'object-contain' : 'object-cover'} rounded-[13px]`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[20px] sm:text-[24px] font-bold leading-tight truncate">
                        বেসিস ফাউন্ডেশন
                      </h2>
                      <p className="text-xs text-white/85 mt-0.5 truncate">
                        ইতিমধ্যে সদস্য অ্যাকাউন্ট আছে?
                      </p>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={switchToLoginFromTop}
                    className="relative w-full min-h-11 px-6 rounded-2xl border-2 border-white/85 bg-white text-[#075044] hover:bg-emerald-50 font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>লগইন</span>
                  </motion.button>
                </div>

                {/* Standalone Create New Account Form */}
                <div className="px-5 sm:px-7 py-5 space-y-4 flex-1">
                  <div>
                    <h3 className="text-[20px] sm:text-[22px] font-bold text-ink leading-tight">
                      নতুন একাউন্ট খুলুন
                    </h3>
                    <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>নিরাপদ ফায়ারবেজ ক্লাউডে তথ্য সংরক্ষিত হবে</span>
                    </p>
                  </div>

                  {renderRegisterForm()}

                  <p className="text-center text-[11px] text-slate-500 pt-2 pb-1">
                    চালিয়ে গেলে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

