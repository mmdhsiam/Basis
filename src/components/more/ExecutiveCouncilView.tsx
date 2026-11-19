import React, { useState } from 'react';
import {
  Award,
  PlusCircle,
  Trash2,
  Edit3,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  X,
  Save,
  Briefcase,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { toBengaliNumerals } from '../../utils/calculations';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { ExecutiveMember } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { StaggerList, StaggerItem, SpringIcon, AnimatedNumber, SMOOTH_EASE } from '../common/MotionPrimitives';

export const ExecutiveCouncilView: React.FC = () => {
  const {
    executiveMembers,
    addExecutiveMember,
    removeExecutiveMember,
    updateExecutiveMember,
    currentUser,
    isGuestMode,
    maskPhoneForPrivacy,
    triggerSuccess,
    triggerWarning,
    checkPendingRequestWarning,
  } = useApp();

  const isAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newResponsibilities, setNewResponsibilities] = useState('');

  // Edit modal state
  const [editingMember, setEditingMember] = useState<ExecutiveMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editResponsibilities, setEditResponsibilities] = useState('');

  const handleOpenAdd = () => {
    setNewName('');
    setNewDesignation('');
    setNewPhone('');
    setNewAvatarUrl('');
    setNewResponsibilities('');
    setIsAddModalOpen(true);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesignation.trim()) {
      triggerWarning('অসম্পূর্ণ তথ্য', 'সদস্যের নাম ও পদবি আবশ্যক।');
      return;
    }

    const ok = addExecutiveMember({
      name: newName.trim(),
      designation: newDesignation.trim(),
      phone: newPhone.trim() || '০১৭০০-০০০০০০',
      avatarUrl: extractDirectImageUrl(newAvatarUrl) || undefined,
      responsibilities: newResponsibilities.trim() || 'সাংগঠনিক দায়িত্ব পালন',
      order: executiveMembers.length + 1,
      approvedDate: new Date().toISOString().split('T')[0],
    });

    if (ok) {
      setIsAddModalOpen(false);
    }
  };

  const handleStartEdit = (m: ExecutiveMember) => {
    if (
      checkPendingRequestWarning(
        { requestTypes: ['EXECUTIVE_EDIT', 'EXECUTIVE_DELETE'], targetRecordId: m.id },
        `কার্যনির্বাহী সদস্য "${m.name}" সম্পাদনা`
      )
    ) {
      return;
    }
    setEditingMember(m);
    setEditName(m.name);
    setEditDesignation(m.designation);
    setEditPhone(m.phone);
    setEditAvatarUrl(m.avatarUrl || '');
    setEditResponsibilities(m.responsibilities || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editName.trim() || !editDesignation.trim()) return;

    const ok = updateExecutiveMember(editingMember.id, {
      name: editName.trim(),
      designation: editDesignation.trim(),
      phone: editPhone.trim(),
      avatarUrl: extractDirectImageUrl(editAvatarUrl) || undefined,
      responsibilities: editResponsibilities.trim(),
    });

    if (ok) {
      setEditingMember(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <SpringIcon activeKey={executiveMembers.length}>
                  <Award className="w-5 h-5" />
                </SpringIcon>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-ink">
                  কার্যনির্বাহী পর্ষদ (Executive Council)
                </h2>
                <p className="text-xs text-slate-400">
                  বেসিস ফাউন্ডেশনের কেন্দ্রীয় নীতি নির্ধারণ ও প্রশাসনিক পরিচালনা পরিষদ।
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-950 text-amber-300 border border-slate-800">
              মোট:{' '}
              <AnimatedNumber
                value={executiveMembers.length}
                formatter={(v) => toBengaliNumerals(Math.round(v))}
              />{' '}
              জন
            </span>

            {isAppMod && (
              <motion.button
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleOpenAdd}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <SpringIcon>
                  <PlusCircle className="w-4 h-4" />
                </SpringIcon>
                <span>নতুন সদস্য যোগ করুন</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Executive Council Members */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {executiveMembers.map((member, index) => {
          const isFemale = member.name.includes('আক্তার') || member.name.includes('বেগম') || member.name.includes('সাবরিনা');
          const isMe = currentUser?.name === member.name;

          return (
            <StaggerItem key={member.id} hoverLift className="h-full">
            <div
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all shadow-md space-y-4 flex flex-col justify-between group h-full"
            >
              <div className="space-y-3">
                {/* Card Top: Order Badge & Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    পর্ষদ পদমর্যাদা #{toBengaliNumerals(index + 1)}
                  </span>

                  {isAppMod && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="এডিট প্রস্তাব পাঠান"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === member.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              removeExecutiveMember(member.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                          >
                            নিশ্চিত
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                          >
                            না
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (
                              checkPendingRequestWarning(
                                { requestTypes: ['EXECUTIVE_EDIT', 'EXECUTIVE_DELETE'], targetRecordId: member.id },
                                `কার্যনির্বাহী সদস্য "${member.name}" অপসারণ`
                              )
                            ) {
                              return;
                            }
                            setConfirmDeleteId(member.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="বাদ দেওয়ার প্রস্তাব পাঠান"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile info */}
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatarUrl}
                    name={member.name}
                    size="lg"
                    ringColor={index === 0 ? 'ring-amber-500' : 'ring-emerald-500'}
                  />
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-sm text-ink truncate flex items-center gap-1.5">
                      <span>{member.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    </h3>
                    <p className="text-xs text-amber-400/90 font-bold mt-0.5 truncate">
                      {member.designation}
                    </p>
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-emerald-400" />
                    <span>দায়িত্ব ও কর্মপরিধি:</span>
                  </span>
                  <p className="leading-relaxed text-[11px]">{member.responsibilities}</p>
                </div>
              </div>

              {/* Card Footer: Phone & Approval Date */}
              <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1 text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">যোগাযোগ:</span>
                  <span className="font-mono font-bold text-slate-300">
                    {maskPhoneForPrivacy(member.phone, isFemale ? 'FEMALE' : 'MALE')}
                  </span>
                </div>
                {member.approvedDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">অনুমোদনের তারিখ:</span>
                    <span className="text-slate-400 font-medium">{member.approvedDate}</span>
                  </div>
                )}
              </div>
            </div>
            </StaggerItem>
          );
        })}
      </StaggerList>

      {/* Add Modal for App Moderator */}
      <AnimatePresence>
      {isAddModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SMOOTH_EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: SMOOTH_EASE }}
            onSubmit={handleCreateMember}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-3.5 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-ink text-base">পর্ষদে নতুন সদস্য যোগ করুন</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">সদস্যের পূর্ণ নাম:</label>
              <input
                type="text"
                placeholder="যেমন: ইঞ্জি. মাহমুদ হোসেন"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">পর্ষদ পদবি / পদমর্যাদা:</label>
              <input
                type="text"
                placeholder="যেমন: সহ-সভাপতি / সাংগঠনিক সম্পাদক"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">মোবাইল নম্বর:</label>
              <input
                type="text"
                placeholder="০১৭০০-০০০০০০"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">প্রোফাইল ছবি হোস্টেড লিংক:</label>
              <div className="flex items-start gap-2.5">
                <Avatar src={newAvatarUrl} name={newName || 'সদস্য'} size="md" />
                <HostedImageInput
                  value={newAvatarUrl}
                  onChange={setNewAvatarUrl}
                  placeholder="https://i.ibb.co/... অথবা গ্যালারি থেকে আপলোড"
                  className="flex-1 min-w-0"
                  inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">দায়িত্ব ও কর্মপরিধি:</label>
              <textarea
                rows={3}
                placeholder="সদস্যের নির্দিষ্ট প্রাতিষ্ঠানিক দায়িত্বসমূহ লিখুন..."
                value={newResponsibilities}
                onChange={(e) => setNewResponsibilities(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
              >
                যুক্ত করুন
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Edit Modal for App Moderator */}
      <AnimatePresence>
      {editingMember && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SMOOTH_EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: SMOOTH_EASE }}
            onSubmit={handleSaveEdit}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-3.5 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-ink text-base">সদস্যের তথ্য সম্পাদনা করুন</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">সদস্যের পূর্ণ নাম:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">পর্ষদ পদবি / পদমর্যাদা:</label>
              <input
                type="text"
                value={editDesignation}
                onChange={(e) => setEditDesignation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">মোবাইল নম্বর:</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">প্রোফাইল ছবি হোস্টেড লিংক:</label>
              <div className="flex items-start gap-2.5">
                <Avatar src={editAvatarUrl} name={editName || 'সদস্য'} size="md" />
                <HostedImageInput
                  value={editAvatarUrl}
                  onChange={setEditAvatarUrl}
                  placeholder="https://i.ibb.co/... অথবা গ্যালারি থেকে আপলোড"
                  className="flex-1 min-w-0"
                  inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">দায়িত্ব ও কর্মপরিধি:</label>
              <textarea
                rows={3}
                value={editResponsibilities}
                onChange={(e) => setEditResponsibilities(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ink"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
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
