# 🟣 P5 — قياس الأداء + Capacitor APK
> **المدة:** أسبوع  
> **البوابة:** P4 مفتوحة  
> **القاعدة:** 30fps مستقر + فتح < 3ث + APK ≤ 28MB

---

## 🎯 الأهداف

1. قياس أداء Canvas على جهاز حقيقي (أندرويد 2GB RAM)
2. تفعيل الوضع المنخفض تلقائياً
3. إعداد Capacitor 6 لبناء APK
4. اختبار size budget (≤ 28MB)
5. إصلاح أي bottleneck الأداء

---

## 📂 الهيكل المطلوب

```
capacitor.config.ts
android/               # يُولّد تلقائياً
src/runtime/world/
├── performance-monitor.ts
└── degraded-mode.ts
tools/
└── performance-audit.ts
```

---

## 🤖 Prompts للـ Vibe Coding

### Prompt 1 — Performance Monitor

```
أنشئ مراقب الأداء في src/runtime/world/performance-monitor.ts

```typescript
export interface PerformanceMetrics {
  fps: number
  frameTimeMs: number
  drawingOperations: number
  activeElements: number
  memoryMB?: number
}

export class PerformanceMonitor {
  private fpsHistory: number[] = []
  private frameTimes: number[] = []
  private drawingOps = 0
  private lastTime = performance.now()
  private frameCount = 0

  start() {
    this.lastTime = performance.now()
    this.frameCount = 0
  }

  tick() {
    this.frameCount++
    this.drawingOps++
  }

  check() {
    const now = performance.now()
    const delta = now - this.lastTime
    
    if (delta >= 1000) {
      const fps = (this.frameCount * 1000) / delta
      const avgFrameTime = delta / this.frameCount
      
      this.fpsHistory.push(fps)
      this.frameTimes.push(avgFrameTime)
      
      // Keep last 10 seconds
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift()
        this.frameTimes.shift()
      }
      
      this.frameCount = 0
      this.lastTime = now
      this.drawingOps = 0
    }
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
  }

  getDrawingOps(): number {
    return this.drawingOps
  }

  /** هل يجب تفعيل الوضع المنخفض؟ */
  shouldEnableDegradedMode(): boolean {
    const avgFps = this.getAverageFPS()
    const avgFrameTime = this.getAverageFrameTime()
    
    if (avgFps < 30) return true
    if (avgFrameTime > 25) return true
    if (this.getDrawingOps() > 400) return true
    
    return false
  }

  reset() {
    this.fpsHistory = []
    this.frameTimes = []
    this.drawingOps = 0
  }
}

export const perfMonitor = new PerformanceMonitor()
```

---

### Prompt 2 — Degraded Mode

```
أنشئ نظام الوضع المنخفض في src/runtime/world/degraded-mode.ts

```typescript
import { perfMonitor } from './performance-monitor'

export interface DegradedConfig {
  enableAnimations: boolean
  enableParticles: boolean
  enableWaves: boolean
  maxActiveElements: number
  disableShadow: boolean
  frameCap: number
}

export const DEFAULT_DEGRADED_CONFIG: DegradedConfig = {
  enableAnimations: false,
  enableParticles: false,
  enableWaves: false,
  maxActiveElements: 30,
  disableShadow: true,
  frameCap: 30,
}

export const FULL_CONFIG: DegradedConfig = {
  enableAnimations: true,
  enableParticles: true,
  enableWaves: true,
  maxActiveElements: 120,
  disableShadow: false,
  frameCap: 60,
}

export function detectLowPerformance(): boolean {
  // Device memory detection
  const memory = (navigator as any).deviceMemory
  if (memory && memory < 2) return true
  
  // CPU cores detection
  const cores = navigator.hardwareConcurrency
  if (cores && cores <= 4) return true
  
  // Runtime performance check
  return perfMonitor.shouldEnableDegradedMode()
}

export function getPerformanceConfig(): DegradedConfig {
  const isLowPerf = detectLowPerformance()
  const appStore = useAppStore.getState()
  
  if (appStore.isLowPerformanceMode) return DEFAULT_DEGRADED_CONFIG
  if (isLowPerf) return DEFAULT_DEGRADED_CONFIG
  
  return FULL_CONFIG
}
```

