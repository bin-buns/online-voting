import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail, EMAILJS_MIN_GAP_MS } from "@/lib/email";
import { getRecipientEmails } from "@/lib/notify-email";

export type ElectionNoticeKind = "scheduled" | "day_before" | "start" | "end" | "results";
export type ElectionRow = {
  id: number;
  title: string;
  voting_starts_at: string;
  voting_ends_at: string;
  results_visible_at: string;
  is_active: boolean;
};

type CandidateRow = { id: string; position_id: string; profiles: { full_name: string } | null };
type PositionRow = { id: string; name: string; sort_order: number };
type VoteRow = { candidate_id: string | null; position_id: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatManila(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila", weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

async function resultMessage(title: string) {
  const admin = createAdminClient();
  const [{ data: positions, error: positionsError }, { data: candidates, error: candidatesError }, { data: votes, error: votesError }] = await Promise.all([
    admin.from("positions").select("id, name, sort_order").order("sort_order", { ascending: true }),
    admin.from("candidates").select("id, position_id, profiles(full_name)").eq("status", "approved"),
    admin.from("votes").select("candidate_id, position_id"),
  ]);
  if (positionsError || candidatesError || votesError) {
    throw new Error(positionsError?.message ?? candidatesError?.message ?? votesError?.message);
  }

  const positionRows = (positions ?? []) as PositionRow[];
  const candidateRows = (candidates ?? []) as unknown as CandidateRow[];
  const voteRows = (votes ?? []) as VoteRow[];
  const candidateNames = new Map(candidateRows.map((candidate) => [candidate.id, candidate.profiles?.full_name ?? "Candidate"]));
  const counts = new Map<string, number>();
  const abstains = new Map<string, number>();
  for (const vote of voteRows) {
    if (vote.candidate_id) counts.set(vote.candidate_id, (counts.get(vote.candidate_id) ?? 0) + 1);
    else abstains.set(vote.position_id, (abstains.get(vote.position_id) ?? 0) + 1);
  }

  const sections = positionRows.map((position) => {
    const ranked = candidateRows
      .filter((candidate) => candidate.position_id === position.id)
      .map((candidate) => ({ name: candidateNames.get(candidate.id) ?? "Candidate", votes: counts.get(candidate.id) ?? 0 }))
      .sort((a, b) => b.votes - a.votes);
    const lines = ranked.length
      ? ranked.map((candidate, index) => `${index + 1}. ${candidate.name} — ${candidate.votes} vote${candidate.votes === 1 ? "" : "s"}`)
      : ["No approved candidates."];
    const abstainCount = abstains.get(position.id) ?? 0;
    if (abstainCount) lines.push(`Abstain — ${abstainCount} vote${abstainCount === 1 ? "" : "s"}`);
    return `${position.name}\n${lines.join("\n")}`;
  });
  return `Official results for ${title}\n\n${sections.join("\n\n")}\n\nTotal ballots: ${voteRows.length}`;
}

export async function buildElectionEmailContent(kind: ElectionNoticeKind, election: ElectionRow) {
  const title = election.title || "Student election";
  const starts = formatManila(election.voting_starts_at);
  const ends = formatManila(election.voting_ends_at);
  const resultsAt = formatManila(election.results_visible_at);
  switch (kind) {
    case "scheduled":
      return {
        subject: `Election schedule: ${title}`, heading: "Election schedule published",
        message: `The schedule for ${title} is now available. Voting opens ${starts} and closes ${ends} (Philippine time). Results are scheduled for ${resultsAt}.`, color: "#0d6b34",
      };
    case "day_before": {
      const hours = Math.max(1, Math.round((new Date(election.voting_starts_at).getTime() - Date.now()) / 3_600_000));
      const when = hours >= 20 ? "tomorrow" : `in about ${hours} hour${hours === 1 ? "" : "s"}`;
      return {
        subject: `Reminder: voting opens ${when} — ${title}`, heading: `Voting opens ${when}`,
        message: `Voting for ${title} opens ${starts} (Philippine time). Please make sure you can sign in.`, color: "#b45309",
      };
    }
    case "start":
      return {
        subject: `Voting is now open — ${title}`, heading: "Voting is now open!",
        message: `Voting for ${title} has started. Sign in to cast your vote before it closes ${ends} (Philippine time).`, color: "#0d6b34",
      };
    case "end":
      return {
        subject: `Voting has closed — ${title}`, heading: "Voting has ended",
        message: `Voting for ${title} closed ${ends} (Philippine time). Results will be published ${resultsAt}.`, color: "#b45309",
      };
    case "results":
      return {
        subject: `Election results — ${title}`, heading: `Official results: ${title}`,
        message: await resultMessage(title), color: "#0d6b34",
      };
  }
}

export async function sendElectionNotice(kind: ElectionNoticeKind, election: ElectionRow) {
  const recipients = await getRecipientEmails("students");
  if (!recipients.length) return { sent: 0, failed: 0, total: 0 };
  const content = await buildElectionEmailContent(kind, election);
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i++) {
    const result = await sendNotificationEmail({
      to: recipients[i], subject: content.subject, heading: content.heading,
      message: content.message, headerColor: content.color,
    });
    if (result.ok) sent++;
    else { failed++; console.error(`[election-email] ${kind} failed for a recipient:`, result.error); }
    if (i < recipients.length - 1) await sleep(EMAILJS_MIN_GAP_MS);
  }
  console.log(`[election-email] ${kind}: ${sent} sent, ${failed} failed of ${recipients.length}`);
  return { sent, failed, total: recipients.length };
}
