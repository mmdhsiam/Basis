import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { NavigationDrawer, SidebarNav } from './components/layout/NavigationDrawer';
import { BottomNav } from './components/layout/BottomNav';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { MemberList } from './components/members/MemberList';
import { SavingsView } from './components/savings/SavingsView';
import { ReceiptsView } from './components/receipts/ReceiptsView';
import { FinancialAnalyticsView } from './components/analytics/FinancialAnalyticsView';
import { ModeratorPanel } from './components/moderator/ModeratorPanel';
import { AppModeratorPanel } from './components/appmoderator/AppModeratorPanel';
import { ChatView } from './components/chat/ChatView';
import { AboutUsView } from './components/more/AboutUsView';
import { NoticesView } from './components/more/NoticesView';
import { RulesView } from './components/more/RulesView';
import { ComplaintsView } from './components/more/ComplaintsView';
import { FeatureRequestsView } from './components/more/FeatureRequestsView';
import { GoogleSheetsView } from './components/more/GoogleSheetsView';
import { ProfileView } from './components/profile/ProfileView';
import { BankInformationView } from './components/bank/BankInformationView';
import { ExecutiveCouncilView } from './components/more/ExecutiveCouncilView';
import { RotateCw, ShieldAlert, LogIn, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PageTabTransition, SMOOTH_EASE } from './components/common/MotionPrimitives';

// Modals
import { ExitConfirmationModal } from './components/modals/ExitConfirmationModal';
import { CallModal } from './components/modals/CallModal';
import { AppUpdateModal } from './components/modals/AppUpdateModal';
import { NewSavingsModal } from './components/savings/NewSavingsModal';
import { NewMemberModal } from './components/members/NewMemberModal';
import { FirebaseGuideModal } from './components/modals/FirebaseGuideModal';
import { ReceiptPrintModal } from './components/modals/ReceiptPrintModal';
import { SuccessCelebrationModal } from './components/modals/SuccessCelebrationModal';
import { PrivateChatModal } from './components/chat/PrivateChatModal';
import { AuthModal } from './components/modals/AuthModal';
import { UniversalSearchModal } from './components/modals/UniversalSearchModal';
import { OverdueReminderPopupModal } from './components/modals/OverdueReminderPopupModal';
import { AuthBrandTransitionOverlay } from './components/modals/AuthBrandTransitionOverlay';
import { UserNotificationToast } from './components/modals/UserNotificationToast';
import { popTopBackHandler } from './utils/backNavigation';

