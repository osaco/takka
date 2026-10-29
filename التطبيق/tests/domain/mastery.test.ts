import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MASTERY_RULE,
  DAY_MS,
  type Evidence,
  type EvidenceKind,
} from '@domain/types';
import {
  computeMasteryMap,
  computeSkillMastery,
} from '@domain/mastery/evidence-store';
import { advanceSkillState } from '@domain/mastery/state-machine';
import { isDecayed } from '@domain/mastery/decay';

const T0 = Date.UTC(2026, 9, 1, 8, 0, 0);

function ev(
  n: number,
  kind: EvidenceKind = 'independent',
  opts: { at?: number; session?: string } = {},
): Evidence {
  return {
    id: `e${n}`,
    profileId: 'p1',
    skillId: 'g1.ar.letter.ra.recognize',
    sessionId: opts.session ?? `s${n}`,
    at: opts.at ?? T0,
    kind,
    templateId: 'listen_identify',
    itemId: `i${n}`,
    attempts: 1,
    durationMs: 4000,
  };
}

describe('قاعدة الإتقان الثلاثية', () => {
  it('لا تتقن المهارة بدليلين مستقلين', () => {
    const m = computeSkillMastery(
      'g1.ar.letter.ra.recognize',
      [ev(1, 'independent', { at: T0 }), ev(2, 'independent', { at: T0 + 3 * DAY_MS })],
      T0 + 3 * DAY_MS,
    );
    expect(m.mastered).toBe(false);
    expect(m.independentCount).toBe(2);
  });

  it('تتقن بثلاثة أدلة مستقلة في جلستين ويومين', () => {
    const evidences = [
      ev(1, 'independent', { at: T0, session: 'sA' }),
      ev(2, 'independent', { at: T0 + 2 * DAY_MS, session: 'sB' }),
      ev(3, 'independent', { at: T0 + 5 * DAY_MS, session: 'sC' }),
    ];
    const m = computeSkillMastery(
      'g1.ar.letter.ra.recognize',
      evidences,
      T0 + 5 * DAY_MS,
    );
    expect(m.mastered).toBe(true);
    expect(m.independentSessions).toBe(3);
    expect(m.independentDays).toBe(3);
  });

  it('لا تتقن إذا كانت الثلاث في اليوم نفسه', () => {
    const evidences = [
      ev(1, 'independent', { at: T0, session: 'sA' }),
      ev(2, 'independent', { at: T0 + 60_000, session: 'sB' }),
      ev(3, 'independent', { at: T0 + 120_000, session: 'sC' }),
    ];
    const m = computeSkillMastery(
      'g1.ar.letter.ra.recognize',
      evidences,
      T0 + 120_000,
    );
    expect(m.independentDays).toBe(1);
    expect(m.mastered).toBe(false);
  });

  it('لا تتقن إذا كانت الثلاث في جلسة واحدة', () => {
    const evidences = [
      ev(1, 'independent', { at: T0, session: 'sA' }),
      ev(2, 'independent', { at: T0 + DAY_MS, session: 'sA' }),
      ev(3, 'independent', { at: T0 + 2 * DAY_MS, session: 'sA' }),
    ];
    const m = computeSkillMastery(
      'g1.ar.letter.ra.recognize',
      evidences,
      T0 + 2 * DAY_MS,
    );
    expect(m.independentSessions).toBe(1);
    expect(m.mastered).toBe(false);
  });

  it('الأدلة بمساعدة لا تُحتسب إتقاناً', () => {
    const evidences = [
      ev(1, 'with_hint', { at: T0, session: 'sA' }),
      ev(2, 'with_scaffold', { at: T0 + 2 * DAY_MS, session: 'sB' }),
      ev(3, 'independent', { at: T0 + 4 * DAY_MS, session: 'sC' }),
    ];
    const m = computeSkillMastery(
      'g1.ar.letter.ra.recognize',
      evidences,
      T0 + 4 * DAY_MS,
    );
    expect(m.independentCount).toBe(1);
    expect(m.mastered).toBe(false);
  });
});

describe('حالة المهارة', () => {
  it('تتدرج ولا تنحدر', () => {
    expect(advanceSkillState('not_reached', 'exposed_only')).toBe('tried');
    expect(advanceSkillState('tried', 'with_hint')).toBe('with_help');
    expect(advanceSkillState('with_help', 'independent')).toBe('independent');
    expect(advanceSkillState('independent', 'exposed_only')).toBe('independent');
  });
});

describe('الانحدار', () => {
  const mastered = () => {
    const evidences = [
      ev(1, 'independent', { at: T0, session: 'sA' }),
      ev(2, 'independent', { at: T0 + 2 * DAY_MS, session: 'sB' }),
      ev(3, 'independent', { at: T0 + 4 * DAY_MS, session: 'sC' }),
    ];
    return computeSkillMastery('g1.ar.letter.ra.recognize', evidences, T0);
  };

  it('لا تحتاج مراجعة قبل 21 يوماً', () => {
    const m = { ...mastered(), lastIndependentAt: T0 };
    expect(isDecayed(m, T0 + 20 * DAY_MS)).toBe(false);
  });

  it('تحتاج مراجعة بعد 21 يوماً — بلا حذف', () => {
    const m = { ...mastered(), lastIndependentAt: T0 };
    expect(isDecayed(m, T0 + 21 * DAY_MS)).toBe(true);
    expect(m.independentCount).toBe(3);
    expect(m.mastered).toBe(true);
  });

  it('قاعدة الانحدار الافتراضية 21 يوماً', () => {
    expect(DEFAULT_MASTERY_RULE.decayAfterMs).toBe(21 * DAY_MS);
  });
});

describe('خريطة الإتقان', () => {
  it('تحسب كل مهارة على حدة بلا معدل عام', () => {
    const other = { ...ev(9), skillId: 'g1.ar.letter.dal.recognize' };
    const map = computeMasteryMap(
      ['g1.ar.letter.ra.recognize', 'g1.ar.letter.dal.recognize', 'g1.ar.letter.ba.recognize'],
      [ev(1), other],
      T0,
    );
    expect(map['g1.ar.letter.ra.recognize']?.independentCount).toBe(1);
    expect(map['g1.ar.letter.dal.recognize']?.independentCount).toBe(1);
    expect(map['g1.ar.letter.ba.recognize']?.state).toBe('not_reached');
  });
});
