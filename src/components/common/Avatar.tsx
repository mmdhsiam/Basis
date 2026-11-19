import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { SMOOTH_EASE } from './MotionPrimitives';
import { registerBackHandler } from '../../utils/backNavigation';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  ringColor?: string;
  expandable?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  ringColor,
  expandable = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cleanSrc = extractDirectImageUrl(src);

  // Reset error when src changes so new hosted URL immediately re-attempts loading
  useEffect(() => {
    setHasError(false);
  }, [cleanSrc]);

  useEffect(() => {
    if (!isExpanded) return;
    const unregisterBack = registerBackHandler(() => setIsExpanded(false));
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      unregisterBack();
      document.removeEventListener('keydown', handleKey);
    };
  }, [isExpanded]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-bold',
    lg: 'w-12 h-12 text-base font-bold',
    xl: 'w-16 h-16 text-xl font-bold',
    '2xl': 'w-24 h-24 text-2xl font-bold',
  };

  const initial = (name || 'স').trim().charAt(0);
  const hasValidImage = Boolean(cleanSrc && !hasError && cleanSrc.trim() !== '');

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!expandable) return;
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const expandedModal =
    expandable && typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0, ease: SMOOTH_EASE }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md cursor-zoom-out"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.24, delay: 0, ease: SMOOTH_EASE }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Point 6: Clicking the expanded profile picture again closes it immediately
                    setIsExpanded(false);
                  }}
                  title="বন্ধ করতে ছবিতে আবার ক্লিক করুন"
                  className="flex flex-col items-center gap-3 cursor-zoom-out select-none"
                >
                  {hasValidImage ? (
                    <img
                      src={cleanSrc}
                      alt={name}
                      className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl object-cover ring-2 ring-emerald-400/70 shadow-2xl bg-slate-900"
                    />
                  ) : (
                    <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl bg-emerald-600 text-white text-6xl font-bold flex items-center justify-center ring-2 ring-emerald-400/70 shadow-2xl">
                      {initial}
                    </div>
                  )}
                  <span className="text-sm font-bold text-white drop-shadow">{name}</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      : null;

  const resolvedImageRing =
    ringColor === 'ring-0'
      ? ''
      : ringColor
        ? `ring-2 ${ringColor}`
        : 'ring-1 ring-slate-700/60 dark:ring-slate-700';

  const resolvedFallbackRing =
    ringColor === 'ring-0'
      ? ''
      : ringColor
        ? `ring-2 ${ringColor}`
        : 'ring-1 ring-emerald-500/30';

  // If valid cleanSrc and not errored
  if (hasValidImage) {
    return (
      <>
        <div
          onClick={expandable ? handleTriggerClick : undefined}
          role={expandable ? 'button' : undefined}
          tabIndex={expandable ? 0 : undefined}
          onKeyDown={
            expandable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsExpanded((prev) => !prev);
                  }
                }
              : undefined
          }
          className={`relative inline-flex items-center justify-center aspect-square leading-none shrink-0 rounded-full overflow-hidden shadow-sm ${
            sizeClasses[size]
          } ${resolvedImageRing} ${
            expandable ? 'cursor-zoom-in transition-transform active:scale-95' : ''
          } ${className}`}
        >
          <img
            src={cleanSrc}
            alt={name}
            onError={() => setHasError(true)}
            className="block w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        </div>
        {expandedModal}
      </>
    );
  }

  // Graceful fallback to vibrant colored initial circle
  return (
    <>
      <div
        onClick={expandable ? handleTriggerClick : undefined}
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        className={`relative inline-flex items-center justify-center aspect-square leading-none shrink-0 rounded-full font-bold select-none ${
          sizeClasses[size]
        } bg-emerald-600 text-white shadow-sm ${resolvedFallbackRing} ${
          expandable ? 'cursor-zoom-in transition-transform active:scale-95' : ''
        } ${className}`}
      >
        <span>{initial}</span>
      </div>
      {expandedModal}
    </>
  );
};

