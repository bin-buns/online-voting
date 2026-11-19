import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { getSessionProfile } from "@/lib/auth";
import { sendTemporaryPasswordEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  try {
    const { student_id } = await req.json();
    if (typeof student_id !== "string" || !student_id) return NextResponse.json({ error: "Student account is required." }, { status: 400 });
    const random = crypto.getRandomValues(new Uint8Array(15));
    const temporaryPassword = `Tsc-${Array.from(random, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 20)}!`;

    const adminClient = createAdminClient();
    const { data: authUserData, error: authLookupError } = await adminClient.auth.admin.getUserById(student_id);
    if (authLookupError || !authUserData.user) return NextResponse.json({ error: "Student authentication account not found." }, { status: 404 });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", student_id)
      .single();

    if (!profile)
      return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const { error } = await adminClient.auth.admin.updateUserById(
      profile.id,
      { password: temporaryPassword, user_metadata: { ...authUserData.user.user_metadata, temporary_password: true } }
    );

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    const { error: profileUpdateError } = await adminClient.from("profiles").update({ is_active: true, is_temporary_password: true, first_login_at: null, password_change_deadline: null }).eq("id", profile.id);
    if (profileUpdateError) return NextResponse.json({ error: "Password reset, but the student profile could not be reactivated." }, { status: 500 });

    const credentialEmail = authUserData.user.email
      ? await sendTemporaryPasswordEmail({ to: authUserData.user.email, toName: profile.full_name, studentId: student_id, temporaryPassword })
      : { ok: false as const, error: "The student account has no email address." };

    await logAudit({
      action:   "Password reset",
      detail:   `Reset password for ${profile.full_name}; temporary password email ${credentialEmail.ok ? "sent" : "failed"}`,
      category: "account",
    });

    return NextResponse.json({ success: true, temporary_password: temporaryPassword, email_sent: credentialEmail.ok, email_error: credentialEmail.ok ? undefined : credentialEmail.error });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
