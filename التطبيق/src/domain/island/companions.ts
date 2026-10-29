import type { BuildingId } from './upgrade-table';

export type CompanionId = 'fateen' | 'noura' | 'zaid' | 'badr';
export type CompanionStatus = 'locked' | 'unlocked';

export type CompanionsState = Record<CompanionId, CompanionStatus>;

export const COMPANION_NAMES_AR: Record<CompanionId, string> = {
  fateen: 'فطين',
  noura: 'نورة',
  zaid: 'زيد',
  badr: 'بدر',
};

export interface CompanionUnlockContext {
  arabicMasteredCount: number;
  mathMasteredCount: number;
  hqLevel: number;
  builtBuildings: readonly BuildingId[];
}

export function createInitialCompanionsState(): CompanionsState {
  return {
    fateen: 'unlocked', // الرفيق الافتراضي متاح دائماً
    noura: 'locked',
    zaid: 'locked',
    badr: 'locked',
  };
}

export function canUnlockCompanion(
  id: CompanionId,
  context: CompanionUnlockContext,
): boolean {
  switch (id) {
    case 'fateen':
      return true;

    case 'noura':
      // نورة: تتطلب إتقان 6 مهارات عربية وبناء بيت الحروف
      return (
        context.arabicMasteredCount >= 6 &&
        context.builtBuildings.includes('letters')
      );

    case 'zaid':
      // زيد: يتطلب إتقان 6 مهارات رياضيات وبناء بيت الأعداد
      return (
        context.mathMasteredCount >= 6 &&
        context.builtBuildings.includes('numbers')
      );

    case 'badr':
      // بدر: يتطلب بلوغ برج تكة المستوى 2 وبناء المنارة
      return (
        context.hqLevel >= 2 &&
        context.builtBuildings.includes('lighthouse')
      );

    default:
      return false;
  }
}

/**
 * محاولة فتح رفيق تعليمي.
 * دالة نقية غير مكررة (Idempotent): إذا كان الرفيق مفتوحاً مسبقاً، تُعاد الحالة كما هي.
 * إذا تحققت الشروط، يُفتح الرفيق ذرياً.
 */
export function tryUnlockCompanion(
  state: CompanionsState,
  id: CompanionId,
  context: CompanionUnlockContext,
): CompanionsState {
  if (state[id] === 'unlocked') {
    return state;
  }

  if (canUnlockCompanion(id, context)) {
    return {
      ...state,
      [id]: 'unlocked',
    };
  }

  return state;
}
