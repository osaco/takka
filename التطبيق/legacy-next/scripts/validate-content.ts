import fs from "node:fs";
import path from "node:path";
import { validateContentPack, type PackValidationResult } from "../lib/core/content-validator.ts";

/**
 * أداة فحص وتدقيق حزم محتوى تكة عبر سطر الأوامر (CLI Validator)
 * تستخدم مدقق النواة مباشرة دون تكرار أي مخططات أو قواعد تحقق.
 */
function runContentValidation(): void {
  const packsDir = path.resolve(process.cwd(), "content/packs");

  console.log("=================================================");
  console.log("       أنبوب محتوى تكة — أداة تدقيق الحزم");
  console.log("=================================================\n");

  if (!fs.existsSync(packsDir)) {
    console.error(`[خطأ] مجلد الحزم غير موجود: ${packsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(packsDir).filter((file) => file.endsWith(".json"));

  if (files.length === 0) {
    console.error(`[خطأ] لم يتم العثور على أي ملفات JSON داخل: ${packsDir}`);
    process.exit(1);
  }

  console.log(`تم العثور على ${files.length} حزمة محتوى محلية.\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  const results: Array<{ file: string; result: PackValidationResult }> = [];

  for (const file of files) {
    const fullPath = path.join(packsDir, file);
    let rawContent: string;
    try {
      rawContent = fs.readFileSync(fullPath, "utf-8");
    } catch (readErr: unknown) {
      const msg = readErr instanceof Error ? readErr.message : "تعذر قراءة الملف";
      console.error(`❌ [${file}] فشل قراءة الملف: ${msg}`);
      totalErrors++;
      continue;
    }

    const result = validateContentPack(rawContent);
    results.push({ file, result });

    if (!result.valid) {
      totalErrors += result.errors.length;
    }
    totalWarnings += result.warnings.length;

    // طباعة تفاصيل كل حزمة
    console.log(`-------------------------------------------------`);
    console.log(`📦 الملف: ${file}`);
    console.log(`   معرف الحزمة: ${result.packId}`);
    console.log(`   حالة الفحص البنيوي: ${result.valid ? "✅ سليم بنوياً وترابطياً" : "❌ فشل الفحص البنيوي"}`);
    console.log(`   حالة المراجعة البشرية: ${result.humanReviewStatus.status}`);
    console.log(`   تنبيه المراجعة: ${result.humanReviewStatus.notice}`);
    console.log(`   إحصاءات: ${result.stats.skillsCount} مهارات | ${result.stats.activitiesCount} أنشطة | ${result.stats.questionsCount} أسئلة`);

    if (result.warnings.length > 0) {
      console.log(`\n   ⚠️ التحذيرات (${result.warnings.length}):`);
      for (const w of result.warnings) {
        const loc = w.activityId ? ` [نشاط: ${w.activityId}]` : w.path ? ` [مسار: ${w.path}]` : "";
        console.log(`     - [${w.code}] ${w.message}${loc}`);
      }
    }

    if (result.errors.length > 0) {
      console.log(`\n   ❌ الأخطاء (${result.errors.length}):`);
      for (const e of result.errors) {
        const loc = e.activityId ? ` [نشاط: ${e.activityId}]` : e.path ? ` [مسار: ${e.path}]` : "";
        console.log(`     - [${e.code}] ${e.message}${loc}`);
      }
    }
    console.log("");
  }

  console.log("=================================================");
  console.log("                 ملخص النتيجة");
  console.log("=================================================");
  console.log(`إجمالي الحزم المفحوصة: ${files.length}`);
  console.log(`إجمالي الأخطاء البنيوية: ${totalErrors}`);
  console.log(`إجمالي التحذيرات: ${totalWarnings}`);
  console.log("\nتنبيه منهجي وتربوي:");
  console.log("• نجاح الفحص الآلي يضمن السلامة التقنية والترابطية فقط.");
  console.log("• لا يعتبر بديلاً عن المراجعة التربوية واللغوية البشرية المتخصصة.");
  console.log("• لا يتم حساب نسبة تغطية منهاجية لعدم وجود خريطة تغطية معتمدة لهذه العينات.");
  console.log("=================================================\n");

  if (totalErrors > 0) {
    console.error(`💥 انتهى التدقيق بوجود ${totalErrors} خطأ بنيوي. يلزم تصحيح الأخطاء.`);
    process.exit(1);
  } else {
    console.log("🎉 جميع حزم المحتوى اجتازت التدقيق البنيوي والترابطي بنجاح.");
    process.exit(0);
  }
}

runContentValidation();
