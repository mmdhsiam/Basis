import React, { useState } from 'react';
import {
  Receipt,
  Download,
  Search,
  FileSpreadsheet,
  ShieldCheck,
  ExternalLink,
  Printer,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ElectronicReceipt, UserProfile } from '../../types';
import {
  formatCurrencyBengali,
  toBengaliNumerals,
} from '../../utils/calculations';
import { generateReceiptPdf, generateStatementPdf } from '../../utils/pdfGenerator';
import { extractDirectImageUrl } from '../../utils/imageUtils';
import { StatementPrintModal } from '../modals/StatementPrintModal';
import { motion } from 'motion/react';
import {
  AnimatedNumber,
  StaggerList,
  StaggerItem,
  SpringIcon,
} from '../common/MotionPrimitives';

interface ReceiptsViewProps {
  selectedReceiptTxId?: string;
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = () => {
  const {
    receipts,
    currentUser,
    users,
    savings,
    config,
    setActivePrintReceipt,
    isGuestMode,
    triggerGuestWarning,
    triggerSuccess,
  } = useApp();

  const isModerator = currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR';
  const realMembers = users.filter((u) => u.id !== '__guest__' && u.memberId !== 'GUEST');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatementMemberId, setSelectedStatementMemberId] = useState<string>(
    !isGuestMode && currentUser?.memberId
      ? currentUser.memberId
      : realMembers[0]?.memberId ?? 'BF-001'
  );
  const [statementPeriod, setStatementPeriod] = useState<string>('ALL');
  const [isStatementModalOpen, setIsStatementModalOpen] = useState<boolean>(false);

  // Filter receipts: Moderators can view all, ordinary members only their own, Guests see none
  const filteredReceipts = receipts.filter((r) => {
    if (!currentUser || isGuestMode) return false;
    if (!isModerator && r.memberId !== currentUser.memberId) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    return (
      r.receiptNumber.toLowerCase().includes(q) ||
      r.memberName.toLowerCase().includes(q) ||
      r.memberId.toLowerCase().includes(q) ||
      r.savingsMonth.includes(q)
    );
  });

  const handleDownloadReceipt = async (receipt: ElectronicReceipt) => {
    if (isGuestMode) {
      triggerGuestWarning('ই-রসিদ ডাউনলোড');
      return;
    }
    await generateReceiptPdf(receipt, config);
    triggerSuccess('ই-রসিদ PDF ফোনের ডাউনলোড স্টোরেজে সংরক্ষিত হয়েছে');
  };

  const currentStatementMember: UserProfile | null = isGuestMode
    ? null
    : realMembers.find((u) => u.memberId === selectedStatementMemberId) ||
      currentUser ||
      realMembers[0] ||
      null;

  const currentStatementTxs = currentStatementMember
    ? savings.filter((t) => t.memberId === currentStatementMember.memberId)
    : [];

  const handleOpenStatementModal = () => {
    if (isGuestMode || !currentStatementMember) {
      triggerGuestWarning('হিসাব স্টেটমেন্ট ভিউ ও ডাউনলোড');
      return;
    }
    setIsStatementModalOpen(true);
  };

  const handleDownloadDirectPdf = async () => {
    if (isGuestMode || !currentStatementMember) {
      triggerGuestWarning('হিসাব স্টেটমেন্ট ডাউনলোড');
      return;
    }
    await generateStatementPdf(currentStatementMember, currentStatementTxs, statementPeriod, config);
    triggerSuccess('স্টেটমেন্ট PDF ফোনের ডাউনলোড স্টোরেজে সংরক্ষিত হয়েছে');
  };

  const cleanReceiptWatermark = extractDirectImageUrl(config.receiptWatermarkImageUrl);

