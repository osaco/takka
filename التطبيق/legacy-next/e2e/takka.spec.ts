import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("a visitor completes the three sample stations and keeps the island locally", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /دخول ولي الأمر/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /حساب ولي الأمر/ })).toHaveCount(0);
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/");
  await page.getByRole("button", { name: /جرّب الجزيرة/ }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByText("بدون اتصال")).toBeVisible();
  const previewSession = await page.evaluate(() => JSON.parse(localStorage.getItem("takka.preview-session.v1") ?? "null"));
  expect(Object.keys(previewSession).sort()).toEqual(["audio_enabled", "id"]);
  await expect(page.getByTestId("child-setup")).toHaveCount(0);

  await answerLesson(page, "letters", ["ب", "باب"]);
  await expect(page.getByRole("dialog")).toContainText("أضفت شيئاً جميلاً");
  await page.getByRole("button", { name: /أرجع إلى جزيرتي/ }).click();

  await answerLesson(page, "numbers", ["٤", "★ ★ ★ ★"]);
  await page.getByRole("button", { name: /أرجع إلى جزيرتي/ }).click();

  await answerLesson(page, "stories", ["وجدت بذرة", "سقتها"]);
  await expect(page.getByRole("dialog")).toContainText("صندوق محطاتك الثلاث");
  await expect(page.getByRole("dialog")).toContainText("فانوس البحر");
  await page.getByRole("button", { name: /أرجع إلى جزيرتي/ }).click();

  await expect(page.locator(".resource-row")).toContainText("15");
  await expect(page.locator(".resource-row")).toContainText("6 ألواح");
  await page.getByRole("button", { name: /المهمات/ }).click();
  await expect(page.getByTestId("missions-view")).toContainText("3 من 3");
  await page.getByRole("button", { name: "باب وبيت", exact: true }).click();
  await expect(page.getByText("لاحظت النمط الصوتي بنفسك.")).toBeVisible();
  await page.getByRole("button", { name: /الجزيرة/ }).click();
  await page.getByRole("combobox", { name: "موقع رقعة زهور" }).selectOption("garden");
  await expect(page.locator('[data-island-item="flower-patch"]')).toHaveAttribute("data-position", "garden");
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.getByTestId("island-view")).toBeVisible();
  await expect(page.locator(".resource-row")).toContainText("6 ألواح");
  await expect(page.getByRole("combobox", { name: "موقع رقعة زهور" })).toHaveValue("garden");
});

test("the island and navigation fit a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /جرّب الجزيرة/ }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole("navigation", { name: "التنقل الرئيسي" })).toBeVisible();
});

test("a visitor can resume a station after opening another station", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /جرّب الجزيرة/ }).click();

  await page.getByTestId("building-letters").click();
  await page.getByRole("button", { name: "ب", exact: true }).click();
  await page.getByRole("button", { name: "المثال التالي" }).click();
  await page.getByRole("button", { name: "الخروج من النشاط" }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByTestId("building-numbers").click();
  await page.getByRole("button", { name: "٤", exact: true }).click();
  await page.getByRole("button", { name: "المثال التالي" }).click();
  await page.getByRole("button", { name: "الخروج من النشاط" }).click();
  await expect(page.getByTestId("island-view")).toBeVisible();

  await page.getByTestId("building-letters").click();
  await expect(page.getByText("2 / 2")).toBeVisible();
});

test("a visitor can download a local-only island backup", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /جرّب الجزيرة/ }).click();
  await page.getByRole("button", { name: "الإعدادات" }).click();
  await expect(page.getByTestId("settings-view")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "تنزيل نسخة" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^takka-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  const backup = JSON.parse(await readFile(path!, "utf8")) as { format: string; version: number; account: unknown; children: unknown[]; this_device: { preview_progress: { completedLessonIds: string[] } } };
  expect(backup.format).toBe("takka-family-export");
  expect(backup.version).toBe(1);
  expect(backup.account).toBeNull();
  expect(backup.children).toHaveLength(0);
  expect(backup.this_device.preview_progress.completedLessonIds).toEqual([]);
});

test("a configured parent can sign in and inspect the family area", async ({ page }) => {
  const email = process.env.TAKKA_TEST_PARENT_EMAIL;
  const password = process.env.TAKKA_TEST_PARENT_PASSWORD;
  const cloudAccountsEnabled = process.env.NEXT_PUBLIC_TAKKA_CLOUD_ACCOUNTS_ENABLED === "true";
  test.skip(!email || !password || !cloudAccountsEnabled, "Enable cloud accounts and set a test-only parent before running this optional test.");

  await page.goto("/");
  await page.getByRole("button", { name: /دخول ولي الأمر/ }).click();
  await page.getByLabel("بريد ولي الأمر").fill(email!);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.getByTestId("parent-view")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(email!)).toBeVisible();
});

async function answerLesson(page: import("@playwright/test").Page, building: string, answers: string[]) {
  await page.getByTestId(`building-${building}`).click();
  for (let index = 0; index < answers.length; index += 1) {
    await page.getByRole("button", { name: answers[index], exact: true }).click();
    await page.getByRole("button", { name: index === answers.length - 1 ? "إنهاء المحطة" : "المثال التالي" }).click();
  }
}
