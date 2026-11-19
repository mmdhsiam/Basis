import React, { useState } from 'react';
import {
  Award,
  Users,
  PlusCircle,
  Phone,
  ShieldCheck,
  Calendar,
  Trash2,
  Edit3,
  X,
  Save,
  CheckCircle2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ExecutiveMember } from '../../types';
import { Avatar } from '../common/Avatar';
import { HostedImageInput } from '../common/HostedImageInput';
import { UserStatusDot } from '../common/UserStatusDot';
import { EditableText } from '../common/EditableText';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { motion, AnimatePresence } from 'motion/react';
import { StaggerList, StaggerItem, SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

export const ExecutiveCouncilView: React.FC = () => {
  const {
    executiveMembers,
    addExecutiveMember,
    removeExecutiveMember,
    updateExecutiveMember,
    currentUser,
    isGuestMode,
    isOnline,
    triggerSuccess,
    triggerWarning,
    checkPendingRequestWarning,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ExecutiveMember | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New member form state
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [responsibilities, setResponsibilities] = useState('');

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  const handleOpenAdd = () => {
    setName('');
    setDesignation('');
    setPhone('');
    setAvatarUrl('');
    setResponsibilities('');
    setIsAddModalOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !designation.trim() || !responsibilities.trim()) {
      triggerWarning('অসম্পূর্ণ তথ্য', 'দয়া করে নাম, পদবি এবং দায়িত্বের বিবরণ প্রদান করুন।');
      return;
    }

    const cleanAvatar = extractDirectImageUrl(avatarUrl);
    const ok = addExecutiveMember({
      name: name.trim(),
      designation: designation.trim(),
      phone: phone.trim() || '০১৭০০-০০০০০০',
      avatarUrl: cleanAvatar || undefined,
      responsibilities: responsibilities.trim(),
      order: executiveMembers.length + 1,
      approvedDate: new Date().toLocaleDateString('en-GB'),
    });

    if (ok) {
      setIsAddModalOpen(false);
    }
  };

  const handleOpenEdit = (m: ExecutiveMember) => {
    if (
      checkPendingRequestWarning(
        { requestTypes: ['EXECUTIVE_EDIT', 'EXECUTIVE_DELETE'], targetRecordId: m.id },
        `কার্যনির্বাহী সদস্য "${m.name}" সম্পাদনা`
      )
    ) {
      return;
    }
    setEditingMember(m);
    setName(m.name);
    setDesignation(m.designation);
    setPhone(m.phone);
    setAvatarUrl(m.avatarUrl || '');
    setResponsibilities(m.responsibilities);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !name.trim() || !designation.trim()) return;

    const cleanAvatar = extractDirectImageUrl(avatarUrl);
    const ok = updateExecutiveMember(editingMember.id, {
      name: name.trim(),
      designation: designation.trim(),
      phone: phone.trim(),
      avatarUrl: cleanAvatar || undefined,
      responsibilities: responsibilities.trim(),
    });

    if (ok) {
      setEditingMember(null);
    }
  };

  const designationBadgeColors: Record<string, string> = {
    'প্রধান অ্যাপ মডারেটর ও সমন্বয়ক': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'সভাপতি / প্রধান নির্বাহী': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'সাধারণ সম্পাদক ও প্রধান অডিটর': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'কোষাধ্যক্ষ (Treasurer)': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                  <EditableText
                    textKey="executive_tab_title"
                    defaultText="কার্যনির্বাহী পর্ষদ ও দায়িত্বশীল পরিচালনা কমিটি"
                    className="text-ink text-xl font-bold"
                  />
                </h2>
                <p className="text-xs text-amber-300/80">
                  বেসিস ফাউন্ডেশনের সার্বিক নীতি নির্ধারণ, প্রশাসনিক সিদ্ধান্ত ও যৌথ ব্যাংক হিসাব পরিচালনাকারী পর্ষদ।
                </p>
              </div>
            </div>
          </div>

          {isModeratorOrAppMod && (
            <button
              onClick={handleOpenAdd}
              className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>নতুন কার্যনির্বাহী সদস্য যুক্ত করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Guidelines Note on 2/3 Approval & Council Responsibilities */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-ink block font-bold">
            গঠনতান্ত্রিক অনুমোদন ও দায়িত্ব বণ্টন বিধি:
          </strong>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            কার্যনির্বাহী পর্ষদের সকল সদস্য যৌথ দায়িত্বশীলতার ভিত্তিতে তহবিল পরিচালনা ও প্রতিটি সঞ্চয় এন্ট্রির ২/৩ অংশ অনুমোদন তত্ত্বাবধান করেন। পর্ষদে নতুন সদস্য অন্তর্ভুক্তি বা অপসারণ গঠনতন্ত্রের ধারা অনুযায়ী অনুমোদন সাপেক্ষে কার্যকর হয়।
          </p>
        </div>
      </div>

      {/* Executive Members Cards Grid */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {executiveMembers.map((member, idx) => {
          const badgeClass =
            designationBadgeColors[member.designation] ||
            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

          return (
            <StaggerItem key={member.id} hoverLift className="h-full">
            <div
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden h-full"
            >
              <div className="space-y-3.5">
                {/* Header: Photo + Name + Designation Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={member.avatarUrl}
                      name={member.name}
                      size="lg"
                      ringColor={idx === 0 ? 'ring-amber-500' : 'ring-emerald-500'}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-ink text-base">{member.name}</h3>
                        {/* Requirement 7: Green/Red status dot */}
                        <UserStatusDot isOnline={isOnline} />
                      </div>
                      <span
                        className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mt-1 ${badgeClass}`}
                      >
                        {member.designation}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Moderators */}
                  {isModeratorOrAppMod && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                        title="তথ্য সম্পাদনা"
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
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="পর্ষদ থেকে অপসারণ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Specific Responsibilities (কে কী দায়িত্বে আছে) */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>সুনির্দিষ্ট দায়িত্ব ও পোর্টফোলিও:</span>
                  </span>
                  <p className="text-slate-300 leading-relaxed font-medium">
                    {member.responsibilities}
                  </p>
                </div>
              </div>

              {/* Card Footer: Contact & Approval Date */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{member.phone}</span>
                </span>

                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  <span>অনুমোদন: {member.approvedDate || '২০২৫-০১-১০'}</span>
                </span>
              </div>
            </div>
            </StaggerItem>
          );
        })}
      </StaggerList>

      {/* Add New Executive Member Modal */}
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
            onSubmit={handleSaveNew}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>নতুন কার্যনির্বাহী সদস্য অন্তর্ভুক্তি</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">সদস্যের নাম:</label>
              <input
                type="text"
                placeholder="যেমন: মোঃ জাহিদুল ইসলাম"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">পদবি ও দায়িত্ব:</label>
              <input
                type="text"
                placeholder="যেমন: সাংগঠনিক সম্পাদক / সহকারী কোষাধ্যক্ষ"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">মোবাইল নম্বর:</label>
              <input
                type="text"
                placeholder="যেমন: ০১৭০০-০০০০০০"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">প্রোফাইল ছবি হোস্টেড লিংক:</label>
              <div className="flex items-start gap-2.5">
                <Avatar src={avatarUrl} name={name || 'সদস্য'} size="md" />
                <HostedImageInput
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  placeholder="https://i.ibb.co/... অথবা গ্যালারি থেকে আপলোড করুন"
                  className="flex-1 min-w-0"
                  inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-ink font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">সুনির্দিষ্ট দায়িত্ব ও পোর্টফোলিও:</label>
              <textarea
                rows={3}
                placeholder="কে কী দায়িত্বে আছেন তার সুস্পষ্ট বিবরণ..."
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink leading-relaxed"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>সংরক্ষণ করুন</span>
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Edit Executive Member Modal */}
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
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>কার্যনির্বাহী সদস্য তথ্য সম্পাদনা</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">নাম:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">পদবি:</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">মোবাইল নম্বর:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">ছবি লিংক:</label>
              <div className="flex items-start gap-2.5">
                <Avatar src={avatarUrl} name={name || 'সদস্য'} size="md" />
                <HostedImageInput
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  placeholder="https://i.ibb.co/... অথবা গ্যালারি থেকে আপলোড করুন"
                  className="flex-1 min-w-0"
                  inputClassName="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-ink font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">সুনির্দিষ্ট দায়িত্ব:</label>
              <textarea
                rows={3}
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-ink leading-relaxed"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
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
