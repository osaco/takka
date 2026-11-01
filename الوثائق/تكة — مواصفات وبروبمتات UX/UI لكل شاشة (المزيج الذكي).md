# 📱 تكة — مواصفات وبروبمتات UX/UI لكل شاشة (المزيج الذكي)

> **التاريخ:** 1 نوفمبر 2026
> **الحالة:** مواصفة صفحة-بصفحة + برومبتات توليد واجهة جاهزة، مبنية على الشاشات الفعلية في `التطبيق/src/runtime/screens` وقوالب الأنشطة في `التطبيق/src/runtime/templates`.
> **الأسلوب:** نفس قفل `S1` وحقل «المزيج الذكي» المنعكس في ملف `تكة — بروبمتات التصميم البصري (…).md`. اقرأ قفل S1 أولاً قبل أي برومبت توليد.

---

## كيف تستخدم هذا الملف

لكل شاشة أدناه كتلتان:
1. **المواصفة** — بنية الشاشة، المكوّنات، الحالات، اللون المهيمن من المزيج الذكي.
2. **برومبت التوليد** — نص إنجليزي جاهز تلصقه في Qwen **بعد** قفل S1 لإنتاج نموذج واجهة (mockup) لتلك الشاشة.

**قاعدة المزيج الذكي في الواجهة:** الأبيض قماش مهيمن؛ كل شاشة يقودها لون واحد من (بنفسجي/أخضر/أحمر)؛ اللونان الآخران لمسات صغيرة؛ **الأحمر للاحتفال/النجوم فقط لا للأخطاء**؛ بنفسجي=هوية/عربية، أخضر=نمو/رياضيات/جزيرة.

**قاعدة النص في الصور:** لا تطلب من المولّد كتابة عربي (يُشوّه). كل المساحات النصية = **أشرطة عناصر نائبة رمادية فارغة**، والنص الحقيقي (خط Tajawal) يُركّب لاحقاً في Figma.

**اللمس:** هدف اللمس ≥ 56px، الهامش الآمن 16px، RTL، خط Tajawal.

---

## فهرس الشاشات

| # | الشاشة (المعرّف في الكود) | النوع |
|---|---|---|
| 1 | Splash — الافتتاح | شاشة مستوى أول |
| 2 | Profile — ملف المتعلم | شاشة مستوى أول |
| 3 | Map — الخريطة/العالم | شاشة مستوى أول (تضمّ ResourceBar + WorldStage + HqUpgradePanel) |
| 4 | Island — صفحة الجزيرة | شاشة مستوى أول |
| 5 | Session — الجلسة | شاشة مستوى أول (تضمّ ModelCard + التلميح + الإغلاق) |
| 6 | End — نهاية الجلسة | شاشة مستوى أول |
| 7 | Parent — للكبار | شاشة مستوى أول |
| 8 | HqUpgradePanel — لوحة ترقية البرج | نافذة منبثقة (Modal) |
| 9 | ResourceBar — شريط الموارد | مكوّن شريط |
| 10 | DragMatch — سحب ومطابقة | قالب نشاط |
| 11 | ListenIdentify — اسمع وحدّد | قالب نشاط |
| 12 | TracePath — تتبّع الحرف | قالب نشاط |
| 13 | Balance — الموازنة | قالب نشاط |
| 14 | Measure — القياس (مخطَّط) | قالب نشاط |
| 15 | مكتبة المكوّنات المشتركة | نظام التصميم |

---

## 1) Splash — شاشة الافتتاح