---

### Prompt 3 — Capacitor Setup

```
أعد إعداد Capacitor 6 لبناء APK Android

capacitor.config.ts:
```typescript
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.takka.app',
  appName: 'تكة',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#F5F1E6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#173F38',
    },
  },
}

export default config
```

package.json scripts:
```json
{
  "scripts": {
    "capacitor:sync": "capacitor sync",
    "capacitor:android": "capacitor open android",
    "build:android": "vite build && capacitor sync android"
  }
}
```

أنشئ الملفات المطلوبة:
- capacitor.config.ts
- أضف scripts إلى package.json
- شغّل: pnpm add @capacitor/core @capacitor/cli @capacitor/android
- شغّل: npx cap init takka com.takka.app --web-dir=dist
- شغّل: npx cap add android

AndroidManifest.xml needs:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<!-- No other permissions needed for MVP -->
```

---

### Prompt 4 — Build & Size Check

```
أنشئ script لفحص حجم الحزمة في tools/size-check.ts

```typescript
import { execSync } from 'child_process'
import { readFileSync, statSync } from 'fs'
import { join } from 'path'

const MAX_APK_SIZE_MB = 28
const MAX_JS_BUNDLE_KB = 450

function checkSize() {
  console.log('📦 فحص حجم الحزمة...')
  
  // Check JS bundle
  const distDir = join(process.cwd(), 'dist')
  const assets = readFileSync(join(distDir, 'assets', 'index-*.js')).toString()
  const jsSizeKB = assets.length / 1024
  
  console.log(`  JS Bundle: ${jsSizeKB.toFixed(1)} KB (حد: ${MAX_JS_BUNDLE_KB} KB)`)
  if (jsSizeKB > MAX_JS_BUNDLE_KB) {
    console.warn('  ⚠️ تجاوز حد حجم JS Bundle!')
  }
  
  // Check assets
  const assetFiles = findFiles(join(distDir, 'assets'))
  let totalAssetSize = 0
  for (const file of assetFiles) {
    totalAssetSize += statSync(file).size
  }
  const assetSizeMB = totalAssetSize / (1024 * 1024)
  
  console.log(`  Assets: ${assetSizeMB.toFixed(2)} MB`)
  
  // Check fonts
  const fontFiles = assetFiles.filter(f => f.endsWith('.woff2'))
  for (const font of fontFiles) {
    const size = statSync(font).size / 1024
    console.log(`    ${font.split('/').pop()}: ${size.toFixed(0)} KB`)
    if (size > 200) {
      console.warn(`    ⚠️ Font exceeds 200KB limit!`)
    }
  }
  
  console.log('\n✅ فحص الحجم اكتمل')
}

function findFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const items = execSync(`dir /s /b "${dir}"`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    results.push(...items)
  } catch {}
  return results
}

checkSize()
```

أنشئ الملفات وأضف script: `"size-check": "node tools/size-check.ts"`
```

---

## 📋 معايير الأداء الإلزامية

| المعيار | الحد الأقصى | طريقة القياس |
|:---|:---|:---|
| FPS مستقر | ≥ 30 fps | Chrome DevTools / Android Profiler |
| زمن الفتح البارد | < 3 ثوانٍ | cronometer على جهاز حقيقي |
| حجم JS Bundle | ≤ 450 KB gzip | `vite build` |
| حجم APK ككل | ≤ 28 MB | `capacitor build android` |
| ذاكرة التطبيق | ≤ 120 MB | Android Profiler Memory |
| عناصر متحركة | ≤ 120 | counter في dev mode |
| عمليات رسم/إطار | ≤ 400 | manual trace |

---

## ✅ معايير قبول البوابة P5

- [ ] APK يُبنى بنجاح (`pnpm build:android`)
- [ ] حجم APK ≤ 28MB
- [ ] JS bundle ≤ 450KB
- [ ] Font WOFF2 ≤ 200KB لكل خط
- [ ] الوضع المنخفض يُفعّل تلقائياً على أجهزة ضعيفة
- [ ] FPS ≥ 30 على جهاز أندرويد 2GB
- [ ] زمن الفتح < 3 ثوانٍ

---

*آخر تحديث: 2026-10-20*
