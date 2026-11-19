import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { getSessionProfile } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  try {
    const { student_id } = await req.json();
    if (!student_id)
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, student_id, role")
      .eq("id", student_id)
      .single();

    if (!profile || !["voter", "candidate"].includes(profile.role)) return NextResponse.json({ error: "Student account not found." }, { status: 404 });

    const { error } = await adminClient.auth.admin.deleteUser(student_id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    await logAudit({
      action:   "Student account deleted",
      detail:   `Deleted account for ${profile?.full_name ?? "Unknown"} (${profile?.student_id ?? student_id})`,
      category: "account",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}