**الهدف:** أول ما يراه الطفل/ولي الأمر؛ يتحقق من الحزم ويؤكد العمل بلا إنترنت. بلا قفز أو إلحاح.
**اللون المهيمن:** بنفسجي (هوية/افتتاح).
**بنية الشاشة (RTL، عمودي):**
- أعلى: أيقونة التطبيق (دائرية، داخل الإطار المزدوج الناقص).
- عنوان «تكة» + جملة إرشادية واحدة («خطوة صغيرة كل يوم، بلا ضغط. تعمل بلا إنترنت»).
- صورة فطين (الرفيق) في المنتصف السفلي.
- زر واحد كبير «ابدأ».
**الحالات:**
- `bootError` → بطاقة «وقفنا قبل البداية» + نص الخطأ + زر «حاول مرة أخرى» (هذه الشاشة الوحيدة التي تظهر نصاً تقنياً، وللكبار لا للطفل).

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile app splash screen, 9:16 portrait, RTL Arabic children's app. Clean white background, one cute chibi turtle-mascot (Salama) and the boy Fatin as small glossy 2.5D stickers in the lower corners. Center: a round app-icon inside the incomplete double circular frame (violet-to-green gradient rings, white gap), a large empty title bar, one empty subtitle bar, and one big rounded primary button at the bottom (violet fill, white label placeholder). Violet is the leading accent, green and red only as tiny sticker glows. Soft rounded cards, calm friendly mood, S1 2.5D glossy chibi style, empty grey placeholder bars for text (no real letters), no words, poster composition.
```

---

## 2) Profile — ملف المتعلم

**الهدف:** إنشاء ملف رمزي بلا هوية: لقب من قائمة + الصف. خصوصية تامة.
**اللون المهيمن:** بنفسجي (إعداد/هوية) على أبيض.
**بنية الشاشة:**
- ترويسة: فطين + عنوان «من يلعب اليوم؟» + إرشاد الخصوصية.
- بطاقة «اللقب»: رقائق (chips) ألقاب جاهزة، المختار محدَّد بوضوح.
- بطاقة «الصف»: أرقام 1–6، الصفوف غير المتاحة عليها وسم «قريباً» ومعطّلة.
- بطاقة «ما في هذا الإصدار»: ملاحظة النطاق + شعار الخصوصية (بلا إنترنت/بلا حساب/بلا إعلانات).
- زر «ابدأ» في الأسفل.
**الحالات:** `profile` موجود مسبقاً → الزر «ابدأ من جديد».

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile profile/onboarding screen, 9:16 portrait, RTL Arabic kids app. White background, violet leading accent (green and red as tiny accents only). Top: small chibi boy Fatin sticker and an empty title bar plus one empty instruction line. Three stacked soft rounded cards: (1) a row of rounded pill chips with one pill highlighted as selected, (2) a row of number chips 1-6 with a "soon" tag on some, (3) a card with two short empty text lines and a small privacy glyph. One large violet primary button at the bottom with an empty label. Glossy 2.5D chibi decorative turtle corner sticker, S1 style, empty grey placeholder bars (no letters), no words, calm.
```

---

## 3) Map — الخريطة / العالم

