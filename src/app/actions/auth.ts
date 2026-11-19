"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLoginOtp } from "@/lib/otp";

export async function signIn(formData: FormData) {
  const email    = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Something went wrong. Try again.");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_active,password_change_deadline").eq("id", user.id).maybeSingle();
  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    redirect("/login?error=This account is deactivated. Please contact the administrator.");
  }
  if (profile?.password_change_deadline && new Date(profile.password_change_deadline).getTime() <= Date.now()) {
    await admin.from("profiles").update({ is_active: false }).eq("id", user.id);
    await supabase.auth.signOut();
    redirect("/login?error=Your temporary password expired. Please contact the administrator to reactivate your account.");
  }

  const result = await sendLoginOtp(user.id, user.email!);
  if (!result.ok) redirect(`/login?error=${encodeURIComponent(result.error!)}`);

  const cookieStore = await cookies();
  cookieStore.set("otp_pending", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  redirect("/verify-otp");
}
