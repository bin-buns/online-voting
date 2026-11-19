import { createClient } from "@/lib/supabase/server";
import ElectionResultClient from "@/components/admin/ElectionResultClient";

type RawPosition = {
  id: string;
  name: string;
  sort_order: number;
  candidates: {
    id: string;
    status: string;
    profiles: { full_name: string } | null;
    votes: { id: string }[];
  }[];
};
type VoteRow = { voter_id: string; candidate_id: string | null; position_id: string };

export default async function AdminResultsPage() {
  const supabase = await createClient();

  const [
    { data: voterRows },
    { data: voteRows },
    { data: posData },
    { data: electionSettings },
  ] = await Promise.all([
    supabase.from("profiles").select("id").in("role", ["voter", "candidate"]),
    supabase.from("votes").select("voter_id, candidate_id, position_id"),
    supabase.from("positions").select(`
      id, name, sort_order,
      candidates ( id, status, profiles ( full_name ), votes ( id ) )
    `).order("sort_order", { ascending: true }),
    supabase.from("election_settings").select("voting_ends_at, results_visible_at").eq("id", 1).single(),
  ]);

  // ── Check if voting is done ──
  const now = new Date();
  const votingEnded = electionSettings?.voting_ends_at
    ? now >= new Date(electionSettings.voting_ends_at)
    : false;

  if (!votingEnded) {
    const votingEndsAt = electionSettings?.voting_ends_at
      ? new Date(electionSettings.voting_ends_at).toLocaleString("en-PH", {
          dateStyle: "long", timeStyle: "short",
        })
      : "a later time";

    return (
      <section style={{ fontFamily: "var(--font-open-sans), sans-serif" }}>
        <h1 style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "22px", fontWeight: 700, color: "#0d6b34",
          letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "24px",
        }}>
          Election Result
        </h1>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: "16px", padding: "60px 24px",
          background: "#1a2e1f", borderRadius: "16px", textAlign: "center",
        }}>
          <i className="ti ti-lock" aria-hidden="true"
            style={{ fontSize: "48px", color: "rgba(255,255,255,0.3)" }} />
          <div style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "22px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em",
          }}>
            Results Not Yet Available
          </div>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", maxWidth: "380px", lineHeight: 1.6, margin: 0 }}>
            Election results will be shown after voting closes on{" "}
            <strong style={{ color: "rgba(255,255,255,0.85)" }}>{votingEndsAt}</strong>.
          </p>
        </div>
      </section>
    );
  }

  // ── Voting is done, show results ──
  const positions = ((posData as unknown as RawPosition[]) ?? []).map((p) => ({
    id: p.id, name: p.name,
  }));

  const candidates = ((posData as unknown as RawPosition[]) ?? []).flatMap((pos) =>
    (pos.candidates ?? [])
      .filter((c) => c.status === "approved")
      .map((c) => ({
        id:          c.id,
        full_name:   c.profiles?.full_name ?? "Unknown",
        vote_count:  c.votes?.length ?? 0,
        position_id: pos.id,
      }))
  );

  const votes = (voteRows ?? []) as VoteRow[];
  const totalVoters = voterRows?.length ?? 0;
  const totalVotes = new Set(votes.map((vote) => vote.voter_id)).size;
  const ballotCounts: Record<string, { total: number; abstentions: number }> = {};
  votes.forEach((vote) => {
    ballotCounts[vote.position_id] ??= { total: 0, abstentions: 0 };
    ballotCounts[vote.position_id].total += 1;
    if (!vote.candidate_id) ballotCounts[vote.position_id].abstentions += 1;
  });

  let positionsDecided = 0;
  ((posData as unknown as RawPosition[]) ?? []).forEach((pos) => {
    const max = Math.max(0, ...(pos.candidates ?? [])
      .filter((c) => c.status === "approved")
      .map((c) => c.votes?.length ?? 0));
    if (max > 0) positionsDecided++;
  });

  return (
    <ElectionResultClient
      initialStats={{
        totalVotes:      totalVotes ?? 0,
        totalVoters:     totalVoters ?? 0,
        totalBallots:    votes.length,
        ballotCounts,
        positionsDecided,
        totalPositions:  positions.length,
        winnersDecided:  positionsDecided,
      }}
      initialPositions={positions}
      initialCandidates={candidates}
    />
  );
}
