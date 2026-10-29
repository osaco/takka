import { DAY_MS, type Skill, type SkillMastery } from '../types';

export interface WarmSession {
  title: string;
  message: string;
  skillIds: string[];
  minutes: number;
}

/**
 * رسالة العودة بعد غياب — بلا لوم، بلا «فقدت سلسلتك».
 */
export function buildWarmSession(
  skills: readonly Skill[],
  mastery: Readonly<Record<string, SkillMastery>>,
  now: number,
): WarmSession | null {
  if (skills.length === 0) return null;

  const lastSeen = Object.values(mastery)
    .map((m) => m.lastIndependentAt)
    .filter((t): t is number => t !== null)
    .sort((a, b) => b - a)[0];

  const awayDays = lastSeen ? Math.floor((now - lastSeen) / DAY_MS) : null;
  const greeted = awayDays !== null && awayDays >= 3;

  const review = skills
    .filter((s) => mastery[s.id]?.needsReview)
    .slice(0, 2)
    .map((s) => s.id);

  if (review.length === 0 && !greeted) return null;

  return {
    title: greeted ? 'أهلاً بعودتك' : 'تكة دافئة',
    message: greeted
      ? 'جزيرتك كانت بانتظارك. تقدّمك محفوظ، ولا شيء ينقص.'
      : 'مراجعة قصيرة تعيد القلب إلى مكانه.',
    skillIds: review.length > 0 ? review : skills.slice(0, 1).map((s) => s.id),
    minutes: 4,
  };
}
