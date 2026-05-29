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
  totalVoters: number;
  voted: number;
  notVoted: number;
};

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

type ElectionSettings = {
  voting_starts_at: string;
  voting_ends_at: string;
  results_visible_at: string;
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function computePhase(s: ElectionSettings) {
  const now     = Date.now();
  const starts  = new Date(s.voting_starts_at).getTime();
  const ends    = new Date(s.voting_ends_at).getTime();
  const results = new Date(s.results_visible_at).getTime();
  if (now < starts)  return "upcoming";
  if (now < ends)    return "voting";
  if (now < results) return "closed";
  return "results";
}

export default function LiveVotingClient({
  initialStats,
  initialPositions,
  initialCandidates,
  phase: initialPhase = "upcoming",
}: {
  initialStats:      Stats;
  initialPositions:  Position[];
  initialCandidates: Candidate[];
  phase:             string;
}) {
  const [stats, setStats]           = useState<Stats>(initialStats);
  const [positions]                 = useState<Position[]>(initialPositions);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [filterPos, setFilterPos]   = useState("all");
  const [currentPhase, setCurrentPhase] = useState(initialPhase);

  async function fetchData() {
    const supabase = createClient();
    const [
      { count: totalVoters },
      { count: voted },
      { data: posData },
      { data: settingsData },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "voter"),
      supabase.from("votes").select("voter_id", { count: "exact", head: true }),
      supabase.from("positions").select(`
        id, name, sort_order,
        candidates ( id, status, profiles ( full_name ), votes ( id ) )
      `).order("sort_order", { ascending: true }),
      supabase.from("election_settings").select("voting_starts_at, voting_ends_at, results_visible_at").single(),
    ]);

    const tv = totalVoters ?? 0;
    const v  = voted ?? 0;
    setStats({ totalVoters: tv, voted: v, notVoted: tv - v });

    if (settingsData) {
      setCurrentPhase(computePhase(settingsData as ElectionSettings));
    }

    const cands: Candidate[] = [];
    ((posData as unknown as RawPosition[]) ?? []).forEach((pos) => {
      (pos.candidates ?? [])
        .filter((c) => c.status === "approved")
        .forEach((c) => {
          cands.push({
            id:          c.id,
            full_name:   c.profiles?.full_name ?? "Unknown",
            vote_count:  c.votes?.length ?? 0,
            position_id: pos.id,
          });
        });
    });
    setCandidates(cands);
  }

  useEffect(() => {
    const supabase = createClient();
    fetchData();
    const channel = supabase
      .channel("live-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const turnoutPct = stats.totalVoters
    ? Math.round((stats.voted / stats.totalVoters) * 100)
    : 0;

  const filteredPositions = positions.filter((p) =>
    filterPos === "all" || p.id === filterPos
  );

  const statCards = [
    {
      label: "Total Voters",
      value: stats.totalVoters,
      sub: "Registered",
      subColor: "#7dd3fc",
      iconClass: "ti-users",
      iconColor: "#7dd3fc",
      bg: "#1a3a4a",
    },
    {
      label: "Voted",
      value: stats.voted,
      sub: `${turnoutPct}% turnout`,
      subColor: "#4ade80",
      iconClass: "ti-checkbox",
      iconColor: "#4ade80",
      bg: "#1a3a2a",
    },
    {
      label: "Not Yet Voted",
      value: stats.notVoted,
      sub: currentPhase === "voting"
        ? "Still pending"
        : currentPhase === "upcoming"
        ? "Waiting to open"
        : "Did not vote",
      subColor: currentPhase === "voting"
        ? "#fcd34d"
        : currentPhase === "upcoming"
        ? "#94a3b8"
        : "#f87171",
      iconClass: "ti-clock-hour-4",
      iconColor: currentPhase === "voting"
        ? "#fcd34d"
        : currentPhase === "upcoming"
        ? "#94a3b8"
        : "#f87171",
      bg: "#3a2a1a",
    },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: "var(--font-open-sans), sans-serif" }}>

      <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
        Live Voting
      </h1>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "12px" }}>
        {statCards.map(({ label, value, sub, subColor, iconClass, iconColor, bg }) => (
          <div key={label} style={{ backgroundColor: bg, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className={`ti ${iconClass}`} aria-hidden="true" style={{ fontSize: "22px", color: iconColor }} />
            </div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>{label}</div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "40px", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: subColor }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Vote Panel — phase aware */}
      {currentPhase === "voting" ? (

        <div style={{ background: "#1a2e1f", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "17px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
              Live Vote Count
            </h2>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(74,222,128,0.15)", borderRadius: "999px", padding: "4px 12px", fontSize: "11px", fontWeight: 700, color: "#4ade80" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
              Live
            </div>
          </div>

          {/* Position Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Position:</span>
            {[{ id: "all", name: "All" }, ...positions].map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterPos(p.id)}
                style={{
                  padding: "6px 14px", borderRadius: "8px", fontFamily: "var(--font-open-sans), sans-serif",
                  border: "1.5px solid", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                  background:  filterPos === p.id ? "#0d6b34" : "transparent",
                  borderColor: filterPos === p.id ? "#0d6b34" : "rgba(255,255,255,0.15)",
                  color:       filterPos === p.id ? "#fff"    : "rgba(255,255,255,0.6)",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Positions + Candidates */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {filteredPositions.map((pos) => {
              const posCands = candidates
                .filter((c) => c.position_id === pos.id)
                .sort((a, b) => b.vote_count - a.vote_count);
              const maxVotes      = Math.max(1, ...posCands.map((c) => c.vote_count));
              const totalPosVotes = posCands.reduce((sum, c) => sum + c.vote_count, 0);
              return (
                <div key={pos.id}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "14px" }}>
                    {pos.name}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px" }}>
                    {posCands.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>No approved candidates.</p>
                    ) : posCands.map((c, i) => {
                      const pct      = totalPosVotes > 0 ? Math.round((c.vote_count / totalPosVotes) * 100) : 0;
                      const barW     = Math.round((c.vote_count / maxVotes) * 100);
                      const isLeading = i === 0 && c.vote_count > 0;
                      return (
                        <div key={c.id} style={{ background: "#0f1f14", borderRadius: "14px", padding: "20px 14px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", border: "1.5px solid rgba(255,255,255,0.07)" }}>
                          <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                            {getInitials(c.full_name)}
                          </div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.3 }}>{c.full_name}</div>
                          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "36px", fontWeight: 700, color: isLeading ? "#4ade80" : "rgba(255,255,255,0.4)", lineHeight: 1 }}>
                            {c.vote_count}
                          </div>
                          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{pct}% of votes</div>
                          <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: "999px", width: `${barW}%`, background: "#0d6b34", transition: "width 0.6s ease" }} />
                          </div>
                          {isLeading && (
                            <div style={{ fontSize: "10px", fontWeight: 700, background: "#fef9c3", color: "#854d0e", borderRadius: "4px", padding: "2px 8px" }}>
                              LEADING
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      ) : currentPhase === "upcoming" ? (

        <div style={{ background: "#1a2e1f", borderRadius: "16px", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", textAlign: "center" }}>
          <i className="ti ti-clock-hour-4" aria-hidden="true" style={{ fontSize: "44px", color: "#fcd34d" }} />
          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "20px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>
            Voting Has Not Started
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.5)", maxWidth: "360px" }}>
            Live vote counts will appear here once the election period begins.
          </p>
        </div>

      ) : (

        /* closed or results */
        <div style={{ background: "#1a2e1f", borderRadius: "16px", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
          <i className="ti ti-lock" aria-hidden="true" style={{ fontSize: "44px", color: "#94a3b8" }} />
          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "20px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>
            Voting Has Ended
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.5)", maxWidth: "360px" }}>
            The election period is over. Final vote counts have been recorded.
          </p>
          
            
        </div>

      )}
    </section>
  );
}