import { useEffect, useState } from 'react';
import type { BalanceProps, BalanceWeight } from './types';

/**
 * الميزان: الطرفان يستويان عند الجواب الصحيح.
 * الميل بصري وحسب — لا رسالة إخفاق، ولا صوت خطأ.
 */
export function Balance({ activity, activityKey, onAttempt, onDone, reducedMotion }: BalanceProps) {
  const { leftSide, rightSide, correctAnswer } = activity.config;
  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => {
    setPick(null);
  }, [activityKey]);

  const leftSum = leftSide.items.reduce((sum, i) => sum + i.value, 0);
  const pickedWeight = rightSide.options.find((o) => o.id === pick) ?? null;
  const rightSum =
    rightSide.items.reduce((sum, i) => sum + i.value, 0) + (pickedWeight ? pickedWeight.value : 0);
  const diff = leftSum - rightSum;
  const tilt = Math.max(-12, Math.min(12, diff * 3));

  const choose = (option: BalanceWeight) => {
    setPick(option.id);
    if (option.id === correctAnswer) onDone(true, option.id);
    else onAttempt(false);
  };

  return (
    <div className="takka-balance">
      <div className="takka-balance-rig">
        <div
          className="takka-balance-beam"
          style={{
            transform: `rotate(${pick ? tilt : 0}deg)`,
            transition: reducedMotion ? 'none' : 'transform 320ms ease-out',
          }}
        >
          <span className="takka-balance-hook takka-balance-hook--right" />
          <span className="takka-balance-hook takka-balance-hook--left" />
        </div>
        <div className="takka-balance-column" aria-hidden="true" />
      </div>

      <div className="takka-balance-pans">
        <div className="takka-pan" aria-label={`الطرف الأول: ${leftSide.items.map((i) => i.label).join(' و')}`}>
          <div className="takka-pan-items">
            {leftSide.items.length === 0 ? (
              <span className="takka-item-label">فارغ</span>
            ) : (
              leftSide.items.map((item) => (
                <span key={item.id} className="takka-weight">
                  <span className="takka-numeral">{item.label}</span>
                </span>
              ))
            )}
          </div>
          <span className="takka-pan-total">المجموع المطلوب: {leftSide.total}</span>
        </div>

        <div className="takka-pan" aria-label="الطرف الثاني: اختر بطاقة">
          <div className="takka-pan-items">
            {rightSide.items.map((item) => (
              <span key={item.id} className="takka-weight">
                <span className="takka-numeral">{item.label}</span>
              </span>
            ))}
            {pickedWeight ? (
              <span className="takka-weight is-picked">
                <span className="takka-numeral">{pickedWeight.label}</span>
              </span>
            ) : null}
          </div>
          <div className="takka-options takka-options--inline" role="group" aria-label="اختر الوزن">
            {rightSide.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`takka-weight-btn ${pick === option.id ? 'is-selected' : ''}`}
                aria-pressed={pick === option.id}
                aria-label={`الوزن ${option.label}`}
                onClick={() => choose(option)}
              >
                <span className="takka-numeral">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {pick && Math.abs(diff) < 0.001 ? (
        <p className="takka-instruction" aria-live="polite">
          استوى الميزان.
        </p>
      ) : null}
    </div>
  );
}
