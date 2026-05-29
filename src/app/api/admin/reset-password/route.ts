import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { student_id, new_password } = await req.json();

    if (!new_password || new_password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .eq("id", student_id)
      .single();

    if (!profile)
      return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const { error } = await adminClient.auth.admin.updateUserById(
      profile.id,
      { password: new_password }
    );

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    await logAudit({
      action:   "Password reset",
      detail:   `Reset password for ${profile.full_name}`,
      category: "account",
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}