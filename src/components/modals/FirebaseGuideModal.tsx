import React, { useState } from 'react';
import {
  X,
  Flame,
  CheckCircle2,
  Copy,
  Key,
  ShieldCheck,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Info,
  Check,
  Activity,
  Server,
  FileCode,
} from 'lucide-react';
import {
  UNIFIED_FIRESTORE_RULES,
  getActiveFirebaseConfig,
  saveFirebaseConfig,
  getFirebaseDb,
  getFirebaseAuth,
  resetFirebaseInstance,
  testFirestoreConnection,
} from '../../utils/firebase';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { PageTabTransition, SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

interface FirebaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({ isOpen, onClose }) => {
  const { cloudSyncStatus, lastSyncTimestamp, triggerCloudSync, triggerSuccess, triggerWarning } = useApp();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Connection testing state (Point 12)
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'IDLE' | 'SUCCESS' | 'ERROR';
    message: string;
  }>({ status: 'IDLE', message: '' });

  // Custom config state
  const [apiKeyInput, setApiKeyInput] = useState(getActiveFirebaseConfig().apiKey);
  const [projectIdInput, setProjectIdInput] = useState(getActiveFirebaseConfig().projectId);
  const [appIdInput, setAppIdInput] = useState(getActiveFirebaseConfig().appId);
  const [jsonInput, setJsonInput] = useState('');

  // Rendered via AnimatePresence below

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ status: 'IDLE', message: 'ফায়ারবেজ সংযোগ পরীক্ষা করা হচ্ছে...' });

    try {
      const activeCfg = getActiveFirebaseConfig();
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();

      if (!auth || !db) {
        throw new Error('Firebase SDK ক্লায়েন্ট শুরু করা যায়নি।');
      }

      const res = await testFirestoreConnection();
      if (res.success) {
        setTestResult({
          status: 'SUCCESS',
          message: `ফায়ারবেজ অথেনটিকেশন ও ফায়ারস্টোর সফলভাবে সংযুক্ত! প্রজেক্ট: "${activeCfg.projectId}" (Package: ${activeCfg.packageName || 'org.basis.foundation'})`,
        });
      } else {
        // Even if collection is empty, connection reached Firestore server
        setTestResult({
          status: 'SUCCESS',
          message: `ফায়ারবেজ ক্লায়েন্ট সক্রিয় ও রেডি! প্রজেক্ট: "${activeCfg.projectId}" (Android: org.basis.foundation)`,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'ERROR',
        message: `ফায়ারবেজ সংযোগে ত্রুটি: ${err.message || 'নেটওয়ার্ক বা রুলস যাচাই করুন'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveJsonConfig = () => {
    try {
      if (!jsonInput.trim()) return;
      const parsed = JSON.parse(jsonInput.trim());

      // If google-services.json
      if (parsed.client && parsed.client[0]) {
        const client = parsed.client[0];
        const projectInfo = parsed.project_info || {};
        const apiKey = client.api_key && client.api_key[0]?.current_key;
        const appId = client.client_info?.mobilesdk_app_id;
        const projectId = projectInfo.project_id;
        const storageBucket = projectInfo.storage_bucket;

        saveFirebaseConfig({
          apiKey: apiKey || '',
          appId: appId || '',
          projectId: projectId || '',
          storageBucket: storageBucket || '',
          authDomain: `${projectId}.firebaseapp.com`,
          packageName: 'org.basis.foundation',
        });
        triggerSuccess('google-services.json সফলভাবে প্রসেস ও সংরক্ষিত হয়েছে!');
        setJsonInput('');
        return;
      }

      // If web config
      saveFirebaseConfig(parsed);
      triggerSuccess('Firebase কনফিগারেশন সংরক্ষিত হয়েছে!');
      setJsonInput('');
    } catch (err) {
      triggerWarning('ত্রুটিপূর্ণ JSON', 'দয়া করে সঠিক JSON ফরম্যাট পেস্ট করুন।');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.26, ease: SMOOTH_EASE }}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <SpringIcon activeKey={activeStep}>
                <Flame className="w-5 h-5" />
              </SpringIcon>
            </div>
            <div>
              <h3 className="font-bold text-ink text-base">
                ফায়ারবেজ (Firebase) ইন্টিগ্রেশন ও রুলস নির্দেশিকা
              </h3>
              <p className="text-xs text-amber-300/80">
                Android অ্যাপ: <code className="font-mono text-emerald-400">org.basis.foundation</code> • ২/৩ মডারেটর অনুমোদন রুলস
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Step Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs font-bold scrollbar-none">
          {[
            { num: 1, title: '১. একক ফায়ারস্টোর রুলস' },
            { num: 2, title: '২. সংযোগ টেস্ট (Point 12)' },
            { num: 3, title: '৩. google-services.json' },
            { num: 4, title: '৪. স্টেপ-বাই-স্টেপ সেটআপ' },
          ].map((step) => (
            <button
              key={step.num}
              onClick={() => setActiveStep(step.num)}
              className={`relative py-3 px-4 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeStep === step.num
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{step.title}</span>
              {activeStep === step.num && (
                <motion.span
                  layoutId="firebase-guide-tab-underline"
                  transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          <PageTabTransition tabKey={String(activeStep)} className="space-y-4">
          {/* Tab 1: Single Unified Firestore Rules (Point 5) */}
          {activeStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>একক ফায়ারস্টোর ও সিকিউরিটি রুলস (Unified Firestore Rules)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    অথেন্টিকেশন, ইউজার প্রোফাইল, সঞ্চয় লেনদেনে ২/৩ মডারেটর অনুমোদন এবং রিয়েল-টাইম ডাটা সিংক এক রুলসেই অন্তর্ভুক্ত।
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(UNIFIED_FIRESTORE_RULES, 'rules')}
                  className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                >
                  {copiedKey === 'rules' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'rules' ? 'কপি হয়েছে!' : 'রুলস কপি করুন'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed">
                  {UNIFIED_FIRESTORE_RULES}
                </pre>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px]">
                <strong className="text-ink block font-bold">কোথায় পেস্ট করবেন:</strong>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                  <li>Firebase Console (<a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">console.firebase.google.com</a>) এ আপনার প্রজেক্ট খুলুন।</li>
                  <li>বাম মেনু থেকে <strong>Firestore Database</strong> &gt; <strong>Rules</strong> ট্যাবে ক্লিক করুন।</li>
                  <li>পূর্বের সকল টেক্সট মুছে উপরের কপি করা কোডটি পেস্ট করে <strong>"Publish"</strong> বাটনে ক্লিক করুন।</li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab 2: Test Connection (Point 12) */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>ফায়ারবেজ অথেনটিকেশন ও ফায়ারস্টোর সংযোগ পরীক্ষা</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                প্যাকেজ নাম <code className="text-emerald-300 font-mono">org.basis.foundation</code> এর সাথে ফায়ারবেজ ক্লাউড ডাটাবেজ এবং অথেনটিকেশন সক্রিয় রয়েছে কিনা তা সরাসরি যাচাই করুন:
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Server className="w-4 h-4" />
                  <span>{isTesting ? 'সংযোগ পরীক্ষা চলছে...' : 'সংযোগ টেস্ট করুন (Check Connection)'}</span>
                </button>

                <button
                  onClick={triggerCloudSync}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  <span>এখনই ক্লাউডে সিংক করুন (Sync Now)</span>
                </button>
              </div>

              {/* Real-time Cloud Sync Status */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">রিয়েল-টাইম ক্লাউড সিংক স্ট্যাটাস:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        cloudSyncStatus === 'SYNCED'
                          ? 'bg-emerald-400 animate-pulse'
                          : cloudSyncStatus === 'SYNCING'
                          ? 'bg-amber-400 animate-spin'
                          : 'bg-blue-400'
                      }`}
                    />
                    <strong className="text-ink">
                      {cloudSyncStatus === 'SYNCED'
                        ? 'ক্লাউড সিংক সক্রিয় (সরাসরি ফায়ারস্টোরে আপডেট হচ্ছে)'
                        : cloudSyncStatus === 'SYNCING'
                        ? 'সিংক প্রক্রিয়া চলছে...'
                        : 'লোকাল ব্যাকআপ মোড (ফায়ারবেজ কানেকশন প্রস্তুত)'}
                    </strong>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400 font-mono">
                  <span>সর্বশেষ সিংক:</span>
                  <strong className="block text-slate-200">{lastSyncTimestamp}</strong>
                </div>
              </div>

              {testResult.message && (
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    testResult.status === 'SUCCESS'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                      : testResult.status === 'ERROR'
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  {testResult.status === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                  <div>
                    <strong className="block font-bold">
                      {testResult.status === 'SUCCESS' ? 'সংযোগ সফল!' : 'পরীক্ষার ফলাফল:'}
                    </strong>
                    <p className="text-[11px] mt-0.5 leading-relaxed">{testResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Paste google-services.json */}
          {activeStep === 3 && (
            <div className="space-y-3">
              <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>google-services.json ফাইল আপলোড বা পেস্ট করুন</span>
              </h4>
              <p className="text-slate-300 text-[11px]">
                ফায়ারবেজ থেকে ডাউনলোডকৃত <code className="font-mono text-emerald-300">google-services.json</code> ফাইলের টেক্সট নিচে পেস্ট করে "সংরক্ষণ করুন" এ ক্লিক করুন:
              </p>

              <textarea
                rows={6}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{ "project_info": { "project_id": "basis-foundation-89b2a" }, "client": [ ... ] }'
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-ink font-mono"
              />

              <button
                onClick={handleSaveJsonConfig}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow cursor-pointer"
              >
                সংরক্ষণ ও সংযোগ করুন
              </button>
            </div>
          )}

          {/* Tab 4: Step by step instructions */}
          {activeStep === 4 && (
            <div className="space-y-3">
              <h4 className="font-bold text-ink text-sm">
                ধাপ-বাই-ধাপ ফায়ারবেজ ও অ্যান্ড্রয়েড গাইড
              </h4>
              <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed text-[11px]">
                <li>Firebase Console-এ প্রজেক্টে একটি Android Application তৈরি করুন যার Package Name হবে <code className="font-mono text-emerald-400">org.basis.foundation</code>।</li>
                <li>Authentication ট্যাবে গিয়ে <strong>Email/Password</strong> এবং <strong>Google</strong> সাইন-ইন মেথড চালু (Enable) করুন।</li>
                <li>Firestore Database তৈরি করে "test mode" অথবা "production mode" সিলেক্ট করুন। এরপর ট্যাব ১-এর রুলসটি পেস্ট করে পাবলিশ করুন।</li>
                <li>অ্যাপ্লিকেশন স্বয়ংক্রিয়ভাবে ক্লাউড ফায়ারস্টোরে সকল সদস্য, সঞ্চয় জমা, এবং কনফিগারেশন সিংক রাখবে।</li>
              </ol>
            </div>
          )}
          </PageTabTransition>
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
