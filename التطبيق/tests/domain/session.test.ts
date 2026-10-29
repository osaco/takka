import { describe, expect, it } from 'vitest';
import type { Skill, SkillMastery } from '@domain/types';
import {
  bandForGrade,
  isLastPhase,
  phaseAt,
  pickTargetSkill,
  planSession,
} from '@domain/session';
import { canAdvance, nextIndex, nextPhaseOf, progressLabel } from '@domain/session/transitions';
import { endSession, closingMessage } from '@domain/session/end';

const NOW = Date.UTC(2026, 9, 20, 9, 0, 0);

const skill = (id: string, prerequisites: string[] = []): Skill => ({
  id,
  grade: 1,
  subject: 'arabic',
  islandId: 'island-letters',
  title: id,
  prerequisites,
  sourceRef: { kind: 'foundational' },
});

const mastered = (skillId: string): SkillMastery => ({
  skillId,
  state: 'independent',
  independentCount: 3,
  independentSessions: 2,
  independentDays: 2,
  firstIndependentAt: NOW - 5 * 86400000,
  lastIndependentAt: NOW - 3 * 86400000,
  mastered: true,
  needsReview: false,
});

describe('بناء الجلسة — الطول حسب الصف', () => {
  const skills = [skill('a'), skill('b', ['a'])];

  it('الصف 1–2: 4–6 دقائق و3–5 تفاعلات', () => {
    const plan = planSession({
      profileId: 'p',
      grade: 1,
      skills,
      mastery: {},
      now: NOW,
      seed: 7,
    });
    expect(plan.totalMinutes).toBeGreaterThanOrEqual(4);
    expect(plan.totalMinutes).toBeLessThanOrEqual(6);
    expect(plan.totalInteractions).toBeGreaterThanOrEqual(3);
    expect(plan.totalInteractions).toBeLessThanOrEqual(5);
    expect(plan.phases.map((p) => p.phase)).toEqual([
      'activate',
      'model',
      'guided',
      'check',
      'close',
    ]);
  });

  it('الصف 3–4: 7–10 دقائق و6–9 تفاعلات', () => {
    const plan = planSession({
      profileId: 'p',
      grade: 3,
      skills,
      mastery: {},
      now: NOW,
      seed: 7,
    });
    expect(plan.totalMinutes).toBeGreaterThanOrEqual(7);
    expect(plan.totalMinutes).toBeLessThanOrEqual(10);
    expect(plan.totalInteractions).toBeGreaterThanOrEqual(6);
    expect(plan.totalInteractions).toBeLessThanOrEqual(9);
    expect(plan.phases.some((p) => p.phase === 'fluency')).toBe(true);
  });

  it('الصف 5–6: 11–15 دقيقة و10–14 تفاعلاً', () => {
    const plan = planSession({
      profileId: 'p',
      grade: 6,
      skills,
      mastery: {},
      now: NOW,
      seed: 7,
    });
    expect(plan.totalMinutes).toBeGreaterThanOrEqual(11);
    expect(plan.totalMinutes).toBeLessThanOrEqual(15);
    expect(plan.totalInteractions).toBeGreaterThanOrEqual(10);
    expect(plan.totalInteractions).toBeLessThanOrEqual(14);
    expect(plan.phases).toHaveLength(8);
  });

  it('خرائط الصفوف', () => {
    expect(bandForGrade(1)).toBe('lower');
    expect(bandForGrade(2)).toBe('lower');
    expect(bandForGrade(3)).toBe('middle');
    expect(bandForGrade(4)).toBe('middle');
    expect(bandForGrade(5)).toBe('upper');
    expect(bandForGrade(6)).toBe('upper');
  });
});

describe('اختيار الهدف', () => {
  it('يختار أول مهارة غير متقنة ومتطلباتها مفتوحة', () => {
    const b = skill('b', ['a']);
    const mastery = { a: mastered('a') };
    expect(pickTargetSkill([skill('a'), b], mastery)?.id).toBe('b');
  });

  it('لا يختار مهارة متطلباتها مغلقة إذا وُجد بديل', () => {
    const b = skill('b', ['a']);
    const c = skill('c');
    expect(pickTargetSkill([b, c], {})?.id).toBe('c');
  });

  it('المهارة المفضّلة تفوز', () => {
    expect(
      pickTargetSkill([skill('a'), skill('b')], {}, 'b')?.id,
    ).toBe('b');
  });

  it('إن أُتقن الكل يعيد الأقدم للمراجعة', () => {
    const a = skill('a');
    const b = skill('b');
    const mastery = {
      a: { ...mastered('a'), lastIndependentAt: NOW - 10 * 86400000 },
      b: { ...mastered('b'), lastIndependentAt: NOW - 2 * 86400000 },
    };
    expect(pickTargetSkill([a, b], mastery)?.id).toBe('a');
  });

  it('الحزمة الفارغة لا تُنتج هدفاً', () => {
    expect(pickTargetSkill([], {})).toBeNull();
  });
});

describe('الانتقالات والخروج', () => {
  const plan = planSession({
    profileId: 'p',
    grade: 1,
    skills: [skill('a')],
    mastery: {},
    now: NOW,
    seed: 3,
  });

  it('الخروج متاح دائماً — لا مرحلة مقفلة', () => {
    for (const phase of plan.phases) {
      if (phase.phase === 'close') expect(canAdvance(phase)).toBe(false);
      else expect(canAdvance(phase)).toBe(true);
    }
  });

  it('الانتقال لا يتجاوز النهاية', () => {
    expect(nextIndex(plan, 99)).toBe(plan.phases.length - 1);
    expect(isLastPhase(plan, plan.phases.length - 1)).toBe(true);
  });

  it('يعرف المرحلة التالية', () => {
    expect(nextPhaseOf(plan, 'activate')).toBe('model');
    expect(nextPhaseOf(plan, 'close')).toBeNull();
  });

  it('التسمية وصفية بلا ضغط', () => {
    expect(progressLabel(plan, 0)).toBe('خطوة 1 من 5');
    expect(phaseAt(plan, 0)?.phase).toBe('activate');
  });
});

describe('إنهاء الجلسة', () => {
  it('التوقف ليس فشلاً', () => {
    const record = endSession({
      sessionId: 's1',
      profileId: 'p',
      grade: 1,
      startedAt: NOW,
      now: NOW + 90_000,
      targetSkillId: 'a',
      phaseReached: 'guided',
      attempts: 2,
      correct: 1,
      hints: 1,
      activityIds: ['act1'],
      stoppedByChild: true,
    });
    expect(record.stoppedByChild).toBe(true);
    expect(record.completed).toBe(false);
    expect(record.durationMs).toBe(90_000);
    expect(closingMessage(true, 0)).toContain('محفوظ');
  });

  it('الإغلاق يصف الإنجاز بلا مبالغة', () => {
    expect(closingMessage(false, 1)).toContain('ازدهرت');
    expect(closingMessage(false, 0)).toContain('عندما تحب');
  });
});
