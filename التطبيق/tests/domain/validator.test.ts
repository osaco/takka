import { describe, expect, it } from 'vitest';
import { validatePack, assertValidPack } from '@domain/content/validator';
import { indexPack } from '@domain/content/loader';

export function makePack(): Record<string, unknown> {
  return {
    manifest: {
      id: 'g1-ar-test',
      grade: 1,
      subject: 'arabic',
      version: '0.1.0',
      title: 'حزمة اختبار',
      edition: 'رزم غزة 2024',
      publishedAt: '2026-10-20',
      auditStatus: 'internal_reviewed',
      scopeNote: 'عيّنة اختبار وليست المنهاج الكامل.',
      coverage: {
        declared: 'حرف واحد — عيّنة.',
        units: [{ id: 'u1', title: 'حرف الراء', page: 12, lessons: 1 }],
      },
    },
    islands: [{ id: 'island-letters', title: 'جزيرة الحروف', subject: 'arabic' }],
    skills: [
      {
        id: 'g1.ar.letter.ra.recognize',
        grade: 1,
        subject: 'arabic',
        islandId: 'island-letters',
        title: 'تمييز حرف الراء',
        prerequisites: [],
        sourceRef: {
          kind: 'pack',
          file: 'لغتنا الجميلة ١ متمازجة غزة.pdf',
          unit: 'حرف الراء',
          edition: 'رزم غزة 2024',
          page: 12,
        },
      },
    ],
    activities: [
      {
        id: 'g1.ar.ra.listen.01',
        grade: 1,
        subject: 'arabic',
        islandId: 'island-letters',
        skillId: 'g1.ar.letter.ra.recognize',
        template: 'listen_identify',
        title: 'أي كلمة تبدأ بالراء؟',
        difficulty: 1,
        scaffolding: { level: 1, hint: 'قل «ر» ثم ابحث عن الصورة التي تبدأ بها.' },
        source: {
          kind: 'pack',
          file: 'لغتنا الجميلة ١ متمازجة غزة.pdf',
          unit: 'حرف الراء',
          edition: 'رزم غزة 2024',
          page: 12,
        },
        audit: { status: 'internal_reviewed', reviewedAt: '2026-10-20' },
        feedback: { success: 'أحسنت! رُمَّان تبدأ بالراء.', retry: 'قريب! جرّب أن تسمع أول صوت.' },
        config: {
          prompt: 'أي كلمة تبدأ بصوت الراء؟',
          spokenText: 'رُ',
          options: [
            { id: 'a', label: 'رُمَّان', correct: true },
            { id: 'b', label: 'دَار', correct: false },
          ],
        },
      },
    ],
  };
}

function clone(): Record<string, any> {
  return JSON.parse(JSON.stringify(makePack()));
}

describe('مدقّق المحتوى', () => {
  it('يقبل الحزمة السليمة', () => {
    const report = validatePack(makePack());
    expect(report.ok).toBe(true);
    expect(report.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
    expect(report.stats.activities).toBe(1);
  });

  it('يفشل عند غياب المصدر', () => {
    const pack = clone();
    delete pack.activities[0].source.file;
    const report = validatePack(pack);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === 'source')).toBe(true);
  });

  it('يفشل عند غياب التدقيق', () => {
    const pack = clone();
    pack.activities[0].audit.status = 'draft';
    expect(validatePack(pack).ok).toBe(false);
  });

  it('يفشل عند إجابتين صحيحتين', () => {
    const pack = clone();
    pack.activities[0].config.options[1].correct = true;
    const report = validatePack(pack);
    expect(report.issues.some((i) => i.code === 'listen.correct')).toBe(true);
  });

  it('يفشل عند لغة لوم', () => {
    const pack = clone();
    pack.activities[0].feedback.retry = 'خطأ! حاول مرة أخرى.';
    const report = validatePack(pack);
    expect(report.issues.some((i) => i.code === 'feedback.shame')).toBe(true);
  });

  it('يحذّر عند غياب رقم الصفحة', () => {
    const pack = clone();
    delete pack.activities[0].source.page;
    const report = validatePack(pack);
    expect(report.ok).toBe(true);
    expect(report.issues.some((i) => i.code === 'source.page')).toBe(true);
  });

  it('يفشل عند مهارة غير موجودة', () => {
    const pack = clone();
    pack.activities[0].skillId = 'g1.ar.letter.zz.recognize';
    const report = validatePack(pack);
    expect(report.issues.some((i) => i.code === 'activity.skill')).toBe(true);
  });

  it('يفشل عند تكرار المعرّفات', () => {
    const pack = clone();
    pack.activities.push(JSON.parse(JSON.stringify(pack.activities[0])));
    const report = validatePack(pack);
    expect(report.issues.some((i) => i.code === 'activity.duplicate')).toBe(true);
  });

  it('يفشل عند دورة في المتطلبات', () => {
    const pack = clone();
    pack.skills.push({
      ...pack.skills[0],
      id: 'g1.ar.letter.dal.recognize',
      prerequisites: ['g1.ar.letter.ra.recognize'],
      title: 'الدال',
    });
    pack.skills[0].prerequisites = ['g1.ar.letter.dal.recognize'];
    const report = validatePack(pack);
    expect(report.issues.some((i) => i.code === 'skill.cycle')).toBe(true);
  });

  it('يفشل عند مسار تتبع غير صالح', () => {
    const pack = clone();
    pack.activities[0] = {
      ...pack.activities[0],
      template: 'trace_path',
      config: {
        prompt: 'تتبّع',
        character: 'ر',
        strokePath: 'X 0 0',
        minCoverage: 0.7,
        tolerance: 28,
        showGuide: true,
      },
    };
    const report = validatePack(pack);
    expect(report.ok).toBe(false);
  });

  it('يتحقق من حساب الميزان', () => {
    const pack = clone();
    pack.activities[0] = {
      ...pack.activities[0],
      template: 'balance',
      config: {
        prompt: 'وازن',
        leftSide: { items: [{ id: 'l1', value: 3, label: '٣' }, { id: 'l2', value: 4, label: '٤' }], total: 7 },
        rightSide: {
          items: [],
          options: [
            { id: 'o1', value: 6, label: '٦' },
            { id: 'o2', value: 8, label: '٨' },
          ],
        },
        correctAnswer: 'o1',
      },
    };
    const report = validatePack(pack);
    expect(report.issues.some((i) => i.code === 'balance.math')).toBe(true);
  });

  it('assertValidPack يرمي برسالة عربية', () => {
    const pack = clone();
    delete pack.activities[0].source;
    expect(() => assertValidPack(pack)).toThrow(/حزمة غير صالحة/);
  });

  it('يبني فهرساً للوصول السريع', () => {
    const pack = assertValidPack(makePack());
    const index = indexPack(pack);
    expect(index.skillsById['g1.ar.letter.ra.recognize']).toBeDefined();
    expect(index.activitiesBySkill['g1.ar.letter.ra.recognize']).toHaveLength(1);
    expect(index.skillsByIsland['island-letters']).toHaveLength(1);
  });
});
