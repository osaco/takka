import { DAY_MS, DEFAULT_MASTERY_RULE, type SkillMastery } from '../types';

/** 21 يوماً بلا دليل مستقل ⇒ «تحتاج مراجعة» في الاقتراح فقط. لا حذف ولا خصم. */
export const DECAY_DAYS = 21;

export function daysSinceLastIndependent(mastery: SkillMastery, now: number): number | null {
  if (mastery.lastIndependentAt === null) return null;
  return (now - mastery.lastIndependentAt) / DAY_MS;
}

export function isDecayed(
  mastery: SkillMastery,
  now: number,
  decayAfterMs = DEFAULT_MASTERY_RULE.decayAfterMs,
): boolean {
  if (!mastery.mastered || mastery.lastIndependentAt === null) return false;
  return now - mastery.lastIndependentAt >= decayAfterMs;
}

/**
 * نصّ لولي الأمر: وصفي، غير جارح، ولا يذكر «خسارة».
 */
export function describeDecay(mastery: SkillMastery, now: number): string {
  const days = daysSinceLastIndependent(mastery, now);
  if (days === null) return 'لم تُجرَّب بعد';
  if (!mastery.mastered) return 'قيد التعلّم';
  if (mastery.needsReview) return `مرّ ${Math.floor(days)} يوماً — نقترح مراجعة لطيفة`;
  return 'ثابتة في السجل، ولا تُحذف أبداً';
}
