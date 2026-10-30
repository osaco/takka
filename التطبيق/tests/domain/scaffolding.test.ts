import { describe, expect, it } from 'vitest';
import {
  createScaffold,
  evidenceKindFor,
  hintAllowed,
  registerCorrect,
  registerWrong,
  SCAFFOLD_LABELS,
} from '@domain/scaffolding/levels';
import {
  markHintRequested,
  submitAttempt,
} from '@domain/scaffolding/fade';
import { suggestBridge } from '@domain/scaffolding/bridge';
import type { Skill, SkillMastery } from '@domain/types';

describe('سقالات متلاشية', () => {
  it('أول لقاء يبدأ بنمذجة كاملة', () => {
    expect(createScaffold(true).level).toBe(1);
    expect(createScaffold(false).level).toBe(0);
  });

  it('تتصاعد بعد كل خطأ حتى التبسيط', () => {
    let s = createScaffold(false);
    s = registerWrong(s);
    expect(s.level).toBe(2);
    s = registerWrong(s);
    expect(s.level).toBe(3);
    s = registerWrong(s);
    expect(s.level).toBe(4);
    s = registerWrong(s);
    expect(s.level).toBe(4);
    expect(s.wrongStreak).toBe(4);
  });

  it('لا تخصم ولا تُغلق المحاولة', () => {
    let s = createScaffold(false);
    for (let i = 0; i < 10; i += 1) s = registerWrong(s);
    expect(s.level).toBe(4);
    expect(SCAFFOLD_LABELS[4]).toBe('تبسيط المهمة');
  });

  it('تتلاشى بعد نجاحين مستقلين', () => {
    let s = createScaffold(false);
    s = registerWrong(s); // 2
    s = registerWrong(s); // 3
    s = registerCorrect(s, true);
    expect(s.level).toBe(3);
    s = registerCorrect(s, true);
    expect(s.level).toBe(2);
    s = registerCorrect(s, true);
    s = registerCorrect(s, true);
    expect(s.level).toBe(1);
  });

  it('النجاح بمساعدة لا يخفض الدرجة', () => {
    let s = createScaffold(false);
    s = registerWrong(s);
    s = registerCorrect(s, false);
    expect(s.level).toBe(2);
    expect(s.successStreak).toBe(0);
  });

  it('نوع الدليل يُشتق من الدرجة', () => {
    expect(evidenceKindFor(0)).toBe('independent');
    expect(evidenceKindFor(1)).toBe('with_hint');
    expect(evidenceKindFor(2)).toBe('with_hint');
    expect(evidenceKindFor(3)).toBe('with_scaffold');
    expect(evidenceKindFor(4)).toBe('with_scaffold');
  });

  it('طلب التلميح يمنع وسم النجاح مستقلاً', () => {
    const s = markHintRequested(createScaffold(false));
    expect(s.level).toBe(2);
    const out = submitAttempt(s, true);
    expect(out.evidenceKind).toBe('with_hint');
    expect(out.helped).toBe(true);
  });

  it('النجاح المستقل يسجّل دليلاً مستقلاً', () => {
    const out = submitAttempt(createScaffold(false), true);
    expect(out.evidenceKind).toBe('independent');
    expect(out.helped).toBe(false);
  });

  it('الخطأ لا يسجّل دليلاً مستقلاً', () => {
    const out = submitAttempt(createScaffold(false), false);
    expect(out.evidenceKind).toBe('exposed_only');
  });

  it('التلميح متاح فقط عندما تسمح المرحلة', () => {
    expect(hintAllowed(true, 2)).toBe(true);
    expect(hintAllowed(false, 2)).toBe(false);
    expect(hintAllowed(true, 4)).toBe(false);
  });
});

describe('الجسر التأسيسي', () => {
  const skill: Skill = {
    id: 'b',
    grade: 1,
    subject: 'arabic',
    islandId: 'i',
    title: 'حرف الباء',
    prerequisites: ['a'],
    sourceRef: { kind: 'foundational' },
  };

  it('يقترح المتطلب الناقص أولاً', () => {
    const bridge = suggestBridge(skill, { a: { ...skill, id: 'a', prerequisites: [] } }, {}, 0);
    expect(bridge?.reason).toBe('missing_prerequisite');
    expect(bridge?.message).toContain('خطوة');
  });

  it('لا يُفرض على الطفل', () => {
    const mastery: Record<string, SkillMastery> = {
      a: {
        skillId: 'a',
        state: 'independent',
        independentCount: 3,
        independentSessions: 2,
        independentDays: 2,
        firstIndependentAt: 1,
        lastIndependentAt: 2,
        mastered: true,
        needsReview: false,
      },
    };
    expect(suggestBridge(skill, {}, mastery, 0)).toBeNull();
  });

  it('يقترح تبسيطاً بعد الدرجة الرابعة', () => {
    const mastery: Record<string, SkillMastery> = {
      a: {
        skillId: 'a',
        state: 'independent',
        independentCount: 3,
        independentSessions: 2,
        independentDays: 2,
        firstIndependentAt: 1,
        lastIndependentAt: 2,
        mastered: true,
        needsReview: false,
      },
    };
    const bridge = suggestBridge(skill, {}, mastery, 4);
    expect(bridge?.reason).toBe('repeated_difficulty');
  });
});
