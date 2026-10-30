/**
 * محمّل الحزم ومسؤول الأصول.
 * قاعدة صارمة: أي حزمة لا تجتاز المدقّق التربوي لا تُحمَّل أبداً.
 * (الوثيقة 10 §9.2: المدقّق يُفشل البناء، لا يحذّر.)
 */
import type { Island, Skill, TemplateId } from '@domain/types';
import type { Activity, ContentPack } from '@domain/content/schema';
import { validatePack, type ValidationReport } from '@domain/content/validator';

const AR = 'ar';
const SVG_SUFFIX = '.svg';

/** كل ملفات الحزم تُضمَّن في البناء مسبقاً — لا شبكة، لا تحميل مؤجّل. */
const rawPacks = import.meta.glob('../content-packs/*/pack.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

/** كلّ الأصول مرسومة محلياً؛ الاستيراد يعيد رابطاً مُبصَّماً من Vite. */
const assetUrls = import.meta.glob('/src/assets/**/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface ContentIndex {
  packs: ContentPack[];
  islands: Island[];
  skills: Skill[];
  activities: Activity[];
  reports: ValidationReport[];
  byActivityId: Map<string, Activity>;
  bySkillId: Map<string, Skill>;
  activitiesBySkill: Map<string, Activity[]>;
  /** جزر مفتوحة حسب ترتيب الظهور في الحزم. */
  islandLayout: { id: string; title: string; subject: Island['subject']; gx: number; gy: number }[];
}

/**
 * تخطيط الأرخبيل البصري: منسوب لكل جزيرة موضعاً في الشبكة.
 * المواضع ثابتة ومقروءة، لا عشوائية — الطفل يتذكّر المكان لا الرقم.
 */
const LAYOUT: Record<string, { gx: number; gy: number }> = {
  'island-letters': { gx: 0, gy: 0 },
  'island-writing': { gx: 3, gy: 1 },
  'island-words': { gx: 0, gy: 3 },
  'island-numbers': { gx: 3, gy: 4 },
  'island-math': { gx: 6, gy: 2 },
  'island-shapes': { gx: 6, gy: 6 },
};

const FALLBACK_LAYOUT = { gx: 1, gy: 6 };

/** مسار أصل المحتوى مثل svg/ar/rumman.svg ⇒ رابط البناء الفعلي. */
export function resolveAsset(path: string): string | null {
  if (path.endsWith(SVG_SUFFIX) || path.includes(SVG_SUFFIX)) {
    const clean = path.replace(/^\/+/, '');
    const key = `/src/assets/${clean}`;
    return assetUrls[key] ?? assetUrls[`/src/assets/${AR}/${clean}`] ?? null;
  }
  return null;
}

export function buildContentIndex(raws: Record<string, unknown> = rawPacks): ContentIndex {
  const packs: ContentPack[] = [];
  const reports: ValidationReport[] = [];

  for (const key of Object.keys(raws).sort()) {
    const report = validatePack(raws[key]);
    reports.push(report);
    if (report.ok && report.pack) packs.push(report.pack);
  }

  const islands: Island[] = [];
  const seenIsland = new Set<string>();
  for (const pack of packs) {
    for (const island of pack.islands) {
      if (seenIsland.has(island.id)) continue;
      seenIsland.add(island.id);
      islands.push({
        id: island.id,
        title: island.title,
        subject: island.subject,
        description: island.description,
      });
    }
  }

  const skills: Skill[] = [];
  const activities: Activity[] = [];
  for (const pack of packs) {
    for (const skill of pack.skills) {
      skills.push({
        id: skill.id,
        grade: skill.grade,
        subject: skill.subject,
        islandId: skill.islandId,
        title: skill.title,
        prerequisites: [...skill.prerequisites],
        sourceRef: skill.sourceRef,
        order: skill.order,
      });
    }
    activities.push(...pack.activities);
  }

  const byActivityId = new Map(activities.map((a) => [a.id, a]));
  const bySkillId = new Map(skills.map((s) => [s.id, s]));
  const activitiesBySkill = new Map<string, Activity[]>();
  for (const activity of activities) {
    const list = activitiesBySkill.get(activity.skillId);
    if (list) list.push(activity);
    else activitiesBySkill.set(activity.skillId, [activity]);
  }

  return {
    packs,
    islands,
    skills,
    activities,
    reports,
    byActivityId,
    bySkillId,
    activitiesBySkill,
    islandLayout: islands.map((i) => ({
      id: i.id,
      title: i.title,
      subject: i.subject,
      ...(LAYOUT[i.id] ?? FALLBACK_LAYOUT),
    })),
  };
}

/** يفشل بصوت عالٍ إن كان في الحزم خلل — ولا يصل طفل إلى محتوى غير مُدقَّق. */
export function assertContentIndex(index: ContentIndex): void {
  const failed = index.reports.filter((r) => !r.ok);
  if (failed.length === 0) return;
  const lines = failed.flatMap((r) =>
    r.issues.filter((i) => i.severity === 'error').map((i) => `- [${i.code}] ${i.path ?? ''} ${i.message}`),
  );
  throw new Error(`حزم محتوى فاشلة:\n${lines.join('\n')}`);
}

export const TEMPLATE_RENDERERS: Record<TemplateId, 'dom' | 'svg' | 'canvas2d'> = {
  drag_match: 'dom',
  trace_path: 'svg',
  listen_identify: 'dom',
  balance: 'canvas2d',
};

export function templateCounts(index: ContentIndex): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const activity of index.activities) {
    counts[activity.template] = (counts[activity.template] ?? 0) + 1;
  }
  return counts;
}
