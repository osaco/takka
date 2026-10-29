import { resolveAsset } from '@content/registry';
import { Button, Card } from '@runtime/design';
import { useRuntime } from '@runtime/store';
import { closingMessage } from '@domain/session/end';
import { nextReviewAt } from '@domain/review/spaced-repetition';
import { DAY_MS } from '@domain/types';

const COMPANION = resolveAsset('svg/companion/fatin.svg');

/**
 * نهاية الجلسة: جملة إغلاق آمنة، بلا درجة ولا وقت ولا مقارنة.
 * «نوقف هون» يُعرض كخيار كامل، لا كخروج ناقص.
 */
export function EndScreen() {
  const masteredThisSession = useRuntime((s) => s.masteredThisSession);
  const notice = useRuntime((s) => s.notice);
  const go = useRuntime((s) => s.go);
  const openIsland = useRuntime((s) => s.openIsland);
  const profile = useRuntime((s) => s.profile);
  const mastery = useRuntime((s) => s.mastery);
  const sessions = useRuntime((s) => s.sessions);

  const last = sessions[sessions.length - 1];
  const message = closingMessage(last?.stoppedByChild ?? false, masteredThisSession);

  const upcoming = Object.values(mastery)
    .map((m) => ({ m, at: nextReviewAt(m) }))
    .filter((entry) => entry.at !== null)
    .sort((a, b) => (a.at as number) - (b.at as number))[0];

  const daysUntil =
    upcoming && upcoming.at !== null ? Math.max(0, Math.ceil((upcoming.at - Date.now()) / DAY_MS)) : null;

  return (
    <div className="takka-screen">
      <Card className="takka-end-card">
        <h1 className="takka-title">{message}</h1>
        {masteredThisSession > 0 ? (
          <p className="takka-instruction">
            {masteredThisSession} خطوة ازدهرت اليوم. الإتقان يحتاج 3 نجاحات مستقلة في يومين مختلفين — وقد بدأناها.
          </p>
        ) : (
          <p className="takka-instruction">
            كل محاولة تُحسب خطوة إلى الأمام. نعود متى شئت.
          </p>
        )}
        {notice ? <p className="takka-meta">{notice}</p> : null}
        {daysUntil !== null ? (
          <p className="takka-meta">
            المراجعة القادمة اللطيفة بعد {daysUntil} يوم. لا شيء يُحذف، والتقدّم محفوظ.
          </p>
        ) : null}
      </Card>

      {COMPANION ? <img src={COMPANION} alt="" width={96} height={110} /> : null}

      <div className="takka-row">
        <Button onClick={() => go('map')}>إلى الخريطة</Button>
        <Button variant="secondary" onClick={() => openIsland(null)}>
          كل الجزر
        </Button>
      </div>

      <p className="takka-meta">
        {profile?.nickname ? `تقدّم ${profile.nickname} ` : 'التقدّم '}محفوظ على هذا الجهاز، ويمكن لوليّ الأمر تصديره
        من شاشة «للكبار».
      </p>
    </div>
  );
}
