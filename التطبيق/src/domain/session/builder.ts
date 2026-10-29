import {
  type Grade,
  type SessionPhase,
  type SessionPhaseSpec,
  type SessionPlan,
  type Skill,
  type SkillMastery,
} from '../types';
import { isPrerequisiteOpen } from '../mastery/state-machine';
import { dueReviews } from '../review/spaced-repetition';
import { makeId } from '../random';

interface PhaseBlueprint {
  phase: SessionPhase;
  minutes: number;
  interactions: number;
  allowHints: boolean;
}

/**
 * «تكة» متغيرة الطول بحسب الصف (قرار الوثيقة 10 §7):
 * 1–2: 4–6 دقائق · 3–4: 7–10 · 5–6: 11–15.
 * الدورة الثمانية تُضغط للصغار، لا تُفرض عليهم.
 */
const BAND_BLUEPRINTS: Record<'lower' | 'middle' | 'upper', PhaseBlueprint[]> = {
  lower: [
    { phase: 'activate', minutes: 1, interactions: 1, allowHints: true },
    { phase: 'model', minutes: 1.5, interactions: 0, allowHints: true },
    { phase: 'guided', minutes: 1.5, interactions: 1, allowHints: true },
    { phase: 'check', minutes: 0.75, interactions: 1, allowHints: false },
    { phase: 'close', minutes: 0.25, interactions: 0, allowHints: false },
  ],
  middle: [
    { phase: 'activate', minutes: 1, interactions: 1, allowHints: true },
    { phase: 'model', minutes: 1.5, interactions: 0, allowHints: true },
    { phase: 'guided', minutes: 1.5, interactions: 1, allowHints: true },
    { phase: 'fluency', minutes: 1.5, interactions: 2, allowHints: false },
    { phase: 'transfer', minutes: 1.5, interactions: 1, allowHints: true },
    { phase: 'check', minutes: 0.75, interactions: 1, allowHints: false },
    { phase: 'close', minutes: 0.25, interactions: 0, allowHints: false },
  ],
  upper: [
    { phase: 'activate', minutes: 1, interactions: 2, allowHints: true },
    { phase: 'model', minutes: 1.5, interactions: 0, allowHints: true },
    { phase: 'guided', minutes: 2, interactions: 2, allowHints: true },
    { phase: 'fluency', minutes: 2, interactions: 3, allowHints: false },
    { phase: 'transfer', minutes: 2, interactions: 2, allowHints: true },
    { phase: 'check', minutes: 1.5, interactions: 2, allowHints: false },
    { phase: 'feedback', minutes: 1, interactions: 0, allowHints: false },
    { phase: 'close', minutes: 1, interactions: 0, allowHints: false },
  ],
};

export function bandForGrade(grade: Grade): 'lower' | 'middle' | 'upper' {
  if (grade <= 2) return 'lower';
  if (grade <= 4) return 'middle';
  return 'upper';
}

export interface PlanSessionInput {
  profileId: string;
  grade: Grade;
  skills: readonly Skill[];
  mastery: Readonly<Record<string, SkillMastery>>;
  now: number;
  seed: number;
  preferredSkillId?: string;
  /**
   * نطاق مهارات مهمة المبنى القادم من mission-link.
   * غيابه = المسار القديم كما هو، بلا أي تغيير في السلوك.
   */
  missionSkillIds?: readonly string[];
}

/**
 * اختيار المهارة الهدف:
 * 1) المهارة المفضّلة إن وُجدت.
 * 2) أول مهارة غير متقنة ومتطلباتها السابقة مفتوحة (ترتيب الحزمة).
 * 3) أول مهارة غير متقنة (مع اقتراح جسر لاحقاً).
 * 4) أقدم مهارة متقنة (مراجعة).
 */
export function pickTargetSkill(
  skills: readonly Skill[],
  mastery: Readonly<Record<string, SkillMastery>>,
  preferredSkillId?: string,
): Skill | null {
  if (skills.length === 0) return null;

  if (preferredSkillId) {
    const preferred = skills.find((s) => s.id === preferredSkillId);
    if (preferred) return preferred;
  }

  const notMastered = skills.filter((s) => !mastery[s.id]?.mastered);
  const withOpenPrereqs = notMastered.find((s) =>
    s.prerequisites.every((id) => isPrerequisiteOpen(mastery[id]?.state ?? 'not_reached')),
  );
  if (withOpenPrereqs) return withOpenPrereqs;
  if (notMastered[0]) return notMastered[0];

  const oldest = skills
    .slice()
    .sort(
      (a, b) =>
        (mastery[a.id]?.lastIndependentAt ?? 0) - (mastery[b.id]?.lastIndependentAt ?? 0),
    )[0];
  return oldest ?? null;
}

export function planSession(input: PlanSessionInput): SessionPlan {
  const scopedSkills = scopeToMission(input.skills, input.missionSkillIds);
  const target = pickTargetSkill(scopedSkills, input.mastery, input.preferredSkillId);
  const due = dueReviews(scopedSkills, input.mastery, input.now)
    .map((d) => d.skillId)
    .filter((id) => id !== target?.id);

  const masteredFallback = scopedSkills
    .filter((s) => masteryFlag(input.mastery, s.id) && s.id !== target?.id)
    .map((s) => s.id);

  const reviewSkillIds = (due.length > 0 ? due : masteredFallback).slice(0, 2);
  const blueprint = BAND_BLUEPRINTS[bandForGrade(input.grade)];

  const phases: SessionPhaseSpec[] = blueprint.map((p) => ({
    phase: p.phase,
    minutes: p.minutes,
    interactions: p.interactions,
    skillId:
      p.phase === 'close'
        ? null
        : p.phase === 'activate'
          ? (reviewSkillIds[0] ?? target?.id ?? null)
          : (target?.id ?? null),
    allowHints: p.allowHints,
  }));

  return {
    id: makeId('session', input.seed, input.now),
    profileId: input.profileId,
    grade: input.grade,
    createdAt: input.now,
    targetSkillId: target?.id ?? null,
    reviewSkillIds,
    phases,
    totalMinutes: round1(phases.reduce((sum, p) => sum + p.minutes, 0)),
    totalInteractions: phases.reduce((sum, p) => sum + p.interactions, 0),
    seed: input.seed,
  };
}

function masteryFlag(
  mastery: Readonly<Record<string, SkillMastery>>,
  skillId: string,
): boolean {
  return mastery[skillId]?.mastered === true;
}

/**
 * حصر مهارات الجلسة في نطاق مهمة المبنى مع الحفاظ على ترتيب الحزمة.
 * بلا نطاق: تُعاد القائمة نفسها بلا نسخ — المسار القديم لا يتغير حرفياً.
 */
export function scopeToMission(
  skills: readonly Skill[],
  missionSkillIds?: readonly string[],
): readonly Skill[] {
  if (!missionSkillIds || missionSkillIds.length === 0) return skills;
  const scope = new Set(missionSkillIds);
  return skills.filter((skill) => scope.has(skill.id));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function phaseAt(plan: SessionPlan, index: number): SessionPhaseSpec | null {
  return plan.phases[index] ?? null;
}

export function isLastPhase(plan: SessionPlan, index: number): boolean {
  return index >= plan.phases.length - 1;
}
