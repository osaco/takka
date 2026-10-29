import { describe, expect, it } from 'vitest';
import {
  createInitialIslandState,
  upgradeIslandHq,
  createInitialEconomyState,
  grantFirstMastery,
  grantReview,
  canAfford,
  spend,
  revealedBuildings,
  createInitialCompanionsState,
  canUnlockCompanion,
  tryUnlockCompanion,
  createDefaultPlacement,
  validatePlacement,
  placeBuilding,
  getMissionLink,
  validateMissionSkillIds,
} from '@domain/island';

describe('جزيرة تكّة — منطق النطاق الخالص (Domain Isolation)', () => {
  // 1. فحص الحالة الابتدائية للجزيرة
  it('1. الحالة الابتدائية للجزيرة تبدأ بـ HQ1 وأرض 10x10', () => {
    const state = createInitialIslandState();
    expect(state.phase).toBe('single-island');
    expect(state.hqLevel).toBe(1);
    expect(state.unlockedLand).toBe(10);
  });

  // 2. فحص تسلسل ترقية برج تكة وسقف المستوى
  it('2. ترقية برج تكة تمر تسلسلياً (1 -> 2 -> 3) وتوسع الأرض عند HQ3 وترفض التجاوز', () => {
    const s1 = createInitialIslandState();

    const r2 = upgradeIslandHq(s1);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.state.hqLevel).toBe(2);
    expect(r2.state.unlockedLand).toBe(10);

    const r3 = upgradeIslandHq(r2.state);
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.state.hqLevel).toBe(3);
    expect(r3.state.unlockedLand).toBe(12);

    const r4 = upgradeIslandHq(r3.state);
    expect(r4.ok).toBe(false);
    if (!r4.ok) {
      expect(r4.error).toBe('MAX_LEVEL_REACHED');
    }
  });

  // 3. فحص الحالة الابتدائية للاقتصاد
  it('3. الحالة الابتدائية للاقتصاد تبدأ بصفر موارد وسجل مهارات فارغ', () => {
    const eco = createInitialEconomyState('2026-10-29');
    expect(eco.stars).toBe(0);
    expect(eco.wood).toBe(0);
    expect(eco.stone).toBe(0);
    expect(eco.crystal).toBe(0);
    expect(eco.masteredSkills).toEqual([]);
    expect(eco.dailyReview.count).toBe(0);
    expect(eco.dailyReview.dayKey).toBe('2026-10-29');
  });

  // 4. فحص منح مكافأة أول إتقان
  it('4. منح أول إتقان يضيف 10 نجوم و1 من كل مادة بناء ويسجل المهارة', () => {
    const s0 = createInitialEconomyState('2026-10-29');
    const s1 = grantFirstMastery(s0, 'g1.ar.letter.ra.recognize');

    expect(s1.stars).toBe(10);
    expect(s1.wood).toBe(1);
    expect(s1.stone).toBe(1);
    expect(s1.crystal).toBe(1);
    expect(s1.masteredSkills).toContain('g1.ar.letter.ra.recognize');
  });

  // 5. فحص عدم التكرار (Idempotency) في منح الإتقان
  it('5. منح إتقان نفس المهارة مرتين لا يضاعف الموارد حرفياً (Idempotent)', () => {
    const s0 = createInitialEconomyState('2026-10-29');
    const s1 = grantFirstMastery(s0, 'g1.ar.letter.ra.recognize');
    const s2 = grantFirstMastery(s1, 'g1.ar.letter.ra.recognize');

    expect(s2.stars).toBe(10);
    expect(s2.wood).toBe(1);
    expect(s2.stone).toBe(1);
    expect(s2.crystal).toBe(1);
    expect(s2.masteredSkills.length).toBe(1);
    expect(s2).toBe(s1); // تطابق مرجعي لعدم التعديل
  });

  // 6. فحص السقف اليومي للمراجعة والتصفير بتغير التاريخ
  it('6. مراجعة اليوم محكومة بسقف 6 مرات وتتصفر مع تغير التاريخ', () => {
    let s = createInitialEconomyState('2026-10-29');

    // 6 مراجعات في نفس اليوم
    for (let i = 1; i <= 6; i++) {
      s = grantReview(s, '2026-10-29');
      expect(s.dailyReview.count).toBe(i);
      expect(s.stars).toBe(i * 3);
    }

    // المحاولة السابعة في نفس اليوم تُرفض ولا تضيف نجوماً
    const sRejected = grantReview(s, '2026-10-29');
    expect(sRejected.dailyReview.count).toBe(6);
    expect(sRejected.stars).toBe(18);

    // مع تغير التاريخ إلى يوم جديد، يتصفر العداد وتبدأ من 1
    const sNewDay = grantReview(s, '2026-10-30');
    expect(sNewDay.dailyReview.count).toBe(1);
    expect(sNewDay.dailyReview.dayKey).toBe('2026-10-30');
    expect(sNewDay.stars).toBe(21); // 18 + 3
  });

  // 7. فحص الإنفاق والخصم الذري
  it('7. خصم الموارد يتم ذرياً ويرفض عند عدم الكفاية أو وجود قيم سالبة', () => {
    let s = createInitialEconomyState('2026-10-29');
    s = grantFirstMastery(s, 's1'); // 10 stars, 1 wood, 1 stone, 1 crystal
    s = grantFirstMastery(s, 's2'); // 20 stars, 2 wood, 2 stone, 2 crystal

    expect(canAfford(s, { stars: 15, wood: 1 })).toBe(true);
    expect(canAfford(s, { stars: 25 })).toBe(false);

    // إنفاق ناجح
    const resSuccess = spend(s, { stars: 15, wood: 2 });
    expect(resSuccess.ok).toBe(true);
    if (resSuccess.ok) {
      expect(resSuccess.state.stars).toBe(5);
      expect(resSuccess.state.wood).toBe(0);
      expect(resSuccess.state.stone).toBe(2);
    }

    // رفض عند نقص الموارد
    const resFail = spend(s, { crystal: 5 });
    expect(resFail.ok).toBe(false);

    // رفض القيم السالبة
    const resNegative = spend(s, { stars: -5 });
    expect(resNegative.ok).toBe(false);
  });

  // 8. فحص الكشف التدريجي للمباني
  it('8. الكشف التدريجي يكشف المجموعات المحددة عند كل مستوى برج (3 -> 6 -> 9)', () => {
    const hq1 = revealedBuildings(1);
    expect(hq1).toEqual(['hq', 'letters', 'numbers']);

    const hq2 = revealedBuildings(2);
    expect(hq2).toEqual(['hq', 'letters', 'numbers', 'stories', 'observatory', 'national']);

    const hq3 = revealedBuildings(3);
    expect(hq3.length).toBe(9);
    expect(hq3).toContain('lighthouse');
    expect(hq3).toContain('companions');
    expect(hq3).toContain('garden');
  });

  // 9. فحص شروط فتح الرفاق
  it('9. فطين متاح افتراضياً ونورة تتطلب 6 مهارات عربية وبناء بيت الحروف', () => {
    const comps = createInitialCompanionsState();
    expect(comps.fateen).toBe('unlocked');
    expect(comps.noura).toBe('locked');

    const ctxNotReady = {
      arabicMasteredCount: 5,
      mathMasteredCount: 0,
      hqLevel: 1,
      builtBuildings: ['letters'],
    } as const;

    expect(canUnlockCompanion('noura', ctxNotReady)).toBe(false);

    const ctxReady = {
      arabicMasteredCount: 6,
      mathMasteredCount: 0,
      hqLevel: 1,
      builtBuildings: ['letters'],
    } as const;

    expect(canUnlockCompanion('noura', ctxReady)).toBe(true);
    const updated = tryUnlockCompanion(comps, 'noura', ctxReady);
    expect(updated.noura).toBe('unlocked');
  });

  // 10. فحص عدم تكرار فتح الرفاق
  it('10. محاولة فتح رفيق مفتوح مسبقاً لا تغير الحالة (Idempotent)', () => {
    const comps = createInitialCompanionsState();
    const ctx = {
      arabicMasteredCount: 10,
      mathMasteredCount: 10,
      hqLevel: 2,
      builtBuildings: ['letters', 'numbers'],
    } as const;

    const res = tryUnlockCompanion(comps, 'fateen', ctx);
    expect(res).toBe(comps); // تطابق مرجعي
  });

  // 11. فحص مواضع المباني والتصادمات
  it('11. التوزيع الافتراضي صالح بدون تصادمات ونقل مبنى يمنع التداخل والخروج عن الحدود', () => {
    const def = createDefaultPlacement();
    const val = validatePlacement(def, 10);
    expect(val.valid).toBe(true);
    expect(val.errors).toEqual([]);

    // محاولة نقل لموضع خارج الحدود
    const outRes = placeBuilding(def, 'letters', 11, 11, 10);
    expect(outRes.ok).toBe(false);

    // محاولة نقل لموضع مشغول ببرج تكة (5, 5)
    const collisionRes = placeBuilding(def, 'letters', 5, 5, 10);
    expect(collisionRes.ok).toBe(false);

    // نقل سليم إلى موضع فارغ
    const validMove = placeBuilding(def, 'letters', 2, 2, 10);
    expect(validMove.ok).toBe(true);
    if (validMove.ok) {
      const moved = validMove.state.buildings.find((b) => b.buildingId === 'letters');
      expect(moved?.x).toBe(2);
      expect(moved?.y).toBe(2);
    }
  });

  // 12. فحص استقامة ربط المبنى بالحزم والمهارات
  it('12. ربط المباني بالحزم يكشف المهارات الصالحة ويحدد أي مهارة غير معتمدة بدقة', () => {
    const lettersLink = getMissionLink('letters');
    expect(lettersLink?.packId).toBe('g1-ar-v1.0');

    const numbersLink = getMissionLink('numbers');
    expect(numbersLink?.packId).toBe('g1-math-v1.0');

    const availableSkills = ['s1', 's2', 's3'];
    const validCheck = validateMissionSkillIds(['s1', 's2'], availableSkills);
    expect(validCheck.valid).toBe(true);
    expect(validCheck.missingSkillIds).toEqual([]);

    const invalidCheck = validateMissionSkillIds(['s1', 's_fake'], availableSkills);
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.missingSkillIds).toEqual(['s_fake']);
  });
});
