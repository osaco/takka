"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import type { AuthPanelMode } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  mode: AuthPanelMode;
  configured: boolean;
  onModeChange: (mode: AuthPanelMode) => void;
  onClose: () => void;
  onAuthenticated: (user: { id: string; email: string }) => void;
};

const TITLES: Record<AuthPanelMode, string> = {
  "sign-in": "عودة إلى جزيرتك",
  "sign-up": "افتح حساب ولي الأمر",
  forgot: "نرسل لك طريق العودة",
};

export function AuthPanel({ mode, configured, onModeChange, onClose, onAuthenticated }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");

    if (!configured) {
      setError("تسجيل الدخول يحتاج ربط مشروع Supabase الخاص بتكة. تقدر تجرّب الجزيرة كزائر الآن.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("تعذر الاتصال بخدمة الحسابات. تحقق من إعدادات البيئة المحلية.");
      setBusy(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    try {
      if (mode === "sign-up") {
        if (password !== confirmPassword) {
          setError("كلمتا المرور غير متطابقتين.");
          setBusy(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          if (!data.user) throw new Error("لم يرجع خادم الحساب معلومات ولي الأمر.");
          onAuthenticated({ id: data.user.id, email: cleanEmail });
        } else {
          setNotice("أرسلنا رسالة تأكيد إلى بريد ولي الأمر. افتحها لتكمل إعداد الأسرة.");
        }
      } else if (mode === "sign-in") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (signInError) throw signInError;
        onAuthenticated({ id: data.user.id, email: cleanEmail });
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (resetError) throw resetError;
        setNotice("إذا كان هذا البريد مسجلاً، ستصلك رسالة استعادة الحساب.");
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "حصل خطأ غير متوقع. جرّب مرة ثانية.";
      setError(localizeAuthError(message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-card" aria-labelledby="auth-title" role="dialog" aria-modal="true">
        <button className="icon-button auth-close" type="button" onClick={onClose} aria-label="إغلاق">×</button>
        <div className="auth-emblem"><LockKeyhole size={22} strokeWidth={1.8} /></div>
        <p className="eyebrow">مساحة ولي الأمر</p>
        <h2 id="auth-title">{TITLES[mode]}</h2>
        <p className="auth-intro">
          {mode === "forgot"
            ? "اكتب بريد ولي الأمر المسجل، ونرسل إليه رابطاً آمناً لإعادة تعيين كلمة المرور."
            : "حساب الكبار يحفظ رحلة الأسرة. الطفل يدخل بلقبه ورمزه فقط، من دون بريد أو كلمة مرور."}
        </p>

        <form onSubmit={submit} className="auth-form">
          <label className="field-label" htmlFor="guardian-email">بريد ولي الأمر</label>
          <div className="input-wrap" dir="ltr">
            <Mail size={18} aria-hidden="true" />
            <input
              id="guardian-email"
              autoComplete="email"
              type="email"
              inputMode="email"
              placeholder="parent@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {mode !== "forgot" && <>
            <label className="field-label" htmlFor="guardian-password">كلمة المرور</label>
            <div className="input-wrap" dir="ltr">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="guardian-password"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                type={showPassword ? "text" : "password"}
                minLength={8}
                placeholder="ثمانية أحرف على الأقل"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button className="field-icon-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </>}

          {mode === "sign-up" && <>
            <label className="field-label" htmlFor="guardian-password-confirm">تأكيد كلمة المرور</label>
            <div className="input-wrap" dir="ltr">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="guardian-password-confirm"
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                minLength={8}
                placeholder="أعد كتابة كلمة المرور"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          </>}

          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {notice && <p className="form-message form-success" role="status">{notice}</p>}

          <button className="button button-primary auth-submit" type="submit" disabled={busy}>
            {busy ? "لحظة من فضلك…" : mode === "sign-up" ? "إنشاء حساب ولي الأمر" : mode === "forgot" ? "إرسال رابط الاستعادة" : "تسجيل الدخول"}
            {!busy && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </form>

        <div className="auth-links">
          {mode === "sign-in" && <button type="button" onClick={() => { setNotice(""); setError(""); onModeChange("forgot"); }}>نسيت كلمة المرور؟</button>}
          {mode !== "sign-in" && <button type="button" onClick={() => { setNotice(""); setError(""); onModeChange("sign-in"); }}>العودة لتسجيل الدخول</button>}
          {mode === "sign-in" && <p>أول مرة معنا؟ <button type="button" onClick={() => { setNotice(""); setError(""); onModeChange("sign-up"); }}>أنشئ حساباً</button></p>}
          {mode === "sign-up" && <p>لديك حساب بالفعل؟ <button type="button" onClick={() => { setNotice(""); setError(""); onModeChange("sign-in"); }}>سجّل الدخول</button></p>}
        </div>
        <p className="privacy-footnote">نستخدم البريد للحسابات ورسائل الأمان الموجهة لولي الأمر فقط.</p>
      </section>
    </div>
  );
}

function localizeAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "البريد أو كلمة المرور غير صحيحة.";
  if (normalized.includes("email not confirmed")) return "أكد البريد من الرسالة التي أرسلناها قبل تسجيل الدخول.";
  if (normalized.includes("user already registered")) return "هذا البريد لديه حساب. جرّب تسجيل الدخول.";
  if (normalized.includes("password should be at least")) return "كلمة المرور تحتاج إلى ثمانية أحرف على الأقل.";
  if (normalized.includes("email rate limit")) return "وصلنا إلى حد إرسال الرسائل مؤقتاً. انتظر قليلاً ثم أعد المحاولة.";
  return "تعذر إكمال الطلب. تحقق من البيانات أو جرّب بعد قليل.";
}
