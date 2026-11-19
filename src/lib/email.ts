import "server-only";

/** Server-side EmailJS sender. OTP codes and notifications never go through the browser. */
const ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";
export const EMAILJS_MIN_GAP_MS = 1100;

type TemplateParams = Record<string, string | number>;
export type SendResult = { ok: true } | { ok: false; error: string };

function readConfig() {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!serviceId || !publicKey || !privateKey) return null;
  return { serviceId, publicKey, privateKey };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes plain text before turning line breaks into safe HTML. */
export function textToHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export async function sendEmail(
  templateId: string | undefined,
  params: TemplateParams
): Promise<SendResult> {
  const cfg = readConfig();
  if (!cfg || !templateId) {
    console.error("[email] EmailJS env vars are missing (check .env.local).");
    return { ok: false, error: "Email service is not configured." };
  }

  const body = JSON.stringify({
    service_id: cfg.serviceId,
    template_id: templateId,
    user_id: cfg.publicKey,
    accessToken: cfg.privateKey,
    template_params: params,
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      });
      if (res.ok) return { ok: true };
      if (res.status === 429 && attempt === 0) {
        await sleep(EMAILJS_MIN_GAP_MS * 2);
        continue;
      }
      const detail = await res.text().catch(() => "");
      console.error(`[email] EmailJS ${res.status}: ${detail}`);
      return {
        ok: false,
        error: `EmailJS ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      };
    } catch (err) {
      console.error("[email] network error:", err);
      return { ok: false, error: "Could not reach the email provider." };
    }
  }
  return { ok: false, error: "Email provider is rate limiting requests." };
}

/** Both OTP and announcement email bodies are rendered into one template slot. */
export function sendOtpEmail(opts: { to: string; code: string; expiryMinutes: number }) {
  const contentHtml = [
    '<p style="color:#1a2e1f;">Your login verification code is:</p>',
    `<p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1a2e1f;margin:16px 0;">${escapeHtml(opts.code)}</p>`,
    `<p style="color:#64748b;font-size:13px;">This code expires in ${opts.expiryMinutes} minutes. If you did not request this, ignore this email.</p>`,
  ].join("");

  return sendEmail(process.env.EMAILJS_TEMPLATE_ID, {
    to_email: opts.to,
    subject: "Your login verification code",
    content_html: contentHtml,
    app_name: "Smart Voting System",
  });
}

export function sendNotificationEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  heading: string;
  message: string;
  headerColor?: string;
}) {
  const color = /^#[0-9a-fA-F]{6}$/.test(opts.headerColor ?? "")
    ? opts.headerColor!
    : "#0d6b34";
  const contentHtml = [
    `<h3 style="color:#1a2e1f;margin:0 0 12px;">${textToHtml(opts.heading)}</h3>`,
    `<div style="color:#1a2e1f;font-size:14px;line-height:1.6;">${textToHtml(opts.message)}</div>`,
    `<hr style="border:none;border-top:2px solid ${color};margin:20px 0 0;">`,
  ].join("");

  return sendEmail(process.env.EMAILJS_TEMPLATE_ID, {
    to_email: opts.to,
    to_name: opts.toName ?? "",
    subject: opts.subject,
    content_html: contentHtml,
    app_name: "Smart Voting System",
  });
}

export function sendTemporaryPasswordEmail(opts: {
  to: string;
  toName: string;
  studentId: string;
  temporaryPassword: string;
}) {
  const message = [
    `Hello ${opts.toName},`,
    "Your student account for the Smart Voting System is ready.",
    `Student ID: ${opts.studentId}`,
    `Login email: ${opts.to}`,
    `Temporary password: ${opts.temporaryPassword}`,
    "Please change this temporary password within 15 days after your first successful login. If you miss the deadline, your account will be deactivated and you will need to contact the administrator.",
  ].join("\n\n");

  return sendNotificationEmail({
    to: opts.to,
    toName: opts.toName,
    subject: "Your Smart Voting System account details",
    heading: "Your student account is ready",
    message,
  });
}
