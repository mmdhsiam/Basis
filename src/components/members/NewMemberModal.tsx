import React, { useState } from 'react';
import { X, UserPlus, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({ isOpen, onClose }) => {
  const { addDirectUser, triggerWarning } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [nomineePhone, setNomineePhone] = useState('');
  const [nidNumber, setNidNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      triggerWarning('অসম্পূর্ণ তথ্য', 'সদস্যের নাম ও ফোন নম্বর প্রদান বাধ্যতামূলক।');
      return;
    }

    const ok = addDirectUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role: 'MEMBER',
      gender: 'MALE',
      address: address.trim(),
      nomineeName: nomineeName.trim() || undefined,
      nomineeRelation: nomineeRelation.trim() || undefined,
      nomineePhone: nomineePhone.trim() || undefined,
      nidNumber: nidNumber.trim() || undefined,
    });

    if (ok) {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNomineeName('');
      setNomineeRelation('');
      setNomineePhone('');
      setNidNumber('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
    {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: SMOOTH_EASE }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.26, ease: SMOOTH_EASE }}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <SpringIcon activeKey={isOpen}>
                <UserPlus className="w-5 h-5" />
              </SpringIcon>
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">নতুন সদস্য অন্তর্ভুক্তি ফরম</h3>
              <p className="text-xs text-slate-400">বেসিস ফাউন্ডেশন ডিজিটাল রেজিস্টার</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">সদস্যের পূর্ণ নাম:</label>
            <input
              type="text"
              placeholder="যেমন: মোঃ জাহিদুল ইসলাম"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">মোবাইল নম্বর:</label>
              <input
                type="tel"
                placeholder="+8801..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">ইমেইল ঠিকানা:</label>
              <input
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">বর্তমান ঠিকানা:</label>
              <input
                type="text"
                placeholder="এলাকা, থানা, জেলা"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">জাতীয় পরিচয়পত্র (NID):</label>
              <input
                type="text"
                placeholder="১০/১৩/১৭ ডিজিট"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h4 className="font-semibold text-slate-300">নমিনি সংক্রান্ত তথ্য (উত্তরাধিকার):</h4>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="নমিনির নাম"
                value={nomineeName}
                onChange={(e) => setNomineeName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
              />
              <input
                type="text"
                placeholder="সম্পর্ক (যেমন: স্ত্রী)"
                value={nomineeRelation}
                onChange={(e) => setNomineeRelation(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
              />
              <input
                type="tel"
                placeholder="নমিনির মোবাইল"
                value={nomineePhone}
                onChange={(e) => setNomineePhone(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>নিবন্ধন সম্পন্ন করুন</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
