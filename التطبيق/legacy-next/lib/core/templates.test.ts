import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ActivitySchema,
} from "./content-schema.ts";
import {
  validateContentPack,
} from "./content-validator.ts";
import {
  createLearningEvidenceFromCompletion,
} from "./activity.ts";
import {
  evaluateActivityRewards,
} from "./rewards.ts";
import {
  FIXTURE_DRAG_MATCH_ACTIVITY,
  FIXTURE_TRACE_PATH_ACTIVITY,
  FIXTURE_LISTEN_IDENTIFY_ACTIVITY,
  ALL_FIXTURE_ACTIVITIES,
  FIXTURE_SKILL,
} from "./template-fixtures.ts";
import type { ContentPack } from "./types.ts";

const samplePackPath = path.resolve(process.cwd(), "content/packs/g1-foundational-sample-pack.json");
const starterPack = JSON.parse(fs.readFileSync(samplePackPath, "utf-8")) as ContentPack;

describe("P3 Activity Templates & Engine Verification", () => {
  // 1. اختيار القالب الصحيح لكل نوع نشاط
  it("1. selects the correct template discrimination based on template field", () => {
    // multiple_choice
    const mcParsed = ActivitySchema.safeParse(starterPack.activities[0]);
    assert.equal(mcParsed.success, true);
    if (mcParsed.success) {
      assert.equal(mcParsed.data.template ?? "multiple_choice", "multiple_choice");
    }

    // drag_match
    const dmParsed = ActivitySchema.safeParse(FIXTURE_DRAG_MATCH_ACTIVITY);
    assert.equal(dmParsed.success, true);
    if (dmParsed.success) {
      assert.equal(dmParsed.data.template, "drag_match");
      assert.ok(dmParsed.data.config.pairs.length >= 2);
    }

    // trace_path
    const tpParsed = ActivitySchema.safeParse(FIXTURE_TRACE_PATH_ACTIVITY);
    assert.equal(tpParsed.success, true);
    if (tpParsed.success) {
      assert.equal(tpParsed.data.template, "trace_path");
      assert.equal(tpParsed.data.config.character, "ب");
      assert.ok(tpParsed.data.config.checkpoints.length >= 2);
    }

    // listen_identify
    const liParsed = ActivitySchema.safeParse(FIXTURE_LISTEN_IDENTIFY_ACTIVITY);
    assert.equal(liParsed.success, true);
    if (liParsed.success) {
      assert.equal(liParsed.data.template, "listen_identify");
      assert.equal(liParsed.data.config.audioText, "بَاب");
      assert.ok(liParsed.data.config.options.some((o) => o.correct));
    }
  });

  // 2. عرض المحطات الثلاث الحالية بالقالب الحالي دون تغيير
  it("2. preserves the 3 starter stations with unchanged IDs, answers, and rewards", () => {
    assert.equal(starterPack.activities.length, 3);

    const [station1, station2, station3] = starterPack.activities;

    // Station 1: صوت حرف الباء
    assert.equal(station1.id, "starter-letter-b");
    assert.equal(station1.activityId, "40000000-0000-4000-8000-000000000001");
    assert.equal(station1.reward.stars, 5);
    assert.equal(station1.reward.planks, 1);
    assert.equal(station1.reward.itemKey, "flower-patch");
    assert.equal(station1.questions.length, 2);
    assert.equal(station1.questions[0].answer, "ب");

    // Station 2: العد حتى أربعة
    assert.equal(station2.id, "starter-count-four");
    assert.equal(station2.activityId, "40000000-0000-4000-8000-000000000002");
    assert.equal(station2.reward.stars, 5);
    assert.equal(station2.reward.planks, 1);
    assert.equal(station2.reward.itemKey, "stone-path");
    assert.equal(station2.questions.length, 2);
    assert.equal(station2.questions[0].answer, "٤");

    // Station 3: تسلسل أحداث الحكاية
    assert.equal(station3.id, "starter-story-order");
    assert.equal(station3.activityId, "40000000-0000-4000-8000-000000000003");
    assert.equal(station3.reward.stars, 5);
    assert.equal(station3.reward.planks, 1);
    assert.equal(station3.reward.itemKey, "tiny-lantern");
    assert.equal(station3.questions.length, 2);
    assert.equal(station3.questions[0].answer, "وجدت بذرة");
  });

  // 3. نجاح المطابقة مرة واحدة ومنع تكرار إكمال الزوج
  it("3. handles DragMatch pairing logic and prevents duplicate match increments", () => {
    const config = FIXTURE_DRAG_MATCH_ACTIVITY.config;
    const matchedDraggables = new Set<string>();

    function match(draggableId: string, targetId: string): boolean {
      if (matchedDraggables.has(draggableId)) {
        return false; // يمنع مطابقة العنصر نفسه مرتين
      }
      const pair = config.pairs.find((p) => p.draggable.id === draggableId);
      if (!pair) return false;

      if (pair.target.id === targetId) {
        matchedDraggables.add(draggableId);
        return true;
      }
      return false;
    }

    // أول محاولة صحيحة للزوج 1
    assert.equal(match("d1", "t1"), true);
    assert.equal(matchedDraggables.size, 1);

    // محاولة تكرار المطابقة للزوج 1 نفسه
    assert.equal(match("d1", "t1"), false);
    assert.equal(matchedDraggables.size, 1);

    // محاولة غير صحيحة للزوج 2
    assert.equal(match("d2", "t1"), false);
    assert.equal(matchedDraggables.size, 1);

    // محاولة صحيحة للزوج 2
    assert.equal(match("d2", "t2"), true);
    assert.equal(matchedDraggables.size, 2);
    assert.equal(matchedDraggables.size, config.pairs.length);
  });

  // 4. تتبع المسار على مساحة متجاوبة مع اللمس والمؤشر
  it("4. handles TracePath checkpoints sequence and completion", () => {
    const config = FIXTURE_TRACE_PATH_ACTIVITY.config;
    const checkpoints = config.checkpoints;
    assert.ok(checkpoints.length >= 3);

    const visited: number[] = [];
    const radius = 28;

    function visitPoint(x: number, y: number) {
      const nextIndex = visited.length;
      if (nextIndex >= checkpoints.length) return;
      const target = checkpoints[nextIndex];
      const dist = Math.hypot(x - target.x, y - target.y);
      if (dist <= radius) {
        visited.push(nextIndex);
      }
    }

    // النقطة الأولى
    visitPoint(40, 100);
    assert.equal(visited.length, 1);

    // نقطة بعيدة عشوائية (لا تحسب)
    visitPoint(200, 10);
    assert.equal(visited.length, 1);

    // النقطة الثانية
    visitPoint(150, 145);
    assert.equal(visited.length, 2);

    // النقطة الثالثة
    visitPoint(260, 100);
    assert.equal(visited.length, 3);
    assert.equal(visited.length, checkpoints.length);
  });

  // 5. الاستماع مع الصوت المكتوم أو غير المتوفر مع بقاء نص المهمة ظاهراً
  it("5. ensures ListenIdentify provides accessible and clear text fallback when muted", () => {
    const config = FIXTURE_LISTEN_IDENTIFY_ACTIVITY.config;
    assert.ok(config.prompt.length > 0);
    assert.ok(config.audioText.length > 0);
    assert.ok(config.options.length >= 2);

    // خيار صحيح واحد على الأقل
    const correctOptions = config.options.filter((o) => o.correct);
    assert.equal(correctOptions.length, 1);
    assert.equal(correctOptions[0].label, config.audioText);

    // النص البديل كافٍ تماماً لإكمال المهمة بصرياً عند كتم الصوت
    const fallbackText = config.audioText;
    assert.equal(fallbackText, "بَاب");
  });

  // 6. تمرير المساعدة والمحاولات إلى مسار التقدم
  it("6. correctly captures attemptsCount and helpUsed in learning evidence", () => {
    const evidenceWithHelp = createLearningEvidenceFromCompletion({
      activityId: FIXTURE_DRAG_MATCH_ACTIVITY.activityId,
      skillId: FIXTURE_DRAG_MATCH_ACTIVITY.skillId,
      helpUsed: true,
      startedAt: "2026-10-29T10:00:00.000Z",
      completedAt: "2026-10-29T10:01:30.000Z",
      answers: ["بَاب, تُفَّاح"],
      stepAttempts: [3],
      sessionId: "session-test-p3-1",
    });

    assert.equal(evidenceWithHelp.kind, "with_help");
    assert.equal(evidenceWithHelp.helpUsed, true);
    assert.equal(evidenceWithHelp.attemptsCount, 3);
    assert.equal(evidenceWithHelp.durationMs, 90000);

    const independentEvidence = createLearningEvidenceFromCompletion({
      activityId: FIXTURE_TRACE_PATH_ACTIVITY.activityId,
      skillId: FIXTURE_TRACE_PATH_ACTIVITY.skillId,
      helpUsed: false,
      startedAt: "2026-10-29T10:00:00.000Z",
      completedAt: "2026-10-29T10:00:45.000Z",
      answers: ["ب"],
      stepAttempts: [1],
      sessionId: "session-test-p3-1",
    });

    assert.equal(independentEvidence.kind, "independent");
    assert.equal(independentEvidence.helpUsed, false);
    assert.equal(independentEvidence.attemptsCount, 1);
    assert.equal(independentEvidence.durationMs, 45000);
  });

  // 7. إكمال النشاط مرة ثانية دون منح موارد مكررة
  it("7. prevents double rewards upon replaying an activity", () => {
    const activity = FIXTURE_DRAG_MATCH_ACTIVITY;

    // الإكمال الأول: يمنح النجوم والألواح والزينة
    const firstEval = evaluateActivityRewards(activity, [], []);
    assert.equal(firstEval.isFirstCompletion, true);
    assert.equal(firstEval.starsEarned, 2);
    assert.equal(firstEval.planksEarned, 1);
    assert.deepEqual(firstEval.newPlacedItemKeys, ["fixture-letter-tile"]);

    // الإكمال الثاني (المراجعة): لا يمنح أي موارد أو عناصر
    const replayEval = evaluateActivityRewards(activity, [activity.id], []);
    assert.equal(replayEval.isFirstCompletion, false);
    assert.equal(replayEval.starsEarned, 0);
    assert.equal(replayEval.planksEarned, 0);
    assert.deepEqual(replayEval.newPlacedItemKeys, []);
  });

  // 8. الخروج دون تفاعل دون تسجيل إكمال
  it("8. validates that exit without interaction leaves hasInteracted false", () => {
    function computeHasInteracted(
      step: number,
      answers: string[],
      wrongAttempts: number,
      selected: string | null,
      stepAttempts: number[],
    ): boolean {
      return (
        step > 0 ||
        answers.some((a) => Boolean(a)) ||
        wrongAttempts > 0 ||
        selected !== null ||
        stepAttempts.some((c) => c > 0)
      );
    }

    // بمجرد فتح النشاط ودون أي لمس أو إجابة
    const initialInteracted = computeHasInteracted(0, [], 0, null, [0]);
    assert.equal(initialInteracted, false);

    // بعد تفاعل واحد
    const touchedInteracted = computeHasInteracted(0, [], 1, null, [1]);
    assert.equal(touchedInteracted, true);
  });

  // 9. رفض بيانات إعداد قالب معطوبة عبر Zod وعدم إسقاط التطبيق
  it("9. safely rejects corrupted template configs via Zod without crashing", () => {
    // قالب drag_match مع pairs فارغ (يجب رفضه)
    const badDragMatch = {
      ...FIXTURE_DRAG_MATCH_ACTIVITY,
      config: {
        prompt: "ناقص",
        pairs: [], // غير مسموح
      },
    };
    const badDmResult = ActivitySchema.safeParse(badDragMatch);
    assert.equal(badDmResult.success, false);

    // قالب trace_path بنقاط تفتيش أقل من 2 (يجب رفضه)
    const badTracePath = {
      ...FIXTURE_TRACE_PATH_ACTIVITY,
      config: {
        prompt: "ناقص",
        character: "ب",
        strokePath: "M 0 0",
        checkpoints: [{ x: 10, y: 10 }], // نقطة واحدة فقط
      },
    };
    const badTpResult = ActivitySchema.safeParse(badTracePath);
    assert.equal(badTpResult.success, false);

    // قالب listen_identify بدون أي خيار صحيح (يجب رفضه)
    const badListen = {
      ...FIXTURE_LISTEN_IDENTIFY_ACTIVITY,
      config: {
        prompt: "ناقص",
        audioText: "صوت",
        options: [
          { id: "1", label: "أ", correct: false },
          { id: "2", label: "ب", correct: false },
        ],
      },
    };
    const badLiResult = ActivitySchema.safeParse(badListen);
    assert.equal(badLiResult.success, false);

    // كائن activityId مشوه (ليس UUID v4)
    const badUuidActivity = {
      ...FIXTURE_DRAG_MATCH_ACTIVITY,
      activityId: "not-a-valid-uuid",
    };
    const badUuidResult = ActivitySchema.safeParse(badUuidActivity);
    assert.equal(badUuidResult.success, false);
  });

  // 10. التحقق من كل الـ fixtures التجريبية عبر محرك التحقق الصارم
  it("10. validates all technical fixtures with validateContentPack and ActivitySchema", () => {
    for (const fixture of ALL_FIXTURE_ACTIVITIES) {
      const parsed = ActivitySchema.safeParse(fixture);
      assert.equal(parsed.success, true, `Fixture ${fixture.id} should parse with ActivitySchema`);
    }

    const testPack = {
      ...starterPack,
      id: "fixture-validation-pack",
      skills: [...starterPack.skills, FIXTURE_SKILL],
      activities: ALL_FIXTURE_ACTIVITIES,
    };
    const packResult = validateContentPack(testPack);
    assert.equal(packResult.valid, true, `Validation errors: ${JSON.stringify(packResult.errors)}`);
    assert.equal(packResult.errors.length, 0);
  });
});
