import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/types/database";

export async function getSessionProfile(): Promise<{
  user: { id: string; email?: string };
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Require OTP verification, even if Supabase already sees a valid password session
  const cookieStore = await cookies();
  const otpVerified = cookieStore.get("otp_verified")?.value;
  if (otpVerified !== user.id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const typedProfile = profile as Profile;
  if (typedProfile.is_active === false) return null;
  if (typedProfile.is_temporary_password && typedProfile.password_change_deadline && new Date(typedProfile.password_change_deadline).getTime() <= Date.now()) {
    await createAdminClient().from("profiles").update({ is_active: false }).eq("id", user.id);
    return null;
  }

  return { user: { id: user.id, email: user.email }, profile: typedProfile };
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  if (allowedRoles && !allowedRoles.includes(session.profile.role)) {
    redirect("/dashboard");
  }

  return session;
}
