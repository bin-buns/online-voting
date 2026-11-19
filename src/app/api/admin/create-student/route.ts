import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { emailPendingNotificationsForUser } from "@/lib/notify-email";
import { getSessionProfile } from "@/lib/auth";
import { sendTemporaryPasswordEmail } from "@/lib/email";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function makeTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return `Tsc-${Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 20)}!`;
}

export async function POST(req: NextRequest) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  try {
    const { first_name, middle_name, last_name, suffix, student_id, section, strand, email } = await req.json();
    if ([first_name, last_name, student_id, email].some((value) => typeof value !== "string")) return NextResponse.json({ error: "First name, last name, student ID, and email are required." }, { status: 400 });

    const firstName = first_name.trim();
    const middleName = typeof middle_name === "string" ? middle_name.trim() : "";
    const lastName = last_name.trim();
    const submittedSuffix = typeof suffix === "string" ? suffix.trim() : "N/A";
    const allowedSuffixes = new Set(["N/A", "Jr.", "Sr.", "II", "III", "IV"]);
    if (!allowedSuffixes.has(submittedSuffix)) return NextResponse.json({ error: "Select a valid suffix." }, { status: 400 });
    const normalizedSuffix = submittedSuffix === "N/A" ? "" : submittedSuffix;
    const sectionValue = typeof section === "string" ? section.trim() : "";
    const strandValue = typeof strand === "string" ? strand.trim() : "";
    if (strandValue && !["ICT", "STEM", "ABM", "HUMSS"].includes(strandValue)) return NextResponse.json({ error: "Select one of the available strands: ICT, STEM, ABM, or HUMSS." }, { status: 400 });
    const full_name = [firstName, middleName, lastName, normalizedSuffix].filter(Boolean).join(" ");
    const password = makeTemporaryPassword();

    // ── Validation ──────────────────────────────────────────────────────
    if (!firstName || !lastName)
      return NextResponse.json({ error: "First name and last name are required." }, { status: 400 });
    if (!student_id?.trim())
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    if (!email?.trim() || !isValidEmail(email))
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    // ── Initialize clients ───────────────────────────────────────────────
    const supabase    = await createClient();
    const adminClient = createAdminClient();

    // ── Check if student_id already exists ───────────────────────────────
    const { data: existingById } = await supabase
      .from("profiles")
      .select("id, student_id")
      .ilike("student_id", student_id.trim())
      .maybeSingle();

    if (existingById)
      return NextResponse.json(
        { error: `Student ID ${student_id} is already registered.` },
        { status: 400 }
      );

    // ── Check if email already exists ────────────────────────────────────
    const normalizedEmail = email.trim().toLowerCase();
    let emailExists = false;
    for (let page = 1; page <= 100; page++) {
      const { data: usersPage, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (listError) return NextResponse.json({ error: "Unable to verify whether this email is already registered." }, { status: 500 });
      emailExists = usersPage.users.some((u) => u.email?.toLowerCase() === normalizedEmail);
      if (emailExists || usersPage.users.length < 1000) break;
    }

    if (emailExists)
      return NextResponse.json(
        { error: `Email ${email} is already registered.` },
        { status: 400 }
      );

    // ── Create auth user ─────────────────────────────────────────────────
    const { data, error: authError } = await adminClient.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name:  full_name.trim(),
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        suffix: normalizedSuffix || null,
        student_id: student_id.trim(),
        section:    sectionValue,
        strand:     strandValue,
        role:       "voter",
        temporary_password: true,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // ── Manually upsert profile as backup in case trigger fails ──────────
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id:         data.user.id,
        full_name:  full_name.trim(),
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        suffix: normalizedSuffix || null,
        student_id: student_id.trim(),
        section:    sectionValue || null,
        strand:     strandValue || null,
        role:       "voter",
        is_active: true,
        is_temporary_password: true,
        first_login_at: null,
        password_change_deadline: null,
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      await adminClient.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Account could not be saved to the student profile list." }, { status: 500 });
    }

    const credentialEmail = await sendTemporaryPasswordEmail({
      to: normalizedEmail,
      toName: full_name.trim(),
      studentId: student_id.trim(),
      temporaryPassword: password,
    });

    await logAudit({
      action:   "Student account created",
      detail:   `Created account for ${full_name.trim()} (${student_id.trim()}) — ${normalizedEmail}; temporary password email ${credentialEmail.ok ? "sent" : "failed"}`,
      category: "account",
    });

    // Include email-enabled announcements posted before this student account existed.
    await emailPendingNotificationsForUser(data.user.id);

    return NextResponse.json({
      id: data.user.id,
      success: true,
      temporary_password: password,
      full_name,
      email_sent: credentialEmail.ok,
      email_error: credentialEmail.ok ? undefined : credentialEmail.error,
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
