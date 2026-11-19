"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyLoginOtp, sendLoginOtp } from "@/lib/otp";
import { logAudit } from "@/lib/audit";

export async function verifyOtpAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const cookieStore = await cookies();
  const userId = cookieStore.get("otp_pending")?.value;

  if (!userId) redirect("/login");

  const result = await verifyLoginOtp(userId, code);
  if (!result.ok) redirect(`/verify-otp?error=${encodeURIComponent(result.error!)}`);

  const admin = createAdminClient();
  const { data: account } = await admin.from("profiles").select("is_active,is_temporary_password,first_login_at").eq("id", userId).maybeSingle();
  if (account?.is_active === false) {
    cookieStore.delete("otp_pending");
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=This account is deactivated. Please contact the administrator.");
  }
  if (account?.is_temporary_password && !account.first_login_at) {
    const firstLoginAt = new Date();
    const deadline = new Date(firstLoginAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    await admin.from("profiles").update({ first_login_at: firstLoginAt.toISOString(), password_change_deadline: deadline.toISOString() }).eq("id", userId);
  }

  await logAudit({ action: "Login completed", detail: "Login verification code accepted", category: "system" });
  cookieStore.delete("otp_pending");
  cookieStore.set("otp_verified", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).single();

  redirect(profile?.role === "admin" ? "/admin/dashboard" : "/dashboard");
}

export async function resendOtpAction() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("otp_pending")?.value;
  if (!userId) redirect("/login");

  const admin = createAdminClient();
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  if (!userData.user?.email) redirect("/login");

  const result = await sendLoginOtp(userId, userData.user.email);
  if (!result.ok) redirect(`/verify-otp?error=${encodeURIComponent(result.error!)}`);

  redirect("/verify-otp?message=Code resent.");
}
