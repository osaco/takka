import { describe, expect, it } from 'vitest';
import { MemoryProgressRepository } from '@data/memory-repository';
import { parseEnvelope, stableStringify, fnv1a } from '@data/export-import';
import type { Evidence, Profile, SessionRecord } from '@domain/types';

const profile: Profile = {
  id: 'p1',
  nickname: 'نجمة',
  grade: 1,
  audioEnabled: true,
  reducedMotion: false,
  createdAt: 1,
  schemaVersion: 1,
};

const evidence: Evidence = {
  id: 'e1',
  profileId: 'p1',
  skillId: 'g1.ar.letter.ra.recognize',
  sessionId: 's1',
  at: 1000,
  kind: 'independent',
  templateId: 'listen_identify',
  itemId: 'a1',
  attempts: 1,
  durationMs: 5000,
};

const session: SessionRecord = {
  id: 's1',
  profileId: 'p1',
  grade: 1,
  startedAt: 900,
  endedAt: 2000,
  targetSkillId: 'g1.ar.letter.ra.recognize',
  phaseReached: 'close',
  completed: true,
  stoppedByChild: false,
  attempts: 1,
  correct: 1,
  hints: 0,
  durationMs: 1100,
  activityIds: ['a1'],
};

describe('المستودع في الذاكرة', () => {
  it('يحفظ الملف والأدلة والجلسات', async () => {
    const repo = new MemoryProgressRepository();
    await repo.saveProfile(profile);
    await repo.saveEvidence(evidence);
    await repo.saveSession(session);

    expect(await repo.loadProfile('p1')).toEqual(profile);
    expect(await repo.getEvidence('p1')).toHaveLength(1);
    expect(await repo.getSessions('p1')).toHaveLength(1);
    expect(await repo.getSkillStates('p1')).toEqual({
      'g1.ar.letter.ra.recognize': 'independent',
    });
  });

  it('يحذف كل شيء مع الملف', async () => {
    const repo = new MemoryProgressRepository();
    await repo.saveProfile(profile);
    await repo.saveEvidence(evidence);
    await repo.deleteProfile('p1');
    expect(await repo.listProfiles()).toHaveLength(0);
    expect(await repo.getEvidence('p1')).toHaveLength(0);
  });

  it('تصدير واستيراد يعيدان نفس التقدّم', async () => {
    const repo = new MemoryProgressRepository();
    await repo.saveProfile(profile);
    await repo.saveEvidence(evidence);
    await repo.saveSession(session);

    const blob = await repo.exportProfile('p1');
    const text = await blob.text();
    const parsed = parseEnvelope(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.snapshot?.evidence).toHaveLength(1);

    const fresh = new MemoryProgressRepository();
    const imported = await fresh.importProfile(blob);
    expect(imported.id).toBe('p1');
    expect(await fresh.getEvidence('p1')).toEqual([evidence]);
    expect(await fresh.getSessions('p1')).toEqual([session]);
  });

  it('يرفض ملفاً معدّلاً بعد التصدير', async () => {
    const repo = new MemoryProgressRepository();
    await repo.saveProfile(profile);
    await repo.saveEvidence(evidence);
    const text = await (await repo.exportProfile('p1')).text();

    const tampered = text.replace('"attempts": 1', '"attempts": 9');
    const parsed = parseEnvelope(tampered);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain('بصمة');
  });

  it('الملف التالف لا يُستورد', async () => {
    const repo = new MemoryProgressRepository();
    await expect(repo.importProfile(new Blob(['{oops']))).rejects.toThrow();
  });

  it('البصمة مستقرة مهما اختلف ترتيب المفاتيح', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(fnv1a('تكة')).toBe(fnv1a('تكة'));
    expect(fnv1a('تكة')).not.toBe(fnv1a('تكه'));
  });
});
