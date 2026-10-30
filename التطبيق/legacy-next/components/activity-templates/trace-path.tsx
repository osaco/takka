"use client";

import { useState, useRef, useCallback } from "react";
import { RotateCcw, Check } from "lucide-react";
import type { TracePathConfig } from "@/lib/core/types";

interface Props {
  config: TracePathConfig;
  onAttempt: (isCorrect: boolean, attempts: number, allDone: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

export function TracePathTemplate({ config, onAttempt }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [visitedCheckpoints, setVisitedCheckpoints] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const checkpoints = config.checkpoints;
  const CHECKPOINT_RADIUS = 28; // مسافة الالتقاط المحسوبة

  // تحويل إحداثيات الشاشة إلى إحداثيات SVG المتجاوبة
  const getSvgCoordinates = useCallback((e: React.PointerEvent<SVGSVGElement>): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inverse = ctm.inverse();
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(inverse);
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  // فحص المرور بنقاط التفتيش
  const checkHit = useCallback(
    (currentPoint: Point, currentVisited: number[]): number[] => {
      const nextIndex = currentVisited.length;
      if (nextIndex >= checkpoints.length) return currentVisited;

      const target = checkpoints[nextIndex];
      const distance = Math.hypot(currentPoint.x - target.x, currentPoint.y - target.y);

      if (distance <= CHECKPOINT_RADIUS) {
        return [...currentVisited, nextIndex];
      }
      return currentVisited;
    },
    [checkpoints]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isComplete) return;
    const pt = getSvgCoordinates(e);
    if (!pt) return;

    svgRef.current?.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setPoints([pt]);

    const updatedVisited = checkHit(pt, visitedCheckpoints);
    if (updatedVisited.length !== visitedCheckpoints.length) {
      setVisitedCheckpoints(updatedVisited);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || isComplete) return;
    const pt = getSvgCoordinates(e);
    if (!pt) return;

    setPoints((prev) => [...prev, pt]);

    const updatedVisited = checkHit(pt, visitedCheckpoints);
    if (updatedVisited.length !== visitedCheckpoints.length) {
      setVisitedCheckpoints(updatedVisited);
      if (updatedVisited.length === checkpoints.length) {
        // إكمال المسار بنجاح!
        setIsComplete(true);
        setIsDrawing(false);
        setFeedback("مسار رائع! تتبّعت الشكل خطوة بخطوة.");
        onAttempt(true, attempts, true);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }

    if (!isComplete) {
      if (visitedCheckpoints.length < checkpoints.length) {
        setAttempts((prev) => prev + 1);
        setFeedback("مسار جميل! حاول إكمال المرور بكل النقاط المضيئة.");
        onAttempt(false, attempts + 1, false);
      }
    }
  };

  const handleReset = () => {
    setPoints([]);
    setVisitedCheckpoints([]);
    setIsComplete(false);
    setIsDrawing(false);
    setFeedback("مُسح المسار. انطلق من النقطة الأولى.");
  };

  // توليد مسار الرسم للمستخدم
  const userPathD = points.length > 1
    ? points.reduce((acc, pt, index) => `${acc} ${index === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "")
    : "";

  return (
    <div className="trace-path-container" dir="rtl">
      <h2>{config.prompt}</h2>

      <p className="trace-instruction" aria-live="polite">
        {feedback ?? "اسحب بإصبعك أو المؤشر فوق المسار لتتبع الحرف."}
      </p>

      <div className="trace-canvas-wrap">
        <svg
          ref={svgRef}
          viewBox="0 0 300 200"
          className="trace-svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="img"
          aria-label={`مسار تتبع الحرف ${config.character}`}
          style={{ touchAction: "none" }} // يمنع حجب التمرير عن بقية الصفحة مع حصر السحب في هذا العنصر فقط
        >
          {/* مسار الإرشاد في الخلفية */}
          <path
            d={config.strokePath}
            className="trace-guide-path"
            fill="none"
            stroke="currentColor"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={config.guideOpacity ?? 0.22}
          />

          {/* نقاط التفتيش الإرشادية */}
          {checkpoints.map((cp, idx) => {
            const isHit = visitedCheckpoints.includes(idx);
            const isNext = visitedCheckpoints.length === idx;

            return (
              <g key={`${cp.x}-${cp.y}-${idx}`}>
                <circle
                  cx={cp.x}
                  cy={cp.y}
                  r={isNext ? 14 : 10}
                  className={`trace-checkpoint${isHit ? " checkpoint-hit" : ""}${
                    isNext ? " checkpoint-active" : ""
                  }`}
                />
                <text
                  x={cp.x}
                  y={cp.y + 4}
                  textAnchor="middle"
                  className="trace-checkpoint-label"
                >
                  {cp.label ?? idx + 1}
                </text>
              </g>
            );
          })}

          {/* خط الرسم الحي الخاص بالمستخدم */}
          {userPathD && (
            <path
              d={userPathD}
              className={`trace-user-path${isComplete ? " trace-success" : ""}`}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        <div className="trace-controls">
          <button
            type="button"
            className="button button-quiet button-small"
            onClick={handleReset}
            disabled={isComplete && points.length === 0}
          >
            <RotateCcw size={16} /> مسح وإعادة المحاولة
          </button>
          <span className="trace-progress-count">
            {isComplete ? (
              <span className="badge-complete">
                <Check size={14} /> اكتمل المسار!
              </span>
            ) : (
              <span>
                النقاط: {visitedCheckpoints.length} / {checkpoints.length}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* تنويه تربوي صريح بأن التتبع تدريب واستكشاف وليس إثبات إتقان خط */}
      <p className="trace-disclaimer">
        💡 <small>تتبع المسار تفاعل تدريبي واستكشافي، ولا يُعد اختباراً أو إثباتاً لإتقان مهارة الخط أو الكتابة.</small>
      </p>
    </div>
  );
}