  return (
    <div className="space-y-5 pb-16">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <SpringIcon activeKey={filteredReceipts.length}>
                <Receipt className="w-5 h-5 text-emerald-400" />
              </SpringIcon>
              <span>ডিজিটাল রসিদ ও ব্যাংক-স্টাইল স্টেটমেন্ট</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              অনুমোদিত প্রতিটি জমার স্বয়ংক্রিয় ভেরিফাইড রসিদ ও সমগ্র সঞ্চয় হিসাবের অফিসিয়াল পিডিএফ স্টেটমেন্ট।
            </p>
          </div>
        </div>

        {/* PDF Statement Generator Card (Section 10.2) */}
        <div className="bg-slate-950 border border-emerald-900/40 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-ink text-sm">
                অফিসিয়াল একাউন্ট স্টেটমেন্ট জেনারেটর (Official Statement Generator)
              </h3>
            </div>
            {isGuestMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                <Lock className="w-3 h-3" />
                <span>অতিথি দর্শকের জন্য লকড</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {isGuestMode
              ? 'অতিথি দর্শকদের জন্য ব্যক্তিগত হিসাব স্টেটমেন্ট লক করা রয়েছে। নিজের স্টেটমেন্ট দেখতে ও ডাউনলোড করতে সদস্য একাউন্টে লগইন করুন।'
              : <>ব্যাংক স্ট্যান্ডার্ড ফরম্যাটে লেনদেন বিবরণী তৈরি হবে (ফাইল নাম: <code className="text-emerald-300 font-mono">BF_MEMBER_ID_Statement.pdf</code>)।</>}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            {/* Member Selector (for moderators) */}
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">সদস্য হিসাব:</label>
              {isGuestMode ? (
                <div className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>GUEST — অতিথি দর্শক (লকড)</span>
                </div>
              ) : (
                <select
                  aria-label="সদস্য হিসাব নির্বাচন করুন"
                  disabled={!isModerator}
                  value={selectedStatementMemberId}
                  onChange={(e) => setSelectedStatementMemberId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                >
                  {realMembers.map((u) => (
                    <option key={u.id} value={u.memberId}>
                      {u.memberId} — {u.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Period Selector */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">স্টেটমেন্ট সময়কাল:</label>
              <select
                aria-label="স্টেটমেন্ট সময়কাল নির্বাচন করুন"
                disabled={isGuestMode}
                value={statementPeriod}
                onChange={(e) => setStatementPeriod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="ALL">সমগ্র সময়কাল (All Time Records)</option>
                <option value="2026-10">অক্টোবর ২০২৬</option>
                <option value="2026-09">সেপ্টেম্বর ২০২৬</option>
                <option value="2026-08">আগস্ট ২০২৬</option>
                <option value="2026">সম্পূর্ণ ২০২৬ সাল</option>
              </select>
            </div>

            {/* Generate Buttons */}
            <div className="sm:col-span-3 flex items-end gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleOpenStatementModal}
                className={`flex-1 py-2.5 px-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isGuestMode
                    ? 'bg-slate-900 text-slate-400 border-slate-800 hover:border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                }`}
                title="স্টেটমেন্ট প্রিভিউ ও প্রিন্ট"
              >
                <SpringIcon>
                  {isGuestMode ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Printer className="w-4 h-4 text-emerald-400" />}
                </SpringIcon>
                <span className="hidden sm:inline">ভিউ / </span>প্রিন্ট
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownloadDirectPdf}
                className={`flex-1 py-2.5 px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isGuestMode
                    ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title="সরাসরি A4 পিডিএফ ডাউনলোড"
              >
                <SpringIcon>
                  {isGuestMode ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-4 h-4" />}
                </SpringIcon>
                <span>ডাউনলোড</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipts Search & Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-ink text-base flex items-center gap-2">
            <span>ভেরিফাইড রসিদসমূহ</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              <AnimatedNumber
                value={filteredReceipts.length}
                formatter={(v) => `${toBengaliNumerals(Math.round(v))} টি`}
              />
            </span>
          </h3>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="রসিদ নং, সদস্যের নাম বা মাস..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Receipts Cards Grid */}
        <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" stagger={0.04}>
          {filteredReceipts.map((receipt) => (
            <StaggerItem
              key={receipt.receiptNumber}
              hoverLift
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm transition-all flex flex-col justify-between space-y-3 group relative overflow-hidden card-interactive"
            >
              {/* Hosted Watermark Image Overlay if provided */}
              {cleanReceiptWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] p-6 z-0">
                  <img
                    src={cleanReceiptWatermark}
                    alt="Watermark"
                    className="max-w-[160px] max-h-[160px] object-contain"
                  />
                </div>
              )}
              <div className="relative z-10">
                {/* Receipt Header Badge */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {receipt.receiptNumber}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(receipt.generatedAt).toLocaleDateString('en-GB')}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">সদস্যের নাম:</span>
                    <strong className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block" title="সক্রিয় সদস্য" />
                      <span>{receipt.memberName}</span>
                    </strong>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">সদস্য আইডি:</span>
                    <span className="font-mono text-slate-300 font-semibold">{receipt.memberId}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">সঞ্চয়ের মাস:</span>
                    <span className="text-slate-200 font-medium">{receipt.savingsMonth}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">পেমেন্ট মাধ্যম:</span>
                    <span className="text-slate-300">{receipt.paymentMethod}</span>
                  </div>
                  {receipt.transactionRef && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">ট্রানজেকশন রেফ:</span>
                      <span className="font-mono text-slate-300">{receipt.transactionRef}</span>
                    </div>
                  )}

                  {/* Amount Pill */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between mt-2">
                    <span className="text-[11px] text-slate-400 font-bold">প্রাপ্ত পরিমাণ:</span>
                    <span className="text-base font-bold text-emerald-400">
                      <AnimatedNumber
                        value={receipt.amount}
                        formatter={(v) => formatCurrencyBengali(Math.round(v))}
                      />
                    </span>
                  </div>

                  {/* Verification Note */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1 font-mono truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>ভেরিফাইড হ্যাশ: {receipt.verificationHash.slice(0, 20)}...</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Preview & Print + Download PDF */}
              <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActivePrintReceipt(receipt)}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1 border border-slate-700/80 cursor-pointer"
                  title="রসিদ প্রিভিউ ও স্পষ্ট প্রিন্ট করুন"
                >
                  <SpringIcon>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  </SpringIcon>
                  <span>প্রিভিউ ও প্রিন্ট</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleDownloadReceipt(receipt)}
                  className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <SpringIcon>
                    <Download className="w-3.5 h-3.5" />
                  </SpringIcon>
                  <span>ডাউনলোড</span>
                </motion.button>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>

        {filteredReceipts.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400">কোনো রসিদ পাওয়া যায়নি।</p>
          </div>
        )}
      </div>

      {/* Official Unbreakable Statement Print Modal */}
      <StatementPrintModal
        isOpen={isStatementModalOpen}
        member={currentStatementMember}
        transactions={currentStatementTxs}
        periodLabel={statementPeriod}
        config={config}
        onClose={() => setIsStatementModalOpen(false)}
      />
    </div>
  );
};
