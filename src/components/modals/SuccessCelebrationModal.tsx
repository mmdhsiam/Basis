import React, { useEffect } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SMOOTH_EASE } from '../common/MotionPrimitives';

interface SuccessCelebrationModalProps {
  message: string | null;
  onClose: () => void;
}

export const SuccessCelebrationModal: React.FC<SuccessCelebrationModalProps> = ({
  message,
  onClose,
}) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SMOOTH_EASE }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.86, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.75 }}
            className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 relative overflow-hidden"
          >
            {/* Glow backdrop */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

            <button
              onClick={onClose}
              aria-label="বন্ধ করুন"
              className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Animated Checkmark Circle */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
              <motion.div
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 480, damping: 18, delay: 0 }}
                className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center relative z-10 shadow-lg"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-spin duration-1000" />
            </div>

            {/* Title & Message */}
            <div className="space-y-1 relative z-10">
              <h3 className="text-lg font-bold text-ink">সফলভাবে সম্পন্ন হয়েছে!</h3>
              <p className="text-xs text-emerald-300 font-bold leading-relaxed">{message}</p>
            </div>

            {/* Action Button */}
            <div className="pt-1 relative z-10">
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
