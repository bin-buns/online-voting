import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string) {
  return password.length >= 8;
}

export async function POST(req: NextRequest) {
  console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ loaded" : "✗ MISSING");
  console.log("SERVICE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ loaded" : "✗ MISSING");

  try {
    const { full_name, student_id, section, strand, email, password } = await req.json();

    // ── Validation ──────────────────────────────────────────────────────
    if (!full_name?.trim())
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    if (!student_id?.trim())
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    if (!email?.trim() || !isValidEmail(email))
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    if (!password || !isValidPassword(password))
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    // ── Initialize clients ───────────────────────────────────────────────
    const supabase    = await createClient();
    const adminClient = createAdminClient();

    // ── Check if student_id already exists ───────────────────────────────
    const { data: existingById } = await supabase
      .from("profiles")
      .select("id, student_id")
      .eq("student_id", student_id.trim())
      .maybeSingle();

    if (existingById)
      return NextResponse.json(
        { error: `Student ID ${student_id} is already registered.` },
        { status: 400 }
      );

    // ── Check if email already exists ────────────────────────────────────
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

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
        student_id: student_id.trim(),
        section:    section?.trim() ?? "",
        strand:     strand?.trim()  ?? "",
        role:       "voter",
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
        student_id: student_id.trim(),
        section:    section?.trim() || null,
        strand:     strand?.trim()  || null,
        role:       "voter",
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
    }

    await logAudit({
      action:   "Student account created",
      detail:   `Created account for ${full_name.trim()} (${student_id.trim()}) — ${email.trim()}`,
      category: "account",
    });

    return NextResponse.json({ id: data.user.id, success: true });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}