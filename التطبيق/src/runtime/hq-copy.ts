import type { HqUpgradeOutcome, HqUpgradeQuote } from '@domain/island';

/**
 * نصوص ترقية البرج — عربية دافئة بلا لوم ولا «لا تستطيع».
 * الرقم وحده لا يكفي طفلاً في الصف الأول؛ الجملة تشرح أن النقص مؤقت وأن التعلّم يعيده.
 */

const RESOURCE_NAMES = {
  stars: 'نجوم',
  wood: 'خشب',
  stone: 'حجر',
  crystal: 'بلورة',
} as const;

function starsText(count: number): string {
  if (count === 1) return 'نجمة واحدة';
  if (count === 2) return 'نجمتان';
  if (count <= 10) return `${count} نجوم`;
  return `${count} نجمة`;
}

function materialsText(quote: HqUpgradeQuote): string {
  const parts: string[] = [];
  for (const key of ['wood', 'stone', 'crystal'] as const) {
    const count = quote.missing[key];
    if (count > 0) parts.push(`${count} ${RESOURCE_NAMES[key]}`);
  }
  return parts.join('، ');
}

function skillsWord(count: number): string {
  return count >= 3 && count <= 10 ? 'مهارات' : 'مهارة';
}

export function upgradeBlockedMessage(outcome: HqUpgradeOutcome): string {
  if (outcome.ok) return '';

  const quote = outcome.quote;

  if (outcome.reason === 'MAX_LEVEL' || !quote) {
    return 'برجك وصل إلى أعلى مستوى — والجزيرة تكبر معك.';
  }

  if (outcome.reason === 'MASTERY_GATE') {
    return `البرج يكبر مع ما نتعلّمه. أتقن ${quote.masteryRequired} ${skillsWord(quote.masteryRequired)} وسيكبر بين يديك — أتقنت ${quote.masteredCount} حتى الآن.`;
  }

  if (outcome.reason === 'INSUFFICIENT_RESOURCES') {
    const parts: string[] = [];
    if (quote.missing.stars > 0) parts.push(starsText(quote.missing.stars));
    const materials = materialsText(quote);
    if (materials) parts.push(materials);

    const detail = parts.length > 0 ? `بقي القليل: ${parts.join('، ')}. ` : '';
    return `${detail}كل خطوة تُتقنها تمنحك نجمة ومواد.`;
  }

  if (outcome.reason === 'NO_PROFILE') {
    return 'لم نجد ملفك بعد. أنشئ ملفاً ثم عُد إلى البرج.';
  }

  return 'لم نستطع حفظ الترقية هذه المرة. جرّب مرة أخرى بعد لحظة.';
}
