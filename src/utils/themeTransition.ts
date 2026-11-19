import React from 'react';
import { flushSync } from 'react-dom';

export type ResolvedTheme = 'dark' | 'light';
export type ThemePreference = 'dark' | 'light';

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition?: () => void;
}

let activeTransition: ViewTransitionLike | null = null;

export function resolveSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function resolveThemePreference(mode: ThemePreference | 'system'): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }
  return resolveSystemTheme();
}

/**
 * Applies dark/light theme cleanly with 0ms click response.
 * Uses flushSync and freeze rules so every element, background, and card snaps
 * to the new theme synchronously with ZERO color lag, ZERO delayed spots, and ZERO stutter,
 * while animating a buttery-smooth growing circle originating directly from the theme icon.
 */
export function applyThemeWithTransition(
  nextMode: ThemePreference,
  currentResolvedTheme: ResolvedTheme,
  setThemeMode: (mode: ThemePreference) => void,
  trigger?: HTMLElement | React.MouseEvent | MouseEvent | null | unknown
): void {
  const nextResolved = resolveThemePreference(nextMode);

  const commitDomTheme = () => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (nextResolved === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
      root.style.colorScheme = nextResolved;
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', nextResolved === 'dark' ? '#0d1513' : '#f4f7f5');
      }
    }
    setThemeMode(nextMode);
  };

  if (nextResolved === currentResolvedTheme) {
    commitDomTheme();
    return;
  }

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const doc = typeof document !== 'undefined' ? (document as Document & {
    startViewTransition?: (cb: () => void) => ViewTransitionLike;
  }) : null;

  if (prefersReduced || !doc || typeof doc.startViewTransition !== 'function') {
    commitDomTheme();
    return;
  }

  // Abort any previous transition if clicked rapidly to eliminate lag
  if (activeTransition?.skipTransition) {
    try {
      activeTransition.skipTransition();
    } catch {
      // ignore
    }
    activeTransition = null;
  }

  // Determine origin (originX, originY) of the mode icon for circular expansion
  let originX = typeof window !== 'undefined' ? window.innerWidth - 65 : 300;
  let originY = 30;

  if (trigger && typeof trigger === 'object') {
    if ('clientX' in trigger && typeof (trigger as { clientX: number }).clientX === 'number') {
      const mouse = trigger as { clientX: number; clientY: number };
      originX = mouse.clientX;
      originY = mouse.clientY;
    } else if (
      'getBoundingClientRect' in trigger &&
      typeof (trigger as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect === 'function'
    ) {
      const rect = (trigger as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }
  } else if (typeof document !== 'undefined') {
    const el = document.querySelector('[data-theme-toggle]') as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }
  }

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const maxDimX = Math.max(originX, winW - originX);
  const maxDimY = Math.max(originY, winH - originY);
  const endRadius = Math.ceil(Math.hypot(maxDimX, maxDimY));

  const root = document.documentElement;

  try {
    // Freeze transitions so snapshot captures 100% finished colors instantly with 0 lag
    root.classList.add('theme-transitioning');

    const transition = doc.startViewTransition(() => {
      // Force React to synchronously flush all DOM changes before taking snapshot
      flushSync(() => {
        commitDomTheme();
      });
    });

    activeTransition = transition;

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${Math.round(originX)}px ${Math.round(originY)}px)`,
              `circle(${endRadius}px at ${Math.round(originX)}px ${Math.round(originY)}px)`,
            ],
          },
          {
            duration: 340,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      })
      .catch(() => {});

    transition.finished
      .catch(() => {})
      .finally(() => {
        root.classList.remove('theme-transitioning');
        if (activeTransition === transition) {
          activeTransition = null;
        }
      });
  } catch {
    root.classList.remove('theme-transitioning');
    commitDomTheme();
  }
}
