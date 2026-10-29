/**
 * تقرير التغطية وصدق النطاق: كم من المنهاج تغطيه الحزم فعلاً؟
 * لا يفشل البناء؛ يطبع فقط، ويُقرأ مع manifest.scopeNote.
 *
 * الاستخدام: npm run coverage
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { validatePack } from '../src/domain/content/validator';
import type { ContentPack } from '../src/domain/content/schema';

const ROOT = resolve(process.cwd());
const PACKS_DIR = join(ROOT, 'src', 'content-packs');

function packFiles(): string[] {
  if (!existsSync(PACKS_DIR)) return [];
  return readdirSync(PACKS_DIR)
    .map((dir) => join(PACKS_DIR, dir, 'pack.json'))
    .filter((file) => existsSync(file));
}

function bar(value: number, total: number, width = 18): string {
  if (total <= 0) return '·'.repeat(width);
  const filled = Math.round((value / total) * width);
  return '█'.repeat(filled) + '·'.repeat(Math.max(0, width - filled));
}

function main(): void {
  const files = packFiles();
  if (files.length === 0) {
    console.error('لا حزم محتوى.');
    process.exit(1);
  }

  console.log('تكة — تقرير التغطية\n');

  for (const file of files) {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const report = validatePack(raw);
    const pack = report.pack as ContentPack | undefined;
    if (!pack) {
      console.log(`✗ ${file} — غير قابل للتحليل`);
      continue;
    }

    const withPage = pack.activities.filter((a) => a.source.page !== undefined).length;
    const expert = pack.activities.filter((a) => a.audit.status === 'expert_reviewed').length;
    const declaredLessons = pack.manifest.coverage.units.reduce(
      (sum, u) => sum + (u.lessons ?? 0),
      0,
    );
    const coveredSkills = pack.skills.length;
    const ratio = declaredLessons === 0 ? 0 : coveredSkills / declaredLessons;

    console.log(`▌ ${pack.manifest.id} — ${pack.manifest.title}`);
    console.log(`  المادة: ${pack.manifest.subject} · الصف: ${pack.manifest.grade} · الطبعة: ${pack.manifest.edition}`);
    console.log(`  حالة التدقيق: ${pack.manifest.auditStatus} (موقَّع من مختص: ${expert}/${pack.activities.length})`);
    console.log(`  صدق النطاق: ${pack.manifest.scopeNote}`);
    console.log(
      `  المهارات مقابل الدروس المعلنة: ${coveredSkills}/${declaredLessons} ${bar(coveredSkills, declaredLessons)} ${(ratio * 100).toFixed(0)}%`,
    );
    console.log(
      `  أنشطة بأرقام صفحات مثبّتة: ${withPage}/${pack.activities.length} ${bar(withPage, pack.activities.length)}`,
    );
    console.log('  الوحدات:');
    for (const unit of pack.manifest.coverage.units) {
      const skills = pack.skills.filter((s) => s.sourceRef.unit?.includes(unit.title.split('—')[0]?.trim() ?? ''));
      console.log(
        `   - ${unit.title}${unit.page ? ` (تبدأ ص ${unit.page})` : ''} — دروس معلنة: ${unit.lessons ?? '؟'} · مهارات مغطاة هنا: ${skills.length}`,
      );
    }
    console.log('  الجزر:');
    for (const island of pack.islands) {
      const total = pack.skills.filter((s) => s.islandId === island.id).length;
      const acts = pack.activities.filter((a) => a.islandId === island.id).length;
      console.log(`   - ${island.title} (${island.id}) — مهارات: ${total} · أنشطة: ${acts}`);
    }
    console.log('');
  }
}

main();
