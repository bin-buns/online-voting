"use client";

import Image from "next/image";

type Candidate = {
  id: string;
  full_name: string;
  tagline: string | null;
  photo_url: string | null;
  position_id: string;
  position_name: string;
  sort_order: number;
};

type Position = {
  id: string;
  name: string;
  sort_order: number;
};

type Props = {
  positions: Position[];
  candidates: Candidate[];
  voteMap: Record<string, number>;
  abstainMap: Record<string, number>;
  totalVoters: number;
  phase: string;
  electionTitle: string;
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const FRAME_COLORS = [
  "#b8860b", "#8b6914", "#c9a84c", "#a0732a", "#d4a843",
];

function getFrameColor(index: number) {
  return FRAME_COLORS[index % FRAME_COLORS.length];
}

// ── Candidate Result Card ─────────────────────────────────────────────────────

function ResultCard({
  candidate,
  index,
  voteCount,
  abstainCount,
  totalVoters,
  isWinner,
  isOnlyCandidate,
}: {
  candidate: Candidate;
  index: number;
  voteCount: number;
  abstainCount: number;
  totalVoters: number;
  isWinner: boolean;
  isOnlyCandidate: boolean;
}) {
  const frameColor  = getFrameColor(index);
  const totalVotes  = totalVoters;
  const voteDisplay = `${voteCount}/${totalVotes} Votes`;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
      position: "relative",
    }}>
      {/* Winner crown */}
      {isWinner && !isOnlyCandidate && (
        <div style={{
          position: "absolute", top: "-18px", left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <i className="ti ti-crown" style={{ fontSize: "22px", color: "#f5e642", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
        </div>
      )}

      {/* Gold picture frame */}
      <div style={{
        padding: "10px",
        background: `linear-gradient(135deg, ${frameColor} 0%, #f5d675 40%, ${frameColor} 60%, #c9a84c 100%)`,
        borderRadius: "6px",
        boxShadow: isWinner
          ? `0 8px 32px rgba(245,230,66,0.45), 0 0 0 3px #f5e642`
          : `0 6px 20px rgba(0,0,0,0.2)`,
        transition: "box-shadow 0.3s",
        position: "relative",
      }}>
        {/* Inner frame line */}
        <div style={{
          position: "absolute", inset: "5px",
          border: "2px solid rgba(255,255,255,0.4)",
          borderRadius: "3px", pointerEvents: "none", zIndex: 1,
        }} />

        {/* Photo */}
        <div style={{
          width: "160px", height: "180px",
          overflow: "hidden", borderRadius: "2px",
          background: "#1a2e1f", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          filter: isWinner ? "none" : "grayscale(30%)",
          transition: "filter 0.3s",
        }}>
          {candidate.photo_url ? (
            <Image
              src={candidate.photo_url}
              alt={candidate.full_name}
              fill
              style={{ objectFit: "cover", objectPosition: "top" }}
            />
          ) : (
            <span style={{ fontSize: "42px", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
              {getInitials(candidate.full_name)}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "15px", fontWeight: 700,
        color: isWinner ? "#0d6b34" : "#1a2e1f",
        letterSpacing: "0.02em", textAlign: "center",
        lineHeight: 1.3, maxWidth: "180px",
        transition: "color 0.3s",
      }}>
        {candidate.full_name}
      </div>

      {/* Vote stats — matches figma style */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
        <div style={{
          fontSize: "14px", fontWeight: 700,
          color: isWinner ? "#0d6b34" : "#64748b",
        }}>
          {voteCount} {voteCount === 1 ? "Vote" : "Votes"}
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
          {abstainCount} Abstain
        </div>
        <div style={{
          fontSize: "13px", fontWeight: 700,
          color: isWinner ? "#0d6b34" : "#94a3b8",
          borderTop: "1px solid #e2e8f0",
          paddingTop: "4px", marginTop: "2px",
        }}>
          {voteDisplay}
        </div>
      </div>

      {/* Winner badge */}
      {isWinner && !isOnlyCandidate && (
        <div style={{
          background: "#0d6b34", color: "#fff",
          borderRadius: "999px", padding: "4px 16px",
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          <i className="ti ti-trophy" style={{ fontSize: "12px" }} />
          WINNER
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ElectionResultPageClient({
  positions,
  candidates,
  voteMap,
  abstainMap,
  totalVoters,
  phase,
  electionTitle,
}: Props) {

  // ── Phase gates ─────────────────────────────────────────────────────────────

  if (phase === "upcoming" || phase === "voting") {
    return (
      <div
    style={{
      minHeight: "100vh",
      backgroundImage: "url('/Background2.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      backgroundRepeat: "no-repeat",
      padding: "32px",
    }}
  >
      <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <h1 style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "22px", fontWeight: 700,
          color: "#0d6b34", letterSpacing: "0.04em",
          textTransform: "uppercase", margin: 0,
        }}>
          Election Result
        </h1>
        <div style={{
          background: "#fff", borderRadius: "16px",
          border: "1px solid #e2e8f0", padding: "64px", textAlign: "center",
        }}>
          <i className="ti ti-lock" style={{ fontSize: "44px", color: "#94a3b8", display: "block", marginBottom: "16px" }} />
          <div style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "20px", fontWeight: 700, color: "#1e293b", marginBottom: "8px",
          }}>
            Results Not Yet Available
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            {phase === "voting"
              ? "Voting is still ongoing. Results will be published after the election closes."
              : "The election has not started yet."}
          </p>
        </div>
      </section>
      </div>
    );
  }

  // ── Results UI (phase === "closed" or "results") ──────────────────────────

  const totalVotesCast = Object.values(voteMap).reduce((a, b) => a + b, 0);
  const turnoutPct     = totalVoters > 0 ? Math.round((totalVotesCast / totalVoters) * 100) : 0;

  return (
    <div
    style={{
      minHeight: "100vh",
      backgroundImage: "url('/Background2.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      backgroundRepeat: "no-repeat",
      padding: "32px",
    }}
  >
    <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "22px", fontWeight: 700,
          color: "#0d6b34", letterSpacing: "0.04em",
          textTransform: "uppercase", margin: 0,
        }}>
          Election Result
        </h1>

        {/* Turnout summary */}
        <div style={{
          background: "#1a2e1f", borderRadius: "12px",
          padding: "12px 20px", display: "flex", gap: "24px",
        }}>
          {[
            { label: "Total Voters",  value: totalVoters     },
            { label: "Votes Cast",    value: totalVotesCast  },
            { label: "Turnout",       value: `${turnoutPct}%`},
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <div style={{
                fontFamily: "var(--font-oswald), sans-serif",
                fontSize: "22px", fontWeight: 700, color: "#f5e642", lineHeight: 1,
              }}>
                {value}
              </div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "18px", fontWeight: 700,
          color: "#0d6b34", letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          Candidates for Election
        </div>
        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
          {electionTitle}
        </div>
      </div>

      {/* Positions */}
      {positions.map((pos) => {
        const posCandidates = candidates
          .filter((c) => c.position_id === pos.id)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));

        if (posCandidates.length === 0) return null;

        // Find winner — most votes, at least 1
        const maxVotes       = Math.max(...posCandidates.map((c) => voteMap[c.id] ?? 0));
        const hasVotes       = maxVotes > 0;
        const isOnlyOne      = posCandidates.length === 1;
        const posAbstains    = abstainMap[pos.id] ?? 0;

        return (
          <div key={pos.id} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Position label */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to right, #0d6b34, transparent)" }} />
              <h2 style={{
                fontFamily: "var(--font-oswald), sans-serif",
                fontSize: "20px", fontWeight: 700,
                color: "#0d6b34", letterSpacing: "0.06em",
                textTransform: "uppercase", margin: 0,
              }}>
                {pos.name}
              </h2>
              <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to left, #0d6b34, transparent)" }} />
            </div>

            {/* Candidate cards */}
            <div style={{
              display: "flex", flexWrap: "wrap",
              gap: "40px 48px", justifyContent: "center",
              paddingTop: "20px", // room for crown
            }}>
              {posCandidates.map((c, i) => {
                const votes    = voteMap[c.id]    ?? 0;
                const isWinner = hasVotes && votes === maxVotes;
                return (
                  <ResultCard
                    key={c.id}
                    candidate={c}
                    index={i}
                    voteCount={votes}
                    abstainCount={posAbstains}
                    totalVoters={totalVoters}
                    isWinner={isWinner}
                    isOnlyCandidate={isOnlyOne}
                  />
                );
              })}
            </div>

            {/* Position abstain total */}
            {posAbstains > 0 && (
              <div style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                {posAbstains} voter{posAbstains !== 1 ? "s" : ""} abstained from this position
              </div>
            )}
          </div>
        );
      })}

    </section>
      </div>
  );
}
