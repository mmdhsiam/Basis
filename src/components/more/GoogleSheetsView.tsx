import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  Save,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

export const GoogleSheetsView: React.FC = () => {
  const {
    config,
    approvals,
    proposeBankOrConfigChange,
    checkPendingRequestWarning,
    currentUser,
    isGuestMode,
    triggerGuestWarning,
    triggerWarning,
  } = useApp();
  const [sheetUrl, setSheetUrl] = useState(
    config.googleSheetsUrl ||
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const isModeratorOrAppMod =
    !isGuestMode && (currentUser?.role === 'APP_MODERATOR' || currentUser?.role === 'MODERATOR');

  const pendingSheetChange = approvals.find(
    (a) =>
      a.status === 'PENDING' &&
      a.requestType === 'BANK_CONFIG_CHANGE' &&
      Boolean(a.payload?.configPatch?.googleSheetsUrl)
  );

  // Keep local sheetUrl synced with saved config whenever not actively editing
  useEffect(() => {
    if (config.googleSheetsUrl && !isEditing) {
      setSheetUrl(config.googleSheetsUrl);
    }
  }, [config.googleSheetsUrl, isEditing]);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isModeratorOrAppMod) {
      triggerGuestWarning('গুগল শিট লিংক পরিবর্তন');
      return;
    }
    const trimmed = sheetUrl.trim();
    if (!trimmed.startsWith('https://docs.google.com/spreadsheets/')) {
      triggerWarning(
        'সঠিক গুগল শিট লিংক দিন',
        'অনুগ্রহ করে https://docs.google.com/spreadsheets/d/... ফরম্যাটের বৈধ গুগল স্প্রেডশিট লিংক পেস্ট করুন।',
        false
      );
      return;
    }

    if (trimmed === (config.googleSheetsUrl || '').trim()) {
      setIsEditing(false);
      return;
    }

    const ok = proposeBankOrConfigChange(
      'গুগল শিট লিংক পরিবর্তন অনুমোদন',
      `${currentUser.name} গুগল শিটের লিংক হালনাগাদের প্রস্তাব দাখিল করেছেন। অনুমোদনের পর নতুন শিটটি স্থায়ীভাবে সেট হবে।`,
      { googleSheetsUrl: trimmed },
      [
        {
          field: 'googleSheetsUrl',
          oldValue: config.googleSheetsUrl || 'পূর্বের শিট লিংক',
          newValue: trimmed,
        },
      ]
    );
    if (!ok) return;
    setSheetUrl(config.googleSheetsUrl || trimmed);
    setIsEditing(false);
  };

  // Convert sharing or published URL to login-free embeddable clean grid view URL
  const getEmbedUrl = (rawUrl: string) => {
    try {
      const clean = rawUrl.trim();
      if (clean.includes('/spreadsheets/d/e/')) {
        const basePub = clean.split('?')[0].replace(/\/pub$/, '/pubhtml');
        return `${basePub}?widget=true&headers=false`;
      }
      if (clean.includes('spreadsheets/d/')) {
        const idMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (idMatch && idMatch[1] && idMatch[1] !== 'e') {
          const sheetId = idMatch[1];
          const gidMatch = clean.match(/[?&#]gid=([0-9]+)/);
          const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
          return `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed?widget=true&headers=false${gidParam}`;
        }
      }
      return clean;
    } catch {
      return rawUrl;
    }
  };

  const getDirectOpenUrl = (rawUrl: string) => {
    const idMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1] && idMatch[1] !== 'e') {
      return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/edit?usp=sharing`;
    }
    return rawUrl;
  };

  const activeConfigUrl =
    config.googleSheetsUrl ||
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
  const embedSrc = getEmbedUrl(activeConfigUrl);
  const directOpenUrl = getDirectOpenUrl(activeConfigUrl);

  return (
    <div className="space-y-2.5 pb-16">
      {/* Compact Title + Inline Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-sm space-y-2">
        <div className="flex items-center gap-2.5 px-0.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            গুগল শিটস স্প্রেডশিট হিসাব
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap w-full">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setIframeKey((k) => k + 1)}
            className="py-2 px-2.5 sm:px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-slate-700 cursor-pointer shrink-0 whitespace-nowrap"
            title="শিট রিলোড করুন"
          >
            <SpringIcon activeKey={iframeKey}>
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </SpringIcon>
            <span>রিলোড</span>
          </motion.button>

          <a
            href={directOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-2.5 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors flex-1 sm:flex-initial min-w-0 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="truncate">গুগল শিটস অ্যাপে খুলুন / এডিট</span>
            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </a>

          {isModeratorOrAppMod && (
            <button
              type="button"
              onClick={() => {
                if (!isEditing && pendingSheetChange) {
                  checkPendingRequestWarning(
                    { requestTypes: ['BANK_CONFIG_CHANGE'], sourceKey: 'config-googleSheetsUrl' },
                    'গুগল শিট লিংক পরিবর্তন'
                  );
                  return;
                }
                setIsEditing(!isEditing);
              }}
              className="py-2 px-2.5 sm:px-3.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-[10.5px] sm:text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              {isEditing ? 'বন্ধ করুন' : 'শিট লিংক পরিবর্তন'}
            </button>
          )}
        </div>

        {isModeratorOrAppMod && pendingSheetChange && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5 font-semibold">
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>নতুন শিট লিংক পরিবর্তনের প্রস্তাব মডারেটর প্যানেলে অনুমোদনের অপেক্ষায় আছে।</span>
          </div>
        )}

        {/* Link Edit Form (Moderator Only + Requires Approval) */}
        <AnimatePresence initial={false}>
          {isEditing && isModeratorOrAppMod && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: SMOOTH_EASE }}
              onSubmit={handleSaveUrl}
              className="pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row gap-2 overflow-hidden"
            >
              <input
                type="url"
                placeholder="গুগল শিট শেয়ারিং লিংক পেস্ট করুন (Anyone with the link)..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-ink focus:ring-1 focus:ring-emerald-500 font-mono"
                required
              />
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>অনুমোদনের জন্য পাঠান</span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Embedded Google Sheet Iframe (Brought up directly below controls) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative">
        <iframe
          key={`${iframeKey}-${embedSrc}`}
          src={embedSrc}
          title="Google Sheets Live Embed"
          className="w-full h-[calc(100vh-190px)] min-h-[540px] border-0 bg-white"
          allow="autoplay; clipboard-write; encrypted-media"
        />
      </div>
    </div>
  );
};
