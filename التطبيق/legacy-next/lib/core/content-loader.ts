import samplePackRaw from "../../content/packs/g1-foundational-sample-pack.json" with { type: "json" };
import { validateContentPack, type PackValidationResult } from "./content-validator.ts";
import type { Activity, BuildingKey, ContentPack, Skill } from "./types.ts";

export interface LoadedPackState {
  pack: ContentPack;
  validation: PackValidationResult;
  loadedAt: string;
}

/**
 * سجل الحزم المحملة محلياً في الذاكرة
 */
const packsRegistry = new Map<string, LoadedPackState>();

/**
 * تحميل حزمة محتوى وفحصها بنيوياً وترابطياً قبل تسجيلها
 * لا تعتمد على أي طلبات شبكية خارجية (Offline-first)
 */
export function loadContentPack(raw: unknown): { success: boolean; pack?: ContentPack; validation: PackValidationResult } {
  const validation = validateContentPack(raw);

  if (!validation.valid) {
    const errorMessages = validation.errors.map((e) => `[${e.code}] ${e.message} (مسار: ${e.path ?? "غير محدد"})`).join("\n");
    console.error(`[تكة - أنبوب المحتوى] فشل تحميل الحزمة (${validation.packId}):\n${errorMessages}`);
    return { success: false, validation };
  }

  const pack = raw as ContentPack;
  packsRegistry.set(pack.id, {
    pack,
    validation,
    loadedAt: new Date().toISOString(),
  });

  return { success: true, pack, validation };
}

// تهيئة الحزمة التأسيسية الافتراضية محلياً عند استيراد الوحدة
const defaultInitialization = loadContentPack(samplePackRaw);

if (!defaultInitialization.success) {
  console.warn("[تكة] تنبيه: تعذر تحميل الحزمة التأسيسية المحايدة من الملف المحلي.");
}

/**
 * الحصول على الحزمة التأسيسية المعتمدة للواجهة
 */
export function getDefaultPack(): ContentPack {
  const loaded = packsRegistry.get("g1-foundational-sample-pack");
  if (loaded) return loaded.pack;

  // في حال وقوع خطأ طارئ، إرجاع الحزمة الأولية بأمان
  return samplePackRaw as unknown as ContentPack;
}

/**
 * استرجاع كافة الحزم المسجلة فعلياً
 */
export function getAllRegisteredPacks(): ContentPack[] {
  return Array.from(packsRegistry.values()).map((state) => state.pack);
}

export const loadAllPacks = getAllRegisteredPacks;

/**
 * استرجاع كافة المهارات المحملة من الحزم المسجلة
 */
export function getLoadedSkills(): Skill[] {
  const defaultPack = getDefaultPack();
  return defaultPack.skills ?? [];
}

/**
 * استرجاع كافة الأنشطة المحملة من الحزم المسجلة
 */
export function getLoadedActivities(): Activity[] {
  const defaultPack = getDefaultPack();
  return defaultPack.activities ?? [];
}

/**
 * البحث عن نشاط بمعرفه النصي أو UUID
 */
export function getLoadedActivityById(idOrUuid: string): Activity | undefined {
  const activities = getLoadedActivities();
  return activities.find((a) => a.id === idOrUuid || a.activityId === idOrUuid);
}

/**
 * البحث عن مهارة بمعرفها
 */
export function getLoadedSkillById(skillId: string): Skill | undefined {
  const skills = getLoadedSkills();
  return skills.find((s) => s.id === skillId);
}

/**
 * استرجاع أنشطة مبنى معين
 */
export function getLoadedActivitiesForBuilding(buildingKey: BuildingKey): Activity[] {
  const activities = getLoadedActivities();
  return activities.filter((a) => a.buildingKey === buildingKey || a.building === buildingKey);
}
