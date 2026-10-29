"use client";

import { useState, useCallback, useRef } from "react";
import { Check, Hand } from "lucide-react";
import type { DragMatchConfig } from "@/lib/core/types";

interface Props {
  config: DragMatchConfig;
  onAttempt: (isCorrect: boolean, attempts: number, allDone: boolean) => void;
}

export function DragMatchTemplate({ config, onAttempt }: Props) {
  const [selectedDraggableId, setSelectedDraggableId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // البحث عن الزوج المرتبط بالعنصر
  const isMatched = useCallback(
    (draggableId: string) => matchedIds.includes(draggableId),
    [matchedIds]
  );

  const isTargetMatched = useCallback(
    (targetId: string) => {
      const pair = config.pairs.find((p) => p.target.id === targetId);
      return pair ? matchedIds.includes(pair.draggable.id) : false;
    },
    [config.pairs, matchedIds]
  );

  const handlePairMatch = useCallback(
    (draggableId: string, targetId: string) => {
      const pair = config.pairs.find((p) => p.draggable.id === draggableId);
      if (!pair) return;

      // منع التكرار إذا كان العنصر أو الهدف قد طُوبق سابقاً
      if (matchedIds.includes(draggableId)) return;
      if (isTargetMatched(targetId)) return;

      if (pair.target.id === targetId) {
        // مطابقة صحيحة
        const nextMatched = [...matchedIds, draggableId];
        setMatchedIds(nextMatched);
        setSelectedDraggableId(null);
        setFeedback("مطابقة موفقة! أحسنت.");

        const allDone = nextMatched.length === config.pairs.length;
        onAttempt(true, wrongCount, allDone);
      } else {
        // مطابقة غير صحيحة - تغذية راجعة لطيفة بلا عقوبة
        const nextWrong = wrongCount + 1;
        setWrongCount(nextWrong);
        setSelectedDraggableId(null);
        setFeedback("قريب! جرّب توصيل هذا العنصر بهدف آخر.");
        onAttempt(false, nextWrong, false);
      }
    },
    [config.pairs, isTargetMatched, matchedIds, onAttempt, wrongCount]
  );

  // اختيار عنصر بالنقر (Accessible click-to-match fallback)
  const handleDraggableClick = (id: string) => {
    if (isMatched(id)) return;
    if (selectedDraggableId === id) {
      setSelectedDraggableId(null);
      setFeedback(null);
    } else {
      setSelectedDraggableId(id);
      setFeedback("اخترت العنصر. الآن انقر على الهدف المطابق له.");
    }
  };

  // النقر على الهدف لإتمام المطابقة
  const handleTargetClick = (targetId: string) => {
    if (isTargetMatched(targetId)) return;
    if (!selectedDraggableId) {
      setFeedback("انقر على أحد العناصر أولاً ثم انقر هنا لمطابقته.");
      return;
    }
    handlePairMatch(selectedDraggableId, targetId);
  };

  // دعم السحب والإفلات عبر Pointer Events للأجهزة اللمسية والمكتبية
  const handlePointerDown = (id: string) => {
    if (isMatched(id)) return;
    setDraggingId(id);
    setSelectedDraggableId(id);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingId) return;

    // فحص العنصر الموجود أسفل المؤشر
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const dropTarget = targetElement?.closest<HTMLElement>("[data-drop-target-id]");
    const targetId = dropTarget?.dataset.dropTargetId;

    if (targetId) {
      handlePairMatch(draggingId, targetId);
    }

    setDraggingId(null);
  };

  return (
    <div
      className="drag-match-container"
      ref={containerRef}
      onPointerUp={handlePointerUp}
      dir="rtl"
    >
      <h2>{config.prompt}</h2>

      <p className="drag-match-instruction" aria-live="polite">
        {feedback ?? "اسحب كل عنصر إلى هدفه، أو انقر على العنصر ثم هدفه."}
      </p>

      {/* منطقة الأهداف (Targets) */}
      <div className="targets-section" role="region" aria-label="أهداف المطابقة">
        <span className="section-label">الأهداف</span>
        <div className="targets-grid">
          {config.pairs.map((pair) => {
            const done = isTargetMatched(pair.target.id);
            const matchedPair = config.pairs.find((p) => p.target.id === pair.target.id);
            const matchingLabel = matchedPair?.draggable.label;

            return (
              <button
                key={pair.target.id}
                type="button"
                data-drop-target-id={pair.target.id}
                onClick={() => handleTargetClick(pair.target.id)}
                className={`drop-target${done ? " drop-matched" : ""}${
                  selectedDraggableId && !done ? " drop-active" : ""
                }`}
                aria-label={`هدف: ${pair.target.label}${done ? " (تمت مطابقته)" : ""}`}
                disabled={done}
              >
                <div className="target-badge">
                  {pair.target.char && <span className="target-char">{pair.target.char}</span>}
                  <span className="target-label">{pair.target.label}</span>
                </div>
                {done && (
                  <span className="match-status">
                    <Check size={18} /> {matchingLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* منطقة العناصر القابلة للسحب/النقر (Draggables) */}
      <div className="draggables-section" role="region" aria-label="العناصر القابلة للمطابقة">
        <span className="section-label">العناصر</span>
        <div className="draggables-grid">
          {config.pairs.map((pair) => {
            const done = isMatched(pair.draggable.id);
            const isSelected = selectedDraggableId === pair.draggable.id;
            const isDragging = draggingId === pair.draggable.id;

            return (
              <button
                key={pair.draggable.id}
                type="button"
                className={`drag-item${done ? " drag-matched" : ""}${
                  isSelected ? " drag-selected" : ""
                }${isDragging ? " is-dragging" : ""}`}
                onClick={() => handleDraggableClick(pair.draggable.id)}
                onPointerDown={() => handlePointerDown(pair.draggable.id)}
                disabled={done}
                aria-pressed={isSelected}
                aria-label={`عنصر: ${pair.draggable.label}${done ? " (مطابق)" : ""}`}
              >
                {pair.draggable.image ? (
                  <span className="item-icon">{pair.draggable.image}</span>
                ) : pair.draggable.char ? (
                  <span className="item-char">{pair.draggable.char}</span>
                ) : (
                  <Hand size={20} className="item-hand" />
                )}
                <span className="item-label">{pair.draggable.label}</span>
                {done && <Check size={16} className="item-check" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
