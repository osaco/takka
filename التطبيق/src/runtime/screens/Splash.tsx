import { resolveAsset } from '@content/registry';
import { Button, Card } from '@runtime/design';
import { useRuntime } from '@runtime/store';

const COMPANION = resolveAsset('svg/companion/fatin.svg');
const ICON = '/icons/icon.svg';

/**
 * شاشة الإقلاع: تحقق من الحزم، وتخزين دائم إن أمكن.
 * أي خلل في المحتوى يظهر هنا صراحةً ولا يمرّ إلى الطفل.
 */
export function SplashScreen() {
  const booted = useRuntime((s) => s.booted);
  const bootError = useRuntime((s) => s.bootError);
  const boot = useRuntime((s) => s.boot);

  if (bootError) {
    return (
      <div className="takka-screen">
        <Card className="takka-end-card">
          <h1 className="takka-title">وقفنا قبل البداية</h1>
          <p className="takka-instruction">
            حزمة محتوى لم تجتز المدقّق التربوي، وقد مُنع تحميلها. هذا مقصود: لا يصل طفل إلى محتوى غير مُراجَع.
          </p>
          <pre className="takka-error">{bootError}</pre>
        </Card>
        <Button onClick={() => void boot()}>حاول مرة أخرى</Button>
      </div>
    );
  }

  return (
    <div className="takka-screen takka-splash">
      <img src={ICON} alt="تكة" width={132} height={132} className="takka-splash-icon" />
      <h1 className="takka-title">تكة</h1>
      <p className="takka-instruction">خطوة صغيرة كل يوم، بلا ضغط. تعمل بلا إنترنت.</p>
      {COMPANION ? <img src={COMPANION} alt="" width={104} height={120} /> : null}
      <Button disabled={booted} onClick={() => void boot()}>
        {booted ? '…' : 'ابدأ'}
      </Button>
    </div>
  );
}
