import {
  DAY_MS,
  type Skill,
  type SkillMastery,
  type SkillState,
} from '../types';

/** الفواصل: ~2 أيام ثم ~7 أيام ثم 21 (حدّ الانحدار). */
export const REVIEW_INTERVAL_DAYS = [2, 7, 21] as const;

export interface ReviewItem {
  skillId: string;
  dueAt: number;
  intervalDays: number;
  overdueDays: number;
}

/**
 * عدد المراجعات يُشتق من عدد الأدلة المستقلة الزائدة عن عتبة الإتقان.
 * بهذا لا نحتاج جدولاً جديداً، ولا نُعيد عدّاد المراجعة إلى الصفر عند الخطأ.
 */
export function reviewCount(mastery: SkillMastery, independentRequired = 3): number {
  return Math.max(0, mastery.independentCount - independentRequired);
}

export function intervalFor(reviewIndex: number): number {
  const i = Math.min(Math.max(0, reviewIndex), REVIEW_INTERVAL_DAYS.length - 1);
  return REVIEW_INTERVAL_DAYS[i] as number;
}

export function nextReviewAt(mastery: SkillMastery, independentRequired = 3): number | null {
  if (!mastery.mastered || mastery.lastIndependentAt === null) return null;
  const days = intervalFor(reviewCount(mastery, independentRequired));
  return mastery.lastIndependentAt + days * DAY_MS;
}

/** المراجعات المستحقة اليوم، مرتّبة بالأقدم أولاً. */
export function dueReviews(
  skills: readonly Skill[],
  mastery: Readonly<Record<string, SkillMastery>>,
  now: number,
  independentRequired = 3,
): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const skill of skills) {
    const m = mastery[skill.id];
    if (!m?.mastered) continue;
    const dueAt = nextReviewAt(m, independentRequired);
    if (dueAt === null || now < dueAt) continue;
    items.push({
      skillId: skill.id,
      dueAt,
      intervalDays: intervalFor(reviewCount(m, independentRequired)),
      overdueDays: Math.floor((now - dueAt) / DAY_MS),
    });
  }
  return items.sort((a, b) => a.dueAt - b.dueAt);
}

/**
 * «تكة دافئة»: جلسة قصيرة كلها مراجعة، بلا مهارة جديدة.
 * تُستخدم عند العودة بعد غياب، أو عند ازدحام المراجعات.
 */
export function warmSessionSkillIds(
  skills: readonly Skill[],
  mastery: Readonly<Record<string, SkillMastery>>,
  now: number,
  limit = 2,
): string[] {
  const due = dueReviews(skills, mastery, now);
  if (due.length > 0) return due.slice(0, limit).map((d) => d.skillId);

  const tried = skills
    .filter((s) => {
      const state: SkillState = mastery[s.id]?.state ?? 'not_reached';
      return state === 'tried' || state === 'with_help';
    })
    .slice(0, limit)
    .map((s) => s.id);

  return tried;
}
