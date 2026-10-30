import { Button, Card, ProgressBar } from '@runtime/design';
import { useRuntime } from '@runtime/store';
import { SKILL_STATE_LABELS } from '@domain/types';

/** شاشة الجزيرة: خطواتها بترتيبها، وحالة كل خطوة بأمانة. */
export function IslandScreen() {
  const index = useRuntime((s) => s.index);
  const mastery = useRuntime((s) => s.mastery);
  const activeIslandId = useRuntime((s) => s.activeIslandId);
  const openIsland = useRuntime((s) => s.openIsland);
  const startSession = useRuntime((s) => s.startSession);

  const island = index.islands.find((i) => i.id === activeIslandId);
  if (!island) {
    return (
      <div className="takka-screen">
        <Card>لم نجد هذه الجزيرة.</Card>
        <Button onClick={() => openIsland(null)}>عودة إلى الخريطة</Button>
      </div>
    );
  }

  const skills = index.skills
    .filter((s) => s.islandId === island.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const mastered = skills.filter((s) => mastery[s.id]?.mastered).length;

  return (
    <div className="takka-screen">
      <header>
        <Button variant="secondary" onClick={() => openIsland(null)}>
          عودة إلى الخريطة
        </Button>
        <h1 className="takka-title">{island.title}</h1>
        {island.description ? <p className="takka-instruction">{island.description}</p> : null}
        <ProgressBar value={skills.length === 0 ? 0 : mastered / skills.length} label={`${mastered} من ${skills.length} خطوة`} />
      </header>

      <div role="list" className="takka-skill-list">
        {skills.map((skill) => {
          const m = mastery[skill.id];
          const activities = index.activitiesBySkill.get(skill.id) ?? [];
          const state = m?.state ?? 'not_reached';
          return (
            <Card key={skill.id} role="listitem" className="takka-skill-card">
              <h2 className="takka-section">{skill.title}</h2>
              <p className="takka-meta">
                {SKILL_STATE_LABELS[state]}
                {m?.mastered ? ' · أُتقنت' : ''}
                {m?.needsReview ? ' · تحتاج مراجعة لطيفة' : ''}
                {m && m.independentCount > 0 ? ` · نجاحات مستقلة: ${m.independentCount}` : ''}
              </p>
              <p className="takka-meta">{activities.length} نشاط متاح</p>
              <Button
                onClick={() => void startSession({ preferredSkillId: skill.id, warmOnly: m?.mastered === true })}
                disabled={activities.length === 0}
              >
                {m?.mastered ? 'راجع هذه الخطوة' : 'ابدأ هذه الخطوة'}
              </Button>
              {skill.sourceRef.file ? (
                <p className="takka-source-note">
                  المصدر: {skill.sourceRef.file}
                  {skill.sourceRef.unit ? ` — ${skill.sourceRef.unit}` : ''}
                  {skill.sourceRef.page ? ` (ص ${skill.sourceRef.page})` : ''}
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
