import type { BuildingId } from './upgrade-table';

export interface BuildingMissionLink {
  buildingId: BuildingId;
  packId: string;
  subject: string;
}

export const BUILDING_PACK_MAPPINGS: Partial<Record<BuildingId, BuildingMissionLink>> = {
  letters: {
    buildingId: 'letters',
    packId: 'g1-ar-v1.0',
    subject: 'arabic',
  },
  numbers: {
    buildingId: 'numbers',
    packId: 'g1-math-v1.0',
    subject: 'math',
  },
  stories: {
    buildingId: 'stories',
    packId: 'g1-ar-v1.0',
    subject: 'arabic',
  },
  observatory: {
    buildingId: 'observatory',
    packId: 'g1-math-v1.0',
    subject: 'math',
  },
  national: {
    buildingId: 'national',
    packId: 'g1-ar-v1.0',
    subject: 'civic',
  },
};

export function getMissionLink(buildingId: BuildingId): BuildingMissionLink | null {
  return BUILDING_PACK_MAPPINGS[buildingId] ?? null;
}

export interface SkillValidationResult {
  valid: boolean;
  missingSkillIds: string[];
}

/**
 * التحقق الصارم من أن مهارات المهمة موجودة بالفعل في الحزمة المعتمدة.
 * يمنع الإشارة إلى أي مهارة وهمية أو غير معتمدة.
 */
export function validateMissionSkillIds(
  targetSkillIds: string[],
  availablePackSkillIds: string[],
): SkillValidationResult {
  const availableSet = new Set(availablePackSkillIds);
  const missingSkillIds = targetSkillIds.filter((id) => !availableSet.has(id));

  return {
    valid: missingSkillIds.length === 0,
    missingSkillIds,
  };
}

/* ------------------------------------------------------------------ *
 * أهداف المهمة — المصدر الوحيد لمهارات الجلسة (الخطوة 3)
 * ------------------------------------------------------------------ */

/** حزمة معتمدة كما تصل من المحمّل: معرّفها ومهاراتها الفعلية فقط. */
export interface PackSkillSource {
  readonly packId: string;
  readonly skillIds: readonly string[];
}

export interface MissionTargets {
  readonly buildingId: BuildingId;
  readonly packId: string;
  readonly skillIds: string[];
}

export type MissionLinkErrorCode =
  | 'NO_MISSION_LINK'
  | 'PACK_NOT_LOADED'
  | 'UNKNOWN_SKILL_IDS';

export type MissionResolution =
  | { ok: true; targets: MissionTargets }
  | { ok: false; code: MissionLinkErrorCode; unknownSkillIds: string[] };

/**
 * تضييق اختياري لمهارات مهمة مبنى بعينه.
 * فارغ = كل مهارات الحزمة المعتمدة، وهو الافتراضي الآمن.
 * أي معرّف هنا غير موجود في الحزمة يُرفض صراحةً.
 */
export const BUILDING_MISSION_SKILLS: Readonly<Partial<Record<BuildingId, readonly string[]>>> =
  Object.freeze({});

/**
 * حل أهداف مهمة مبنى من الحزم المعتمدة — دالة نقية بلا بيئة ولا سجلات.
 * لا تُعيد أبداً مهارة غير موجودة في حزمة معتمدة.
 */
export function resolveMissionTargets(
  buildingId: BuildingId,
  packs: readonly PackSkillSource[],
  declaredSkillIds: Readonly<Partial<Record<BuildingId, readonly string[]>>> = BUILDING_MISSION_SKILLS,
): MissionResolution {
  const link = getMissionLink(buildingId);
  if (!link) {
    return { ok: false, code: 'NO_MISSION_LINK', unknownSkillIds: [] };
  }

  const pack = packs.find((candidate) => candidate.packId === link.packId);
  if (!pack) {
    return { ok: false, code: 'PACK_NOT_LOADED', unknownSkillIds: [] };
  }

  const declared = declaredSkillIds[buildingId];
  const requested = declared && declared.length > 0 ? declared : pack.skillIds;
  const targetSkillIds = [...new Set(requested)];

  const validation = validateMissionSkillIds(targetSkillIds, [...pack.skillIds]);
  if (!validation.valid) {
    return {
      ok: false,
      code: 'UNKNOWN_SKILL_IDS',
      unknownSkillIds: validation.missingSkillIds,
    };
  }

  return {
    ok: true,
    targets: { buildingId, packId: link.packId, skillIds: targetSkillIds },
  };
}

export class MissionLinkViolation extends Error {
  readonly code: MissionLinkErrorCode;
  readonly buildingId: BuildingId;
  readonly unknownSkillIds: readonly string[];

  constructor(code: MissionLinkErrorCode, buildingId: BuildingId, unknownSkillIds: readonly string[]) {
    super(`MISSION_LINK_${code}: ${buildingId}`);
    this.name = 'MissionLinkViolation';
    this.code = code;
    this.buildingId = buildingId;
    this.unknownSkillIds = unknownSkillIds;
  }
}

export type MissionLinkMode = 'strict' | 'warn';

/**
 * تطبيق سياسة الفشل: خطأ صريح في الإنتاج، تحذير في التطوير.
 * القرار البيئي يبقى خارج النطاق — تُمرَّر السياسة صراحةً من طبقة التشغيل.
 */
export function enforceMissionTargets(
  buildingId: BuildingId,
  resolution: MissionResolution,
  mode: MissionLinkMode,
  warn: (message: string) => void = () => {},
): MissionTargets | null {
  if (resolution.ok) return resolution.targets;

  if (mode === 'strict') {
    throw new MissionLinkViolation(resolution.code, buildingId, resolution.unknownSkillIds);
  }

  const detail =
    resolution.unknownSkillIds.length > 0 ? `: ${resolution.unknownSkillIds.join(',')}` : '';
  warn(`MISSION_LINK_${resolution.code}: ${buildingId}${detail}`);
  return null;
}
