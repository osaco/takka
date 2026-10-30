"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("خدمة الحسابات غير مربوطة بعد.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError("انتهت صلاحية الرابط أو تعذر تحديث كلمة المرور. اطلب رابطاً جديداً.");
    else setMessage("تم تحديث كلمة المرور. تقدر ترجع إلى حسابك.");
  }

  return (
    <main className="reset-shell">
      <div className="reset-card">
        <div className="auth-emblem"><LockKeyhole size={22} /></div>
        <p className="eyebrow">مساحة ولي الأمر</p>
        <h1>كلمة مرور جديدة</h1>
        <p className="auth-intro">اختر كلمة مرور جديدة لحساب ولي الأمر.</p>
        <form className="auth-form" onSubmit={submit}>
          <label className="field-label" htmlFor="new-password">كلمة المرور الجديدة</label>
          <input id="new-password" className="plain-input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <label className="field-label" htmlFor="confirm-password">تأكيد كلمة المرور</label>
          <input id="confirm-password" className="plain-input" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {message && <p className="form-message form-success" role="status">{message}</p>}
          <button className="button button-primary auth-submit" disabled={busy} type="submit">{busy ? "جارٍ التحديث…" : "حفظ كلمة المرور"}<ArrowRight size={17} /></button>
        </form>
        <Link className="text-link" href="/">العودة إلى تكة</Link>
      </div>
    </main>
  );
}
