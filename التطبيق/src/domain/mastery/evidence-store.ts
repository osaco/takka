import {
  DAY_MS,
  DEFAULT_MASTERY_RULE,
  type Evidence,
  type MasteryRule,
  type SkillMastery,
  type SkillState,
} from '../types';
import { stateFromEvidence } from './state-machine';

const dayKey = (at: number): number => Math.floor(at / DAY_MS);

/**
 * قاعدة الإتقان (قرار الوثيقة 10 §6.2):
 * «المهارة تُعدّ مُتقنة إذا ظهرت مستقلةً ثلاث مرات، في جلستين مختلفتين
 *  على الأقل، وبفاصل زمني لا يقل عن يوم، دون تلميح.»
 *
 * الدالة نقية: لا وقت نظام داخلها؛ «الآن» يُمرَّر صراحةً.
 */
export function computeSkillMastery(
  skillId: string,
  evidences: readonly Evidence[],
  now: number,
  rule: MasteryRule = DEFAULT_MASTERY_RULE,
): SkillMastery {
  const relevant = evidences.filter((e) => e.skillId === skillId);
  const independent = relevant
    .filter((e) => e.kind === 'independent')
    .slice()
    .sort((a, b) => a.at - b.at);

  const sessions = new Set(independent.map((e) => e.sessionId));
  const days = new Set(independent.map((e) => dayKey(e.at)));
  const first = independent[0]?.at ?? null;
  const last = independent[independent.length - 1]?.at ?? null;
  const span = first !== null && last !== null ? last - first : 0;

  const mastered =
    independent.length >= rule.independentRequired &&
    sessions.size >= rule.distinctSessionsRequired &&
    days.size >= rule.distinctDaysRequired &&
    span >= rule.minSpanMs;

  const needsReview = mastered && last !== null && now - last >= rule.decayAfterMs;

  const state: SkillState = stateFromEvidence(relevant);

  return {
    skillId,
    state,
    independentCount: independent.length,
    independentSessions: sessions.size,
    independentDays: days.size,
    firstIndependentAt: first,
    lastIndependentAt: last,
    mastered,
    needsReview,
  };
}

export function computeMasteryMap(
  skillIds: readonly string[],
  evidences: readonly Evidence[],
  now: number,
  rule: MasteryRule = DEFAULT_MASTERY_RULE,
): Record<string, SkillMastery> {
  const bySkill = new Map<string, Evidence[]>();
  for (const evidence of evidences) {
    const list = bySkill.get(evidence.skillId);
    if (list) list.push(evidence);
    else bySkill.set(evidence.skillId, [evidence]);
  }

  const result: Record<string, SkillMastery> = {};
  for (const skillId of skillIds) {
    result[skillId] = computeSkillMastery(skillId, bySkill.get(skillId) ?? [], now, rule);
  }
  return result;
}

export function emptyMastery(skillId: string): SkillMastery {
  return {
    skillId,
    state: 'not_reached',
    independentCount: 0,
    independentSessions: 0,
    independentDays: 0,
    firstIndependentAt: null,
    lastIndependentAt: null,
    mastered: false,
    needsReview: false,
  };
}
