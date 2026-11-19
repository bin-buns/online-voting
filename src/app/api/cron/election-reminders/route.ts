import { NextResponse, after, type NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRecipientEmails } from "@/lib/notify-email";
import { sendNotificationEmail } from "@/lib/email";
import { buildElectionEmailContent, sendElectionNotice, type ElectionNoticeKind, type ElectionRow } from "@/lib/election-notices";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const DAY_MS = 24 * 60 * 60 * 1000;
const columns: Record<ElectionNoticeKind, string> = {
  scheduled: "schedule_notice_sent_at",
  day_before: "reminder_sent_at",
  start: "start_notice_sent_at",
  end: "end_notice_sent_at",
  results: "results_notice_sent_at",
};

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : req.nextUrl.searchParams.get("key") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const kinds: ElectionNoticeKind[] = ["scheduled", "day_before", "start", "end", "results"];

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not set on the server." }, { status: 500 });
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const admin = createAdminClient();
  const { data: row, error } = await admin.from("election_settings").select("*").eq("id", 1).single();
  if (error || !row) return NextResponse.json({ skipped: "No election settings found." });
  const election = row as ElectionRow & Record<string, unknown>;

  const testTo = params.get("test");
  if (testTo) {
    const requested = params.get("type") as ElectionNoticeKind | null;
    const kind = requested && kinds.includes(requested) ? requested : "day_before";
    try {
      const content = await buildElectionEmailContent(kind, election);
      const result = await sendNotificationEmail({
        to: testTo, subject: content.subject, heading: content.heading,
        message: content.message, headerColor: content.color,
      });
      return NextResponse.json({ test: true, kind, ...result });
    } catch (testError) {
      console.error(`[cron] ${kind} test email failed:`, testError);
      return NextResponse.json({ test: true, kind, error: "Could not create the test email." }, { status: 500 });
    }
  }
  if (!election.is_active) return NextResponse.json({ skipped: "Election is not active." });

  const now = Date.now();
  const starts = new Date(election.voting_starts_at).getTime();
  const ends = new Date(election.voting_ends_at).getTime();
  const resultsAt = new Date(election.results_visible_at).getTime();
  let kind: ElectionNoticeKind | null = null;
  if (!election.schedule_notice_sent_at) kind = "scheduled";
  else if (now < starts && now >= starts - DAY_MS && !election.reminder_sent_at) kind = "day_before";
  else if (now >= starts && !election.start_notice_sent_at) kind = "start";
  else if (now >= ends && !election.end_notice_sent_at) kind = "end";
  else if (now >= resultsAt && !election.results_notice_sent_at) kind = "results";
  if (!kind) return NextResponse.json({ sent: false, reason: "Nothing due right now." });

  if (params.get("dry") === "1") {
    const recipients = await getRecipientEmails("students");
    return NextResponse.json({ dry: true, wouldSend: kind, recipients: recipients.length });
  }

  const column = columns[kind];
  const { data: claimed, error: claimError } = await admin
    .from("election_settings").update({ [column]: new Date().toISOString() })
    .eq("id", election.id).is(column, null).select("id");
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  if (!claimed?.length) return NextResponse.json({ sent: false, reason: "Already claimed by another run." });

  const sendKind = kind;
  after(async () => {
    try {
      const result = await sendElectionNotice(sendKind, election);
      if (result.total > 0 && result.sent === 0) {
        await admin.from("election_settings").update({ [column]: null }).eq("id", election.id);
      }
    } catch (sendError) {
      console.error(`[cron] ${sendKind} email failed:`, sendError);
      await admin.from("election_settings").update({ [column]: null }).eq("id", election.id);
    }
  });
  return NextResponse.json({ sent: true, kind, note: "Emails are being sent in the background." });
}