function MainAppShell() {
  const {
    currentUser,
    unreadCount,
    isGuestMode,
    activeUpdateDialog,
    setActiveUpdateDialog,
    showExitDialog,
    setShowExitDialog,
    isOnline,
    theme,
    warningDialog,
    closeWarning,
    triggerGuestWarning,
    successMessage,
    closeSuccess,
    triggerSuccess,
    activePrintReceipt,
    setActivePrintReceipt,
    config,
    activePrivateChatUser,
    setActivePrivateChatUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isSearchModalOpen,
    setIsSearchModalOpen,
    refreshAllData,
    isRefreshing,
    authTransition,
  } = useApp();

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState<boolean>(false);
  const [isNewSavingsModalOpen, setIsNewSavingsModalOpen] = useState<boolean>(false);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState<boolean>(false);
  const [isFirebaseGuideOpen, setIsFirebaseGuideOpen] = useState<boolean>(false);
  const [targetReceiptTxId, setTargetReceiptTxId] = useState<string | undefined>(undefined);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? Boolean((window as any).__androidKeyboardOpen) : false
  );

  const isModeratorUser =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  const activeTabRef = useRef<string>('home');
  const prevNonProfileTabRef = useRef<string>('home');
  const tabHistoryRef = useRef<string[]>([]);
  const modalStateRef = useRef({
    warningDialog,
    showExitDialog,
    isSearchModalOpen,
    isNewSavingsModalOpen,
    isNewMemberModalOpen,
    isFirebaseGuideOpen,
    isDrawerOpen,
    isCallModalOpen,
    activePrintReceipt,
    activePrivateChatUser,
    isAuthModalOpen,
    activeUpdateDialog,
  });

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Requirement 1: Always navigate to Dashboard ('home') after Login or Logout
  useEffect(() => {
    if (!authTransition?.id) return;
    activeTabRef.current = 'home';
    prevNonProfileTabRef.current = 'home';
    tabHistoryRef.current = [];
    setActiveTab('home');
    setIsDrawerOpen(false);
    setActivePrivateChatUser(null);
    window.history.replaceState({ appRoot: true, appTab: 'home' }, '', '#home');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [authTransition?.id, setActivePrivateChatUser]);

  useEffect(() => {
    modalStateRef.current = {
      warningDialog,
      showExitDialog,
      isSearchModalOpen,
      isNewSavingsModalOpen,
      isNewMemberModalOpen,
      isFirebaseGuideOpen,
      isDrawerOpen,
      isCallModalOpen,
      activePrintReceipt,
      activePrivateChatUser,
      isAuthModalOpen,
      activeUpdateDialog,
    };
  }, [
    warningDialog,
    showExitDialog,
    isSearchModalOpen,
    isNewSavingsModalOpen,
    isNewMemberModalOpen,
    isFirebaseGuideOpen,
    isDrawerOpen,
    isCallModalOpen,
    activePrintReceipt,
    activePrivateChatUser,
    isAuthModalOpen,
    activeUpdateDialog,
  ]);

  const handleTabChange = useCallback((rawTab: string) => {
    const newTab = rawTab === 'settings' ? 'profile' : rawTab;
    if (newTab !== 'profile') {
      prevNonProfileTabRef.current = newTab;
    }
    const currentTab = activeTabRef.current;
    if (newTab !== currentTab) {
      const stack = tabHistoryRef.current;
      if (stack[stack.length - 1] !== currentTab) {
        stack.push(currentTab);
        if (stack.length > 40) stack.shift();
      }
      window.history.pushState({ appRoot: true, appTab: newTab }, '', `#${newTab}`);
      activeTabRef.current = newTab;
      setActiveTab(newTab);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const handleToggleProfile = useCallback(() => {
    if (activeTabRef.current === 'profile') {
      // Step back cleanly to the previous screen
      const stack = tabHistoryRef.current;
      const last = stack.length > 0 ? stack[stack.length - 1] : prevNonProfileTabRef.current || 'home';
      if (stack.length > 0 && last !== 'profile') {
        stack.pop();
        window.history.pushState({ appRoot: true, appTab: last }, '', `#${last}`);
        activeTabRef.current = last;
        setActiveTab(last);
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        handleTabChange(prevNonProfileTabRef.current || 'home');
      }
    } else {
      handleTabChange('profile');
    }
  }, [handleTabChange]);

  const handleOpenReceipt = (txId: string) => {
    setTargetReceiptTxId(txId);
    handleTabChange('receipts');
  };

  const handleOpenNewSavings = () => {
    if (isGuestMode) {
      triggerGuestWarning('নতুন সঞ্চয় জমা দাখিল');
      return;
    }
    setIsNewSavingsModalOpen(true);
  };

  const handleOpenNewMember = () => {
    if (isGuestMode) {
      triggerGuestWarning('নতুন সদস্য নিবন্ধন');
      return;
    }
    setIsNewMemberModalOpen(true);
  };

  // Unified Back Handler for Browser History & Android Studio Hardware Back Button (Points 3, 5, 12)
  const executeBackNavigation = useCallback(
    (fromPopState: boolean): boolean => {
      const modal = modalStateRef.current;

      const restoreHistoryAfterOverlayClose = () => {
        if (fromPopState) {
          const cur = activeTabRef.current;
          window.history.pushState(
            { appRoot: true, appTab: cur },
            '',
            `#${cur}`
          );
        }
      };

      // 0. Close topmost child/portal overlay first (Avatar lightbox, MemberDetailsModal, StatementPrintModal, OverdueReminderPopupModal)
      if (popTopBackHandler()) {
        restoreHistoryAfterOverlayClose();
        return true;
      }

      if (modal.warningDialog) {
        closeWarning();
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.showExitDialog) {
        setShowExitDialog(false);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.isSearchModalOpen) {
        setIsSearchModalOpen(false);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.isNewSavingsModalOpen) {
        setIsNewSavingsModalOpen(false);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.isNewMemberModalOpen) {
        setIsNewMemberModalOpen(false);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.isFirebaseGuideOpen) {
        setIsFirebaseGuideOpen(false);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.isDrawerOpen) {
        setIsDrawerOpen(false);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.isCallModalOpen) {
        setIsCallModalOpen(false);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.activePrintReceipt) {
        setActivePrintReceipt(null);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.activePrivateChatUser) {
        setActivePrivateChatUser(null);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.isAuthModalOpen) {
        setIsAuthModalOpen(false);
        restoreHistoryAfterOverlayClose();
        return true;
      }
      if (modal.activeUpdateDialog) {
        if (modal.activeUpdateDialog.isMandatory) {
          restoreHistoryAfterOverlayClose();
          return true;
        }
        setActiveUpdateDialog(null);
        restoreHistoryAfterOverlayClose();
        return true;
      }

      // Navigate step-by-step to the actual previous screen in tabHistoryRef (Point 2)
      while (tabHistoryRef.current.length > 0) {
        const prevTab = tabHistoryRef.current.pop()!;
        if (prevTab && prevTab !== activeTabRef.current) {
          activeTabRef.current = prevTab;
          if (prevTab !== 'profile') {
            prevNonProfileTabRef.current = prevTab;
          }
          setActiveTab(prevTab);
          window.history.replaceState({ appRoot: true, appTab: prevTab }, '', `#${prevTab}`);
          if (fromPopState) {
            window.history.pushState({ appRoot: true, appTab: prevTab }, '', `#${prevTab}`);
          }
          window.scrollTo({ top: 0, behavior: 'auto' });
          return true;
        }
      }

      // Fallback if history stack is empty and user is on a non-home tab
      if (activeTabRef.current !== 'home') {
        activeTabRef.current = 'home';
        prevNonProfileTabRef.current = 'home';
        setActiveTab('home');
        window.history.replaceState({ appRoot: true, appTab: 'home' }, '', '#home');
        if (fromPopState) {
          window.history.pushState({ appRoot: true, appTab: 'home' }, '', '#home');
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
        return true;
      }

      // Already on Home Dashboard with empty back stack and no modals open -> show Exit Confirmation Modal
      setShowExitDialog(true);
      if (fromPopState) {
        window.history.pushState({ appRoot: true, appTab: 'home' }, '', '#home');
      }
      return true;
    },
    [
      closeWarning,
      setActivePrintReceipt,
      setActivePrivateChatUser,
      setActiveUpdateDialog,
      setIsAuthModalOpen,
      setIsCallModalOpen,
      setIsDrawerOpen,
      setIsFirebaseGuideOpen,
      setIsNewMemberModalOpen,
      setIsNewSavingsModalOpen,
      setIsSearchModalOpen,
      setShowExitDialog,
    ]
  );

  const executeBackRef = useRef(executeBackNavigation);
  useEffect(() => {
    executeBackRef.current = executeBackNavigation;
  }, [executeBackNavigation]);

  useEffect(() => {
    if (!window.history.state?.appRoot) {
      window.history.replaceState({ appRoot: true, appTab: 'home' }, '', '#home');
      window.history.pushState({ appRoot: true, appTab: 'home' }, '', '#home');
    }

    const handlePopState = () => {
      executeBackRef.current(true);
    };

    // Expose stable global callback for Android Studio OnBackPressedCallback WebView integration
    window.__handleAndroidBack = () => executeBackRef.current(false);

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      delete window.__handleAndroidBack;
    };
  }, []);

  // Track soft keyboard state (Native Android bridge + visualViewport + input focus) & keep active input visible
  useEffect(() => {
    let maxHeight =
      typeof window !== 'undefined'
        ? Math.max(window.innerHeight || 0, window.visualViewport?.height || 0)
        : 0;
    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const isTextEntryElement = (el: Element | null): el is HTMLElement => {
      if (!el || !(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName === 'INPUT') {
        const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
        return !['checkbox', 'radio', 'file', 'range', 'color', 'button', 'submit', 'reset'].includes(type);
      }
      return false;
    };

    const handleAndroidKeyboardChange = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      const open = Boolean(detail?.open);
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
      setIsKeyboardOpen(open);
    };

    const handleFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (isTextEntryElement(el)) {
        if (blurTimer) {
          clearTimeout(blurTimer);
          blurTimer = null;
        }
        setIsKeyboardOpen(true);
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      }
    };

    const handleBlur = () => {
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        const active = document.activeElement;
        const nativeOpen = Boolean((window as any).__androidKeyboardOpen);
        const vvHeight = window.visualViewport?.height || window.innerHeight;
        const viewportShrunk = maxHeight > 0 && vvHeight < maxHeight - 130;
        if (!isTextEntryElement(active) && !nativeOpen && !viewportShrunk) {
          setIsKeyboardOpen(false);
        }
      }, 150);
    };

    const handleResize = () => {
      const vvHeight = window.visualViewport?.height || window.innerHeight;
      if (vvHeight > maxHeight) {
        maxHeight = vvHeight;
      }
      const viewportShrunk = maxHeight > 0 && vvHeight < maxHeight - 130;
      const active = document.activeElement;
      if (viewportShrunk) {
        setIsKeyboardOpen(true);
      } else if (!isTextEntryElement(active) && !(window as any).__androidKeyboardOpen) {
        setIsKeyboardOpen(false);
      }
      if (active && isTextEntryElement(active)) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const handlePointerCheck = () => {
      setTimeout(() => {
        const active = document.activeElement;
        const nativeOpen = Boolean((window as any).__androidKeyboardOpen);
        const vvHeight = window.visualViewport?.height || window.innerHeight;
        const viewportShrunk = maxHeight > 0 && vvHeight < maxHeight - 130;
        if (!isTextEntryElement(active) && !nativeOpen && !viewportShrunk) {
          setIsKeyboardOpen(false);
        }
      }, 120);
    };

    window.addEventListener('android-keyboard-change', handleAndroidKeyboardChange);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    document.addEventListener('pointerup', handlePointerCheck);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      window.removeEventListener('android-keyboard-change', handleAndroidKeyboardChange);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
      document.removeEventListener('pointerup', handlePointerCheck);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Mouse Cursor Hold-and-Drag to Scroll
  useEffect(() => {
    let isDown = false;
    let startY = 0;
    let scrollTop = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const target = e.target;
      if (target.closest('button, input, textarea, select, a, [role="button"]') || target.closest('.no-drag, .overflow-y-auto')) {
        return;
      }
      isDown = true;
      startY = e.pageY - window.scrollY;
      scrollTop = window.scrollY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const y = e.pageY - window.scrollY;
      const walk = (y - startY) * 1.5;
      window.scrollTo({ top: scrollTop - walk, behavior: 'auto' });
    };

    const onMouseUp = () => {
      isDown = false;
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Point 14: Pull-to-Refresh Swipe Down — ONLY on Home Dashboard, ONLY for Moderators, Harder Long Vertical Pull, NO Horizontal Swipe
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isTouchingTop = useRef(false);
  const pullCancelled = useRef(false);
  const PULL_TRIGGER_THRESHOLD = 68; // Requires ~180px firm straight-down vertical pull

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTab !== 'home' || !isModeratorUser) {
      isTouchingTop.current = false;
      pullCancelled.current = true;
      return;
    }
    if (window.scrollY <= 2 && e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      isTouchingTop.current = true;
      pullCancelled.current = false;
    } else {
      isTouchingTop.current = false;
      pullCancelled.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (
      activeTab !== 'home' ||
      !isModeratorUser ||
      !isTouchingTop.current ||
      pullCancelled.current ||
      window.scrollY > 2
    ) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const rawDiffY = currentY - touchStartY.current;
    const absDiffX = Math.abs(currentX - touchStartX.current);

    // Immediately abort if user swipes left/right or diagonally
    if (absDiffX > 22 || (rawDiffY > 12 && absDiffX > rawDiffY * 0.32)) {
      pullCancelled.current = true;
      isTouchingTop.current = false;
      setPullY(0);
      return;
    }

    // Require intentional long vertical pull (deadzone 30px)
    if (rawDiffY > 30) {
      setPullY(Math.min((rawDiffY - 30) * 0.45, 92));
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = async () => {
    if (activeTab === 'home' && isModeratorUser && !pullCancelled.current && pullY >= PULL_TRIGGER_THRESHOLD) {
      setPullY(60);
      await refreshAllData();
    }
    setPullY(0);
    isTouchingTop.current = false;
    pullCancelled.current = false;
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    if (typeof window !== 'undefined' && window.AndroidBridge?.exitApp) {
      try {
        window.AndroidBridge.exitApp();
        return;
      } catch (e) {
        console.warn('AndroidBridge.exitApp error:', e);
      }
    }
    triggerSuccess('অ্যাপ্লিকেশন সেশন সমাপ্ত হয়েছে। আবার দেখা হবে!');
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`${
        activeTab === 'chat' ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
      } w-full max-w-full overflow-x-hidden flex flex-col selection:bg-emerald-500 selection:text-white cursor-default select-none text-slate-100`}
    >
      {/* Moderator Home-Only Pull-to-Refresh Indicator & Cloud Sync Feedback */}
      {isModeratorUser && activeTab === 'home' && (pullY > 0 || isRefreshing) && (
        <div
          style={{ transform: `translateY(${Math.max(pullY, isRefreshing ? 48 : 0)}px)` }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/95 border border-emerald-500/80 shadow-2xl text-xs font-bold text-ink transition-all backdrop-blur-md"
        >
          <RotateCw
            className={`w-4 h-4 text-emerald-400 ${
              pullY >= PULL_TRIGGER_THRESHOLD || isRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span>
            {isRefreshing
              ? 'ফায়ারবেজ ক্লাউড সিঙ্ক হচ্ছে...'
              : pullY >= PULL_TRIGGER_THRESHOLD
              ? 'ছেড়ে দিন এবং ক্লাউড সিঙ্ক করুন'
              : 'আরও নিচে লম্বা টান দিন সিঙ্ক করতে'}
          </span>
        </div>
      )}

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-rose-600 text-white text-xs py-2 px-4 text-center font-bold sticky top-0 z-50 shadow-md flex items-center justify-center gap-2">
          <span>ইন্টারনেট সংযোগ নেই! সিংক ও লাইভ আপডেটের জন্য ইন্টারনেট সংযোগ চালু করুন।</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        onOpenDrawer={() => setIsDrawerOpen(true)}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onToggleProfile={handleToggleProfile}
        onInitiateCall={() => {
          if (isGuestMode) {
            triggerGuestWarning('গ্রুপ কল শুরু');
            return;
          }
          setIsCallModalOpen(true);
        }}
      />

      {/* Permanent sidebar (desktop) */}
      <SidebarNav
        onClose={() => {}}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onShowExitDialog={() => setShowExitDialog(true)}
        onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
      />

      {/* Navigation Drawer (mobile / tablet) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onShowExitDialog={() => setShowExitDialog(true)}
        onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
      />

      {/* Content Area */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto ${
          activeTab === 'chat'
            ? `min-h-0 flex flex-col overflow-hidden p-2 sm:p-3 ${
                isKeyboardOpen ? 'pb-2' : 'pb-[72px]'
              } lg:pb-3`
            : `p-3 sm:p-5 ${isKeyboardOpen ? 'pb-3' : 'pb-18'} lg:pb-8 overflow-x-clip`
        } lg:pl-[16rem] lg:max-w-none lg:mx-0 lg:pr-6`}
      >
        <PageTabTransition
          tabKey={activeTab}
          className={activeTab === 'chat' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}
        >
          {activeTab === 'home' && (
            <HomeDashboard
              setActiveTab={handleTabChange}
              onOpenNewSavingsModal={handleOpenNewSavings}
            />
          )}

          {activeTab === 'about-us' && (
            <AboutUsView onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)} />
          )}

          {activeTab === 'members' && (
            <MemberList
              onOpenReceipt={handleOpenReceipt}
              onOpenNewMemberModal={handleOpenNewMember}
            />
          )}

          {activeTab === 'savings' && (
            <SavingsView
              onOpenNewSavingsModal={handleOpenNewSavings}
              onOpenReceipt={handleOpenReceipt}
            />
          )}

          {activeTab === 'receipts' && (
            <ReceiptsView selectedReceiptTxId={targetReceiptTxId} />
          )}

          {activeTab === 'analytics' && <FinancialAnalyticsView />}

          {activeTab === 'moderator' && (
            <ModeratorPanel
              onOpenReceipt={handleOpenReceipt}
              setActiveTab={handleTabChange}
            />
          )}

          {activeTab === 'app-moderator' && <AppModeratorPanel />}

          {activeTab === 'chat' && (
            <ChatView
              onInitiateCall={() => {
                if (isGuestMode) {
                  triggerGuestWarning('অডিও/ভিডিও কল');
                  return;
                }
                setIsCallModalOpen(true);
              }}
            />
          )}

          {activeTab === 'notices' && <NoticesView />}

          {activeTab === 'executive' && <ExecutiveCouncilView />}

          {activeTab === 'rules' && <RulesView />}

          {activeTab === 'complaints' && <ComplaintsView />}

          {activeTab === 'features' && <FeatureRequestsView />}

          {activeTab === 'sheets' && <GoogleSheetsView />}

          {(activeTab === 'profile' || activeTab === 'settings') && (
            <ProfileView
              onOpenReceipt={handleOpenReceipt}
              onShowExitDialog={() => setShowExitDialog(true)}
              onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
            />
          )}

          {activeTab === 'bank' && <BankInformationView />}
        </PageTabTransition>
      </main>

      {/* Bottom Navigation for Mobile — auto-hides globally whenever soft keyboard opens */}
      {!isKeyboardOpen && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isDrawerOpen={isDrawerOpen}
          onOpenDrawer={() => setIsDrawerOpen((v) => !v)}
          unreadCount={unreadCount}
          onNewDeposit={handleOpenNewSavings}
        />
      )}

      {/* Universal Search Modal */}
      <UniversalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectTab={handleTabChange}
      />

      {/* Exit Confirmation Modal */}
      <ExitConfirmationModal
        isOpen={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onConfirmExit={handleConfirmExit}
      />

      {/* Real-Time Call Modal */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
      />

      {/* App Release / Force Update Modal */}
      <AppUpdateModal
        release={activeUpdateDialog}
        onClose={() => {
          if (!activeUpdateDialog?.isMandatory) {
            setActiveUpdateDialog(null);
          }
        }}
      />

      {/* New Savings Entry Modal */}
      <NewSavingsModal
        isOpen={isNewSavingsModalOpen}
        onClose={() => setIsNewSavingsModalOpen(false)}
      />

      {/* New Member Registration Modal */}
      <NewMemberModal
        isOpen={isNewMemberModalOpen}
        onClose={() => setIsNewMemberModalOpen(false)}
      />

      {/* Firebase Setup & Login Guide Modal */}
      <FirebaseGuideModal
        isOpen={isFirebaseGuideOpen}
        onClose={() => setIsFirebaseGuideOpen(false)}
      />

      {/* High-Res Receipt Print & Preview Modal */}
      <ReceiptPrintModal
        receipt={activePrintReceipt}
        config={config}
        onClose={() => setActivePrintReceipt(null)}
      />

      {/* Success Celebration Micro-Animation Modal */}
      <SuccessCelebrationModal
        message={successMessage}
        onClose={closeSuccess}
      />

      {/* Guest Read-Only / Offline Sync Warning Modal (Points 6, 7, 14) */}
      <AnimatePresence>
        {warningDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.24, ease: SMOOTH_EASE }}
              className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink leading-snug">{warningDialog.title}</h3>
                </div>
                <button
                  onClick={closeWarning}
                  className="p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{warningDialog.message}</p>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={closeWarning}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  বন্ধ করুন
                </button>
                {warningDialog.showLoginCta && (
                  <button
                    onClick={() => {
                      closeWarning();
                      setIsAuthModalOpen(true);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>লগইন করুন</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1-on-1 Private Direct Messaging Modal */}
      <PrivateChatModal
        isOpen={!!activePrivateChatUser}
        targetUser={activePrivateChatUser}
        onClose={() => setActivePrivateChatUser(null)}
      />

      {/* User Login & Account Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Overdue Deposit Reminder Official Popup Modal (Point 8) */}
      <OverdueReminderPopupModal
        onOpenDepositModal={handleOpenNewSavings}
      />

      {/* Live User Approval & Personal Notification Toast Banner */}
      <UserNotificationToast />

      {/* Smooth Center-Resting Login / Logout Brand Transition Curtain (Point 6) */}
      <AuthBrandTransitionOverlay />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppShell />
    </AppProvider>
  );
}
