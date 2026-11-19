import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { SMOOTH_EASE } from '../common/MotionPrimitives';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserName?: string;
  isIncoming?: boolean;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  targetUserName = 'তানভীর আহমেদ (মডারেটর)',
  isIncoming = false,
}) => {
  const { currentUser, activeCall, endCall } = useApp();
  const incomingMode = isIncoming || (activeCall ? activeCall.callerId !== currentUser?.id : false);
  const displayName = activeCall
    ? activeCall.callerId === currentUser?.id
      ? activeCall.targetName || targetUserName
      : activeCall.callerName
    : targetUserName;

  const [callState, setCallState] = useState<'RINGING' | 'CONNECTED' | 'ENDED'>(
    incomingMode ? 'RINGING' : 'CONNECTED'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCallState(incomingMode ? 'RINGING' : 'CONNECTED');
      setDuration(0);
      return;
    }

    let interval: NodeJS.Timeout;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, callState, incomingMode]);

  // Rendered via AnimatePresence below

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallState('ENDED');
    endCall(duration);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
    {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: SMOOTH_EASE }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl flex flex-col items-center relative overflow-hidden"
      >
        {/* Calling Top Header */}
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>WebRTC সুরক্ষিত এনক্রিপ্টেড অডিও/ভিডিও কল</span>
        </div>

        {/* Avatar Ring */}
        <div className="relative my-4">
          <div className="w-24 h-24 rounded-full bg-emerald-500 p-1 flex items-center justify-center shadow-xl">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-3xl font-bold text-ink">
              {displayName.charAt(0)}
            </div>
          </div>
          {callState === 'RINGING' && (
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
          )}
        </div>

        <h3 className="text-lg font-bold text-ink">{displayName}</h3>
        <p className="text-xs text-slate-400 mt-0.5">বেসিস ফাউন্ডেশন রিয়েল-টাইম কলিং</p>

        {/* State Label */}
        <div className="mt-3 py-1 px-3 rounded-full bg-slate-800/80 text-xs font-semibold text-slate-200">
          {callState === 'RINGING' && (isIncoming ? 'ইনকামিং কল...' : 'রিং হচ্ছে...')}
          {callState === 'CONNECTED' && `সংযুক্ত • ${formatDuration(duration)}`}
          {callState === 'ENDED' && 'কল সমাপ্ত'}
        </div>

        {/* Video preview mock surface if video is enabled */}
        {callState === 'CONNECTED' && isVideoOn && (
          <div className="w-full h-32 rounded-xl bg-slate-950 border border-slate-800 my-4 flex items-center justify-center text-slate-500 text-xs relative overflow-hidden">
            <div className="flex flex-col items-center">
              <Video className="w-6 h-6 text-emerald-400/80 mb-1" />
              <span>এইচডি ভিডিও স্ট্রিমিং অ্যাক্টিভ</span>
            </div>
          </div>
        )}

        {/* Call Controls */}
        <div className="w-full mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-4">
          {callState === 'CONNECTED' ? (
            <>
              {/* Mic toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3.5 rounded-full transition-colors ${
                  isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video toggle */}
              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`p-3.5 rounded-full transition-colors ${
                  !isVideoOn ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {!isVideoOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* End Call */}
              <button
                onClick={handleEndCall}
                className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </>
          ) : callState === 'RINGING' ? (
            <>
              {/* Decline / Cancel */}
              <button
                onClick={handleEndCall}
                className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-colors"
                title="বাতিল করুন"
              >
                <PhoneOff className="w-5 h-5" />
              </button>

              {/* Accept / Connect */}
              <button
                onClick={() => setCallState('CONNECTED')}
                className="p-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors animate-bounce"
                title="রিসিভ করুন"
              >
                <Phone className="w-5 h-5" />
              </button>
            </>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
