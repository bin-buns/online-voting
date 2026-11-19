import "server-only";
import crypto from "crypto";
import { sendOtpEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const MIN_RESEND_INTERVAL_SECONDS = 60;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  // 6-digit numeric code, zero-padded
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Generates a new OTP for this user, stores its hash, and emails it via EmailJS.
 * Rate-limited: refuses to send again within MIN_RESEND_INTERVAL_SECONDS
 * of the last code for the same user, to protect the EmailJS monthly quota.
 */
export async function sendLoginOtp(userId: string, email: string) {
  const admin = createAdminClient();

  const { data: recent } = await admin
    .from("login_otps")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    const secondsSinceLast = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
    if (secondsSinceLast < MIN_RESEND_INTERVAL_SECONDS) {
      return {
        ok: false,
        error: `Please wait ${Math.ceil(MIN_RESEND_INTERVAL_SECONDS - secondsSinceLast)}s before requesting another code.`,
      };
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { data: inserted, error: insertError } = await admin
    .from("login_otps")
    .insert({
      user_id: userId,
      code_hash: hashCode(code),
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: "Could not generate login code. Try again." };
  }

  const sent = await sendOtpEmail({ to: email, code, expiryMinutes: OTP_EXPIRY_MINUTES });

  if (!sent.ok) {
    // Remove the unusable code so the 60s resend cooldown doesn't lock the user out.
    await admin.from("login_otps").delete().eq("id", inserted.id);
    // In development, show the real EmailJS reason on the login page to speed up setup.
    const reason = process.env.NODE_ENV !== "production" ? ` (${sent.error})` : "";
    return { ok: false, error: `Failed to send login code email. Try again.${reason}` };
  }

  return { ok: true };
}

/**
 * Verifies a submitted code against the most recent unconsumed OTP for
 * this user. Enforces expiry and a max-attempts lockout per code.
 */
export async function verifyLoginOtp(userId: string, submittedCode: string) {
  const admin = createAdminClient();

  const { data: otp } = await admin
    .from("login_otps")
    .select("*")
    .eq("user_id", userId)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return { ok: false, error: "No active code found. Request a new one." };

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Code expired. Request a new one." };
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many incorrect attempts. Request a new code." };
  }

  if (hashCode(submittedCode) !== otp.code_hash) {
    await admin.from("login_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return { ok: false, error: "Incorrect code." };
  }

  await admin.from("login_otps").update({ consumed: true }).eq("id", otp.id);
  return { ok: true };
}
