import React, { useState } from 'react';
import { Lightbulb, PlusCircle, ThumbsUp, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toBengaliNumerals } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { StaggerList, StaggerItem, SpringIcon, AnimatedNumber, SMOOTH_EASE } from '../common/MotionPrimitives';

export const FeatureRequestsView: React.FC = () => {
  const {
    featureRequests,
    currentUser,
    isGuestMode,
    triggerGuestWarning,
    triggerSuccess,
    submitFeatureRequest,
    voteFeatureRequest,
  } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestMode) {
      setShowModal(false);
      triggerGuestWarning('নতুন প্রস্তাবনা দাখিল');
      return;
    }
    if (!title.trim() || !description.trim()) return;
    submitFeatureRequest(title.trim(), description.trim());
    setShowModal(false);
    setTitle('');
    setDescription('');
    triggerSuccess('আপনার নতুন ফিচার প্রস্তাবনা সফলভাবে দাখিল হয়েছে।');
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <SpringIcon>
              <Lightbulb className="w-5 h-5 text-amber-400" />
            </SpringIcon>
            <span>সদস্য প্রস্তাবনা ও নতুন ফিচার রিকোয়েস্ট</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            অ্যাপ ও ফাউন্ডেশনের উন্নয়নে সদস্যদের প্রস্তাবনা, ভোট প্রদান ও ডেভেলপমেন্ট অগ্রগতি।
          </p>
        </div>

        <motion.button
          whileHover={{ y: -1.5 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (isGuestMode) {
              triggerGuestWarning('নতুন প্রস্তাবনা দাখিল');
              return;
            }
            setShowModal(true);
          }}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <SpringIcon>
            <PlusCircle className="w-4 h-4" />
          </SpringIcon>
          <span>নতুন প্রস্তাবনা দিন</span>
        </motion.button>
      </div>

      <StaggerList className="space-y-3">
        {featureRequests.map((feat) => {
          const hasVoted = currentUser ? (feat.votedUserIds || []).includes(currentUser.id) : false;

          return (
            <StaggerItem key={feat.id} hoverLift>
            <div
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        feat.status === 'PLANNED'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : feat.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : feat.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {feat.status === 'PLANNED'
                        ? 'পরিকল্পনাভুক্ত'
                        : feat.status === 'IN_PROGRESS'
                        ? 'কাজ চলছে'
                        : feat.status === 'COMPLETED'
                        ? 'সম্পন্ন হয়েছে'
                        : 'পর্যালোচনাধীন'}
                    </span>
                    <h3 className="font-bold text-ink text-sm sm:text-base">{feat.title}</h3>
                  </div>

                  <p className="text-slate-300 leading-relaxed pt-1">{feat.description}</p>
                </div>

                {/* Upvote Button */}
                <motion.button
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (isGuestMode) {
                      triggerGuestWarning('প্রস্তাবনায় ভোট প্রদান');
                      return;
                    }
                    voteFeatureRequest(feat.id);
                  }}
                  className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer ${
                    !isGuestMode && hasVoted
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                  title="সমর্থন / ভোট দিন"
                >
                  <SpringIcon activeKey={`${hasVoted}-${feat.votesCount}`}>
                    <ThumbsUp className="w-4 h-4" />
                  </SpringIcon>
                  <AnimatedNumber
                    value={feat.votesCount}
                    formatter={(v) => toBengaliNumerals(Math.round(v))}
                    className="text-xs mt-0.5"
                  />
                </motion.button>
              </div>

              {feat.moderatorResponse && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1">
                  <strong className="text-amber-400">কর্তৃপক্ষের পর্যালোচনা:</strong>
                  <p className="text-slate-300">{feat.moderatorResponse}</p>
                </div>
              )}

              <div className="pt-1 flex items-center justify-between text-slate-500 text-[11px] border-t border-slate-800/60">
                <span>প্রস্তাবক: {feat.submitterName} ({feat.memberId})</span>
                <span>{new Date(feat.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
            </StaggerItem>
          );
        })}
      </StaggerList>

      {/* New Feature Modal */}
      <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SMOOTH_EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: SMOOTH_EASE }}
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-ink">নতুন ফিচার বা অ্যাপ সুবিধার প্রস্তাব</h3>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ফিচারের নাম / প্রস্তাবনা:</label>
              <input
                type="text"
                placeholder="যেমন: অটো এসএমএস নোটিফিকেশন..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">বিস্তারিত সুবিধা ও বিবরণ:</label>
              <textarea
                rows={4}
                placeholder="এই ফিচারের মাধ্যমে সদস্যরা কীভাবে উপকৃত হবেন লিখুন..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                দাখিল করুন
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
