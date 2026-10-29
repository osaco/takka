import { resolveAsset } from '@content/registry';
import { Button, Card, HintBox, ProgressBar } from '@runtime/design';
import type { Activity } from '@domain/content/schema';
import { ActivityStage } from '@runtime/templates';
import { PHASE_LABELS, type SessionPhase } from '@domain/types';
import { useRuntime } from '@runtime/store';

const COMPANION = resolveAsset('svg/companion/fatin.svg');

/**
 * شاشة الجلسة: مرحلة واحدة في كل مرة، بلا عدّاد ولا وقت ولا نقاط.
 * زر «نوقف هون» ظاهر دائماً، وكبير بما يكفي لإصبع طفل في السادسة.
 */
export function SessionScreen() {
  const plan = useRuntime((s) => s.plan);
  const phase = useRuntime((s) => s.phase);
  const activity = useRuntime((s) => s.currentActivity());
  const phaseComplete = useRuntime((s) => s.phaseComplete());
  const activityDone = useRuntime((s) => s.activityDone);
  const nextRound = useRuntime((s) => s.nextRound);
  const lastFeedback = useRuntime((s) => s.lastFeedback);
  const canHint = useRuntime((s) => s.canHint());
  const requestHint = useRuntime((s) => s.requestHint);
  const submit = useRuntime((s) => s.submit);
  const noteAttempt = useRuntime((s) => s.noteAttempt);
  const advancePhase = useRuntime((s) => s.advancePhase);
  const finishSession = useRuntime((s) => s.finishSession);
  const reducedMotion = useRuntime((s) => s.profile?.reducedMotion ?? false);
  const scaffold = useRuntime((s) => s.scaffold);

  if (!plan) {
    return (
      <div className="takka-screen">
        <Card>لا جلسة مفتوحة الآن.</Card>
      </div>
    );
  }

  const spec = plan.phases[phase.index];
  const phaseName: SessionPhase = spec?.phase ?? 'close';
  const isModeling = phaseName === 'model';
  const isClosing = phaseName === 'close';
  const activityKey = `${plan.id}:${phase.index}:${phase.cursor}`;

  return (
    <div className="takka-screen">
      <header className="takka-session-head">
        <div>
          <p className="takka-phase-label">{PHASE_LABELS[phaseName]}</p>
          <ProgressBar
            value={plan.phases.length <= 1 ? 1 : phase.index / (plan.phases.length - 1)}
            label={`المرحلة ${phase.index + 1} من ${plan.phases.length}`}
          />
        </div>
        <Button variant="secondary" className="takka-stop" onClick={() => void finishSession(true)}>
          نوقف هون
        </Button>
      </header>

      {isClosing ? (
        <Card className="takka-close-card">
          <p className="takka-instruction">وصلنا إلى نهاية تكة اليوم. خُذ نفساً هادئاً.</p>
          <Button onClick={() => advancePhase()}>أنهِ بهدوء</Button>
        </Card>
      ) : null}

      {isModeling && activity ? (
        <ModelCard activity={activity} onContinue={() => advancePhase()} />
      ) : null}

      {!isClosing && !isModeling && activity ? (
        <section aria-label={activity.title}>
          <h2 className="takka-section">{activity.title}</h2>
          <p className="takka-instruction">{activity.config.prompt}</p>

          <ActivityStage
            key={activityKey}
            activity={activity}
            activityKey={activityKey}
            onAttempt={(correct) => noteAttempt(correct)}
            onDone={(correct, itemId) => submit(correct, { itemId })}
            reducedMotion={reducedMotion}
          />

          <div className="takka-session-foot">
            {canHint ? (
              <Button variant="secondary" onClick={() => requestHint()}>
                تلميح لطيف
              </Button>
            ) : null}
            {activityDone && !phaseComplete ? (
              <Button onClick={() => nextRound()}>جولة أخرى</Button>
            ) : null}
            {phaseComplete ? <Button onClick={() => advancePhase()}>متابعة</Button> : null}
          </div>
        </section>
      ) : null}

      {!isClosing && !isModeling && !activity ? (
        <Card>لا نشاط لهذه المرحلة بعد. نكمل بهدوء.</Card>
      ) : null}

      {lastFeedback ? (
        <HintBox aria-live="polite" className="takka-feedback">
          {lastFeedback.text}
        </HintBox>
      ) : null}

      {scaffold.level >= 2 && !isModeling && activity ? (
        <HintBox>
          تلميح إضافي: {activity.scaffolding.hint}
        </HintBox>
      ) : null}

      {COMPANION ? (
        <img src={COMPANION} alt="" className="takka-companion" width={96} height={110} />
      ) : null}
    </div>
  );
}

/**
 * مرحلة النمذجة: فطين يحل الخطوة الأولى أمام الطفل، والحل ظاهر بلا اختبار.
 */
function ModelCard({ activity, onContinue }: { activity: Activity; onContinue: () => void }) {
  return (
    <Card className="takka-model-card">
      <div className="takka-model-head">
        {COMPANION ? <img src={COMPANION} alt="" width={64} height={74} /> : null}
        <div>
          <h2 className="takka-section">فطين يريك أولاً</h2>
          <p className="takka-instruction">{activity.config.prompt}</p>
        </div>
      </div>
      <p className="takka-model-answer">{answerReveal(activity)}</p>
      <HintBox>{activity.scaffolding.hint}</HintBox>
      <Button onClick={onContinue}>فهمت، نكمل</Button>
    </Card>
  );
}

/** كشف الحل للنمذجة — نصي دائماً، ولو كان النشاط صورياً. */
export function answerReveal(activity: Activity): string {
  switch (activity.template) {
    case 'listen_identify': {
      const correct = activity.config.options.find((o) => o.correct);
      return correct ? `الجواب: ${correct.label}` : 'الجواب ظاهر في النشاط.';
    }
    case 'drag_match':
      return `نضع كل بطاقة أمام ما يناسبها: ${activity.config.pairs
        .map((p) => `${p.draggable.label} ← ${p.target.label}`)
        .join(' · ')}`;
    case 'balance': {
      const correct = activity.config.rightSide.options.find((o) => o.id === activity.config.correctAnswer);
      return correct ? `الوزن الذي يستوي به الميزان: ${correct.label}` : 'الميزان يستوي عند الوزن الصحيح.';
    }
    case 'trace_path':
      return `نتبع الخط الذهبي لنرسم «${activity.config.character}» من بدايته إلى نهايته.`;
    default:
      return 'الحل ظاهر في النشاط.';
  }
}
