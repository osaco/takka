import { describe, expect, it } from 'vitest';
import type { Skill, SkillMastery } from '@domain/types';
import {
  MissionLinkViolation,
  enforceMissionTargets,
  resolveMissionTargets,
  type PackSkillSource,
} from '@domain/island';
import { planSession } from '@domain/session';

const NOW = Date.UTC(2026, 9, 29, 9, 0, 0);

const AR_SKILLS = ['g1.ar.letter.ra.recognize', 'g1.ar.letter.dal.recognize'];
const MATH_SKILLS = ['g1.math.count.1-5', 'g1.math.compare.within9'];

const PACKS: PackSkillSource[] = [
  { packId: 'g1-ar-v1.0', skillIds: AR_SKILLS },
  { packId: 'g1-math-v1.0', skillIds: MATH_SKILLS },
];

const skill = (id: string, subject: Skill['subject'], islandId: string): Skill => ({
  id,
  grade: 1,
  subject,
  islandId,
  title: id,
  prerequisites: [],
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

describe('ربط المبنى بأهداف الجلسة — mission-link (Step 3)', () => {
  // 1. بيت الحروف يلتقط مهارات العربية فقط
  it('1. مهمة بيت الحروف تُحل إلى حزمة العربية بمهاراتها المعتمدة فقط', () => {
    const res = resolveMissionTargets('letters', PACKS);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.targets.packId).toBe('g1-ar-v1.0');
    expect(res.targets.skillIds).toEqual(AR_SKILLS);
    expect(res.targets.skillIds.some((id) => MATH_SKILLS.includes(id))).toBe(false);
  });

  // 2. بيت الأعداد يلتقط مهارات الرياضيات فقط
  it('2. مهمة بيت الأعداد تُحل إلى حزمة الرياضيات بمهاراتها المعتمدة فقط', () => {
    const res = resolveMissionTargets('numbers', PACKS);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.targets.packId).toBe('g1-math-v1.0');
    expect(res.targets.skillIds).toEqual(MATH_SKILLS);
    expect(res.targets.skillIds.some((id) => AR_SKILLS.includes(id))).toBe(false);
  });

  // 3. مبانٍ بلا مهمة تعليمية تُرفض صراحةً
  it('3. المباني بلا ربط تعليمي (البرج، الرفاق، البستان، المنارة) تُرفض بـ NO_MISSION_LINK', () => {
    for (const id of ['hq', 'companions', 'garden', 'lighthouse'] as const) {
      const res = resolveMissionTargets(id, PACKS);
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.code).toBe('NO_MISSION_LINK');
      expect(res.unknownSkillIds).toEqual([]);
    }
  });

  // 4. حزمة غير محمّلة لا تُخترع
  it('4. غياب الحزمة المعتمدة يعطي PACK_NOT_LOADED ولا يخترع مهارات', () => {
    const res = resolveMissionTargets('letters', [{ packId: 'g1-math-v1.0', skillIds: MATH_SKILLS }]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('PACK_NOT_LOADED');
    expect(res.unknownSkillIds).toEqual([]);
  });

  // 5. مهارة وهمية: خطأ صريح في الإنتاج، تحذير في التطوير
  it('5. المهارة غير المعتمدة تُرفض بالمعرّف الدقيق: throw في strict وتحقير في warn', () => {
    const declared = { letters: ['g1.ar.letter.ra.recognize', 'g1.ar.ghost.skill'] } as const;

    const res = resolveMissionTargets('letters', PACKS, declared);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('UNKNOWN_SKILL_IDS');
    expect(res.unknownSkillIds).toEqual(['g1.ar.ghost.skill']);

    expect(() => enforceMissionTargets('letters', res, 'strict')).toThrow(MissionLinkViolation);
    try {
      enforceMissionTargets('letters', res, 'strict');
    } catch (error) {
      expect(error).toBeInstanceOf(MissionLinkViolation);
      expect((error as MissionLinkViolation).code).toBe('UNKNOWN_SKILL_IDS');
      expect((error as MissionLinkViolation).unknownSkillIds).toEqual(['g1.ar.ghost.skill']);
    }

    const warnings: string[] = [];
    const soft = enforceMissionTargets('letters', res, 'warn', (message) => warnings.push(message));
    expect(soft).toBeNull();
    expect(warnings).toEqual(['MISSION_LINK_UNKNOWN_SKILL_IDS: letters: g1.ar.ghost.skill']);
  });

  // 6. الجلسة تحترم نطاق المهمة والمسار القديم يبقى سليماً
  it('6. الجلسة تستهدف مهارات المبنى فقط، والمسار القديم بلا نطاق لا يتغير', () => {
    const skills = [
      skill('g1.math.count.1-5', 'math', 'island-numbers'),
      skill('g1.ar.letter.ra.recognize', 'arabic', 'island-letters'),
      skill('g1.ar.letter.dal.recognize', 'arabic', 'island-letters'),
    ];

    const legacy = planSession({ profileId: 'p', grade: 1, skills, mastery: {}, now: NOW, seed: 3 });
    expect(legacy.targetSkillId).toBe('g1.math.count.1-5');

    const mission = resolveMissionTargets('letters', PACKS);
    expect(mission.ok).toBe(true);
    if (!mission.ok) return;

    const scoped = planSession({
      profileId: 'p',
      grade: 1,
      skills,
      mastery: {},
      now: NOW,
      seed: 3,
      missionSkillIds: mission.targets.skillIds,
    });
    expect(scoped.targetSkillId).toBe('g1.ar.letter.ra.recognize');
    expect(scoped.phases.every((phase) => phase.skillId !== 'g1.math.count.1-5')).toBe(true);

    const allMastered = Object.fromEntries(skills.map((s) => [s.id, mastered(s.id)]));
    const scopedMastered = planSession({
      profileId: 'p',
      grade: 1,
      skills,
      mastery: allMastered,
      now: NOW,
      seed: 3,
      missionSkillIds: mission.targets.skillIds,
    });
    expect(scopedMastered.targetSkillId).toBe('g1.ar.letter.ra.recognize');
    expect(scopedMastered.reviewSkillIds).not.toContain('g1.math.count.1-5');
  });
});
