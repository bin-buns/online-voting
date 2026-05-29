import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { student_id } = await req.json();
    if (!student_id)
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, student_id")
      .eq("id", student_id)
      .single();

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