import { expect, test } from "@playwright/test";

test("core activity cycle, scaffolding, replay protection, and mastery verification", async ({ page }) => {
  test.setTimeout(90_000);

  // 1. Start guest session
  await page.goto("/");
  await page.getByRole("button", { name: /جرّب الجزيرة/ }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();

  // 2. Test scaffolding in letters station
  await page.getByTestId("building-letters").click();
  await expect(page.locator(".lesson-panel")).toBeVisible();

  // Request hint from Fatin
  await page.getByRole("button", { name: /تلميح من فطين/ }).click();
  await expect(page.locator(".hint-card")).toBeVisible();
  // Should show the pedagogical scaffold (model/visual cue)
  await expect(page.locator(".hint-card")).toContainText("فطين");

  // Wrong answer attempt
  await page.getByRole("button", { name: "ت", exact: true }).click();
  await expect(page.getByText("قريب! جرّب مرة ثانية")).toBeVisible();

  // Correct answer
  await page.getByRole("button", { name: "ب", exact: true }).click();
  await expect(page.getByText("أحسنت الانتباه")).toBeVisible();
  await page.getByRole("button", { name: "المثال التالي" }).click();

  // Second question: solve correctly
  await page.getByRole("button", { name: "باب", exact: true }).click();
  await page.getByRole("button", { name: "إنهاء المحطة" }).click();

  // Dialog appeared for first completion
  await expect(page.getByRole("dialog")).toContainText("أضفت شيئاً جميلاً");
  await page.getByRole("button", { name: /أرجع إلى جزيرتي/ }).click();

  // Check stars and planks
  await expect(page.locator(".resource-row")).toContainText("5");
  await expect(page.locator(".resource-row")).toContainText("1 ألواح");

  // 3. Test replay of completed station (idempotency: no double rewards)
  // Replaying from building card
  await page.getByTestId("building-letters").click();
  await expect(page.locator(".lesson-panel")).toBeVisible();

  // Answer both correctly
  await page.getByRole("button", { name: "ب", exact: true }).click();
  await page.getByRole("button", { name: "المثال التالي" }).click();
  await page.getByRole("button", { name: "باب", exact: true }).click();
  await page.getByRole("button", { name: "إنهاء المحطة" }).click();

  // Dialog must show warm review confirmation, not duplicate reward
  await expect(page.getByRole("dialog")).toContainText("مراجعة طيبة وخطوة إضافية");
  await page.getByRole("button", { name: /أرجع إلى جزيرتي/ }).click();

  // Resources must NOT be duplicated (still 5 stars and 1 plank)
  await expect(page.locator(".resource-row")).toContainText("5");
  await expect(page.locator(".resource-row")).toContainText("1 ألواح");

  // 4. Test exit mid-station records "tried" state
  await page.getByTestId("building-numbers").click();
  await page.getByRole("button", { name: "٣", exact: true }).click(); // wrong answer
  await expect(page.getByText("قريب! جرّب مرة ثانية")).toBeVisible();
  await page.getByRole("button", { name: "الخروج من النشاط" }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();

  // Verify stored progress has evidences
  const localData = await page.evaluate(() => {
    const activeId = localStorage.getItem("takka.active-child.v1");
    return JSON.parse(localStorage.getItem(`takka.progress.v1.${activeId}`) ?? "{}");
  });

  expect(localData.evidences).toBeDefined();
  expect(localData.evidences.length).toBeGreaterThanOrEqual(2);

  // Check the skill state for numbers was marked as tried
  const numberSkillId = "30000000-0000-4000-8000-000000000002";
  expect(localData.skillsProgress?.[numberSkillId]?.state).toBe("tried");

  // 5. Check building upgrade evaluation with planks
  // Currently child has 1 plank, upgrading letters requires 2 planks
  await page.getByRole("button", { name: "طوّر · 🪵2" }).first().click();
  await expect(page.getByRole("status")).toContainText("تحتاج إلى 2 ألواح");
});

test("legacy progress migration preserves data truthfully without fabricating synthetic evidence", async ({ page }) => {
  // Pre-seed legacy localStorage progress without evidences
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    const childId = "legacy-test-child";
    localStorage.setItem("takka.preview-session.v1", JSON.stringify({ id: childId, audio_enabled: true }));
    localStorage.setItem("takka.active-child.v1", childId);
    localStorage.setItem(`takka.progress.v1.${childId}`, JSON.stringify({
      version: 1,
      childId,
      childName: "ليان",
      completedLessonIds: ["starter-letter-b"],
      masteredSkillIds: [],
      assistedLessonIds: [],
      buildingLevels: { letters: 1, numbers: 0, stories: 0 },
      stars: 5,
      planks: 1,
      placedItems: ["flower-patch"],
      itemPlacements: { "flower-patch": "shore" },
      milestonesClaimed: [],
      audioEnabled: true,
      updatedAt: "2026-10-20T10:00:00.000Z",
    }));
  });

  await page.reload();
  await expect(page.getByTestId("island-view")).toBeVisible();

  // Verify completed station and resources are fully preserved
  await expect(page.locator(".resource-row")).toContainText("5");
  await expect(page.locator(".resource-row")).toContainText("1 ألواح");
  await expect(page.locator(".resource-row")).toContainText("1 محطات");

  // Verify localStorage has no fabricated evidences or synthetic mastery
  const localData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("takka.progress.v1.legacy-test-child") ?? "{}");
  });

  expect(localData.completedLessonIds).toEqual(["starter-letter-b"]);
  expect(localData.evidences).toEqual([]);
  expect(localData.masteredSkillIds).toEqual([]);
  const letterSkillId = "30000000-0000-4000-8000-000000000001";
  expect(localData.skillsProgress?.[letterSkillId]?.isMastered).toBe(false);
  expect(localData.skillsProgress?.[letterSkillId]?.independentCount).toBe(0);
});

test("starting an activity and exiting immediately without interaction records no learning", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /جرّب الجزيرة/ }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();

  // Count existing evidences
  const initialEvidenceCount = await page.evaluate(() => {
    const activeId = localStorage.getItem("takka.active-child.v1");
    const progress = JSON.parse(localStorage.getItem(`takka.progress.v1.${activeId}`) ?? "{}");
    return (progress.evidences ?? []).length;
  });

  // Open stories station and immediately exit without answering or opening hints
  await page.getByTestId("building-stories").click();
  await expect(page.locator(".lesson-panel")).toBeVisible();
  await page.getByRole("button", { name: "الخروج من النشاط" }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();

  // Evidence count must NOT have increased
  const afterExitEvidenceCount = await page.evaluate(() => {
    const activeId = localStorage.getItem("takka.active-child.v1");
    const progress = JSON.parse(localStorage.getItem(`takka.progress.v1.${activeId}`) ?? "{}");
    const storySkillId = "30000000-0000-4000-8000-000000000003";
    return {
      count: (progress.evidences ?? []).length,
      skillState: progress.skillsProgress?.[storySkillId]?.state ?? "not_reached",
    };
  });

  expect(afterExitEvidenceCount.count).toBe(initialEvidenceCount);
  expect(afterExitEvidenceCount.skillState).toBe("not_reached");
});
