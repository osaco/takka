import type {
  DragMatchActivity,
  TracePathActivity,
  ListenIdentifyActivity,
  Skill,
} from "./types";

/**
 * عينات ونماذج تقنية لاختبار قوالب P3 التعليمية.
 * ملاحظة توثيقية إلزامية: هذه الأنشطة fixtures تجريبية محايدة للتحقق والاختبار البرمجي فقط،
 * وليست أنشطة منهاجية معتمدة؛ إدخال الأنشطة المنهاجية مؤجل لحين صدور اعتماد صريح
 * لخريطة الصف الأول ومصادرها من المالك وفق دستور «تكة.md».
 */

export const FIXTURE_SKILL: Skill = {
  id: "90000000-0000-4000-8000-000000000001",
  grade: 1,
  subject: "arabic",
  title: "مهارة تجريبية محايدة لقوالب الأنشطة",
  description: "مهارة تجريبية لفحص القوالب البرمجية دون ادعاء تغطية المنهاج.",
  prerequisites: [],
  sourceRef: {
    kind: "foundational_neutral",
    note: "مهارة تقنية للاختبار والتحقق البرمجي فقط.",
  },
  createdAt: "2026-10-29T00:00:00.000Z",
};

export const FIXTURE_DRAG_MATCH_ACTIVITY: DragMatchActivity = {
  id: "fixture-drag-match-01",
  activityId: "80000000-0000-4000-8000-000000000101",
  skillId: "90000000-0000-4000-8000-000000000001",
  buildingKey: "letters",
  building: "letters",
  title: "سحب ومطابقة الحروف",
  subtitle: "عينة تقنية لاختبار قالب السحب والمطابقة",
  icon: "🔤",
  theme: "green",
  version: 1,
  template: "drag_match",
  config: {
    prompt: "طابق كل كلمة بالحرف الذي تبدأ به",
    pairs: [
      {
        draggable: { id: "d1", label: "بَاب", char: "ب" },
        target: { id: "t1", label: "صوت بَ", char: "بَ" },
      },
      {
        draggable: { id: "d2", label: "تُفَّاح", char: "ت" },
        target: { id: "t2", label: "صوت تُ", char: "تُ" },
      },
    ],
    hint: "انظر إلى الحرف الأول في كل بطاقة.",
    scaffolds: [
      {
        level: 1,
        type: "visual_cue",
        text: "لاحظ الحرف الأول الملون بالبداية.",
      },
      {
        level: 2,
        type: "verbal_hint",
        text: "كلمة باب تبدأ بالباء، تفاح يبدأ بالتاء.",
      },
    ],
  },
  questions: [
    {
      prompt: "طابق كل كلمة بالحرف الذي تبدأ به",
      choices: ["بَاب, تُفَّاح", "مطابقة غير مكتملة"],
      answer: "بَاب, تُفَّاح",
      hint: "انظر إلى الحرف الأول في كل بطاقة.",
    },
  ],
  reward: {
    stars: 2,
    planks: 1,
    itemKey: "fixture-letter-tile",
    itemId: "70000000-0000-4000-8000-000000000101",
  },
  sourceRef: {
    kind: "foundational_neutral",
    note: "عينة تقنية محايدة لاختبار قالب السحب والمطابقة - غير خاضعة لاعتماد منهاجي",
  },
};

export const FIXTURE_TRACE_PATH_ACTIVITY: TracePathActivity = {
  id: "fixture-trace-path-01",
  activityId: "80000000-0000-4000-8000-000000000102",
  skillId: "90000000-0000-4000-8000-000000000001",
  buildingKey: "letters",
  building: "letters",
  title: "تتبع رسم الحرف",
  subtitle: "عينة تقنية لاختبار قالب تتبع المسارات",
  icon: "✍️",
  theme: "green",
  version: 1,
  template: "trace_path",
  config: {
    prompt: "تتبع مسار حرف الباء من النقطة الأولى حتى النهاية",
    character: "ب",
    strokePath: "M 40 100 Q 150 160 260 100",
    checkpoints: [
      { x: 40, y: 100, label: "١" },
      { x: 150, y: 145, label: "٢" },
      { x: 260, y: 100, label: "٣" },
    ],
    guideOpacity: 0.25,
    minStrokeLength: 100,
    hint: "ابدأ من اليمين وانزلق بنعومة مع القوس.",
    scaffolds: [
      {
        level: 1,
        type: "visual_cue",
        text: "ضع إصبعك على النقطة (١) واتبع السهم.",
      },
    ],
  },
  questions: [
    {
      prompt: "تتبع مسار حرف الباء من النقطة الأولى حتى النهاية",
      choices: ["ب", "تتبع المسار"],
      answer: "ب",
      hint: "ابدأ من اليمين وانزلق بنعومة مع القوس.",
    },
  ],
  reward: {
    stars: 2,
    planks: 1,
    itemKey: "fixture-quill",
    itemId: "70000000-0000-4000-8000-000000000102",
  },
  sourceRef: {
    kind: "foundational_neutral",
    note: "عينة تقنية محايدة لاختبار قالب تتبع المسار - تفاعل تدريبي واستكشافي",
  },
};

export const FIXTURE_LISTEN_IDENTIFY_ACTIVITY: ListenIdentifyActivity = {
  id: "fixture-listen-identify-01",
  activityId: "80000000-0000-4000-8000-000000000103",
  skillId: "90000000-0000-4000-8000-000000000001",
  buildingKey: "letters",
  building: "letters",
  title: "استمع وميّز الصوت",
  subtitle: "عينة تقنية لاختبار قالب الاستماع والتمييز",
  icon: "👂",
  theme: "green",
  version: 1,
  template: "listen_identify",
  config: {
    prompt: "استمع إلى الصوت واختر الكلمة المطابقة",
    audioText: "بَاب",
    options: [
      { id: "opt-1", label: "بَاب", char: "ب", correct: true },
      { id: "opt-2", label: "تِين", char: "ت", correct: false },
      { id: "opt-3", label: "دَار", char: "د", correct: false },
    ],
    hint: "استمع للصوت الأول: يبدأ بالباء.",
    scaffolds: [
      {
        level: 1,
        type: "verbal_hint",
        text: "الصوت المسموع هو بَاب.",
      },
    ],
  },
  questions: [
    {
      prompt: "استمع إلى الصوت واختر الكلمة المطابقة",
      choices: ["بَاب", "تِين", "دَار"],
      answer: "بَاب",
      hint: "استمع للصوت الأول: يبدأ بالباء.",
    },
  ],
  reward: {
    stars: 2,
    planks: 1,
    itemKey: "fixture-chime",
    itemId: "70000000-0000-4000-8000-000000000103",
  },
  sourceRef: {
    kind: "foundational_neutral",
    note: "عينة تقنية محايدة لاختبار قالب الاستماع والتمييز - يدعم الكتم والتوليف الصوتي",
  },
};

export const ALL_FIXTURE_ACTIVITIES = [
  FIXTURE_DRAG_MATCH_ACTIVITY,
  FIXTURE_TRACE_PATH_ACTIVITY,
  FIXTURE_LISTEN_IDENTIFY_ACTIVITY,
];
