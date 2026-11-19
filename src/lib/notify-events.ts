import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email";
import { getRecipientEmails } from "@/lib/notify-email";

/**
 * Event emails (candidacy submitted / approved / rejected).
 * Every function here swallows its own errors: an email problem must never
 * break the action that triggered it.
 */

// Set to false if you don't want admins emailed for every new application
// (saves your EmailJS monthly quota).
const NOTIFY_ADMINS_ON_APPLICATION = true;

const GREEN = "#0d6b34";
const RED = "#be123c";
const AMBER = "#b45309";

async function getPositionName(positionId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("positions").select("name").eq("id", positionId).single();
  return data?.name ?? "the position";
}

async function getUserContact(userId: string) {
  const admin = createAdminClient();
  const [{ data: userData }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select("full_name").eq("id", userId).single(),
  ]);
  return { email: userData.user?.email ?? null, name: (profile?.full_name as string | undefined) ?? "" };
}

/** Student submitted a candidacy → confirm to the student, alert the admin(s). */
export async function notifyCandidacySubmitted(userId: string, positionId: string) {
  try {
    const [{ email, name }, positionName] = await Promise.all([
      getUserContact(userId),
      getPositionName(positionId),
    ]);

    if (email) {
      await sendNotificationEmail({
        to: email,
        toName: name,
        subject: "We received your candidacy application",
        heading: "Application received",
        message:
          `Hi ${name || "there"},\n\nYour application for ${positionName} has been submitted and is now pending review by the election administrator. ` +
          `You'll receive another email as soon as a decision is made.`,
        headerColor: AMBER,
      });
    }

    if (NOTIFY_ADMINS_ON_APPLICATION) {
      const adminEmails = await getRecipientEmails("admin");
      for (const to of adminEmails) {
        await sendNotificationEmail({
          to,
          subject: `New candidacy application: ${name || "A student"}`,
          heading: "New application to review",
          message: `${name || "A student"} applied for ${positionName}.\n\nOpen the Admin → Candidacy page to approve or reject it.`,
          headerColor: GREEN,
        });
        await new Promise((r) => setTimeout(r, 1100)); // EmailJS: ~1 request/second
      }
    }
  } catch (err) {
    console.error("[notify] candidacy-submitted email failed:", err);
  }
}

/** Admin approved/rejected a candidacy → tell the student. */
export async function notifyCandidacyDecision(
  candidateId: string,
  userId: string,
  status: "approved" | "rejected"
) {
  try {
    const admin = createAdminClient();
    const { data: cand } = await admin
      .from("candidates")
      .select("position_id")
      .eq("id", candidateId)
      .single();

    const [{ email, name }, positionName] = await Promise.all([
      getUserContact(userId),
      cand?.position_id ? getPositionName(cand.position_id as string) : Promise.resolve("the position"),
    ]);
    if (!email) return;

    const approved = status === "approved";
    await sendNotificationEmail({
      to: email,
      toName: name,
      subject: approved ? "Your candidacy was approved" : "Update on your candidacy application",
      heading: approved ? "You're officially a candidate!" : "Application not approved",
      message: approved
        ? `Hi ${name || "there"},\n\nGood news — your application for ${positionName} has been APPROVED. Voters can now see you on the ballot, and you can post campaign materials from your dashboard.`
        : `Hi ${name || "there"},\n\nAfter review, your application for ${positionName} was NOT approved this time. If you have questions, please contact your election administrator.`,
      headerColor: approved ? GREEN : RED,
    });
  } catch (err) {
    console.error("[notify] candidacy-decision email failed:", err);
  }
}