**الهدف:** مركز اللعبة: العالم (جزيرة السلحفاة العملاقة النائمة) + برج تكّة + قائمة الجزر + «تكة اليوم».
**اللون المهيمن:** أخضر (عالم/جزيرة/طبيعة)، مع بنفسجي لسماء/إطار HQ ولمسات، وأحمر للنجوم.
**بنية الشاشة:**
- ترويسة: «أهلاً {اللقب}» + عدّاد الإتقان + زر «للكبار» (ثانوي).
- `ResourceBar` (شريط الموارد — انظر #9).
- شريط إشعار (notice) عند الحاجة.
- `WorldStage`: لوحة Canvas للعالم (برج HQ في المنتصف + مبانٍ/جزر حوله)، اللمس عليها يفتح البرج أو يشرح.
- بطاقة «برج تكّة» (المستوى + زر «افتح البرج»).
- قائمة بطاقات الجزر: العنوان + وسم المادة + حالة المزاج (نائمة/تستيقظ/مزدهرة) + عدّاد مهارات/أنشطة + زرّا «ادخل الجزيرة» و«مراجعة هادئة».
- بطاقة «تكة اليوم»: جلسة قصيرة يختارها التطبيق.
- فطين كملصق عائم.
**الحالات:** `panelOpen` → تظهر `HqUpgradePanel` (#8) فوق الكل.

**برومبت التوليد (Qwen) — نسخة العالم:**
```
UI mockup of a mobile game world-map screen, 9:16 portrait, RTL Arabic kids app. White-to-soft-green background, green is the leading accent (violet sky gradient and red star accents only). Top header with empty title bar and a small secondary button top-left. A horizontal resource chip row. Center: a large rounded canvas showing a giant sleeping chibi sea-turtle island (grass shell, tiny schoolhouse, peaceful closed eyes), the HQ tower glowing in the middle, small floating island badges around it, all in glossy 2.5D chibi style. Below: two stacked rounded cards each with an empty title, a subject tag, a status line, and two rounded buttons. A small chibi turtle and boy sticker in corners. S1 style, empty grey placeholder bars (no letters), no words.
```

---

## 4) Island — صفحة الجزيرة

**الهدف:** خطوات الجزيرة بترتيبها وحالتها بأمانة (لا تزيين).
**اللون المهيمن:** يتبع مادة الجزيرة — العربية→بنفسجي، الرياضيات→أخضر.
**بنية الشاشة:**
- ترويسة: زر «عودة إلى الخريطة» (ثانوي) + عنوان الجزيرة + الوصف + `ProgressBar` للتقدم.
- قائمة بطاقات المهارة: العنوان + حالة الخطوة (لم تُبلَغ / في الطريق / أُتقنت / تحتاج مراجعة) + عدّاد أنشطة + زر «ابدأ/راجع هذه الخطوة» + ملاحظة المصدر.
**الحالات:** `activeIslandId` غير موجود → بطاقة «لم نجد هذه الجزيرة» + زر عودة.

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile "island/skills" screen, 9:16 portrait, RTL Arabic kids app. White background, ONE leading accent color (either violet or green) used for the progress bar and selected tags, the other two hues as tiny accents only. Top: a secondary back button top-left, an empty title bar, one instruction line, and a horizontal progress bar. Below: a vertical list of 4-5 soft rounded cards, each with an empty title, a small status pill, a tiny meta line, and one rounded button. A small chibi turtle sticker in a corner. Glossy 2.5D chibi style, empty grey placeholder bars (no letters), no words, calm and uncluttered.
```

---

## 5) Session — شاشة الجلسة

**الهدف:** نشاط واحد في كل مرة، بلا عدّاد/وقت/نقاط. «نوقف هون» ظاهر دائماً وكبير.
**اللون المهيمن:** يتبع مادة النشاط (بنفسجي/أخضر)؛ الأحمر يظهر فقط كوميض نجمة عند النجاح.
**بنية الشاشة:**
- ترويسة: تسمية المرحلة + `ProgressBar` + زر «نوقف هون» (ثانوي، كبير).
- حالة `close` → بطاقة إغلاق هادئة + زر «أنهِ بهدوء».
- حالة `model` → `ModelCard`: فطين «يريك أولاً» + كشف الحل النصي + تلميح + زر «فهمت، نكمل».
- الحالة العادية → قسم النشاط: العنوان + تعليمة + `ActivityStage` (قالب النشاط) + تذييل (تلميح لطيف / جولة أخرى / متابعة).
- `HintBox` للتغذية الراجعة (aria-live) وللتلميح الإضافي عند السقالة ≥2.
- فطين كملصق.

**برومبت التوليد (Qwen) — الشاشة الأساسية مع نشاط:**
```
UI mockup of a mobile learning-session screen, 9:16 portrait, RTL Arabic kids app. White background, one leading accent (violet or green) for the progress bar and active button, red only as a tiny star sparkle on success. Top bar: an empty phase label, a progress bar, and a large secondary "stop" button on the side. Center: an empty activity title, one instruction line, and a large rounded play-area card holding the activity (drag tiles / choices). Bottom: one or two rounded buttons and a soft hint box. A small chibi boy sticker in a corner. Glossy 2.5D chibi style, empty grey placeholder bars (no letters), no words, calm, big touch targets.
```

---

## 6) End — نهاية الجلسة

**الهدف:** جملة إغلاق آمنة، بلا درجة/وقت/مقارنة. «نوقف هون» خيار كامل لا خروج ناقص.
**اللون المهيمن:** أخضر (آمان/إزهار هادئ) + لمسة نجمة حمراء عند الإتقان.
**بنية الشاشة:**
- بطاقة الإغلاق: عنوان (رسالة الإغلاق) + إرشاد (عدد الخطوات المزدهرة / كل محاولة خطوة) + ملاحظة + موعد المراجعة القادمة.
- فطين كملصق.
- تذييل: زرّا «إلى الخريطة» و«كل الجزر» + ملاحظة حفظ التقدّم.

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile session-end screen, 9:16 portrait, RTL Arabic kids app. Soft white background, green leading accent (a single small red star sticker as the only red), calm and warm. Center: one large rounded card with an empty celebration-title bar and two short empty lines. A cute chibi turtle mascot Salama with a gentle happy face as a soft sticker. Bottom: two rounded buttons side by side (one filled green, one outlined). No scores, no timers, no comparison. Glossy 2.5D chibi style, empty grey placeholder bars (no letters), no words.
```

---

## 7) Parent — شاشة للكبار (بوابة ولي الأمر)

**الهدف:** شفافية كاملة + خصوصية + نسخ احتياطي محلي. لا شبكة أثناء الاستخدام.
**اللون المهيمن:** بنفسجي (موثوقية/هوية للكبار) على أبيض هادئ.
**بنية الشاشة (بطاقات متتابعة):**
- ترويسة: «للكبار» + زر «عودة».
- بطاقة الملف الرمزي: اللقب/الصف/العمر + مفتاحا «تشغيل الصوت» و«تقليل الحركة».
- بطاقة التقدّم: الجلسات/الوقت/الخطوات المُتقنة + قائمة كل المهارات وحالتها + تنبيه المراجعة (>21 يوماً).
- بطاقة المحتوى والمصادر: حزم + حالة التدقيق + القوالب.
- بطاقة النسخ الاحتياطي: تصدير/استيراد JSON.
- بطاقة الملاحظة: textarea + زر حفظ محلي.
- بطاقة الخصوصية: قائمة المبادئ + زر «احذف هذا الملف نهائياً» (ثانوي/محذّر).

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile parent/guardian dashboard screen, 9:16 portrait, RTL Arabic app, designed for adults not children. Clean white background, violet as the leading calm accent (green/red tiny accents only). Top: an empty title bar and a back button. A vertical scroll of 5-6 stacked soft rounded cards, each with a small section heading and 2-3 empty text lines or a simple toggle row; one card shows a bulleted list of short lines; one card has two outlined buttons; the last card has a textarea rectangle and a small button. Clear, trustworthy, uncluttered. S1 glossy 2.5D decorative turtle emblem in a corner (subtle), empty grey placeholder bars (no letters), no words.
```

---

## 8) HqUpgradePanel — لوحة ترقية برج تكّة (Modal)

**الهدف:** ترقية البرج بإنفاق الموارد عند بلوغ بوابة الإتقان. الزر لا يُعطَّل عند النقص بل يشرح بودّ.
**اللون المهيمن:** أخضر (نمو/ترقية) داخل إطار بنفسجي للنافذة.
**بنية الـ Modal:**
- العنوان «برج تكّة» + مؤشر المستوى (1 من 3 نقاط مملوءة/فارغة).
- رسالة بوابة الإتقان (عدّاد المهارات المُتقنة المطلوبة).
- قائمة التكلفة: نجوم/خشب/حجر/بلورة (مملوك/مطلوب) — الناقص مميَّز.
- رسالة توضيحية عند النقص + أزرار «ارتقِ بالبرج» / «ليس الآن».
- الحالة القصوى: «وصل برجك لأعلى مستوى».

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile upgrade modal dialog, 9:16 portrait, RTL Arabic kids app. A dimmed overlay, centered white rounded card with a violet frame. Inside: an empty title bar, a 3-dot level indicator (one filled green), one instruction line, a small list of 4 resource rows each with an icon and "owned / needed" placeholder numbers, and two rounded buttons at the bottom (one green filled "upgrade", one outlined). Glossy 2.5D chibi turtle HQ tower emblem at top. S1 style, empty grey placeholder bars (no letters), no words, friendly not alarming.
```

---

## 9) ResourceBar — شريط موارد الجزيرة

**الهدف:** مرآة لحالة الاقتصاد (نجوم/خشب/حجر/بلورة) — رموز واضحة وأرقام صغيرة، بلا أزرار.
**اللون المهيمن:** مختلط مقصوداً عبر الرموز: نجمة=أحمر، خشب=أخضر/رملي، حجر=رمادي-بنفسجي محايد، بلورة=بنفسجي.
**بنية:** صف أفقي من 4 عناصر، كلٌّ = `Glyph` (24px) + رقم + تسمية مخفية بصرياً؛ أسفله ملاحظة تحذير عند الحاجة.
**ملاحظة:** الرموز مرسومة بخط `Glyph` (SVG) لا صور — يمكن تلوينها بتوكنز المزيج الذكي مباشرة.

**برومبت التوليد (Qwen) — شريط الرموز:**
```
UI mockup of a small mobile resource bar, horizontal row of 4 rounded pill chips, RTL. Each chip: a cute glossy 2.5D chibi icon (star in warm red, wood log in green, stone in neutral grey-violet, crystal in violet) plus a small number placeholder. White card background, calm, no text. S1 style, icons only, no words.
```

---

## 10) DragMatch — قالب سحب ومطابقة

**الهدف:** يسحب الطفل بطاقة ويضعها أمام ما يناسبها (مثل حرف↔صورة، أو رقم↔كمية).
**اللون المهيمن:** يتبع المادة (بنفسجي/أخضر)، أبيض قماش.
**بنية داخل منطقة اللعب:** صفّا بطاقات (قابلة للسحب فوق، أهداف تحت)؛ لمس السحب ≥56px؛ تغذية راجعة بصريّة فورية (لا أحمر صارخ).
**الحالات:** إجابة صحيحة → وميض أخضر/نجمة؛ خطأ → اهتزاز لطيف وإعادة البطاقة لمكانها بلا لوم.

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile "drag and match" activity, 9:16 portrait, RTL Arabic kids app. White play area, one leading accent (violet or green). Center: a rounded card with two rows of 3 cute rounded tiles each — top row draggable picture tiles, bottom row target slots outlined. A small chibi turtle sticker watching. One rounded button below. Soft, big touch targets, no timers. S1 glossy 2.5D chibi style, tiles show simple icon placeholders (no letters), no words.
```

---

## 11) ListenIdentify — اسمع وحدّد

**الهدف:** يشغّل الطفل الصوت (اختياري) ثم يختار البطاقة الصحيحة من خيارات.
**اللون المهيمن:** يتبع المادة؛ أبيض قماش.
**بنية:** زر تشغيل صوت كبير (دائرة) + تعليمة + شبكة خيارات (بطاقات صور/رموز)؛ بديل بصري عند تعطيل الصوت.
**الحالات:** لا صوت → تلقائياً يُعتمد البديل البصري؛ صحيح/خطأ بلمسة لون هادئة.

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile "listen and identify" activity, 9:16 portrait, RTL Arabic kids app. White background, one leading accent (violet or green). Center: a big rounded circular play-button (sound icon), one instruction line, and a grid of 3-4 cute rounded choice cards with simple icon placeholders. A small chibi boy sticker. S1 glossy 2.5D chibi style, icons only (no letters), no words, calm.
```

---

## 12) TracePath — تتبّع الحرف

**الهدف:** يتبع الطفل «الخط الذهبي» ليرسم حرفاً/شكلاً من بدايته إلى نهايته (تغطية ≥70%).
**اللون المهيمن:** يتبع المادة؛ أبيض قماش.
**بنية:** منطقة رسم كبيرة فيها مسار منقوط متدرج + زر «مسح/إعادة»؛ يقاس الأثر بلا عقاب على السرعة.
**الحالات:** تغطية كافية → إشارة إتقان هادئة؛ ناقصة → تشجيع بلا لوم.

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile "trace the letter" activity, 9:16 portrait, RTL Arabic kids app. White background, one leading accent (violet or green). Center: a large rounded writing pad showing a dotted guiding path forming a simple Arabic-letter shape, with a start dot. A small chibi turtle sticker. One outlined "retry" button below. S1 glossy 2.5D chibi style, no letters, no words, friendly.
```

---

## 13) Balance — الموازنة (الميزان)

**الهدف:** يختار الطفل الوزن الذي يستوي به الميزان (مفهوم التوازن/التكافؤ).
**للون المهيمن:** يتبع المادة؛ أبيض قماش.
**بنية:** رسم ميزان في المنتصف (كفتان) + خيارات وزن أسفله؛ يتحرك الميزان بصرياً عند الاختيار.
**الحالات:** استواء → إشارة هادئة؛ ميل → عودة لطيفة بلا خطأ صارخ.

**برومبت التوليد (Qwen):**
```
UI mockup of a mobile "balance/weighing" activity, 9:16 portrait, RTL Arabic kids app. White background, one leading accent (violet or green). Center: a cute glossy 2.5D chibi balance scale with two pans, one pan holding an icon, the other empty. Below: a row of 3 rounded weight-choice buttons with simple icon placeholders. A small chibi sticker in a corner. S1 style, icons only (no letters), no words, calm.
```

---

## 14) Measure — القياس (مخطَّط)

> ملاحظة: أداة القياس (`measure.ts`) موجودة وتُستخدم فعلاً داخل `TracePath`؛ ويُقترح قالب نشاط مستقل «مقارنة الأطوال/الأحجام» مستقبلاً. أُدرج هنا للاكتمال.

**الهدف المقترح:** يقارن الطفل أطوالاً/أحجاماً (أطول/أقصر، أثقل/أخف) عبر سحب شريط أو ترتيب.
**اللون المهيمن:** يتبع المادة؛ أبيض قماش.
**بنية مقترحة:** منطقة فيها أجسام متفاوتة + أداة قياس مرئية + خيار «رتّب من الأصغر».
**برومبت التوليد (Qwen):**
```
UI mockup of a mobile "compare sizes" activity, 9:16 portrait, RTL Arabic kids app. White background, one leading accent (violet or green). Center: a rounded card with 3 cute objects of different heights/widths and a simple measuring ribbon. Below: one rounded button. A small chibi turtle sticker. S1 glossy 2.5D chibi style, icons only (no letters), no words, calm.
```

---

## 15) مكتبة المكوّنات المشتركة (نظام التصميم)

هذه المكوّنات معرّفة في `التطبيق/src/runtime/design` ويجب أن تتلقّى توكنز المزيج الذكي عند تحديث `theme.ts`:
- **Button** (`takka-btn-primary` / `takka-btn-secondary`): ≥56px، تركيز واضح، لا أحمر صارخ.
- **Card** (`takka-card`): خلفية بيضاء/عاجية، حواف ناعمة (radius 16–24).
- **HintBox** (`takka-hint`): صندوق تلميح/تغذية راجعة، `role="note"`.
- **ProgressBar**: شريط تقدّم هادئ (خلفية `--fog`، ممتلئ باللون المهيمن للمادة).
- **Modal**: نافذة منبثقة (خلفية مُعتّمة بنفسجي-أخضر خفيف).
- **Glyph** + **GlyphGroup**: رموز SVG معدودة (apple/star/wood/stone/crystal/circle/square/triangle/dot) — تُلوَّن بتوكنز المزيج.

**توكنز مقترحة للتحديث في `theme.ts`** (استبدال لوحة «ورق دافئ/بحري» القديمة):
```
paper  → #FFFFFF   (الأبيض المهيمن)
ink    → #1E2230   (حبر داكن للنص)
journey→ #34C77B   (أخضر النمو — كان بحري)
violet → #7B5CF0   (بنفسجي الهوية — جديد)
red    → #F2545B   (أحمر الاحتفال — جديد، إيجابي فقط)
fog    → #E6E9F2   (خلفية شريط التقدّم المحايدة)
card   → #FFFFFF   (سطح البطاقة)
```
> احتفظ بـ `apricot/sand/leaf/sky` كدرجات مساندة للرموز إن لزم، لكن القماش والنص والثالوث المهيمن يتبع المزيج الذكي.

---

## ملاحظات إتاحة مشتركة عبر كل الشاشات
- **النص على الأبيض بلون حبر داكن** (#1E2230) لتباين ≥ 4.5:1.
- **الأحمر إيجابي فقط** (نجوم/احتفال)؛ الأخطاء تُعرض بأسلوب محايد/بنّي هادئ لا أحمر حتى لا تُرعب الطفل.
- **لا نعتمد اللون وحده** لشرح الحالة — رمز + نص دائماً.
- **`prefers-reduced-motion`** محترم (الجلسة تقرأ `reducedMotion` من الملف)؛ لا مؤثرات مستمرة.
- **RTL** افتراضي (`dir="rtl"`)؛ اللمس ≥56px؛ الهامش الآمن 16px.
