import { useRef, useState } from 'react';
import { Button, Card } from '@runtime/design';
import { useRuntime } from '@runtime/store';
import { SKILL_STATE_LABELS, SUBJECT_LABELS } from '@domain/types';
import { DAY_MS } from '@domain/types';
import { templateCounts } from '@content/registry';

/**
 * شاشة وليّ الأمر: شفافية كاملة، وبلا إرسال أي شيء إلى أي مكان.
 * تصدير/استيراد ملف JSON محلي، وحذف كامل عند الطلب.
 */
export function ParentScreen() {
  const index = useRuntime((s) => s.index);
  const profile = useRuntime((s) => s.profile);
  const mastery = useRuntime((s) => s.mastery);
  const sessions = useRuntime((s) => s.sessions);
  const reports = useRuntime((s) => s.reports);
  const notice = useRuntime((s) => s.notice);
  const go = useRuntime((s) => s.go);
  const updateProfile = useRuntime((s) => s.updateProfile);
  const deleteProfile = useRuntime((s) => s.deleteProfile);
  const exportProgress = useRuntime((s) => s.exportProgress);
  const importProgress = useRuntime((s) => s.importProgress);
  const saveLocalReport = useRuntime((s) => s.saveLocalReport);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const masteredSkills = index.skills.filter((s) => mastery[s.id]?.mastered);
  const needsReview = index.skills.filter((s) => mastery[s.id]?.needsReview);
  const touched = index.skills.filter((s) => (mastery[s.id]?.state ?? 'not_reached') !== 'not_reached');
  const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.durationMs, 0) / 60000);

  return (
    <div className="takka-screen">
      <header className="takka-map-head">
        <h1 className="takka-title">للكبار</h1>
        <Button variant="secondary" onClick={() => go('map')}>
          عودة
        </Button>
      </header>

      {notice ? (
        <div className="takka-notice" role="status">
          {notice}
        </div>
      ) : null}

      <Card>
        <h2 className="takka-section">الملف الرمزي</h2>
        <p className="takka-meta">
          اللقب: {profile?.nickname ?? '—'} · الصف: {profile?.grade ?? '—'} · أُنشئ قبل{' '}
          {profile ? Math.max(0, Math.round((Date.now() - profile.createdAt) / DAY_MS)) : 0} يوم
        </p>
        <label className="takka-toggle">
          <input
            type="checkbox"
            checked={profile?.audioEnabled ?? true}
            onChange={(e) => void updateProfile({ audioEnabled: e.target.checked })}
          />
          تشغيل الصوت إن توفّر
        </label>
        <label className="takka-toggle">
          <input
            type="checkbox"
            checked={profile?.reducedMotion ?? false}
            onChange={(e) => void updateProfile({ reducedMotion: e.target.checked })}
          />
          تقليل الحركة
        </label>
      </Card>

      <Card>
        <h2 className="takka-section">التقدّم</h2>
        <p className="takka-meta">
          جلسات: {sessions.length} · وقت مجموع: {totalMinutes} دقيقة · خطوات لُمست: {touched.length} من{' '}
          {index.skills.length}
        </p>
        <p className="takka-meta">مُتقنة (3 نجاحات مستقلة في يومين مختلفين): {masteredSkills.length}</p>
        <ul className="takka-list">
          {index.skills.map((skill) => {
            const m = mastery[skill.id];
            const state = m?.state ?? 'not_reached';
            return (
              <li key={skill.id}>
                <span className="takka-subject-tag">{SUBJECT_LABELS[skill.subject]}</span> {skill.title} —{' '}
                {SKILL_STATE_LABELS[state]}
                {m?.needsReview ? ' · تحتاج مراجعة' : ''}
              </li>
            );
          })}
        </ul>
        {needsReview.length > 0 ? (
          <p className="takka-meta">
            {needsReview.length} مهارة مرّ عليها أكثر من 21 يوماً بلا نجاح مستقل. لا يُحذف شيء؛ تُقترح مراجعة لطيفة فقط.
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="takka-section">المحتوى ومصادره</h2>
        {index.packs.map((pack) => (
          <div key={pack.manifest.id} className="takka-pack">
            <p className="takka-meta">
              {pack.manifest.title} — {pack.manifest.edition} · حالة التدقيق: {pack.manifest.auditStatus}
            </p>
            <p className="takka-meta">{pack.manifest.scopeNote}</p>
            <p className="takka-meta">
              {pack.skills.length} مهارة · {pack.activities.length} نشاط · القوالب:{' '}
              {Object.entries(templateCounts(index))
                .map(([k, v]) => `${k}=${v}`)
                .join(' ')}
            </p>
          </div>
        ))}
        <p className="takka-meta">
          كل نشاط يحمل مصدره ورقم وحدته. ما لم يُراجَع بشرياً يظهر هنا بصراحة، ولا يُنشر بوصفه نهائياً.
        </p>
      </Card>

      <Card>
        <h2 className="takka-section">نسخ احتياطي محلي</h2>
        <div className="takka-row">
          <Button
            onClick={async () => {
              const blob = await exportProgress();
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `takka-progress-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            تصدير JSON
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            استيراد JSON
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await importProgress(file);
            if (fileRef.current) fileRef.current.value = '';
          }}
        />
      </Card>

      <Card>
        <h2 className="takka-section">ملاحظة أو بلاغ خطأ</h2>
        <textarea
          className="takka-textarea"
          rows={3}
          value={message}
          placeholder="مثال: كلمة «رُمَّان» في نشاط الراء تحتاج تشكيلاً أوضح."
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          disabled={message.trim().length < 4}
          onClick={async () => {
            await saveLocalReport(message.trim());
            setMessage('');
          }}
        >
          احفظ الملاحظة على الجهاز
        </Button>
        <p className="takka-meta">
          الملاحظات تبقى محلياً ({reports.length} محفوظة)، ولا تُرسل تلقائياً. يمكن تصديرها مع ملف التقدّم.
        </p>
      </Card>

      <Card>
        <h2 className="takka-section">الخصوصية</h2>
        <ul className="takka-list">
          <li>لا حساب، لا بريد، لا اسم حقيقي.</li>
          <li>لا شبكة أثناء الاستخدام، ولا تتبّع، ولا إعلانات.</li>
          <li>لا قياس زمن لكل إجابة، ولا نتائج تُقارن بين الأطفال.</li>
          <li>الحذف كامل ومتاح: زر الحذف يزيل الملف وكل أدلّته.</li>
        </ul>
        <Button
          variant="secondary"
          onClick={async () => {
            await deleteProfile();
          }}
        >
          احذف هذا الملف الرمزي نهائياً
        </Button>
      </Card>
    </div>
  );
}
