import { useState } from 'react';
import {
  quoteHqUpgrade,
  type EconomyState,
  type HqUpgradeOutcome,
  type IslandState,
} from '@domain/island';
import { Button, Modal } from '@runtime/design';
import { upgradeBlockedMessage } from './hq-copy';

const COST_ROWS = [
  { key: 'stars', label: 'نجوم' },
  { key: 'wood', label: 'خشب' },
  { key: 'stone', label: 'حجر' },
  { key: 'crystal', label: 'بلورة' },
] as const;

interface Props {
  island: IslandState;
  economy: EconomyState;
  onClose: () => void;
  onUpgraded: () => void;
  onUpgrade: () => Promise<HqUpgradeOutcome>;
}

/**
 * لوحة ترقية برج تكّة.
 * الزر لا يُعطَّل عند النقص: الضغط يفتح شرحاً دافئاً بدل زر ميت لا يفهمه الطفل.
 */
export function HqUpgradePanel({
  island,
  economy,
  onClose,
  onUpgraded,
  onUpgrade,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const quote = quoteHqUpgrade(island, economy);

  async function confirm(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    const outcome = await onUpgrade();
    setBusy(false);

    if (outcome.ok) {
      onUpgraded();
      onClose();
      return;
    }

    setMessage(upgradeBlockedMessage(outcome));
  }

  return (
    <Modal title="برج تكّة" onClose={onClose}>
      <div className="takka-hq-levels">
        <span className="takka-hq-level-text">المستوى {island.hqLevel} من 3</span>
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={`takka-hq-level${level <= island.hqLevel ? ' is-filled' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

      {quote === null ? (
        <>
          <p className="takka-instruction">
            وصل برجك إلى أعلى مستوى — والجزيرة تكبر معك.
          </p>
          <div className="takka-modal-actions">
            <Button variant="secondary" onClick={onClose}>
              حسناً
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="takka-instruction">
            {quote.masteryMet
              ? 'بوابة الإتقان مفتوحة — البرج جاهز أن يكبر.'
              : `بوابة الإتقان: ${quote.masteredCount} من ${quote.masteryRequired} مهارة.`}
          </p>

          <p className="takka-meta">ما تملكه / ما تحتاجه الترقية</p>
          <ul className="takka-cost-list">
            {COST_ROWS.map(({ key, label }) => {
              const needed = quote.cost[key] ?? 0;
              const owned = economy[key];
              const short = quote.missing[key] > 0;

              return (
                <li key={key} className={short ? 'is-short' : undefined}>
                  <span>{label}</span>
                  <span>
                    {owned} / {needed}
                  </span>
                </li>
              );
            })}
          </ul>

          {message ? (
            <p className="takka-hq-message" role="status">
              {message}
            </p>
          ) : null}

          <div className="takka-modal-actions">
            <Button onClick={() => void confirm()} disabled={busy}>
              {busy ? 'نُرقّي البرج…' : 'ارتقِ بالبرج'}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              ليس الآن
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
