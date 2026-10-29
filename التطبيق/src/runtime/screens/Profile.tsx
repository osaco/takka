import { useState } from 'react';
import { resolveAsset } from '@content/registry';
import { Button, Card } from '@runtime/design';
import { SUGGESTED_NICKNAMES, useRuntime } from '@runtime/store';
import type { Grade } from '@domain/types';

const COMPANION = resolveAsset('svg/companion/fatin.svg');

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
/** المحتوى المنشور الآن للصف الأول فقط؛ ما بعده يظهر بصدق كـ«قريباً». */
const AVAILABLE_GRADES = new Set<Grade>([1]);

/** ملف رمزي بلا هوية: لقب من قائمة جاهزة، لا اسم حقيقي ولا بريد ولا حساب. */
export function ProfileScreen() {
  const createProfile = useRuntime((s) => s.createProfile);
  const profile = useRuntime((s) => s.profile);
  const index = useRuntime((s) => s.index);
  const [nickname, setNickname] = useState<string>(SUGGESTED_NICKNAMES[0]);
  const [grade, setGrade] = useState<Grade>(1);
  const [busy, setBusy] = useState(false);

  const scopeNote = index.packs[0]?.manifest.scopeNote;

  return (
    <div className="takka-screen">
      <header className="takka-profile-head">
        {COMPANION ? <img src={COMPANION} alt="" width={88} height={100} /> : null}
        <div>
          <h1 className="takka-title">من يلعب اليوم؟</h1>
          <p className="takka-instruction">
            اختر لقباً رمزياً. لا نطلب اسماً حقيقياً، ولا نرسل شيئاً إلى الإنترنت.
          </p>
        </div>
      </header>

      <Card>
        <h2 className="takka-section">اللقب</h2>
        <div className="takka-chips" role="group" aria-label="ألقاب جاهزة">
          {SUGGESTED_NICKNAMES.map((name) => (
            <button
              key={name}
              type="button"
              className={`takka-chip ${nickname === name ? 'is-selected' : ''}`}
              aria-pressed={nickname === name}
              onClick={() => setNickname(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="takka-section">الصف</h2>
        <div className="takka-chips" role="group" aria-label="اختيار الصف">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              className={`takka-chip ${grade === g ? 'is-selected' : ''}`}
              aria-pressed={grade === g}
              disabled={!AVAILABLE_GRADES.has(g)}
              onClick={() => setGrade(g)}
            >
              {g}
              {!AVAILABLE_GRADES.has(g) ? <span className="takka-chip-note">قريباً</span> : null}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="takka-section">ما في هذا الإصدار</h2>
        <p className="takka-meta">{scopeNote ?? 'حزم الصف الأول: العربية والرياضيات.'}</p>
        <p className="takka-meta">
          يعمل بلا إنترنت · بلا حساب · بلا إعلانات · بلا قياس سلوك. التقدّم يبقى على هذا الجهاز.
        </p>
      </Card>

      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await createProfile(nickname, grade);
          setBusy(false);
        }}
      >
        {profile ? 'ابدأ من جديد' : 'ابدأ'}
      </Button>
    </div>
  );
}
