import { createClient } from "@/lib/supabase/server";
import { getElectionSettings } from "@/lib/election";
import { getElectionPhase } from "@/types/database";
import CountdownTimer from "@/components/admin/CountdownTimer";
import LiveVoteSnapshot from "@/components/admin/LiveVoteSnapshot";

type VoteRow = { id: string };
type ProfileRow = { full_name: string };
type CandidateRow = { id: string; status: string; profiles: ProfileRow | null; votes: VoteRow[] };
type PositionRow = { id: string; name: string; sort_order: number; candidates: CandidateRow[] };

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: voterCount },
    { count: voteCount },
    { count: approvedCandidates },
    { count: pendingCandidates },
    { data: positionsData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "voter"),
    supabase.from("votes").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("positions").select(`
      id, name, sort_order,
      candidates (
        id,
        status,
        profiles ( full_name ),
        votes ( id )
      )
    `).order("sort_order", { ascending: true }),
  ]);

  const settings = await getElectionSettings();
  const phase = settings ? getElectionPhase(settings) : "upcoming";

  const initialSnapshot = ((positionsData as unknown as PositionRow[]) ?? []).map((pos) => ({
  id: pos.id,
  name: pos.name,
  candidates: (pos.candidates ?? [])
    .filter((c) => c.status === "approved")      // ← add this line
    .map((c) => ({
      id: c.id,
      full_name: c.profiles?.full_name ?? "Unknown",
      vote_count: c.votes?.length ?? 0,
    }))
    .sort((a, b) => b.vote_count - a.vote_count),
}));

  const cards = [
    {
      label: "Registered Voters",
      value: voterCount ?? 0,
      sub: "Total registered",
      subColor: "#4ade80",
      iconClass: "ti-users",
      iconColor: "#7dd3fc",
      bg: "#1a3a4a",
    },
    {
      label: "Votes Cast",
      value: voteCount ?? 0,
      sub: voterCount ? `${Math.round(((voteCount ?? 0) / voterCount) * 100)}% turnout` : "0% turnout",
      subColor: "#4ade80",
      iconClass: "ti-checkbox",
      iconColor: "#86efac",
      bg: "#1a3a2a",
    },
    {
      label: "Candidates",
      value: approvedCandidates ?? 0,
      sub: "Approved",
      subColor: "#a5b4fc",
      iconClass: "ti-user-check",
      iconColor: "#a5b4fc",
      bg: "#2a2a4a",
    },
    {
      label: "Pending Approval",
      value: pendingCandidates ?? 0,
      sub: pendingCandidates ? "Need Review" : "All clear",
      subColor: pendingCandidates ? "#fcd34d" : "#4ade80",
      iconClass: "ti-clock-hour-4",
      iconColor: "#fcd34d",
      bg: "#3a2a1a",
    },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      <h1 style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "22px", fontWeight: 700,
        color: "#0d6b34", letterSpacing: "0.04em",
        textTransform: "uppercase", margin: 0,
      }}>
        Home
      </h1>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "12px" }}>
        {cards.map(({ label, value, sub, subColor, iconClass, iconColor, bg }) => (
          <div key={label} style={{
            backgroundColor: bg, borderRadius: "12px",
            padding: "16px", display: "flex", flexDirection: "column", gap: "10px",
          }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "10px",
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className={`ti ${iconClass}`} aria-hidden="true" style={{ fontSize: "22px", color: iconColor }} />
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
              {label}
            </div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "32px", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: subColor }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Countdown */}
      {settings ? (
        <CountdownTimer
          targetDate={
            phase === "upcoming" ? settings.voting_starts_at :
            phase === "voting"   ? settings.voting_ends_at :
                                   settings.results_visible_at
          }
          label={
            phase === "upcoming" ? `Voting opens on ${new Date(settings.voting_starts_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}` :
            phase === "voting"   ? `Voting closes on ${new Date(settings.voting_ends_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}` :
                                   `Results visible on ${new Date(settings.results_visible_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`
          }
          phase={phase}
        />
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            No election scheduled yet.{" "}
            <a href="/admin/election" style={{ color: "#0d6b34", fontWeight: 600 }}>
              Set up election schedule →
            </a>
          </p>
        </div>
      )}

      {/* Live Vote Snapshot */}
      <LiveVoteSnapshot initialData={initialSnapshot} />

    </section>
  );
}