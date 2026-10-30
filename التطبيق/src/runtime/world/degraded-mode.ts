/**
 * تكة — الوضع المنخفض (Degraded Mode)
 * يُفعَّل عند: deviceMemory < 2GB أو hardwareConcurrency ≤ 4
 * أو متوسط إطار > 25ms لثلاث ثوانٍ. خريطة شبه ثابتة بلا موج ولا جزيئات.
 */

export interface DeviceCaps {
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  avgFrameMs?: number;
}

export function shouldDegrade(caps: DeviceCaps): boolean {
  if (caps.deviceMemoryGb !== undefined && caps.deviceMemoryGb < 2) return true;
  if (caps.hardwareConcurrency !== undefined && caps.hardwareConcurrency <= 4) return true;
  if (caps.avgFrameMs !== undefined && caps.avgFrameMs > 25) return true;
  return false;
}

export function readDeviceCaps(): DeviceCaps {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    deviceMemoryGb: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
  };
}
