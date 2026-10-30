import { describe, expect, it } from 'vitest';
import {
  assertContentIndex,
  buildContentIndex,
  resolveAsset,
  templateCounts,
  TEMPLATE_RENDERERS,
} from '../../src/content/registry';
import { validatePack } from '../../src/domain/content/validator';
import arPack from '../../src/content-packs/g1-ar-v1.0/pack.json';
import mathPack from '../../src/content-packs/g1-math-v1.0/pack.json';

/**
 * البوابة: هذا الاختبار يفشل إذا دخلت حزمة غير مُدقَّقة،
 * أو نشاط بلا مصدر، أو قالب بلا مصيّر.
 */
describe('حزم المحتوى', () => {
  const packs = [
    { name: 'العربية', raw: arPack as unknown, id: 'g1-ar-v1.0', activities: 8 },
    { name: 'الرياضيات', raw: mathPack as unknown, id: 'g1-math-v1.0', activities: 9 },
  ];

  for (const pack of packs) {
    it(`${pack.name}: تجتاز المدقّق التربوي`, () => {
      const report = validatePack(pack.raw);
      const errors = report.issues.filter((i) => i.severity === 'error');
      expect(errors).toEqual([]);
      expect(report.ok).toBe(true);
      expect(report.pack?.manifest.id).toBe(pack.id);
      expect(report.pack?.activities.length).toBe(pack.activities);
    });

    it(`${pack.name}: كل نشاط يحمل مصدراً وتدقيقاً وتلميحاً`, () => {
      const report = validatePack(pack.raw);
      for (const activity of report.pack?.activities ?? []) {
        expect(activity.source.kind).toBe('pack');
        expect(activity.source.file?.length ?? 0).toBeGreaterThan(3);
        expect(activity.source.edition?.length ?? 0).toBeGreaterThan(3);
        expect(activity.audit.status).toBe('internal_reviewed');
        expect(activity.scaffolding.hint.length).toBeGreaterThanOrEqual(10);
        expect(activity.feedback.retry.length).toBeGreaterThan(3);
      }
    });

    it(`${pack.name}: التغذية الراجعة خالية من لغة اللوم`, () => {
      const report = validatePack(pack.raw);
      const forbidden = ['خطأ', 'خسر', 'فشل', 'ضعيف', 'غبي'];
      for (const activity of report.pack?.activities ?? []) {
        for (const word of forbidden) {
          expect(activity.feedback.retry).not.toContain(word);
          expect(activity.feedback.success).not.toContain(word);
        }
      }
    });
  }
});

describe('فهرس المحتوى', () => {
  it('يجمع الحزم ويبني الفهارس الفرعية', () => {
    const index = buildContentIndex();
    expect(index.packs.length).toBe(2);
    expect(index.skills.length).toBe(17);
    expect(index.activities.length).toBe(17);
    expect(index.islands.length).toBe(6);
    expect(() => assertContentIndex(index)).not.toThrow();
  });

  it('كل مهارة يخدمها نشاط واحد على الأقل', () => {
    const index = buildContentIndex();
    for (const skill of index.skills) {
      expect(index.activitiesBySkill.get(skill.id)?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('كل مهارة تتبع جزيرة موجودة وترتيبها معرف', () => {
    const index = buildContentIndex();
    for (const skill of index.skills) {
      expect(index.islands.some((i) => i.id === skill.islandId)).toBe(true);
      expect(skill.order).toBeTypeOf('number');
    }
  });

  it('كل قالب له مصيّر معلن ومحتوى فعلي', () => {
    const index = buildContentIndex();
    const counts = templateCounts(index);
    for (const template of Object.keys(counts)) {
      expect(TEMPLATE_RENDERERS[template as keyof typeof TEMPLATE_RENDERERS]).toBeTruthy();
    }
    expect(counts.balance).toBe(3);
    expect(counts.trace_path).toBe(3);
  });

  it('حزمة فاسدة تُسقط assert بدل أن تمرّ بصمت', () => {
    const index = buildContentIndex({
      'broken/pack.json': {
        manifest: { id: 'BAD ID' },
        islands: [],
        skills: [],
        activities: [],
      },
    });
    expect(index.packs.length).toBe(0);
    expect(() => assertContentIndex(index)).toThrow();
  });
});

describe('مسؤول الأصول', () => {
  it('يجد كل صور حزمة العربية', () => {
    for (const path of [
      'svg/ar/rumman.svg',
      'svg/ar/rishah.svg',
      'svg/ar/dar.svg',
      'svg/ar/bab.svg',
      'svg/ar/miftah.svg',
      'svg/ar/bata.svg',
    ]) {
      expect(resolveAsset(path), path).toBeTruthy();
    }
  });

  it('يجد أيقونة الرفيق فطين', () => {
    expect(resolveAsset('svg/companion/fatin.svg')).toBeTruthy();
  });

  it('يعيد null لمسار غير موجود بدل رابط مكسور', () => {
    expect(resolveAsset('svg/ar/ghost.svg')).toBeNull();
    expect(resolveAsset('audio/hello.mp3')).toBeNull();
  });

  it('كل صورة مطلوبة في الحزم موجودة فعلاً', () => {
    const index = buildContentIndex();
    const wanted = new Set<string>();
    for (const activity of index.activities) {
      if (activity.template === 'listen_identify') {
        for (const option of activity.config.options) if (option.image) wanted.add(option.image);
      }
      if (activity.template === 'drag_match') {
        for (const pair of activity.config.pairs) {
          if (pair.target.image) wanted.add(pair.target.image);
          if (pair.draggable.image) wanted.add(pair.draggable.image);
        }
      }
    }
    expect(wanted.size).toBeGreaterThan(0);
    for (const path of wanted) {
      expect(resolveAsset(path), `صورة مفقودة: ${path}`).toBeTruthy();
    }
  });
});
