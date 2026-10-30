import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveAsset } from '@content/registry';
import { Button, Card } from '@runtime/design';
import { HqUpgradePanel } from '@runtime/HqUpgradePanel';
import { WorldStage } from '@runtime/world';
import { buildStageView } from '@runtime/world/stage-view';
import { buildingCenter, computeGridMetrics } from '@runtime/world/grid-layout';
import { islandViewFor } from '@runtime/world/islands';
import { useRuntime } from '@runtime/store';
import { SUBJECT_LABELS } from '@domain/types';

const COMPANION = resolveAsset('svg/companion/fatin.svg');

const MOOD_TEXT: Record<'sleeping' | 'awakening' | 'blooming', string> = {
  sleeping: 'نائمة — لم نصل إليها بعد',
  awakening: 'تستيقظ — بدأنا الخطوة',
  blooming: 'مزدهرة — أتقنّا خطواتها',
};

/**
 * خريطة العالم: Canvas للفنّ، وأزرار DOM كبيرة لكل جزيرة.
 * كل نص عربي في DOM فوق الـCanvas، واللمس 56dp على الأقل.
 */
export function MapScreen() {
  const index = useRuntime((s) => s.index);
  const mastery = useRuntime((s) => s.mastery);
  const profile = useRuntime((s) => s.profile);
  const notice = useRuntime((s) => s.notice);
  const dismissNotice = useRuntime((s) => s.dismissNotice);
  const openIsland = useRuntime((s) => s.openIsland);
  const startSession = useRuntime((s) => s.startSession);
  const go = useRuntime((s) => s.go);

  const views = useMemo(
    () =>
      index.islandLayout.map((slot) => {
        const skillIds = index.skills.filter((s) => s.islandId === slot.id).map((s) => s.id);
        return {
          slot,
          view: islandViewFor(slot.id, slot.title, slot.gx, slot.gy, skillIds, mastery),
        };
      }),
    [index, mastery],
  );

  const island = useRuntime((s) => s.island);
  const economy = useRuntime((s) => s.economy);
  const placement = useRuntime((s) => s.placement);
  const upgradeHq = useRuntime((s) => s.upgradeHq);
  const [hint, setHint] = useState<{ name: string; text: string } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const burstTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    },
    [],
  );

  const stage = useMemo(
    () => buildStageView(island.hqLevel, placement),
    [island.hqLevel, placement],
  );

  const burstPoint = useMemo(() => {
    const hq = stage.buildings.find((building) => building.id === 'hq');
    if (!hq) return null;

    const metrics = computeGridMetrics(640, 420);
    const center = buildingCenter({ id: hq.id, x: hq.x, y: hq.y }, metrics);
    return {
      left: `${(center.x / 640) * 100}%`,
      top: `${(center.y / 420) * 100}%`,
    };
  }, [stage]);

  const celebrateUpgrade = (): void => {
    setBurst(true);
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(false), 700);
  };

  const masteredTotal = Object.values(mastery).filter((m) => m.mastered).length;

  return (
    <div className="takka-screen">
      <header className="takka-map-head">
        <div>
          <h1 className="takka-title">أهلاً {profile?.nickname ?? 'صديقي'}</h1>
          <p className="takka-instruction">
            أتقنت حتى الآن {masteredTotal} خطوة. اختر جزيرة، أو خُذ «تكة» قصيرة.
          </p>
        </div>
        <Button variant="secondary" className="takka-parent-btn" onClick={() => go('parent')}>
          للكبار
        </Button>
      </header>

      {notice ? (
        <div className="takka-notice" role="status">
          <span>{notice}</span>
          <button type="button" className="takka-notice-x" onClick={dismissNotice} aria-label="إخفاء">
            ×
          </button>
        </div>
      ) : null}

      {hint ? (
        <div className="takka-notice" role="status">
          <span>
            {hint.name} — {hint.text}
          </span>
          <button type="button" className="takka-notice-x" onClick={() => setHint(null)} aria-label="إخفاء">
            ×
          </button>
        </div>
      ) : null}

      <div className="takka-stage-wrap">
        <WorldStage
          buildings={stage.buildings}
          onPick={(id) => {
            if (id === 'hq') setPanelOpen(true);
          }}
          onExplain={(id) => {
            const building = stage.buildings.find((entry) => entry.id === id);
            if (building) setHint({ name: building.nameAr, text: building.unlockHint });
          }}
        />
        {burst && burstPoint ? (
          <span className="takka-upgrade-burst" style={burstPoint} aria-hidden="true" />
        ) : null}
      </div>

      <Card className="takka-hq-card">
        <div>
          <h2 className="takka-section">برج تكّة</h2>
          <p className="takka-meta">المستوى {island.hqLevel} من 3 — من هنا تكبر الجزيرة.</p>
        </div>
        <Button onClick={() => setPanelOpen(true)}>افتح البرج</Button>
      </Card>

      <div className="takka-island-list" role="list">
        {views.map(({ slot, view }) => (
          <Card key={slot.id} className="takka-island-card">
            <div className="takka-island-card-head">
              <h2 className="takka-section">{slot.title}</h2>
              <span className="takka-subject-tag">{SUBJECT_LABELS[slot.subject]}</span>
            </div>
            <p className="takka-instruction">{MOOD_TEXT[view.mood]}</p>
            <p className="takka-meta">
              {view.mastered} من {view.total} مهارة · {index.activities.filter((a) => a.islandId === slot.id).length} نشاط
            </p>
            <div className="takka-row">
              <Button onClick={() => openIsland(slot.id)}>ادخل الجزيرة</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  openIsland(slot.id);
                  void startSession({ warmOnly: true });
                }}
              >
                مراجعة هادئة
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="takka-quick">
        <h2 className="takka-section">تكة اليوم</h2>
        <p className="takka-instruction">
          جلسة قصيرة يختارها التطبيق من خطواتك القادمة، من 4 إلى 6 دقائق.
        </p>
        <Button onClick={() => void startSession()}>ابدأ تكة</Button>
      </Card>

      {COMPANION ? (
        <img src={COMPANION} alt="فطين، رفيق الرحلة" className="takka-companion takka-companion--map" width={96} height={110} />
      ) : null}

      {panelOpen ? (
        <HqUpgradePanel
          island={island}
          economy={economy}
          onClose={() => setPanelOpen(false)}
          onUpgraded={celebrateUpgrade}
          onUpgrade={upgradeHq}
        />
      ) : null}
    </div>
  );
}
