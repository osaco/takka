import type { ExportEnvelope, ProgressSnapshot } from '@domain/storage/repository';

/**
 * بصمة تحقق بسيطة (FNV-1a 32-bit) — تكفي لمنع الاستيراد التالف،
 * وليست توقيعاً أمنياً. لا شبكة، لا مفاتيح.
 */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** JSON مستقرّ: ترتيب مفاتيح ثابت حتى تعطي البصمة نفسها دائماً. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function createEnvelope(snapshot: ProgressSnapshot, now: number): ExportEnvelope {
  const payload: ProgressSnapshot = { ...snapshot, exportedAt: now };
  return {
    format: 'takka-progress-export',
    version: 1,
    checksum: fnv1a(stableStringify(payload)),
    payload,
  };
}

export function serializeEnvelope(snapshot: ProgressSnapshot, now: number): string {
  return JSON.stringify(createEnvelope(snapshot, now), null, 2);
}

export interface ParseResult {
  ok: boolean;
  snapshot?: ProgressSnapshot;
  error?: string;
}

export function parseEnvelope(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'الملف ليس JSON صالحاً.' };
  }

  const env = raw as Partial<ExportEnvelope>;
  if (env.format !== 'takka-progress-export' || env.version !== 1) {
    return { ok: false, error: 'ملف تقدّم غير معروف الإصدار.' };
  }
  if (!env.payload || typeof env.checksum !== 'string') {
    return { ok: false, error: 'الملف ناقص.' };
  }
  const expected = fnv1a(stableStringify(env.payload));
  if (expected !== env.checksum) {
    return { ok: false, error: 'بصمة التحقق لا تطابق المحتوى — الملف تالف.' };
  }
  if (env.payload.format !== 'takka-progress') {
    return { ok: false, error: 'محتوى التقدّم غير معروف.' };
  }
  return { ok: true, snapshot: env.payload };
}
