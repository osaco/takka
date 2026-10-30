import { useEffect, useMemo, useRef, useState } from 'react';
import { coverageRatio, samplePath, thin, type Point } from './measure';
import type { TracePathProps } from './types';

const VIEW = { w: 216, h: 190 };

/**
 * تتبّع المسار: يُقاس التغطية لا السرعة ولا الجمال.
 * الوثيقة 04 تشترط تغطية 70%؛ وما دونها يُعاد بلطف بلا وسم خطأ.
 */
export function TracePath({ activity, activityKey, onAttempt, onDone }: TracePathProps) {
  const { strokePath, tolerance, minCoverage, showGuide } = activity.config;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [solved, setSolved] = useState(false);

  const samples = useMemo(() => samplePath(strokePath, 24), [strokePath]);

  useEffect(() => {
    setDrawn([]);
    setCoverage(0);
    setDrawing(false);
    setSolved(false);
  }, [activityKey]);

  const toLocal = (event: React.PointerEvent<SVGSVGElement>): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    // التحويل عبر CTM يحترم preserveAspectRatio والحشو، بخلاف نسبة المستطيل الخام.
    const ctm = svg.getScreenCTM?.();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const mapped = pt.matrixTransform(ctm.inverse());
      return { x: mapped.x, y: mapped.y };
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW.w,
      y: ((event.clientY - rect.top) / rect.height) * VIEW.h,
    };
  };

  const polyline = drawn.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = samples[0] ?? { x: VIEW.w / 2, y: 40 };

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        width="100%"
        style={{ touchAction: 'none', maxHeight: 340, background: 'var(--card)', borderRadius: 24 }}
        role="application"
        aria-label={activity.config.prompt}
        onPointerDown={(e) => {
          if (solved) return;
          const p = toLocal(e);
          if (!p) return;
          // الالتقاط على عنصر الـsvg نفسه: لا نثق بعنصر هدف قد يُستبدل أثناء الرسم.
          try {
            svgRef.current?.setPointerCapture(e.pointerId);
          } catch {
            /* بعض المتصفحات ترفض الالتقاط؛ الرسم يبقى ممكناً بلا التقاط. */
          }
          setDrawing(true);
          setDrawn([p]);
          setCoverage(0);
        }}
        onPointerMove={(e) => {
          if (!drawing) return;
          const p = toLocal(e);
          if (!p) return;
          setDrawn((prev) => {
            const last = prev[prev.length - 1];
            if (last && Math.hypot(p.x - last.x, p.y - last.y) < 2) return prev;
            return [...prev, p];
          });
        }}
        onPointerUp={() => {
          if (!drawing) return;
          setDrawing(false);
          const ratio = coverageRatio(samples, thin(drawn), tolerance);
          setCoverage(ratio);
          if (ratio >= minCoverage) onDone(true, activity.id);
          else onAttempt(false);
        }}
        onPointerCancel={() => setDrawing(false)}
      >
        {/* مسار مرجعي ذهبي */}
        <path
          d={strokePath}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={12}
          strokeLinecap="round"
          opacity={showGuide ? 0.35 : 0.18}
        />
        {showGuide ? (
          <path
            d={strokePath}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={3}
            strokeDasharray="8 8"
            strokeLinecap="round"
          />
        ) : null}

        {/* أثر الإصبع */}
        {drawn.length > 1 ? (
          <polyline
            points={polyline}
            fill="none"
            stroke="var(--journey)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        ) : null}

        {/* نقطة البداية */}
        <circle cx={first.x} cy={first.y} r={9} fill="var(--gold)" stroke="var(--ink)" strokeWidth={2} />
        <circle cx={first.x} cy={first.y} r={3} fill="var(--ink)" />
      </svg>

      <div className="takka-trace-meter" role="status" aria-live="polite">
        <div className="takka-trace-bar">
          <div
            className="takka-trace-fill"
            style={{ width: `${Math.round(Math.min(1, coverage) * 100)}%` }}
          />
        </div>
        <p className="takka-instruction">
          {coverage >= minCoverage
            ? 'وصلت إلى آخر المسار.'
            : 'مرّر إصبعك على الخط الذهبي من النقطة إلى نهايته.'}
        </p>
      </div>
    </div>
  );
}
