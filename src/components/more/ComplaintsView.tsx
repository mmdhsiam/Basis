import React, { useState } from 'react';
import { FileText, PlusCircle, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toBengaliNumerals } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { StaggerList, StaggerItem, SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

export const ComplaintsView: React.FC = () => {
  const {
    complaints,
    currentUser,
    isGuestMode,
    triggerGuestWarning,
    triggerSuccess,
    submitComplaint,
    updateComplaintStatus,
  } = useApp();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  // Ordinary members only see their own complaints; guests see none
  const visibleComplaints = isGuestMode
    ? []
    : complaints.filter((c) => isModeratorOrAppMod || c.submitterId === currentUser?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestMode) {
      setShowSubmitModal(false);
      triggerGuestWarning('অভিযোগ দাখিল');
      return;
    }
    if (!title.trim() || !description.trim()) return;
    submitComplaint(title.trim(), description.trim());
    setShowSubmitModal(false);
    setTitle('');
    setDescription('');
    triggerSuccess('আপনার অভিযোগ সফলভাবে দাখিল হয়েছে। কর্তৃপক্ষ শীঘ্রই পর্যালোচনা করবে।');
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <SpringIcon>
              <FileText className="w-5 h-5 text-rose-400" />
            </SpringIcon>
            <span>অভিযোগ বক্স ও সমস্যা প্রতিকার (Complaints)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            সঞ্চয় হিসাব, লেনদেন বা সেবা সংক্রান্ত যেকোনো অভিযোগ গোপনীয়তার সাথে নিষ্পত্তি করা হয়।
          </p>
        </div>

        <motion.button
          whileHover={{ y: -1.5 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (isGuestMode) {
              triggerGuestWarning('অভিযোগ দাখিল');
              return;
            }
            setShowSubmitModal(true);
          }}
          className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <SpringIcon>
            <PlusCircle className="w-4 h-4" />
          </SpringIcon>
          <span>অভিযোগ দাখিল করুন</span>
        </motion.button>
      </div>

      <StaggerList className="space-y-3">
        {visibleComplaints.map((comp) => (
          <StaggerItem key={comp.id} hoverLift>
          <div
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    comp.status === 'RESOLVED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : comp.status === 'IN_PROGRESS'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {comp.status === 'RESOLVED'
                    ? 'নিষ্পত্তি সম্পন্ন'
                    : comp.status === 'IN_PROGRESS'
                    ? 'তদন্তাধীন'
                    : 'দাখিলকৃত'}
                </span>
                <h3 className="font-bold text-ink text-sm">{comp.title}</h3>
              </div>

              <span className="text-[11px] text-slate-400">
                {new Date(comp.createdAt).toLocaleDateString('en-GB')}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed">{comp.description}</p>

            {comp.moderatorNotes && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1">
                <strong className="text-emerald-400">মডারেটরের প্রতিক্রিয়া:</strong>
                <p className="text-slate-300">{comp.moderatorNotes}</p>
                {comp.assignedModeratorName && (
                  <span className="text-[10px] text-slate-500 block">
                    দায়িত্বপ্রাপ্ত মডারেটর: {comp.assignedModeratorName}
                  </span>
                )}
              </div>
            )}

            <div className="pt-1 flex items-center justify-between text-slate-500 text-[11px]">
              <span>দাখিলকারী: {comp.submitterName}</span>
              {isModeratorOrAppMod && comp.status !== 'RESOLVED' && (
                <button
                  onClick={() =>
                    updateComplaintStatus(
                      comp.id,
                      'RESOLVED',
                      'অভিযোগটি সন্তোষজনকভাবে সমাধান করা হয়েছে।'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  নিষ্পত্তি করুন
                </button>
              )}
            </div>
          </div>
          </StaggerItem>
        ))}

        {visibleComplaints.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400">কোনো অভিযোগ রেকর্ড পাওয়া যায়নি।</p>
          </div>
        )}
      </StaggerList>

      {/* Submit Complaint Modal */}
      <AnimatePresence>
      {showSubmitModal && (
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
            <h3 className="text-base font-bold text-ink">নতুন অভিযোগ বা অনুসন্ধান দাখিল</h3>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">অভিযোগের বিষয়:</label>
              <input
                type="text"
                placeholder="বিষয় সংক্ষেপে লিখুন..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">বিস্তারিত বিবরণ:</label>
              <textarea
                rows={4}
                placeholder="সমস্যা বা অভিযোগের পূর্ণ বিবরণ লিখুন..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
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
