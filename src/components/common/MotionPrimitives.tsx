import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Observes when a chart, progress bar, or numeric element enters/exits the viewport.
 * Resets when scrolled out of view so every time the user views it, it smoothly animates from 0 again.
 */
export function useViewportReplay<T extends Element = HTMLDivElement>(threshold = 0.14) {
  const ref = useRef<T | null>(null);
  const prefersReduced = useReducedMotion();
  const [isInView, setIsInView] = useState<boolean>(Boolean(prefersReduced));
  const [replayCount, setReplayCount] = useState<number>(0);

  useEffect(() => {
    if (prefersReduced) {
      setIsInView(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsInView(true);
          setReplayCount((c) => c + 1);
        } else {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, prefersReduced]);

  return { ref, isInView: prefersReduced ? true : isInView, replayCount };
}

/**
 * Wraps each top-level tab view or sub-tab view so switching tabs responds in 0ms
 * with immediate mount and GPU-composited opacity/transform glide (zero blocking wait).
 */
export const PageTabTransition: React.FC<{
  tabKey: string;
  children: React.ReactNode;
  className?: string;
}> = ({ tabKey, children, className = '' }) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0, ease: SMOOTH_EASE }}
      style={{ willChange: 'transform, opacity' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Staggered container for grids & lists with zero initial delay.
 */
export const StaggerList: React.FC<{
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}> = ({ children, className = '', stagger = 0.022, delayChildren = 0 }) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Individual staggered item inside a StaggerList or standalone reveal card.
 */
export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  hoverLift?: boolean;
}> = ({ children, className = '', hoverLift = false }) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 6 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.28, delay: 0, ease: SMOOTH_EASE },
        },
      }}
      whileHover={hoverLift ? { y: -2, transition: { duration: 0.18, delay: 0, ease: SMOOTH_EASE } } : undefined}
      style={{ willChange: 'transform, opacity' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Instant 0ms spring icon feedback on selection/tap without mount delay.
 */
export const SpringIcon: React.FC<{
  activeKey?: string | number | boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ activeKey, children, className = '' }) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <span className={`inline-flex items-center justify-center ${className}`}>{children}</span>;
  }

  return (
    <motion.span
      key={String(activeKey ?? 'static')}
      initial={activeKey !== undefined ? { scale: 0.9 } : false}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.55 }}
      className={`inline-flex items-center justify-center ${className}`}
    >
      {children}
    </motion.span>
  );
};

/**
 * Smoothly animates numerical KPIs, counts, percentages & currency values
 * on initial mount, value changes, AND viewport re-entry (whether formatted in Bengali or English numerals).
 */
export const AnimatedNumber: React.FC<{
  value: number;
  formatter: (val: number) => string;
  durationMs?: number;
  className?: string;
}> = ({ value, formatter, durationMs = 640, className = '' }) => {
  const prefersReduced = useReducedMotion();
  const { ref, isInView, replayCount } = useViewportReplay<HTMLSpanElement>(0.08);
  const [displayValue, setDisplayValue] = useState<number>(prefersReduced ? value : 0);
  const prevValueRef = useRef<number>(0);
  const lastReplayRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    if (!isInView) {
      prevValueRef.current = 0;
      setDisplayValue(0);
      return;
    }

    const isFreshReplay = replayCount !== lastReplayRef.current;
    lastReplayRef.current = replayCount;

    const from = isFreshReplay ? 0 : prevValueRef.current;
    const to = value;
    if (from === to) {
      setDisplayValue(to);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayValue(to);
        prevValueRef.current = to;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs, prefersReduced, isInView, replayCount]);

  return (
    <span ref={ref} data-num className={`font-bold tabular ${className}`}>
      {formatter(displayValue)}
    </span>
  );
};

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function bnToEnString(s: string): string {
  return s.replace(/[০-৯]/g, (ch) => String(BN_DIGITS.indexOf(ch)));
}

function enToBnString(s: string): string {
  return s.replace(/[0-9]/g, (ch) => BN_DIGITS[Number(ch)] ?? ch);
}

/**
 * Animates any embedded Bengali (০-৯) or English (0-9) numbers inside a formatted string
 * (e.g., "+15.4%", "+১৫.৪%", "১২ জন সদস্য", "৳ ১,৫০০") while preserving surrounding text & script.
 */
export const AnimatedFormattedText: React.FC<{
  text: string;
  durationMs?: number;
  className?: string;
}> = ({ text, durationMs = 640, className = '' }) => {
  const segments = useMemo(() => {
    const regex = /[০-৯0-9][০-৯0-9,]*(?:\.[০-৯0-9]+)?/g;
    const parts: Array<
      | { kind: 'text'; raw: string }
      | {
          kind: 'num';
          value: number;
          isBengali: boolean;
          decimals: number;
          hasCommas: boolean;
        }
    > = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ kind: 'text', raw: text.slice(lastIndex, match.index) });
      }
      const token = match[0];
      const isBengali = /[০-৯]/.test(token);
      const hasCommas = token.includes(',');
      const normalized = bnToEnString(token).replace(/,/g, '');
      const dotIdx = normalized.indexOf('.');
      const decimals = dotIdx >= 0 ? normalized.length - dotIdx - 1 : 0;
      const numeric = Number(normalized);

      if (!Number.isNaN(numeric)) {
        parts.push({
          kind: 'num',
          value: numeric,
          isBengali,
          decimals,
          hasCommas,
        });
      } else {
        parts.push({ kind: 'text', raw: token });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ kind: 'text', raw: text.slice(lastIndex) });
    }
    return parts;
  }, [text]);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return <React.Fragment key={i}>{seg.raw}</React.Fragment>;
        }
        return (
          <AnimatedNumber
            key={`${i}-${seg.isBengali ? 'bn' : 'en'}`}
            value={seg.value}
            durationMs={durationMs}
            formatter={(val) => {
              const fixed = seg.decimals > 0 ? val.toFixed(seg.decimals) : String(Math.round(val));
              const withCommas = seg.hasCommas
                ? Number(fixed).toLocaleString('en-IN', {
                    minimumFractionDigits: seg.decimals,
                    maximumFractionDigits: seg.decimals,
                  })
                : fixed;
              return seg.isBengali ? enToBnString(withCommas) : withCommas;
            }}
          />
        );
      })}
    </span>
  );
};

/**
 * Corvane/Fernly sliding pill indicator shared via Framer Motion layoutId.
 */
export const SlidingTabPill: React.FC<{
  layoutId: string;
  className?: string;
}> = ({ layoutId, className = 'bg-emerald-600 shadow-md' }) => {
  return (
    <motion.span
      layoutId={layoutId}
      transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.7 }}
      className={`absolute inset-0 rounded-xl pointer-events-none ${className}`}
    />
  );
};
