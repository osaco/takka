import { describe, expect, it } from 'vitest';
import { DAY_MS, type Skill, type SkillMastery } from '@domain/types';
import {
  dueReviews,
  intervalFor,
  nextReviewAt,
  reviewCount,
  warmSessionSkillIds,
} from '@domain/review/spaced-repetition';
import { buildWarmSession } from '@domain/review/warm-session';

const NOW = Date.UTC(2026, 9, 20, 9, 0, 0);

const skill = (id: string): Skill => ({
  id,
  grade: 1,
  subject: 'arabic',
  islandId: 'i',
  title: id,
  prerequisites: [],
  sourceRef: { kind: 'foundational' },
});

const m = (over: Partial<SkillMastery> = {}): SkillMastery => ({
  skillId: 'a',
  state: 'independent',
  independentCount: 3,
  independentSessions: 3,
  independentDays: 3,
  firstIndependentAt: NOW - 10 * DAY_MS,
  lastIndependentAt: NOW - 2 * DAY_MS,
  mastered: true,
  needsReview: false,
  ...over,
});

describe('المراجعة المتباعدة', () => {
  it('الفاصل الأول يومان', () => {
    expect(intervalFor(0)).toBe(2);
    expect(intervalFor(1)).toBe(7);
    expect(intervalFor(2)).toBe(21);
    expect(intervalFor(99)).toBe(21);
  });

  it('عدد المراجعات يُشتق من الأدلة الزائدة', () => {
    expect(reviewCount(m({ independentCount: 3 }))).toBe(0);
    expect(reviewCount(m({ independentCount: 5 }))).toBe(2);
    expect(reviewCount(m({ independentCount: 1 }))).toBe(0);
  });

  it('الاستحقاق بعد يومين', () => {
    const mastery = m({ lastIndependentAt: NOW - 2 * DAY_MS });
    expect(nextReviewAt(mastery)).toBe(NOW);
    const due = dueReviews([skill('a')], { a: mastery, b: m() }, NOW);
    expect(due).toHaveLength(1);
    expect(due[0]?.skillId).toBe('a');
  });

  it('لا يستحق قبل موعده', () => {
    const mastery = m({ lastIndependentAt: NOW - DAY_MS });
    expect(dueReviews([skill('a')], { a: mastery }, NOW)).toHaveLength(0);
  });

  it('غير المتقنة لا تدخل المراجعة', () => {
    const mastery = m({ mastered: false });
    expect(nextReviewAt(mastery)).toBeNull();
    expect(dueReviews([skill('a')], { a: mastery }, NOW)).toHaveLength(0);
  });

  it('المراجعة لا تصفّر عند الخطأ', () => {
    const before = m({ independentCount: 4 });
    const afterFailure = { ...before, state: 'with_help' as const };
    expect(reviewCount(afterFailure)).toBe(1);
    expect(afterFailure.mastered).toBe(true);
  });

  it('تكة دافئة تختار المستحق', () => {
    const s = skill('a');
    const mastery = { a: m({ lastIndependentAt: NOW - 8 * DAY_MS }) };
    expect(warmSessionSkillIds([s], mastery, NOW)).toEqual(['a']);
  });

  it('رسالة العودة بلا لوم', () => {
    const warm = buildWarmSession(
      [skill('a')],
      { a: m({ needsReview: true, lastIndependentAt: NOW - 30 * DAY_MS }) },
      NOW,
    );
    expect(warm?.message).toContain('محفوظ');
    expect(warm?.message).not.toContain('خسر');
  });
});
