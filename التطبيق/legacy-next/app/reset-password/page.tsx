import { ResetPasswordForm } from "@/components/reset-password-form";
import { redirect } from "next/navigation";
import { isCloudAccountsEnabled } from "@/lib/supabase/env";

export default function ResetPasswordPage() {
  if (!isCloudAccountsEnabled()) redirect("/");
  return <ResetPasswordForm />;
}
