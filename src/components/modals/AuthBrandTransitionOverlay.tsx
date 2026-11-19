import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { extractDirectImageUrl } from '../../utils/imageUtils';

/**
 * Smooth, zero-jitter brand transition curtain for Login, Logout, and Auth view switches.
 * - Glides smoothly from top or bottom to rest steadily at the exact center (y: 0%)
 * - Holds cleanly at dead center with zero shake/bounce
 * - Dissolves at the end with a long, ultra-smooth opacity fade-out (opacity: 1 -> 0)
 */
export const AuthBrandTransitionOverlay: React.FC = () => {
  const { authTransition, clearAuthTransition, config } = useApp();

  if (!authTransition) return null;

  const resolvedLogoUrl = extractDirectImageUrl(config.logoUrl) || config.logoUrl || '/logo.svg';
  const startY = authTransition.dir === 'UP' ? '40%' : '-40%';
  const statusSubtitle =
    authTransition.type === 'LOGIN'
      ? 'আপনার সদস্য ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...'
      : 'নিরাপদে লগআউট সম্পন্ন হয়েছে...';

  return (
    <motion.div
      key={authTransition.id}
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{
        duration: 1.75,
        times: [0, 0.48, 1],
        ease: [0.22, 1, 0.36, 1],
      }}
      onAnimationComplete={() => clearAuthTransition(authTransition.id)}
      style={{ willChange: 'opacity' }}
      className="pointer-events-none fixed inset-0 z-[90] bg-hero flex items-center justify-center overflow-hidden text-white"
    >
      <div className="pointer-events-none absolute -top-28 -right-20 h-72 w-72 rounded-full border-[44px] border-white/[0.05]" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full border-[44px] border-white/[0.05]" />

      <motion.div
        initial={{ y: startY, opacity: 0.72, scale: 0.96 }}
        animate={{ y: '0%', opacity: 1, scale: 1 }}
        transition={{
          duration: 0.68,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ willChange: 'transform, opacity' }}
        className="relative flex flex-col items-center justify-center text-center px-6"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-gradient-to-b from-[#f3cb68] via-[#cfa13c] to-[#9b6f1b] p-[3px] flex items-center justify-center shadow-[0_18px_42px_rgba(0,0,0,0.35)] overflow-hidden">
          <img
            src={resolvedLogoUrl}
            alt="লোগো"
            className="w-full h-full object-contain rounded-[19px]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo.svg';
            }}
          />
        </div>
        <h2 className="mt-3.5 text-[24px] sm:text-[28px] font-bold tracking-tight text-white">
          {config.foundationName || 'বেসিস ফাউন্ডেশন'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm font-medium text-white/85">
          {statusSubtitle}
        </p>
      </motion.div>
    </motion.div>
  );
};
