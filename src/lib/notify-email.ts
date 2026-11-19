import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail, EMAILJS_MIN_GAP_MS } from "@/lib/email";

type Audience = "all" | "students" | "voter" | "candidate" | "admin";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Emails live in auth.users, not profiles, so look up both and match by id.
export async function getRecipientEmails(audience: Audience): Promise<string[]> {
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id");
  if (audience === "students") query = query.in("role", ["voter", "candidate"]);
  else if (audience !== "all") query = query.eq("role", audience);
  const { data: profiles } = await query;
  const allowedIds = new Set((profiles ?? []).map((p) => p.id));

  const emails = new Set<string>();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data.users.length) break;
    for (const user of data.users) {
      if (user.email && allowedIds.has(user.id)) emails.add(user.email);
    }
    if (data.users.length < 1000) break;
    page++;
  }
  return [...emails];
}

function colorFor(type: string) {
  return type === "urgent" ? "#be123c" : type === "warning" ? "#b45309" : "#0d6b34";
}

/** One EmailJS request is sent per recipient, paced to respect provider limits. */
export async function emailNotification(opts: {
  title: string;
  body: string;
  type: string;
  audience: Audience;
}): Promise<{ sent: number; error?: string }> {
  const recipients = await getRecipientEmails(opts.audience);
  if (!recipients.length) return { sent: 0 };

  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;
  for (let i = 0; i < recipients.length; i++) {
    const result = await sendNotificationEmail({
      to: recipients[i], subject: opts.title, heading: opts.title,
      message: opts.body, headerColor: colorFor(opts.type),
    });
    if (result.ok) sent++;
    else { failed++; firstError ??= result.error; }
    if (i < recipients.length - 1) await sleep(EMAILJS_MIN_GAP_MS);
  }
  return failed
    ? { sent, error: `${failed} of ${recipients.length} emails failed: ${firstError}` }
    : { sent };
}

/** Deliver email-enabled announcements that were posted before an account existed. */
export async function emailPendingNotificationsForUser(userId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
    ]);
    const user = authUser.user;
    const email = user?.email;
    if (!user || !email || !profile) return 0;

    const { data: notices } = await admin.from("notifications")
      .select("id, title, body, type, emails_sent")
      .eq("send_email", true)
      .in("audience", ["all", profile.role])
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: true });
    if (!notices?.length) return 0;

    const { data: priorDeliveries } = await admin.from("notification_email_deliveries")
      .select("notification_id")
      .eq("user_id", userId)
      .not("sent_at", "is", null);
    const sentIds = new Set((priorDeliveries ?? []).map((delivery) => delivery.notification_id as string));
    let sentCount = 0;

    for (const notice of notices) {
      if (sentIds.has(notice.id)) continue;
      const { error: reserveError } = await admin.from("notification_email_deliveries")
        .insert({ notification_id: notice.id, user_id: userId, sent_at: null });
      if (reserveError) continue;

      const result = await sendNotificationEmail({
        to: email,
        toName: user.user_metadata?.full_name,
        subject: notice.title,
        heading: notice.title,
        message: notice.body,
        headerColor: colorFor(notice.type),
      });
      if (result.ok) {
        await admin.from("notification_email_deliveries").update({ sent_at: new Date().toISOString() })
          .eq("notification_id", notice.id).eq("user_id", userId);
        await admin.from("notifications").update({ emails_sent: (notice.emails_sent ?? 0) + 1 }).eq("id", notice.id);
        sentCount++;
      } else {
        await admin.from("notification_email_deliveries").delete().eq("notification_id", notice.id).eq("user_id", userId);
        console.error(`[notify] historical announcement email failed for ${userId}:`, result.error);
      }
      if (notice !== notices[notices.length - 1]) await sleep(EMAILJS_MIN_GAP_MS);
    }
    return sentCount;
  } catch (error) {
    console.error("[notify] historical announcement delivery failed:", error);
    return 0;
  }
}
