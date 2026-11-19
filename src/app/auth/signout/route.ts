import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const supabase = await createClient();
  await logAudit({ action: "Logout", detail: "User signed out", category: "system" });
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete("otp_verified");
  cookieStore.delete("otp_pending");

  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  return NextResponse.redirect(new URL("/login", origin));
}