import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { student_id?: string; is_active?: boolean } | null;
  if (!body?.student_id || typeof body.is_active !== "boolean") return NextResponse.json({ error: "Student and account status are required." }, { status: 400 });
  const admin = createAdminClient();
  const { data: student, error: lookupError } = await admin.from("profiles").select("id,full_name,role,is_temporary_password,password_change_deadline").eq("id", body.student_id).maybeSingle();
  if (lookupError || !student) return NextResponse.json({ error: "Student account not found." }, { status: 404 });
  if (body.is_active && student.is_temporary_password && student.password_change_deadline && new Date(student.password_change_deadline).getTime() <= Date.now()) {
    return NextResponse.json({ error: "This temporary password expired. Reset the password before reactivating the account." }, { status: 400 });
  }
  const { error } = await admin.from("profiles").update({ is_active: body.is_active }).eq("id", body.student_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({ action: body.is_active ? "Student account reactivated" : "Student account deactivated", detail: `${body.is_active ? "Reactivated" : "Deactivated"} ${student.full_name}`, category: "account" });
  return NextResponse.json({ success: true });
}
