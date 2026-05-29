"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Candidate = {
  id: string;
  full_name: string;
  vote_count: number;
  position_id: string;
};

type Position = {
  id: string;
  name: string;
};

type Stats = {
  totalVotes: number;
  totalVoters: number;
  positionsDecided: number;
  totalPositions: number;
  winnersDecided: number;
};

type RawPosition = {
  id: string;
  name: string;
  sort_order: number;
  candidates: {
    status: string;
    id: string;
    profiles: { full_name: string } | null;
    votes: { id: string }[];
  }[];
};



export default function ElectionResultClient({
  initialStats,
  initialPositions,
  initialCandidates,
}: {
  initialStats: Stats;
  initialPositions: Position[];
  initialCandidates: Candidate[];
}) {
  const [stats, setStats]           = useState<Stats>(initialStats);
  const [positions]                 = useState<Position[]>(initialPositions);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);

  async function fetchData() {
    const supabase = createClient();

    const { data: settings } = await supabase
    .from("election_settings")
    .select("voting_ends_at")
    .eq("id", 1)
    .single();

  const votingEnded = settings?.voting_ends_at
    ? new Date() >= new Date(settings.voting_ends_at)
    : false;

  if (!votingEnded) return;
  
    const [
      { count: totalVoters },
      { count: totalVotes },
      { data: posData },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "voter"),
      supabase.from("votes").select("*", { count: "exact", head: true }),
      supabase.from("positions").select(`
        id, name, sort_order,
        candidates ( id, profiles ( full_name ), votes ( id ), status )
      `).order("sort_order", { ascending: true }),
    ]);
    

    const cands: Candidate[] = [];
    let positionsDecided = 0;

    ((posData as unknown as RawPosition[]) ?? []).forEach((pos) => {
      const posCands = (pos.candidates ?? [])
      .filter((c) => c.status === "approved")
      .map((c) => ({
        id:          c.id,
        full_name:   c.profiles?.full_name ?? "Unknown",
        vote_count:  c.votes?.length ?? 0,
        position_id: pos.id,
      }));
      cands.push(...posCands);
      const maxVotes = Math.max(0, ...posCands.map((c) => c.vote_count));
      if (maxVotes > 0) positionsDecided++;
    });

    setCandidates(cands);
    setStats({
      totalVotes:        totalVotes ?? 0,
      totalVoters:       totalVoters ?? 0,
      positionsDecided,
      totalPositions:    posData?.length ?? 0,
      winnersDecided:    positionsDecided,
    });
  }

  useEffect(() => {
    const supabase = createClient();
    fetchData();
    const channel = supabase
      .channel("result-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const turnoutPct = stats.totalVoters
    ? Math.round((stats.totalVotes / stats.totalVoters) * 100)
    : 0;

  const statCards = [
    { label: "Total Votes Cast",     value: stats.totalVotes,      sub: `Of ${stats.totalVoters} voters`, subColor: "#7dd3fc", iconClass: "ti-checkbox",     iconColor: "#7dd3fc", bg: "#1a3a4a" },
    { label: "Turnout",              value: `${turnoutPct}%`,       sub: "Participation rate",             subColor: "#4ade80", iconClass: "ti-chart-pie",    iconColor: "#4ade80", bg: "#1a3a2a" },
    { label: "Positions Decided",    value: `${stats.positionsDecided}/${stats.totalPositions}`, sub: "With clear winner", subColor: "#a5b4fc", iconClass: "ti-layout-list", iconColor: "#a5b4fc", bg: "#2a2a4a" },
    { label: "Winners Declared",     value: stats.winnersDecided,   sub: stats.winnersDecided ? "Finalized" : "Election ongoing", subColor: "#fcd34d", iconClass: "ti-trophy", iconColor: "#fcd34d", bg: "#3a2a1a" },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: "var(--font-open-sans), sans-serif" }}>

      <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
        Election Result
      </h1>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "12px" }}>
        {statCards.map(({ label, value, sub, subColor, iconClass, iconColor, bg }) => (
          <div key={label} style={{ backgroundColor: bg, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className={`ti ${iconClass}`} aria-hidden="true" style={{ fontSize: "22px", color: iconColor }} />
            </div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>{label}</div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "36px", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: subColor }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Left — detailed results per position */}
        <div style={{ background: "#1a2e1f", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {positions.map((pos, posIdx) => {
            const posCands = candidates
              .filter((c) => c.position_id === pos.id)
              .sort((a, b) => b.vote_count - a.vote_count);
            const totalPosVotes = posCands.reduce((s, c) => s + c.vote_count, 0);
            const maxVotes = Math.max(1, ...posCands.map((c) => c.vote_count));

            return (
              <div key={pos.id}>
                {posIdx > 0 && <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }} />}
                <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                  Final Result
                </div>
                <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "18px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "14px" }}>
                  {pos.name}
                </div>
                {posCands.map((c, i) => {
                  const pct = totalPosVotes > 0 ? Math.round((c.vote_count / stats.totalVoters) * 100) : 0;
                  const abstainPct = 100 - pct;
                  const barW = Math.round((c.vote_count / maxVotes) * 100);
                  const isWinner = i === 0 && c.vote_count > 0;
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: "14px", paddingBottom: "14px", borderBottom: i < posCands.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none", marginBottom: i < posCands.length - 1 ? "14px" : 0 }}>
                      <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "32px", fontWeight: 700, color: isWinner ? "#fcd34d" : "rgba(255,255,255,0.3)", minWidth: "32px", lineHeight: 1 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>
                          {c.full_name}
                          {isWinner && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontWeight: 700, marginLeft: "8px" }}>
                              <i className="ti ti-crown" aria-hidden="true" style={{ fontSize: "10px" }} /> WINNER
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>
                          {c.vote_count} votes · {pct}% · {abstainPct}% Abstain
                        </div>
                        <div style={{ height: "7px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: "999px", width: `${barW}%`, background: isWinner ? "#0d6b34" : "#94a3b8", transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Right — summary table */}
        <div style={{ background: "#1a2e1f", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "18px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            All Position Summary
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Position", "Winner", "Votes"].map((h) => (
                  <th key={h} style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", padding: "0 0 10px", textAlign: h === "Votes" ? "right" : "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const posCands = candidates
                  .filter((c) => c.position_id === pos.id)
                  .sort((a, b) => b.vote_count - a.vote_count);
                const winner = posCands[0];
                const hasWinner = winner && winner.vote_count > 0;
                return (
                  <tr key={pos.id}>
                    <td style={{ padding: "12px 0", fontSize: "12px", color: "rgba(255,255,255,0.5)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {pos.name}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "13px", color: hasWinner ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {hasWinner ? (
                        <>
                          <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", marginRight: "6px" }} />
                          {winner.full_name}
                        </>
                      ) : "— No votes yet"}
                    </td>
                    <td style={{ padding: "12px 0", textAlign: "right", fontFamily: "var(--font-oswald), sans-serif", fontSize: "16px", color: hasWinner ? "#4ade80" : "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {winner?.vote_count ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}