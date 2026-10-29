import { expect, test } from "@playwright/test";
import { validateContentPack } from "../lib/core/content-validator.ts";
import samplePackRaw from "../content/packs/g1-foundational-sample-pack.json" with { type: "json" };

test("أنبوب المحتوى P2: عرض المحطات الثلاث التجريبية من الحزمة المحايدة وسلامة معرّف الجلسة والأدلة", async ({ page }) => {
  // 1. الدخول كضيف
  await page.goto("/");
  await page.getByRole("button", { name: /جرّب الجزيرة/ }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();

  // 2. التحقق من توفر المباني الثلاثة المطابقة للحزمة التأسيسية
  await expect(page.getByTestId("building-letters")).toBeVisible();
  await expect(page.getByTestId("building-numbers")).toBeVisible();
  await expect(page.getByTestId("building-stories")).toBeVisible();

  // 3. التحقق من معرّف الجلسة: غير مشتق من تاريخ اليوم، وثابت عند تحديث الصفحة
  const sessionInfo = await page.evaluate(() => {
    const activeChildId = localStorage.getItem("takka.active-child.v1");
    const sessionKey = `takka.active-session.${activeChildId}`;
    const sid = sessionStorage.getItem(sessionKey);
    return { activeChildId, sid };
  });

  expect(sessionInfo.sid).toBeTruthy();
  // يجب ألا يكون مجرد تاريخ اليوم مثل session-2026-10-29
  const todayStr = new Date().toISOString().slice(0, 10);
  expect(sessionInfo.sid).not.toBe(`session-${todayStr}`);
  expect(sessionInfo.sid).toContain(sessionInfo.activeChildId);

  // إعادة تحميل الصفحة داخل نفس التبويب
  await page.reload();
  await expect(page.getByTestId("island-view")).toBeVisible();

  const sessionAfterReload = await page.evaluate(() => {
    const activeChildId = localStorage.getItem("takka.active-child.v1");
    const sessionKey = `takka.active-session.${activeChildId}`;
    return sessionStorage.getItem(sessionKey);
  });

  // ثبات معرّف الجلسة بعد تحديث الصفحة داخل نفس جلسة الاستخدام
  expect(sessionAfterReload).toBe(sessionInfo.sid);

  // 4. الانتقال إلى شاشة المهمات والتأكد من عرض المحطات الثلاث من بيانات الحزمة
  await page.getByRole("button", { name: "المهمات" }).click();
  await expect(page.getByTestId("missions-view")).toBeVisible();

  // التحقق من وجود المهمات الثلاث من مصدر الحزمة الموحد
  await expect(page.getByText("اكتشاف صوت الحرف")).toBeVisible();
  await expect(page.getByText("عدّ الأشياء")).toBeVisible();
  await expect(page.getByText("رتّب أحداث الحكاية")).toBeVisible();

  // 5. حل محطة والتأكد من تسجيل دليل التعلم بمعرّف الجلسة الفعلي
  await page.getByRole("button", { name: "الجزيرة" }).click();
  await page.getByTestId("building-letters").click();
  await expect(page.locator(".lesson-panel")).toBeVisible();

  // إجابة السؤالين في محطة الحروف
  await page.getByRole("button", { name: "ب", exact: true }).click();
  await page.getByRole("button", { name: "المثال التالي" }).click();
  await page.getByRole("button", { name: "باب", exact: true }).click();
  await page.getByRole("button", { name: "إنهاء المحطة" }).click();
  await page.getByRole("button", { name: /أرجع إلى جزيرتي/ }).click();

  // فحص سجل الأدلة في التخزين المحلي
  const evidenceSessionId = await page.evaluate(() => {
    const activeChildId = localStorage.getItem("takka.active-child.v1");
    const progress = JSON.parse(localStorage.getItem(`takka.progress.v1.${activeChildId}`) ?? "{}");
    const lastEvidence = progress.evidences?.[progress.evidences.length - 1];
    return lastEvidence?.sessionId;
  });

  expect(evidenceSessionId).toBe(sessionInfo.sid);
  expect(evidenceSessionId).not.toBe(`session-${todayStr}`);

  // 6. التحقق من المدقق البنيوي للحزمة الأساسية
  const validation = validateContentPack(samplePackRaw);
  expect(validation.valid).toBe(true);
  expect(validation.errors).toHaveLength(0);
  expect(validation.stats.skillsCount).toBe(3);
  expect(validation.stats.activitiesCount).toBe(3);
  expect(validation.humanReviewStatus.needsHumanReview).toBe(true);
});
