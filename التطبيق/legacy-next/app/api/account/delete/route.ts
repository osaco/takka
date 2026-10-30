import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCloudAccountsEnabled } from "@/lib/supabase/env";

export async function DELETE() {
  if (!isCloudAccountsEnabled()) return NextResponse.json({ error: "حسابات الأسرة غير مفعّلة في هذه النسخة." }, { status: 404 });

  const sessionClient = await createClient();
  if (!sessionClient) return NextResponse.json({ error: "خدمة الحسابات غير جاهزة." }, { status: 503 });

  const { data: { user }, error: userError } = await sessionClient.auth.getUser();
  if (userError || !user?.email || !user.email_confirmed_at) {
    return NextResponse.json({ error: "سجّل الدخول ببريد مؤكد قبل حذف الحساب." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return NextResponse.json({ error: "إعداد الحذف الآمن غير متوفر." }, { status: 503 });

  const admin = createSupabaseAdmin(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
  if (deletionError) return NextResponse.json({ error: "تعذر حذف الحساب. لم نحذف بياناته." }, { status: 500 });

  let noticeSent = false;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (resendKey && from) {
    try {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from,
        to: user.email,
        subject: "تأكيد حذف حساب تكة",
        html: "<div dir=\"rtl\" style=\"font-family:Arial,sans-serif;color:#173f38;line-height:1.8\"><h2>تم حذف حساب تكة</h2><p>حُذف حساب ولي الأمر وملفات الأسرة المرتبطة به بناءً على طلبك.</p><p>إذا لم تطلب الحذف، تواصل مع فريق تكة.</p></div>",
      });
      noticeSent = !error;
    } catch {
      noticeSent = false;
    }
  }

  return NextResponse.json({ deleted: true, noticeSent });
}
