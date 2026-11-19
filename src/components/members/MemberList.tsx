import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Phone,
  Shield,
  Wallet,
  Clock,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserProfile } from '../../types';
import {
  formatCurrencyBengali,
  toBengaliNumerals,
  calculateMemberSavings,
  getUserDesignationList,
} from '../../utils/calculations';
import { getMaskedPhone } from '../../utils/privacyUtils';
import { MemberDetailsModal } from './MemberDetailsModal';
import { Avatar } from '../common/Avatar';
import { motion } from 'motion/react';
import {
  AnimatedNumber,
  StaggerList,
  StaggerItem,
  SpringIcon,
} from '../common/MotionPrimitives';

interface MemberListProps {
  onOpenReceipt: (txId: string) => void;
  onOpenNewMemberModal: () => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  onOpenReceipt,
  onOpenNewMemberModal,
}) => {
  const { users, savings, currentUser, isGuestMode, triggerGuestWarning, setActivePrivateChatUser, executiveMembers } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('APPROVED');
  const [sortBy, setSortBy] = useState<'NAME' | 'ID' | 'SAVINGS' | 'LATEST_DEPOSIT'>('ID');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);

  // Compute stats for all real registered members (exclude unified Guest placeholder)
  const memberWithStats = useMemo(() => {
    return users
      .filter((user) => user.id !== '__guest__' && user.memberId !== 'GUEST')
      .map((user) => {
        const stats = calculateMemberSavings(user.memberId, savings);
        const latestTx = stats.history[0];
        return {
          user,
          stats,
          latestDepositDate: latestTx ? new Date(latestTx.transactionDate).getTime() : 0,
        };
      });
  }, [users, savings]);

  // Filter & Search
  const filteredMembers = useMemo(() => {
    return memberWithStats
      .filter(({ user }) => {
        // Query match
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          (user.name || '').toLowerCase().includes(q) ||
          (user.memberId || '').toLowerCase().includes(q) ||
          (user.phone || '').includes(q);

        // Role filter
        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

        // Status filter
        const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;

        return matchesQuery && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME') {
          return (a.user.name || '').localeCompare(b.user.name || '');
        }
        if (sortBy === 'ID') {
          return (a.user.memberId || '').localeCompare(b.user.memberId || '');
        }
        if (sortBy === 'SAVINGS') {
          return b.stats.approvedTotal - a.stats.approvedTotal;
        }
        if (sortBy === 'LATEST_DEPOSIT') {
          return b.latestDepositDate - a.latestDepositDate;
        }
        return 0;
      });
  }, [memberWithStats, searchQuery, roleFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-4 pb-16">
      {/* Top Header & Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <span>সদস্য তালিকা ও সঞ্চয় প্রোফাইল</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                মোট:{' '}
                <AnimatedNumber
                  value={filteredMembers.length}
                  formatter={(v) => toBengaliNumerals(Math.round(v))}
                />{' '}
                জন
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              বেসিস ফাউন্ডেশনের নিবন্ধিত সদস্যদের তালিকা, অনুমোদিত মোট সঞ্চয় ও সর্বশেষ কিস্তির বিবরণ।
            </p>
          </div>

          {(currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR') && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenNewMemberModal}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <SpringIcon>
                <UserPlus className="w-4 h-4" />
              </SpringIcon>
              <span>নতুন সদস্য নিবন্ধন</span>
            </motion.button>
          )}
        </div>

        {/* Search Input & Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-800">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="সদস্যের নাম, আইডি (যেমন BF-001) বা ফোন নম্বর লিখুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Role Filter */}
          <div className="sm:col-span-3">
            <select
              aria-label="রোল ফিল্টার করুন"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">সকল পদবী (All Roles)</option>
              <option value="APP_MODERATOR">অ্যাপ মডারেটর</option>
              <option value="MODERATOR">মডারেটর</option>
              <option value="MEMBER">সাধারণ সদস্য</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="sm:col-span-3">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                aria-label="সাজানোর ধরণ নির্বাচন করুন"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ID">সদস্য আইডি অনুসারে</option>
                <option value="SAVINGS">সর্বোচ্চ সঞ্চয় অনুসারে</option>
                <option value="LATEST_DEPOSIT">সর্বশেষ জমা অনুসারে</option>
                <option value="NAME">নামের বর্ণানুক্রমিক</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Member Cards Grid */}
      <StaggerList
        key={`${roleFilter}-${sortBy}`}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        stagger={0.04}
      >
        {filteredMembers.map(({ user, stats }) => {
          // Latest 3 savings entries as specified in Section 7
          const latestThree = stats.history.slice(0, 3);

          return (
            <StaggerItem
              key={user.id}
              hoverLift
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group card-interactive"
            >
              <div>
                {/* Member Top Bar */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user.avatarUrl}
                      name={user.name}
                      size="lg"
                      ringColor={
                        user.role === 'APP_MODERATOR'
                          ? 'ring-amber-500'
                          : user.role === 'MODERATOR'
                          ? 'ring-blue-500'
                          : 'ring-slate-700'
                      }
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-ink text-sm sm:text-base group-hover:text-emerald-400 transition-colors">
                          {user.name}
                        </h3>
                        {/* Requirement 12: Blue Tick beside moderator names */}
                        {(user.role !== 'MEMBER' || user.isPublicModerator) && (
                          <span title="ভেরিফাইড মডারেটর" className="inline-flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-500 text-ink inline-block" />
                          </span>
                        )}
                        {(() => {
                          const designations = getUserDesignationList(user, executiveMembers);
                          if (designations.length === 0) return null;
                          return (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-normal">
                              {designations.join(', ')}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-emerald-400 font-bold">
                          {user.memberId}
                        </span>
                        <span>•</span>
                        <span>{user.gender === 'MALE' ? 'পুরুষ' : user.gender === 'FEMALE' ? 'নারী' : 'অন্যান্য'}</span>
                        <span>•</span>
                        <span>যোগদান: {user.joinDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Requirement 16: 1-on-1 Private Message Button */}
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isGuestMode) {
                            triggerGuestWarning('ব্যক্তিগত বার্তা প্রেরণ');
                            return;
                          }
                          setActivePrivateChatUser(user);
                        }}
                        title={`${user.name} কে ব্যক্তিগত বার্তা পাঠান`}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <SpringIcon>
                          <MessageSquare className="w-4 h-4" />
                        </SpringIcon>
                      </button>
                    )}

                    {/* Requirement 8: Female Member Phone Masking & Safe Calling */}
                    {(() => {
                      const phoneInfo = getMaskedPhone(user, currentUser);
                      return phoneInfo.canCall ? (
                        <a
                          href={`tel:${phoneInfo.rawPhone}`}
                          title={`কল করুন (${phoneInfo.displayText})`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <SpringIcon>
                            <Phone className="w-4 h-4" />
                          </SpringIcon>
                        </a>
                      ) : (
                        <span
                          title="নারী সদস্যদের মোবাইল নম্বর শুধুমাত্র মডারেটরদের জন্য উন্মুক্ত"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
                        >
                          <Lock className="w-4 h-4" />
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Savings Summary Banner in Card */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      মোট অনুমোদিত সঞ্চয়
                    </span>
                    <h4 className="text-lg font-bold text-emerald-400">
                      <AnimatedNumber
                        value={stats.approvedTotal}
                        formatter={(v) => formatCurrencyBengali(Math.round(v))}
                      />
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      মোট কিস্তি
                    </span>
                    <p className="text-xs font-bold text-slate-200">
                      {toBengaliNumerals(stats.approvedCount)} টি
                    </p>
                  </div>
                </div>

                {/* Latest 3 savings entries (Section 7) */}
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
                    সর্বশেষ ৩টি সঞ্চয় এন্ট্রি:
                  </span>
                  {latestThree.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">কোনো রেকর্ড নেই</p>
                  ) : (
                    <div className="space-y-1">
                      {latestThree.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                tx.status === 'APPROVED' ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                            />
                            <span className="text-slate-300 font-medium">{tx.savingsMonth}</span>
                            <span className="text-slate-500">({tx.paymentMethod})</span>
                          </div>
                          <span className="font-bold text-slate-200">
                            {formatCurrencyBengali(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* View Full Profile & Statement Button */}
              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMember(user)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-700/60 cursor-pointer"
              >
                <span>সম্পূর্ণ বিবরণ ও হিসাব দেখুন</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            </StaggerItem>
          );
        })}
      </StaggerList>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-400">কোনো সদস্য খুঁজে পাওয়া যায়নি।</p>
        </div>
      )}

      {/* Member Details Modal */}
      <MemberDetailsModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onOpenReceipt={onOpenReceipt}
      />
    </div>
  );
};
