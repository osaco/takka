import { useEffect, useMemo, useRef, useState } from 'react';
import { shuffle } from '@domain/random';
import { ItemVisual } from './ItemVisual';
import { seedFrom, type DragMatchProps } from './types';

/**
 * قالب المطابقة: اختيار باللمس ثم إسقاط باللمس.
 * لا سحب مستمر — إصبع طفل الصف الأول يُفلت، واللمس المزدوج أضمن.
 * لا شيء يُوسم «خطأ»: المحاولة غير الموفقة تهتزّ بلطف ثم تُترك للطفل.
 */
export function DragMatch({ activity, activityKey, onAttempt, onDone, reducedMotion }: DragMatchProps) {
  const pairs = activity.config.pairs;
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);
  const doneRef = useRef(false);

  // ترتيب ثابت مشتق من المعرّف: لا يتغيّر الترتيب أثناء اللعب.
  const targets = useMemo(() => {
    const list = pairs.map((p) => p.target);
    return activity.config.shuffleTargets ? shuffle(list, seedFrom(activity.id)) : list;
  }, [pairs, activity.config.shuffleTargets, activity.id]);

  useEffect(() => {
    setSelected(null);
    setPlaced([]);
    setShake(null);
    doneRef.current = false;
  }, [activityKey]);

  useEffect(() => {
    if (doneRef.current) return;
    if (pairs.length > 0 && placed.length === pairs.length) {
      // حارس ضد إعادة الإرسال: تغيّر هوية onDone مع كل تصيير لا يعني جولة جديدة.
      doneRef.current = true;
      onDone(true, activity.id);
    }
  }, [placed, pairs.length, onDone, activity.id]);

  const tray = pairs.filter((p) => !placed.includes(p.id));

  return (
    <div>
      <div className="takka-targets" role="group" aria-label="أماكن الوضع">
        {targets.map((target) => {
          const pair = pairs.find((p) => p.target.id === target.id);
          const isPlaced = pair ? placed.includes(pair.id) : false;
          return (
            <button
              key={target.id}
              type="button"
              className={`takka-drop ${isPlaced ? 'is-placed' : ''} ${
                shake === target.id && !reducedMotion ? 'takka-wiggle' : ''
              }`}
              aria-label={target.label}
              disabled={isPlaced}
              onClick={() => {
                if (!selected) {
                  onAttempt(false);
                  setShake(target.id);
                  return;
                }
                const picked = pairs.find((p) => p.draggable.id === selected);
                if (picked && picked.target.id === target.id) {
                  setPlaced((prev) => [...prev, picked.id]);
                  setSelected(null);
                  setShake(null);
                } else {
                  onAttempt(false);
                  setShake(target.id);
                  setSelected(null);
                }
              }}
            >
              {isPlaced ? <ItemVisual item={target} size={64} /> : <span className="takka-drop-mark" />}
              <span className="takka-item-label">{isPlaced ? target.label : '؟'}</span>
            </button>
          );
        })}
      </div>

      <div className="takka-tray" role="group" aria-label="البطاقات">
        {tray.map((pair) => (
          <button
            key={pair.draggable.id}
            type="button"
            className={`takka-card-chip ${selected === pair.draggable.id ? 'is-selected' : ''}`}
            aria-pressed={selected === pair.draggable.id}
            aria-label={pair.draggable.label}
            onClick={() => setSelected(pair.draggable.id)}
          >
            <ItemVisual item={pair.draggable} size={64} />
          </button>
        ))}
      </div>

      {selected ? (
        <p className="takka-instruction" aria-live="polite">
          اخترت بطاقة. المس الآن المكان الذي يناسبها.
        </p>
      ) : null}
    </div>
  );
}
