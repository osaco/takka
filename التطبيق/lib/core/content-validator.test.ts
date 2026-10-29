import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validateContentPack } from "./content-validator.ts";
import { loadContentPack, getLoadedActivities, getLoadedSkills, getLoadedActivityById } from "./content-loader.ts";

const samplePackPath = path.resolve(process.cwd(), "content/packs/g1-foundational-sample-pack.json");
const samplePackRaw = JSON.parse(fs.readFileSync(samplePackPath, "utf-8"));

test("المحطات الثلاث في حزمة العينة المحايدة تجتاز التدقيق البنيوي والترابطي بنجاح", () => {
  const result = validateContentPack(samplePackRaw);

  assert.equal(result.valid, true, "يجب أن تكون الحزمة صالحة");
  assert.equal(result.errors.length, 0, "يجب ألا تحتوي الحزمة الصالحة على أخطاء");
  assert.equal(result.stats.skillsCount, 3, "يجب أن تحتوي الحزمة على 3 مهارات");
  assert.equal(result.stats.activitiesCount, 3, "يجب أن تحتوي الحزمة على 3 أنشطة");
  assert.equal(result.stats.questionsCount, 6, "يجب أن تحتوي الحزمة على 6 أسئلة");
  assert.equal(result.humanReviewStatus.status, "unreviewed_neutral_sample");
  assert.equal(result.humanReviewStatus.needsHumanReview, true, "نجاح الفحص البنيوي لا يلغي الحاجة لمراجعة بشرية");
  assert.equal(result.warnings.length, 1, "يجب وجود تحذير واضح بأنها عينة أولية غير مراجعة بشرياً");
});

test("المدقق يرفض سلاسل JSON غير الصالحة بنيوياً", () => {
  const result = validateContentPack("{ id: 'broken', not_json: ");

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "invalid_json"));
});

test("المدقق يرفض الحزم التي تنقصها حقول إلزامية", () => {
  const brokenPack = {
    id: "incomplete-pack",
    version: "1.0.0",
    grade: 1,
    // missing title, description, reviewStatus, skills, activities, etc.
  };

  const result = validateContentPack(brokenPack);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("المدقق يرفض تكرار معرف المهارة (Duplicate Skill ID)", () => {
  const duplicateSkillPack = JSON.parse(JSON.stringify(samplePackRaw));
  // نسخ أول مهارة بنفس الـ ID
  duplicateSkillPack.skills.push({ ...duplicateSkillPack.skills[0], title: "مهارة مكررة" });

  const result = validateContentPack(duplicateSkillPack);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "duplicate_skill_id"));
});

test("المدقق يرفض تكرار معرف النشاط النصي أو UUID", () => {
  const duplicateActivityPack = JSON.parse(JSON.stringify(samplePackRaw));
  // نسخ أول نشاط بنفس المعرف
  duplicateActivityPack.activities.push({
    ...duplicateActivityPack.activities[0],
    id: "starter-letter-b", // مكرر
    activityId: "40000000-0000-4000-8000-000000000009",
  });

  const result = validateContentPack(duplicateActivityPack);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "duplicate_activity_id"));

  const duplicateUuidPack = JSON.parse(JSON.stringify(samplePackRaw));
  duplicateUuidPack.activities.push({
    ...duplicateUuidPack.activities[0],
    id: "different-id",
    activityId: "40000000-0000-4000-8000-000000000001", // مكرر
  });

  const resultUuid = validateContentPack(duplicateUuidPack);
  assert.equal(resultUuid.valid, false);
  assert.ok(resultUuid.errors.some((e) => e.code === "duplicate_activity_uuid"));
});

test("المدقق يرفض النشاط الذي يشير إلى مهارة غير موجودة", () => {
  const missingSkillPack = JSON.parse(JSON.stringify(samplePackRaw));
  // معرف UUID صالح شكلياً ولكنه غير موجود ضمن مهارات الحزمة
  missingSkillPack.activities[0].skillId = "90000000-0000-4000-8000-000000000999";

  const result = validateContentPack(missingSkillPack);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "missing_skill_reference"));
});

test("المدقق يرفض المهارة التي تشير إلى متطلب سابق غير موجود", () => {
  const missingPrereqPack = JSON.parse(JSON.stringify(samplePackRaw));
  missingPrereqPack.skills[0].prerequisites = ["00000000-0000-0000-0000-000000000888"];

  const result = validateContentPack(missingPrereqPack);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "missing_prerequisite_reference"));
});

test("المدقق يرفض السؤال عندما لا تكون الإجابة ضمن الخيارات", () => {
  const wrongAnswerPack = JSON.parse(JSON.stringify(samplePackRaw));
  // الإجابة "ج" غير موجودة في الخيارات ["ب", "ت", "ث"]
  wrongAnswerPack.activities[0].questions[0].answer = "ج";

  const result = validateContentPack(wrongAnswerPack);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "answer_not_in_choices"));
});

test("المدقق يرفض foundational_neutral إذا خلا من ملاحظة توضح طبيعته المحايدة", () => {
  const missingNotePack = JSON.parse(JSON.stringify(samplePackRaw));
  missingNotePack.skills[0].sourceRef.note = "";

  const result = validateContentPack(missingNotePack);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "missing_neutral_note"));
});

test("المدقق يرفض النشاط الخالي من الأسئلة", () => {
  const emptyQuestionsPack = JSON.parse(JSON.stringify(samplePackRaw));
  emptyQuestionsPack.activities[0].questions = [];

  const result = validateContentPack(emptyQuestionsPack);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code.startsWith("schema_")));
});

test("حالة المراجعة البشرية لا ترقى تلقائياً إلى معتمدة بنجاح التدقيق البنيوي", () => {
  const neutralPack = JSON.parse(JSON.stringify(samplePackRaw));
  neutralPack.reviewStatus = "unreviewed_neutral_sample";

  const result = validateContentPack(neutralPack);
  assert.equal(result.valid, true);
  assert.equal(result.humanReviewStatus.needsHumanReview, true);
  assert.notEqual(result.humanReviewStatus.status, "pedagogical_reviewed");
});

test("المحمل يتعامل مع الحزم غير الصالحة بأمان دون تعطيل التطبيق", () => {
  const invalidPack = { id: "bad-pack" };
  const loadResult = loadContentPack(invalidPack);

  assert.equal(loadResult.success, false);
  assert.equal(loadResult.validation.valid, false);

  // التأكد من أن الدوال المسترجعة للبيانات الأساسية لا زالت تعمل وتعيد بيانات الحزمة الافتراضية
  const skills = getLoadedSkills();
  const activities = getLoadedActivities();
  assert.equal(skills.length, 3);
  assert.equal(activities.length, 3);

  const letterB = getLoadedActivityById("starter-letter-b");
  assert.ok(letterB);
  assert.equal(letterB?.buildingKey, "letters");
});
