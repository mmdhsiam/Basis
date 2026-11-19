import React, { useState, useEffect, useRef } from 'react';
import { DownloadCloud, CheckCircle2, AlertCircle, X, ShieldCheck, RefreshCw, PackageCheck } from 'lucide-react';
import { AppRelease } from '../../types';
import { toBengaliNumerals } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { SpringIcon, SMOOTH_EASE } from '../common/MotionPrimitives';

interface AppUpdateModalProps {
  release: AppRelease | null;
  onClose: () => void;
}

interface ApkDownloadProgressDetail {
  status?: 'STARTED' | 'DOWNLOADING' | 'COMPLETED' | 'ERROR' | 'PERMISSION_REQUIRED';
  progress?: number;
  loaded?: number;
  total?: number;
  error?: string;
}

const formatMegabytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '০.০ MB';
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${toBengaliNumerals(mb)} MB`;
};

const WavyCircularProgress: React.FC<{
  progress: number;
  loadedBytes?: number;
  totalBytes?: number;
  isCompleted: boolean;
}> = ({ progress, loadedBytes = 0, totalBytes = 0, isCompleted }) => {
  const clamped = Math.max(0, Math.min(100, progress));
  const [phase, setPhase] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPhase((prev) => (prev + dt * 5.2) % (Math.PI * 2));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const size = 148;
  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = 56;
  const sweepAngle = (clamped / 100) * Math.PI * 2;
  const startAngle = -Math.PI / 2;

  // Build wavy sinusoidal arc path for current progress
  const buildWavyArc = (): string => {
    if (clamped <= 0.5) return '';
    const steps = Math.max(12, Math.round((clamped / 100) * 140));
    const waveCycles = 8;
    const waveAmp = isCompleted ? 0 : 3.4;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startAngle + t * sweepAngle;
      // Smoothly taper amplitude at arc ends
      const taper = clamped >= 99.5 ? 0 : Math.sin(Math.min(1, t * 4) * Math.PI * 0.5) * Math.sin(Math.min(1, (1 - t) * 4) * Math.PI * 0.5);
      const wave = Math.sin(t * sweepAngle * waveCycles - phase) * waveAmp * (taper || 1);
      const r = baseRadius + (isCompleted ? 0 : wave);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    return d.trim();
  };

  // Build gentle sinusoidal liquid level wave clipped inside inner circle
  const buildLiquidWavePath = (): string => {
    const innerR = 44;
    const fillRatio = clamped / 100;
    const waterY = cy + innerR - fillRatio * (innerR * 2);
    const waveH = clamped >= 99 || clamped <= 1 ? 0 : 4.2;
    let path = `M ${cx - innerR} ${cy + innerR} L ${cx - innerR} ${waterY.toFixed(2)} `;
    for (let x = -innerR; x <= innerR; x += 4) {
      const wy = waterY + Math.sin((x / innerR) * Math.PI * 2 + phase) * waveH;
      path += `L ${(cx + x).toFixed(2)} ${wy.toFixed(2)} `;
    }
    path += `L ${cx + innerR} ${cy + innerR} Z`;
    return path;
  };

  const arcPath = buildWavyArc();
  const liquidPath = buildLiquidWavePath();

  return (
    <div className="flex flex-col items-center justify-center py-2 space-y-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            <linearGradient id="wavyUpdateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="wavyLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.36)" />
              <stop offset="100%" stopColor="rgba(5, 150, 105, 0.58)" />
            </linearGradient>
            <clipPath id="wavyInnerCircleClip">
              <circle cx={cx} cy={cy} r={44} />
            </clipPath>
          </defs>

          {/* Outer track circle */}
          <circle
            cx={cx}
            cy={cy}
            r={baseRadius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.18)"
            strokeWidth={6}
          />

          {/* Inner container + wavy liquid level */}
          <circle
            cx={cx}
            cy={cy}
            r={44}
            fill="rgba(15, 23, 42, 0.72)"
            stroke="rgba(16, 185, 129, 0.25)"
            strokeWidth={1.5}
          />
          <g clipPath="url(#wavyInnerCircleClip)">
            <path d={liquidPath} fill="url(#wavyLiquidGrad)" />
          </g>

          {/* Wavy progress arc */}
          {arcPath && (
            <path
              d={arcPath}
              fill="none"
              stroke="url(#wavyUpdateGrad)"
              strokeWidth={6.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-ink leading-none">
            {toBengaliNumerals(Math.round(clamped))}%
          </span>
          <span className="text-[10px] font-bold text-emerald-300 mt-1">
            {isCompleted ? 'ডাউনলোড সম্পন্ন' : 'ডাউনলোড হচ্ছে'}
          </span>
        </div>
      </div>

      {totalBytes > 0 && (
        <span className="text-[11px] font-bold text-slate-300 font-mono">
          {formatMegabytes(loadedBytes)} / {formatMegabytes(totalBytes)}
        </span>
      )}
    </div>
  );
};

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ release, onClose }) => {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [loadedBytes, setLoadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isMandatory = Boolean(release?.isMandatory);

  // Reset state cleanly whenever a new release modal opens
  useEffect(() => {
    if (!release) {
      setDownloadProgress(null);
      setLoadedBytes(0);
      setTotalBytes(0);
      setIsDownloading(false);
      setIsDownloaded(false);
      setDownloadError(null);
      setStatusMessage(null);
      return;
    }
    setTotalBytes(release.fileSizeBytes || 0);
    setDownloadProgress(null);
    setLoadedBytes(0);
    setIsDownloading(false);
    setIsDownloaded(false);
    setDownloadError(null);
    setStatusMessage(null);
  }, [release?.id, release?.versionCode]);

  // Listen to real-time APK download events dispatched by Android MainActivity
  useEffect(() => {
    if (!release) return;
    const handleNativeProgress = (e: Event) => {
      const detail = (e as CustomEvent<ApkDownloadProgressDetail>).detail || {};
      if (detail.status === 'STARTED') {
        setIsDownloading(true);
        setIsDownloaded(false);
        setDownloadError(null);
        setDownloadProgress(0);
        setStatusMessage('আপডেট ফাইল ডাউনলোড শুরু হচ্ছে...');
      } else if (detail.status === 'DOWNLOADING') {
        setIsDownloading(true);
        setDownloadError(null);
        const pct = typeof detail.progress === 'number' ? detail.progress : 0;
        setDownloadProgress(pct);
        if (typeof detail.loaded === 'number') setLoadedBytes(detail.loaded);
        if (typeof detail.total === 'number' && detail.total > 0) setTotalBytes(detail.total);
      } else if (detail.status === 'PERMISSION_REQUIRED') {
        setIsDownloading(false);
        setIsDownloaded(true);
        setDownloadProgress(100);
        setStatusMessage(
          'ইনস্টলার খুলতে Android সেটিংস থেকে "Install unknown apps" অনুমতি চালু করে ফিরে আসুন এবং নিচে "ইনস্টলার খুলুন" চাপুন।'
        );
      } else if (detail.status === 'COMPLETED') {
        setIsDownloading(false);
        setIsDownloaded(true);
        setDownloadProgress(100);
        setStatusMessage('APK ডাউনলোড সম্পন্ন হয়েছে! সিস্টেম প্যাকেজ ইনস্টলার চালু হচ্ছে...');
      } else if (detail.status === 'ERROR') {
        setIsDownloading(false);
        setDownloadProgress(null);
        setDownloadError(detail.error || 'আপডেট ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট যাচাই করে পুনরায় চেষ্টা করুন।');
      }
    };

    window.addEventListener('apk-download-progress', handleNativeProgress);
    return () => {
      window.removeEventListener('apk-download-progress', handleNativeProgress);
    };
  }, [release]);

  const handleStartDownload = async () => {
    if (!release || isDownloading) return;
    const url = release.downloadUrl?.trim();
    if (!url) {
      setDownloadError('ডাউনলোড লিংক পাওয়া যায়নি। অ্যাপ মডারেটরের সাথে যোগাযোগ করুন।');
      return;
    }

    setDownloadError(null);
    setStatusMessage(null);
    setIsDownloaded(false);
    setIsDownloading(true);
    setDownloadProgress(0);
    setLoadedBytes(0);
    setTotalBytes(release.fileSizeBytes || 0);

    // 1. Native Android APK direct downloader + System Package Installer trigger
    if (typeof window !== 'undefined' && window.AndroidBridge?.downloadAndInstallApk) {
      try {
        const started = window.AndroidBridge.downloadAndInstallApk(url, release.versionName);
        if (started !== false) {
          return;
        }
      } catch (err: any) {
        setIsDownloading(false);
        setDownloadProgress(null);
        setDownloadError(err?.message || 'অ্যান্ড্রয়েড ডাউনলোডার চালু করা যায়নি।');
        return;
      }
    }

    // 2. Web browser ReadableStream progress downloader fallback
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const headerLen = Number(response.headers.get('content-length') || 0);
      const expectedTotal = headerLen > 0 ? headerLen : release.fileSizeBytes || 0;
      if (expectedTotal > 0) setTotalBytes(expectedTotal);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader unavailable');
      }

      const chunks: BlobPart[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          setLoadedBytes(received);
          if (expectedTotal > 0) {
            setDownloadProgress(Math.min(99, Math.round((received / expectedTotal) * 100)));
          } else {
            setDownloadProgress((prev) => Math.min(92, (prev ?? 5) + 7));
          }
        }
      }

      const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `BasisFoundation-v${release.versionName}.apk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

      setDownloadProgress(100);
      setIsDownloading(false);
      setIsDownloaded(true);
      setStatusMessage(
        `BasisFoundation-v${release.versionName}.apk ডাউনলোড সম্পন্ন হয়েছে! ডাউনলোড ফোল্ডার থেকে APK ফাইলটি ইনস্টল করুন।`
      );
    } catch {
      // If cross-origin CORS blocks fetch() in WebView/browser, trigger direct anchor download
      const link = document.createElement('a');
      link.href = url;
      link.download = `BasisFoundation-v${release.versionName}.apk`;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      let pct = 15;
      setDownloadProgress(pct);
      const timer = setInterval(() => {
        pct += 25;
        if (pct >= 100) {
          clearInterval(timer);
          setDownloadProgress(100);
          setIsDownloading(false);
          setIsDownloaded(true);
          setStatusMessage('ডাউনলোড শুরু হয়েছে। ডাউনলোড সম্পন্ন হলে APK ফাইলটি ওপেন করে ইনস্টল করুন।');
        } else {
          setDownloadProgress(pct);
        }
      }, 320);
    }
  };

  const handleOpenSystemInstaller = () => {
    if (window.AndroidBridge?.triggerPendingApkInstall) {
      window.AndroidBridge.triggerPendingApkInstall();
    } else {
      handleStartDownload();
    }
  };

  return (
    <AnimatePresence>
      {release && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SMOOTH_EASE }}
          onClick={() => {
            if (!isMandatory) onClose();
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: SMOOTH_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto"
          >
            {/* Top Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <SpringIcon activeKey={release.versionName}>
                    <DownloadCloud className="w-6 h-6" />
                  </SpringIcon>
                </div>
                <div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isMandatory
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isMandatory ? 'বাধ্যতামূলক অ্যাপ আপডেট' : 'নতুন সংস্করণ উপলভ্য'}
                  </span>
                  <h3 className="text-lg font-bold text-ink mt-1">
                    নতুন আপডেট v{release.versionName.replace(/^v/i, '')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    বিল্ড কোড: <strong className="text-ink font-bold">{toBengaliNumerals(release.versionCode)}</strong> • সাইজ:{' '}
                    {formatMegabytes(release.fileSizeBytes)}
                  </p>
                </div>
              </div>

              {!isMandatory && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="বন্ধ করুন"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Wavy Circular Progress Indicator while downloading or completed */}
            {downloadProgress !== null && (
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/25">
                <WavyCircularProgress
                  progress={downloadProgress}
                  loadedBytes={loadedBytes}
                  totalBytes={totalBytes}
                  isCompleted={isDownloaded}
                />
              </div>
            )}

            {/* Status / Error Banners */}
            {statusMessage && (
              <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{statusMessage}</span>
              </div>
            )}

            {downloadError && (
              <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{downloadError}</span>
              </div>
            )}

            {/* Release Notes */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2.5">
              <div>
                <h4 className="font-bold text-slate-200">আপডেট বিবরণ:</h4>
                <p className="text-slate-400 mt-0.5 leading-relaxed">{release.releaseNotes}</p>
              </div>

              {release.featureList && release.featureList.length > 0 && (
                <div>
                  <h4 className="font-bold text-emerald-400">নতুন ফিচারসমূহ:</h4>
                  <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                    {release.featureList.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {release.bugFixList && release.bugFixList.length > 0 && (
                <div>
                  <h4 className="font-bold text-amber-400">সমাধানকৃত বিষয়াদি:</h4>
                  <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                    {release.bugFixList.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {release.apkSha256 && release.apkSha256 !== 'verified-cloud-release' && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate font-mono">SHA256: {release.apkSha256}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-1 space-y-2">
              {!isDownloaded ? (
                <button
                  type="button"
                  onClick={handleStartDownload}
                  disabled={isDownloading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-lg"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>ডাউনলোড হচ্ছে ({toBengaliNumerals(Math.round(downloadProgress ?? 0))}%)</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-4 h-4" />
                      <span>এখনই আপডেট করুন</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleOpenSystemInstaller}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <PackageCheck className="w-4 h-4 text-slate-950" />
                    <span>প্যাকেজ ইনস্টলার খুলুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartDownload}
                    className="w-full py-2 text-xs text-slate-400 hover:text-ink font-semibold cursor-pointer"
                  >
                    পুনরায় ডাউনলোড করুন
                  </button>
                </div>
              )}

              {!isMandatory && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  পরে আপডেট করব
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
