import { useEffect, useState } from 'react';
import { ItemVisual } from './ItemVisual';
import type { ListenIdentifyProps } from './types';

/**
 * «اسمع واختر»: أزرار كبيرة بمحتوى بصري، والبديل النصي لما «يُسمع»
 * موجود دائماً، فلا معلومة صوتية وحدها.
 */
export function ListenIdentify({ activity, activityKey, onAttempt, onDone, reducedMotion }: ListenIdentifyProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setPicked(null);
    setSettled(false);
  }, [activityKey]);

  return (
    <div>
      <p className="takka-spoken" lang="ar">
        <span className="takka-spoken-label">الصوت</span>
        {activity.config.spokenText}
      </p>

      <div className="takka-options" role="group" aria-label="الخيارات">
        {activity.config.options.map((option) => {
          const isPicked = picked === option.id;
          const reveal = settled && option.correct;
          return (
            <button
              key={option.id}
              type="button"
              className={`takka-option ${isPicked && !option.correct ? 'is-trying' : ''} ${
                reveal ? 'takka-celebrate' : ''
              } ${isPicked && !option.correct && !reducedMotion ? 'takka-wiggle' : ''}`}
              aria-label={option.label}
              disabled={settled}
              onClick={() => {
                setPicked(option.id);
                if (option.correct) {
                  setSettled(true);
                  onDone(true, option.id);
                } else {
                  onAttempt(false);
                }
              }}
            >
              <ItemVisual item={option} size={72} />
              <span className="takka-item-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
