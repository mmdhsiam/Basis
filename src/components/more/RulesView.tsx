import React, { useState } from 'react';
import { BookOpen, Edit3, CheckCircle2, Save, X, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FoundationRule } from '../../types';
import { toBengaliNumerals } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { StaggerList, StaggerItem, SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

export const RulesView: React.FC = () => {
  const { rules, currentUser, isGuestMode, updateRule, addRule, checkPendingRequestWarning } = useApp();
  const [editingRule, setEditingRule] = useState<FoundationRule | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  const handleStartEdit = (rule: FoundationRule) => {
    if (
      checkPendingRequestWarning(
        { requestTypes: ['RULE_CHANGE'], targetRecordId: rule.id },
        `গঠনতন্ত্র ধারা ${toBengaliNumerals(rule.ruleNumber)} সংশোধন`
      )
    ) {
      return;
    }
    setEditingRule(rule);
    setEditTitle(rule.title);
    setEditDesc(rule.description);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editTitle.trim() || !editDesc.trim()) return;
    const ok = updateRule(editingRule.id, editTitle.trim(), editDesc.trim());
    if (ok) {
      setEditingRule(null);
    }
  };

  const handleSaveNewRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    const ok = addRule(newTitle.trim(), newDesc.trim());
    if (ok) {
      setNewTitle('');
      setNewDesc('');
      setIsAddingRule(false);
    }
  };

  const nextRuleNum =
    rules.reduce((max, r) => Math.max(max, r.ruleNumber || 0), 0) + 1;

  return (
    <div className="space-y-4 pb-16">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <SpringIcon>
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </SpringIcon>
            <span>বেসিস ফাউন্ডেশন অফিসিয়াল গঠনতন্ত্র ও সঞ্চয় নীতিমালা</span>
          </h2>
          <p className="text-xs text-slate-400">
            ফাউন্ডেশনের সকল সদস্যের বাধ্যতামূলকভাবে প্রতিপালনীয় সাধারণ ও আর্থিক নীতিমালা।
          </p>
        </div>

        {isModeratorOrAppMod && (
          <button
            type="button"
            onClick={() => {
              setNewTitle('');
              setNewDesc('');
              setIsAddingRule(true);
            }}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ধারা যুক্ত করুন</span>
          </button>
        )}
      </div>

      <StaggerList className="space-y-3.5">
        {rules.map((rule, idx) => {
          const colorStyles = [
            {
              badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              title: 'text-emerald-200 group-hover:text-emerald-100',
              border: 'hover:border-emerald-500/60',
              accent: 'border-l-4 border-l-emerald-500',
              tag: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
            },
            {
              badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
              title: 'text-sky-200 group-hover:text-sky-100',
              border: 'hover:border-sky-500/60',
              accent: 'border-l-4 border-l-sky-500',
              tag: 'bg-sky-950/60 text-sky-400 border-sky-800/60',
            },
            {
              badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              title: 'text-amber-200 group-hover:text-amber-100',
              border: 'hover:border-amber-500/60',
              accent: 'border-l-4 border-l-amber-500',
              tag: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
            },
            {
              badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
              title: 'text-indigo-200 group-hover:text-indigo-100',
              border: 'hover:border-indigo-500/60',
              accent: 'border-l-4 border-l-indigo-500',
              tag: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
            },
            {
              badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
              title: 'text-rose-200 group-hover:text-rose-100',
              border: 'hover:border-rose-500/60',
              accent: 'border-l-4 border-l-rose-500',
              tag: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
            },
            {
              badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
              title: 'text-teal-200 group-hover:text-teal-100',
              border: 'hover:border-teal-500/60',
              accent: 'border-l-4 border-l-teal-500',
              tag: 'bg-teal-950/60 text-teal-400 border-teal-800/60',
            },
          ];

          const theme = colorStyles[idx % colorStyles.length];

          return (
            <StaggerItem key={rule.id} hoverLift>
              <div
                className={`p-5 rounded-2xl bg-slate-900 border border-slate-800 ${theme.border} ${theme.accent} space-y-3 transition-all duration-200 hover:shadow-xl hover:shadow-black/40 group`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shadow-sm ${theme.badge}`}
                    >
                      {toBengaliNumerals(rule.ruleNumber)}
                    </span>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">
                        ধারা {toBengaliNumerals(rule.ruleNumber)}
                      </span>
                      <h3 className={`font-bold text-base transition-colors ${theme.title}`}>
                        {rule.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold ${theme.tag}`}
                    >
                      v{rule.version}.0
                    </span>

                    {isModeratorOrAppMod && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(rule)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                        title="নিয়মাবলী সম্পাদনা করুন"
                      >
                        <SpringIcon>
                          <Edit3 className="w-3.5 h-3.5" />
                        </SpringIcon>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-normal">{rule.description}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                  <span className="font-bold">সর্বশেষ হালনাগাদ: {rule.lastUpdated}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>কার্যনির্বী পরিষদ অনুমোদিত</span>
                  </span>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerList>

      {/* Add New Rule Modal (Moderator Only) */}
      <AnimatePresence>
        {isAddingRule && isModeratorOrAppMod && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, delay: 0, ease: SMOOTH_EASE }}
            onClick={() => setIsAddingRule(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, delay: 0, ease: SMOOTH_EASE }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveNewRule}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 text-xs shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>নতুন ধারা যুক্ত করুন (ধারা {toBengaliNumerals(nextRuleNum)})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">নতুন ধারার শিরোনাম:</label>
                <input
                  type="text"
                  placeholder="যেমন: জরুরি কল্যাণ তহবিল ও সহায়তা নীতিমালা"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">ধারার পূর্ণাঙ্গ বর্ণনা:</label>
                <textarea
                  rows={4}
                  placeholder="ধারার বিস্তারিত নীতিমালা ও শর্তাবলী লিখুন..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <p className="text-[11px] text-amber-400">
                * নতুন ধারা সংযোজনের প্রস্তাব মডারেটর প্যানেলে অনুমোদনের পর গঠনতন্ত্রে সরাসরি যুক্ত হবে।
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>অনুমোদনের জন্য জমা দিন</span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Rule Modal */}
      <AnimatePresence>
        {editingRule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, delay: 0, ease: SMOOTH_EASE }}
            onClick={() => setEditingRule(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, delay: 0, ease: SMOOTH_EASE }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveEdit}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 text-xs shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-base font-bold text-ink">
                  নীতিমালা সম্পাদনা (ধারা {toBengaliNumerals(editingRule.ruleNumber)})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">ধারার শিরোনাম:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">ধারার পূর্ণাঙ্গ বর্ণনা:</label>
                <textarea
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  required
                />
              </div>

              <p className="text-[11px] text-amber-400">
                * পরিবর্তন অনুমোদনের সাথে সাথে ভার্সন সংখ্যা এক বৃদ্ধি পাবে এবং অডিট লগে সংরক্ষিত হবে।
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>সংরক্ষণ করুন</span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
