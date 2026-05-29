import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { user: { id: user.id, email: user.email }, profile: profile as Profile };
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  if (allowedRoles && !allowedRoles.includes(session.profile.role)) {
    redirect("/dashboard");
  }

  return session;
}
