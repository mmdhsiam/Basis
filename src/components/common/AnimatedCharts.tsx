import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { formatCurrencyBengali, toBengaliNumerals } from '../../utils/calculations';
import { AnimatedNumber, SMOOTH_EASE, useViewportReplay } from './MotionPrimitives';

export interface ChartDatum {
  key: string;
  label: string;
  shortLabel?: string;
  value: number;
  secondaryValue?: number;
  isHighlighted?: boolean;
}

/**
 * Generates a smooth cubic-bezier SVG path through a list of (x, y) points.
 */
function buildSmoothSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.22;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Capsule Bar Chart — animates every bar upward from zero (0) whenever it enters the viewport,
 * and replays from 0 again if scrolled out and back into view.
 */
export const FernlyCapsuleBarChart: React.FC<{
  data: ChartDatum[];
  heightClass?: string;
  showValuesOnTop?: boolean;
  dualMode?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
}> = ({
  data,
  heightClass = 'h-56',
  showValuesOnTop = true,
  dualMode = false,
  primaryLabel = 'সঞ্চয় জমা',
  secondaryLabel = 'ব্যয়',
}) => {
  const uid = useId().replace(/:/g, '');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { ref: viewportRef, isInView } = useViewportReplay<HTMLDivElement>(0.15);

  const maxVal = useMemo(() => {
    const vals = data.flatMap((d) =>
      dualMode ? [d.value, d.secondaryValue || 0] : [d.value]
    );
    return Math.max(...vals, 1);
  }, [data, dualMode]);

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-500">
        এখনও কোনো মাসিক তথ্য নেই
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="relative select-none">
      {/* SVG hatch pattern definition for Fernly-style striped inactive/projected capsules */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <pattern
            id={`fernly-hatch-${uid}`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(42)"
          >
            <rect width="8" height="8" fill="rgba(16, 185, 129, 0.12)" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="rgba(52, 211, 153, 0.34)"
              strokeWidth="3"
            />
          </pattern>
          <pattern
            id={`expense-hatch-${uid}`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(42)"
          >
            <rect width="8" height="8" fill="rgba(244, 63, 94, 0.14)" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="rgba(251, 113, 133, 0.45)"
              strokeWidth="3"
            />
          </pattern>
        </defs>
      </svg>

      <div
        className={`chart-canvas-grid rounded-2xl px-2 sm:px-4 pt-7 pb-2 border border-slate-800/70 flex items-end gap-2.5 sm:gap-5 ${heightClass}`}
      >
        {data.map((item, idx) => {
          const pct = Math.max(10, Math.round((item.value / maxVal) * 100));
          const secPct = Math.max(
            item.secondaryValue && item.secondaryValue > 0 ? 10 : 4,
            Math.round(((item.secondaryValue || 0) / maxVal) * 100)
          );
          const isActive = item.isHighlighted || hoveredIdx === idx;

          return (
            <div
              key={item.key}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
              className="relative flex-1 h-full flex flex-col items-center justify-end cursor-pointer group"
            >
              {/* Floating Corvane dark pill tooltip on hover/tap */}
              <AnimatePresence>
                {hoveredIdx === idx && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.94 }}
                    transition={{ duration: 0.16, ease: SMOOTH_EASE }}
                    className="absolute -top-5 z-20 px-2.5 py-1 rounded-xl bg-slate-950 text-ink border border-emerald-500/40 shadow-xl whitespace-nowrap pointer-events-none text-[10px] font-bold"
                  >
                    <span className="text-emerald-400">{formatCurrencyBengali(item.value)}</span>
                    {dualMode && (
                      <span className="text-rose-400 ml-1.5">
                        • {secondaryLabel}: {formatCurrencyBengali(item.secondaryValue || 0)}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {showValuesOnTop && !dualMode && (
                <span
                  className={`text-[10px] sm:text-[11px] font-bold mb-1.5 transition-transform duration-200 ${
                    isActive ? 'text-emerald-400 scale-105' : 'text-slate-400'
                  }`}
                >
                  <AnimatedNumber value={item.value} formatter={(v) => formatCurrencyBengali(Math.round(v))} />
                </span>
              )}

              {!dualMode ? (
                <div className="w-full flex-1 flex items-end justify-center">
                  <motion.div
                    initial={{ scaleY: 0, opacity: 0.25 }}
                    animate={{
                      scaleY: isInView ? 1 : 0,
                      opacity: isInView ? 1 : 0.25,
                    }}
                    transition={{
                      duration: isInView ? 0.68 : 0.15,
                      delay: isInView ? idx * 0.04 : 0,
                      ease: SMOOTH_EASE,
                    }}
                    style={{ height: `${pct}%`, transformOrigin: 'bottom', willChange: 'transform, opacity' }}
                    className={`w-full max-w-[52px] rounded-2xl relative overflow-hidden transition-colors duration-200 flex items-start justify-center pt-2 ${
                      isActive
                        ? 'bg-gradient-to-t from-[#064e3b] via-[#059669] to-[#34d399] shadow-[0_10px_24px_-6px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400/50'
                        : 'border border-emerald-500/25 bg-emerald-500/10'
                    }`}
                  >
                    {!isActive && (
                      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                        <rect width="100%" height="100%" fill={`url(#fernly-hatch-${uid})`} />
                      </svg>
                    )}
                    {item.isHighlighted && (
                      <span className="relative z-10 w-2 h-2 rounded-full bg-white shadow animate-pulse" />
                    )}
                  </motion.div>
                </div>
              ) : (
                <div className="w-full flex-1 flex items-end justify-center gap-1 sm:gap-2">
                  {/* Savings Capsule */}
                  <div className="flex-1 max-w-[28px] h-full flex flex-col items-center justify-end">
                    <span className="text-[9px] font-bold text-emerald-400 mb-1 truncate hidden sm:block">
                      <AnimatedNumber value={item.value} formatter={(v) => formatCurrencyBengali(Math.round(v))} />
                    </span>
                    <motion.div
                      initial={{ scaleY: 0, opacity: 0.25 }}
                      animate={{
                        scaleY: isInView ? 1 : 0,
                        opacity: isInView ? 1 : 0.25,
                      }}
                      transition={{
                        duration: isInView ? 0.68 : 0.15,
                        delay: isInView ? idx * 0.04 : 0,
                        ease: SMOOTH_EASE,
                      }}
                      style={{ height: `${pct}%`, transformOrigin: 'bottom', willChange: 'transform, opacity' }}
                      className="w-full rounded-xl bg-gradient-to-t from-emerald-800 via-emerald-600 to-teal-400 shadow-md ring-1 ring-emerald-400/30"
                      title={`${primaryLabel}: ${formatCurrencyBengali(item.value)}`}
                    />
                  </div>

                  {/* Expense Striped Capsule */}
                  <div className="flex-1 max-w-[28px] h-full flex flex-col items-center justify-end">
                    <span className="text-[9px] font-bold text-rose-400 mb-1 truncate hidden sm:block">
                      <AnimatedNumber
                        value={item.secondaryValue || 0}
                        formatter={(v) => formatCurrencyBengali(Math.round(v))}
                      />
                    </span>
                    <motion.div
                      initial={{ scaleY: 0, opacity: 0.25 }}
                      animate={{
                        scaleY: isInView ? 1 : 0,
                        opacity: isInView ? 1 : 0.25,
                      }}
                      transition={{
                        duration: isInView ? 0.68 : 0.15,
                        delay: isInView ? idx * 0.04 + 0.05 : 0,
                        ease: SMOOTH_EASE,
                      }}
                      style={{ height: `${secPct}%`, transformOrigin: 'bottom', willChange: 'transform, opacity' }}
                      className="w-full rounded-xl relative overflow-hidden bg-rose-600/20 border border-rose-500/40 shadow-sm"
                      title={`${secondaryLabel}: ${formatCurrencyBengali(item.secondaryValue || 0)}`}
                    >
                      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                        <rect width="100%" height="100%" fill={`url(#expense-hatch-${uid})`} />
                      </svg>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Axis Labels */}
      <div className="flex justify-between gap-2 px-2 sm:px-4 pt-2">
        {data.map((item, idx) => {
          const active = item.isHighlighted || hoveredIdx === idx;
          return (
            <span
              key={item.key}
              className={`flex-1 text-center text-[11px] truncate transition-colors ${
                active ? 'font-bold text-emerald-400' : 'font-bold text-slate-400'
              }`}
            >
              {item.shortLabel || item.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Interactive Smooth Spline Area Chart:
 * - Rises vertically from zero baseline (0) AND draws spline path from 0 -> 1 whenever in viewport
 * - Replays from 0 whenever scrolled out and back into view
 * - Default green shadow; clicking red curve switches shadow to red
 */
export const InteractiveSplineAreaChart: React.FC<{
  data: ChartDatum[];
  height?: number;
  valueLabel?: string;
  secondarySeriesLabel?: string;
  activeShadow?: 'PRIMARY' | 'SECONDARY';
  onChangeActiveShadow?: (next: 'PRIMARY' | 'SECONDARY') => void;
}> = ({
  data,
  height = 210,
  valueLabel = 'মোট তহবিল',
  secondarySeriesLabel,
  activeShadow,
  onChangeActiveShadow,
}) => {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref: viewportRef, isInView } = useViewportReplay<HTMLDivElement>(0.15);
  const [activeIndex, setActiveIndex] = useState<number>(Math.max(0, data.length - 1));
  const [internalShadow, setInternalShadow] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');

  const resolvedShadow = secondarySeriesLabel ? activeShadow ?? internalShadow : 'PRIMARY';

  const handleSelectShadow = (next: 'PRIMARY' | 'SECONDARY') => {
    setInternalShadow(next);
    onChangeActiveShadow?.(next);
  };

  useEffect(() => {
    setActiveIndex(Math.max(0, data.length - 1));
  }, [data.length]);

  const width = 560;
  const padX = 32;
  const padTop = 28;
  const padBottom = 26;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;
  const baselineY = padTop + plotH;

  const { primaryPts, secondaryPts, linePath, areaPath, secLinePath, secAreaPath } = useMemo(() => {
    if (data.length === 0) {
      return {
        primaryPts: [],
        secondaryPts: [],
        linePath: '',
        areaPath: '',
        secLinePath: '',
        secAreaPath: '',
      };
    }
    const allVals = data.flatMap((d) =>
      d.secondaryValue !== undefined ? [d.value, d.secondaryValue] : [d.value]
    );
    const maxV = Math.max(...allVals, 1);
    const minV = 0;

    const toPoint = (val: number, i: number, minVisualRatio = 0) => {
      const x = data.length === 1 ? width / 2 : padX + (i / (data.length - 1)) * plotW;
      const rawRatio = (val - minV) / Math.max(1, maxV - minV);
      const ratio = val > 0 ? Math.max(rawRatio, minVisualRatio) : 0;
      const y = padTop + plotH - ratio * plotH;
      return { x, y };
    };

    const pPts = data.map((d, i) => toPoint(d.value, i, 0.06));
    const sPts =
      secondarySeriesLabel !== undefined
        ? data.map((d, i) => toPoint(d.secondaryValue || 0, i, 0.12))
        : [];

    const lPath = buildSmoothSplinePath(pPts);
    const base = padTop + plotH;
    const aPath =
      pPts.length > 0
        ? `${lPath} L ${pPts[pPts.length - 1].x.toFixed(2)} ${base} L ${pPts[0].x.toFixed(2)} ${base} Z`
        : '';
    const sPath = sPts.length > 0 ? buildSmoothSplinePath(sPts) : '';
    const sAreaPath =
      sPts.length > 0
        ? `${sPath} L ${sPts[sPts.length - 1].x.toFixed(2)} ${base} L ${sPts[0].x.toFixed(2)} ${base} Z`
        : '';

    return {
      primaryPts: pPts,
      secondaryPts: sPts,
      linePath: lPath,
      areaPath: aPath,
      secLinePath: sPath,
      secAreaPath: sAreaPath,
    };
  }, [data, plotH, plotW, secondarySeriesLabel]);

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-500">
        পর্যাপ্ত ডাটা নেই
      </div>
    );
  }

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || primaryPts.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX =
      'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const relX = ((clientX - rect.left) / Math.max(1, rect.width)) * width;

    let closest = 0;
    let bestDist = Infinity;
    primaryPts.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - relX);
      if (dist < bestDist) {
        bestDist = dist;
        closest = idx;
      }
    });
    setActiveIndex(closest);
  };

  const activeDatum = data[activeIndex] || data[data.length - 1];
  const activePrimaryPt = primaryPts[activeIndex] || primaryPts[primaryPts.length - 1];
  const activeSecondaryPt = secondaryPts[activeIndex] || secondaryPts[secondaryPts.length - 1];
  const isRedActive = resolvedShadow === 'SECONDARY' && Boolean(activeSecondaryPt);
  const badgePt = isRedActive ? activeSecondaryPt : activePrimaryPt;
  const badgeVal = isRedActive ? activeDatum.secondaryValue || 0 : activeDatum.value;

  return (
    <div ref={viewportRef} className="space-y-2 select-none">
      {/* Live interactive readout header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{activeDatum.label}</span>
          </span>
          <button
            type="button"
            onClick={() => handleSelectShadow('PRIMARY')}
            className={`text-xs sm:text-sm font-bold tabular cursor-pointer transition-opacity ${
              resolvedShadow === 'PRIMARY' ? 'text-emerald-400 opacity-100' : 'text-emerald-400/70 hover:opacity-100'
            }`}
          >
            {valueLabel}:{' '}
            <AnimatedNumber value={activeDatum.value} formatter={(v) => formatCurrencyBengali(Math.round(v))} />
          </button>
          {secondarySeriesLabel && (
            <button
              type="button"
              onClick={() => handleSelectShadow('SECONDARY')}
              className={`text-xs sm:text-sm font-bold tabular cursor-pointer transition-opacity ${
                resolvedShadow === 'SECONDARY' ? 'text-rose-400 opacity-100' : 'text-rose-400/75 hover:opacity-100'
              }`}
            >
              · {secondarySeriesLabel}:{' '}
              <AnimatedNumber
                value={activeDatum.secondaryValue || 0}
                formatter={(v) => formatCurrencyBengali(Math.round(v))}
              />
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate-400 font-bold">
          {secondarySeriesLabel ? 'কার্ভে ক্লিক করে শ্যাডো পরিবর্তন করুন' : 'গ্রাফের উপর মাউস বা আঙুল রাখুন'}
        </span>
      </div>

      <div className="relative chart-canvas-grid rounded-2xl border border-slate-800/70 p-2 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible touch-pan-y cursor-crosshair"
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
        >
          <defs>
            <linearGradient id={`spline-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.48" />
              <stop offset="68%" stopColor="#0d9488" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`spline-stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="55%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
            <linearGradient id={`spline-sec-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.48" />
              <stop offset="68%" stopColor="#e11d48" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`spline-sec-stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e11d48" />
              <stop offset="55%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fda4af" />
            </linearGradient>
          </defs>

          {/* Horizontal subtle reference lines */}
          {[0.25, 0.5, 0.75, 1].map((r) => {
            const y = padTop + plotH * r;
            return (
              <line
                key={r}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="currentColor"
                className="text-slate-800/80"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Animated vertical zero-to-value plot group anchored at baselineY */}
          <motion.g
            initial={{ scaleY: 0, opacity: 0.25 }}
            animate={{
              scaleY: isInView ? 1 : 0,
              opacity: isInView ? 1 : 0.25,
            }}
            transition={{
              duration: isInView ? 0.82 : 0.15,
              delay: 0,
              ease: SMOOTH_EASE,
            }}
            style={{
              transformOrigin: `${width / 2}px ${baselineY}px`,
              willChange: 'transform, opacity',
            }}
          >
            {/* Primary green curve shadow area fill — shown by default */}
            <motion.path
              d={areaPath}
              fill={`url(#spline-area-${uid})`}
              initial={false}
              animate={{ opacity: isInView && resolvedShadow === 'PRIMARY' ? 1 : 0 }}
              transition={{ duration: 0.32, delay: 0, ease: SMOOTH_EASE }}
              className="pointer-events-none"
            />

            {/* Secondary red curve shadow area fill — shown when red curve is clicked */}
            {secAreaPath && (
              <motion.path
                d={secAreaPath}
                fill={`url(#spline-sec-area-${uid})`}
                initial={false}
                animate={{ opacity: isInView && resolvedShadow === 'SECONDARY' ? 1 : 0 }}
                transition={{ duration: 0.32, delay: 0, ease: SMOOTH_EASE }}
                className="pointer-events-none"
              />
            )}

            {/* Primary smooth green spline + generous click target */}
            <motion.path
              d={linePath}
              fill="none"
              stroke={`url(#spline-stroke-${uid})`}
              strokeWidth={resolvedShadow === 'PRIMARY' ? '3.6' : '2.8'}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: isInView ? 1 : 0 }}
              transition={{ duration: isInView ? 0.92 : 0.15, delay: 0, ease: SMOOTH_EASE }}
            />
            {secondarySeriesLabel && (
              <path
                d={linePath}
                fill="none"
                stroke="transparent"
                strokeWidth="22"
                strokeLinecap="round"
                onClick={() => handleSelectShadow('PRIMARY')}
                className="cursor-pointer"
              />
            )}

            {/* Secondary smooth red spline + generous click target */}
            {secLinePath && (
              <>
                <motion.path
                  d={secLinePath}
                  fill="none"
                  stroke={`url(#spline-sec-stroke-${uid})`}
                  strokeWidth={resolvedShadow === 'SECONDARY' ? '3.6' : '2.8'}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: isInView ? 1 : 0, opacity: isInView ? 1 : 0 }}
                  transition={{ duration: isInView ? 0.92 : 0.15, delay: 0, ease: SMOOTH_EASE }}
                />
                <path
                  d={secLinePath}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="22"
                  strokeLinecap="round"
                  onClick={() => handleSelectShadow('SECONDARY')}
                  className="cursor-pointer"
                />
              </>
            )}

            {/* Interactive crosshair line */}
            {badgePt && (
              <line
                x1={badgePt.x}
                y1={padTop - 8}
                x2={badgePt.x}
                y2={baselineY}
                stroke={isRedActive ? '#fb7185' : '#34d399'}
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            )}

            {/* Secondary red curve data nodes */}
            {secondaryPts.map((pt, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <g
                  key={`sec-${data[idx].key}`}
                  onClick={() => {
                    setActiveIndex(idx);
                    handleSelectShadow('SECONDARY');
                  }}
                  className="cursor-pointer"
                >
                  {(isSelected || isRedActive) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 10 : 7}
                      fill="#f43f5e"
                      fillOpacity={isRedActive ? '0.28' : '0.16'}
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.2 : 3.6}
                    fill={isSelected || isRedActive ? '#fb7185' : '#0f172a'}
                    stroke="#fb7185"
                    strokeWidth={isSelected ? 2.4 : 1.8}
                  />
                </g>
              );
            })}

            {/* Primary green curve data nodes */}
            {primaryPts.map((pt, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <g
                  key={data[idx].key}
                  onClick={() => {
                    setActiveIndex(idx);
                    handleSelectShadow('PRIMARY');
                  }}
                  className="cursor-pointer"
                >
                  {isSelected && !isRedActive && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="11"
                      fill="#10b981"
                      fillOpacity="0.22"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : 3.8}
                    fill={isSelected && !isRedActive ? '#34d399' : '#0f172a'}
                    stroke="#34d399"
                    strokeWidth={isSelected ? 2.5 : 2}
                  />
                </g>
              );
            })}
          </motion.g>

          {/* Floating SVG badge over active point */}
          {badgePt && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: isInView ? 1 : 0 }}
              transition={{ duration: 0.45, delay: isInView ? 0.35 : 0, ease: SMOOTH_EASE }}
              transform={`translate(${Math.min(
                Math.max(badgePt.x, 76),
                width - 76
              )}, ${Math.max(18, badgePt.y - 18)})`}
            >
              <rect
                x="-64"
                y="-18"
                width="128"
                height="22"
                rx="9"
                fill="#071310"
                stroke={isRedActive ? '#f43f5e' : '#10b981'}
                strokeOpacity="0.65"
                strokeWidth="1"
              />
              <text
                x="0"
                y="-3.5"
                textAnchor="middle"
                fill={isRedActive ? '#fda4af' : '#6ee7b7'}
                fontSize="11"
                fontWeight="700"
              >
                {formatCurrencyBengali(badgeVal)}
              </text>
            </motion.g>
          )}
        </svg>

        {/* Bottom labels */}
        <div className="flex justify-between gap-2 px-3 pt-1">
          {data.map((d, idx) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`text-[11px] font-bold truncate cursor-pointer transition-colors ${
                idx === activeIndex ? 'text-emerald-400' : 'text-slate-400 hover:text-ink'
              }`}
            >
              {d.shortLabel || d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Inline Mini Bezier Sparkline — grows from 0 whenever entering viewport.
 */
export const MiniSparkline: React.FC<{
  values: number[];
  stroke?: string;
  className?: string;
}> = ({ values, stroke = '#34d399', className = 'w-20 h-8' }) => {
  const uid = useId().replace(/:/g, '');
  const { ref: viewportRef, isInView } = useViewportReplay<SVGSVGElement>(0.12);
  const safeVals = values.length >= 2 ? values : [0, Math.max(1, values[0] || 1)];
  const max = Math.max(...safeVals, 1);
  const min = Math.min(...safeVals, 0);
  const w = 88;
  const h = 32;

  const pts = safeVals.map((v, i) => ({
    x: 3 + (i / (safeVals.length - 1)) * (w - 6),
    y: 4 + (h - 8) - ((v - min) / Math.max(1, max - min)) * (h - 8),
  }));
  const line = buildSmoothSplinePath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;

  return (
    <svg
      ref={viewportRef}
      viewBox={`0 0 ${w} ${h}`}
      className={`overflow-visible shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.g
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: isInView ? 1 : 0, opacity: isInView ? 1 : 0 }}
        transition={{ duration: isInView ? 0.72 : 0.15, ease: SMOOTH_EASE }}
        style={{ transformOrigin: `${w / 2}px ${h}px` }}
      >
        <path d={area} fill={`url(#spark-${uid})`} />
        <motion.path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isInView ? 1 : 0 }}
          transition={{ duration: isInView ? 0.9 : 0.15, delay: 0, ease: SMOOTH_EASE }}
        />
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r="2.8"
          fill={stroke}
        />
      </motion.g>
    </svg>
  );
};

/**
 * Interactive SVG Donut Chart — sweeps from 0 arc whenever entering viewport.
 */
export interface DonutSlice {
  id: string;
  label: string;
  amount: number;
  stroke: string;
}

export const InteractiveDonutChart: React.FC<{
  slices: DonutSlice[];
  total: number;
  activeId: string | null;
  onHoverSlice: (id: string | null) => void;
}> = ({ slices, total, activeId, onHoverSlice }) => {
  const { ref: viewportRef, isInView } = useViewportReplay<HTMLDivElement>(0.18);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total > 0 ? total : 1;

  const activeSlice = slices.find((s) => s.id === activeId);

  let accumulatedOffset = 0;

  return (
    <div ref={viewportRef} className="relative w-40 h-40 shrink-0 flex items-center justify-center select-none">
      <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          className="text-slate-800"
          strokeWidth="12"
        />
        {slices.map((s, idx) => {
          const sliceLen = (s.amount / safeTotal) * circumference;
          const offset = accumulatedOffset;
          accumulatedOffset += sliceLen;
          if (s.amount <= 0) return null;

          const isSelected = activeId === s.id;

          return (
            <motion.circle
              key={s.id}
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={s.stroke}
              strokeWidth={isSelected ? 15.5 : 12}
              strokeDasharray={`${sliceLen} ${Math.max(0, circumference - sliceLen)}`}
              initial={{ strokeDashoffset: circumference, opacity: 0 }}
              animate={{
                strokeDashoffset: isInView ? -offset : circumference,
                opacity: isInView ? 1 : 0,
              }}
              transition={{
                duration: isInView ? 0.78 : 0.15,
                delay: isInView ? idx * 0.05 : 0,
                ease: SMOOTH_EASE,
              }}
              strokeLinecap="butt"
              onMouseEnter={() => onHoverSlice(s.id)}
              onMouseLeave={() => onHoverSlice(null)}
              onClick={() => onHoverSlice(isSelected ? null : s.id)}
              className="cursor-pointer transition-[stroke-width] duration-200"
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
        <span className="text-[10px] text-slate-400 font-bold truncate max-w-full">
          {activeSlice ? activeSlice.label.split(' ')[0] : 'মোট সঞ্চয়'}
        </span>
        <span className="text-xs font-bold text-ink leading-tight mt-0.5 tabular">
          <AnimatedNumber
            value={activeSlice ? activeSlice.amount : total}
            formatter={(v) => formatCurrencyBengali(Math.round(v))}
          />
        </span>
        {activeSlice && total > 0 && (
          <span className="text-[10px] font-bold text-emerald-400 mt-0.5">
            <AnimatedNumber
              value={Math.round((activeSlice.amount / total) * 100)}
              formatter={(v) => `${toBengaliNumerals(Math.round(v))}%`}
            />
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Wavy Milestone Voyage Route — animates from 0% up to target progressPct whenever entering viewport.
 */
const DEFAULT_VOYAGE_MILESTONES = [
  { pct: 0, label: '০%' },
  { pct: 25, label: '২৫%' },
  { pct: 50, label: '৫০%' },
  { pct: 75, label: '৭৫%' },
  { pct: 100, label: '১০০%' },
];

export const VoyageMilestoneTracker: React.FC<{
  progressPct: number;
  milestones?: { pct: number; label: string }[];
}> = ({
  progressPct,
  milestones = DEFAULT_VOYAGE_MILESTONES,
}) => {
  const uid = useId().replace(/:/g, '');
  const pathRef = useRef<SVGPathElement | null>(null);
  const { ref: viewportRef, isInView } = useViewportReplay<HTMLDivElement>(0.18);
  const clampedPct = Math.max(0, Math.min(100, progressPct));
  const milestonesKey = milestones.map((m) => `${m.pct}:${m.label}`).join('|');

  const waveD =
    'M 24 54 C 110 14, 190 92, 280 50 C 370 10, 450 88, 536 42';

  const [marker, setMarker] = useState<{ x: number; y: number; angle: number }>({
    x: 24,
    y: 54,
    angle: 0,
  });
  const [stationPoints, setStationPoints] = useState<{ x: number; y: number; pct: number; label: string }[]>([]);

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;

    try {
      const totalLen = pathEl.getTotalLength();
      const targetLen = (clampedPct / 100) * totalLen;
      const pt = pathEl.getPointAtLength(targetLen);
      const ahead = pathEl.getPointAtLength(Math.min(totalLen, targetLen + 2));
      const behind = pathEl.getPointAtLength(Math.max(0, targetLen - 2));
      const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;

      setMarker({ x: pt.x, y: pt.y, angle: angle * 0.45 });

      const computedStations = milestones.map((m) => {
        const p = pathEl.getPointAtLength((m.pct / 100) * totalLen);
        return { x: p.x, y: p.y, pct: m.pct, label: m.label };
      });
      setStationPoints(computedStations);
    } catch {
      // Safe fallback in non-browser SSR
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedPct, milestonesKey]);

  return (
    <div
      ref={viewportRef}
      className="relative rounded-2xl bg-slate-950/85 border border-slate-800 px-3 pt-3 pb-2 overflow-hidden select-none"
    >
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1 px-1">
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <Sparkles className="w-3 h-3" />
          <span>মাইলস্টোন যাত্রাপথ</span>
        </span>
        <span className="inline-flex items-center gap-1 text-amber-400">
          <Flag className="w-3 h-3" />
          <span>
            অগ্রগতি:{' '}
            <AnimatedNumber
              value={clampedPct}
              formatter={(v) => `${toBengaliNumerals(Math.round(v))}%`}
            />
          </span>
        </span>
      </div>

      <svg viewBox="0 0 560 96" className="w-full h-20 overflow-visible">
        <defs>
          <linearGradient id={`voyage-grad-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="60%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        {/* Unfilled dashed route */}
        <path
          ref={pathRef}
          d={waveD}
          fill="none"
          stroke="currentColor"
          className="text-slate-800"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="6 6"
        />

        {/* Animated emerald filled route */}
        <motion.path
          d={waveD}
          fill="none"
          stroke={`url(#voyage-grad-${uid})`}
          strokeWidth="5.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isInView ? clampedPct / 100 : 0 }}
          transition={{ duration: isInView ? 1.15 : 0.15, delay: 0, ease: SMOOTH_EASE }}
        />

        {/* Milestone Station Dots */}
        {stationPoints.map((st) => {
          const reached = isInView && clampedPct >= st.pct;
          return (
            <g key={st.pct}>
              <circle
                cx={st.x}
                cy={st.y}
                r={reached ? 6 : 4.5}
                fill={reached ? '#10b981' : '#0f172a'}
                stroke={reached ? '#a7f3d0' : '#475569'}
                strokeWidth="2"
              />
              <text
                x={st.x}
                y={88}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={reached ? '#34d399' : '#64748b'}
              >
                {st.label}
              </text>
            </g>
          );
        })}

        {/* Gliding Moorly Vessel / Shield Marker from 0% station to target */}
        <motion.g
          initial={{ x: 24, y: 54, rotate: 0 }}
          animate={{
            x: isInView ? marker.x : 24,
            y: isInView ? marker.y : 54,
            rotate: isInView ? marker.angle : 0,
          }}
          transition={{ duration: isInView ? 1.05 : 0.15, delay: 0, ease: SMOOTH_EASE }}
        >
          <circle cx="0" cy="0" r="14" fill="#10b981" fillOpacity="0.22" />
          <rect
            x="-11"
            y="-11"
            width="22"
            height="22"
            rx="7"
            fill="#059669"
            stroke="#ecfdf5"
            strokeWidth="1.8"
          />
          <ShieldCheck x="-6.5" y="-6.5" width="13" height="13" color="#ffffff" />
        </motion.g>
      </svg>
    </div>
  );
};
