/**
 * بوابة الجودة: كل حزمة محتوى تُفحص آلياً قبل البناء.
 * الأخطاء تفشل البناء (exit 1). التحذيرات تُطبع ولا توقف.
 *
 * الاستخدام: npm run validate  [-- --strict-pages]
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { validatePack } from '../src/domain/content/validator';

const ROOT = resolve(process.cwd());
const PACKS_DIR = join(ROOT, 'src', 'content-packs');
const strictPages = process.argv.includes('--strict-pages');

interface PackRow {
  file: string;
  id: string;
  islands: number;
  skills: number;
  activities: number;
  errors: number;
  warnings: number;
}

function listPackFiles(): string[] {
  if (!existsSync(PACKS_DIR)) return [];
  return readdirSync(PACKS_DIR)
    .map((dir) => join(PACKS_DIR, dir, 'pack.json'))
    .filter((file) => existsSync(file));
}

function main(): void {
  const files = listPackFiles();
  if (files.length === 0) {
    console.error('لم يُعثر على أي حزمة محتوى في src/content-packs/.');
    process.exit(1);
  }

  const rows: PackRow[] = [];
  let failed = false;

  for (const file of files) {
    const rel = file.replace(`${ROOT}\\`, '').replace(`${ROOT}/`, '');
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      console.error(`\n✗ ${rel}\n  JSON غير قابل للقراءة: ${String(err)}`);
      failed = true;
      continue;
    }

    const report = validatePack(raw);
    const errors = report.issues.filter((i) => i.severity === 'error');
    const warnings = report.issues.filter((i) => i.severity === 'warning');
    const pageWarnings = warnings.filter((i) => i.code === 'source.page').length;
    const blocking = strictPages ? [...errors, ...warnings.filter((i) => i.code === 'source.page')] : errors;

    rows.push({
      file: rel,
      id: report.pack?.manifest.id ?? '(بلا معرّف)',
      islands: report.stats.islands,
      skills: report.stats.skills,
      activities: report.stats.activities,
      errors: errors.length,
      warnings: warnings.length,
    });

    const mark = blocking.length === 0 ? '✓' : '✗';
    console.log(`\n${mark} ${rel}`);
    console.log(
      `   الجزر: ${report.stats.islands} · المهارات: ${report.stats.skills} · الأنشطة: ${report.stats.activities}` +
        ` · القوالب: ${Object.entries(report.stats.byTemplate)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')}`,
    );

    for (const issue of report.issues) {
      const tag = issue.severity === 'error' ? 'خطأ ' : 'تحذير';
      console.log(`   [${tag}] ${issue.code} ${issue.path ?? ''} — ${issue.message}`);
    }

    if (pageWarnings > 0) {
      console.log(
        `   ملاحظة: ${pageWarnings} نشاطاً بلا رقم صفحة مثبّت. هذا مقبول في العيّنة، ويجب أن يصير صفراً قبل النشر.`,
      );
    }

    if (blocking.length > 0) failed = true;
  }

  const totals = rows.reduce(
    (acc, r) => ({
      skills: acc.skills + r.skills,
      activities: acc.activities + r.activities,
      islands: acc.islands + r.islands,
    }),
    { skills: 0, activities: 0, islands: 0 },
  );

  console.log('\n──────────────────────────────');
  console.log(
    `المجموع: ${rows.length} حزم · ${totals.islands} جزر · ${totals.skills} مهارة · ${totals.activities} نشاط`,
  );

  if (failed) {
    console.error(
      strictPages
        ? '\nفشل التحقق: أخطاء أو صفحات غير مثبّتة (وضع --strict-pages).'
        : '\nفشل التحقق: أخطاء تمنع البناء.',
    );
    process.exit(1);
  }
  console.log('كل الحزم اجتازت بوابة الجودة.');
}

main();
