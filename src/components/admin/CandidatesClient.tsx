"use client";
import { useState } from "react";

type Candidate = {
  id: string;
  full_name: string;
  student_id: string;
  section: string;
  strand: string;
  tagline: string;
  status: "approved" | "pending" | "rejected";
  position_id: string;
  position_name: string;
};

type Position = {
  id: string;
  name: string;
};

type Stats = {
  total: number;
  filledPositions: number;
  totalPositions: number;
  approved: number;
  incomplete: number;
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const STATUS_STYLE: Record<string, { background: string; color: string; label: string }> = {
  approved: { background: "#0d6b34", color: "#fff",     label: "Verified"  },
  pending:  { background: "#fef3c7", color: "#b45309",  label: "Pending"   },
  rejected: { background: "#ffe4e6", color: "#be123c",  label: "Rejected"  },
};

export default function CandidatesClient({
  candidates,
  positions,
  stats,
}: {
  candidates: Candidate[];
  positions: Position[];
  stats: Stats;
}) {
  const [filterPosition, setFilterPosition] = useState("all");

  const filteredPositions = positions.filter((pos) =>
    filterPosition === "all" || pos.id === filterPosition
  );

  const statCards = [
    { label: "Total Candidates",  value: stats.total,             sub: "All positions",    subColor: "#7dd3fc", iconClass: "ti-users",          iconColor: "#7dd3fc", bg: "#1a3a4a" },
    { label: "Positions Filled",  value: `${stats.filledPositions}/${stats.totalPositions}`, sub: "With candidates", subColor: "#a5b4fc", iconClass: "ti-layout-list", iconColor: "#a5b4fc", bg: "#2a2a4a" },
    { label: "Verified",          value: stats.approved,          sub: "Approved",          subColor: "#4ade80", iconClass: "ti-user-check",     iconColor: "#4ade80", bg: "#1a3a2a" },
    { label: "Incomplete",        value: stats.incomplete,        sub: "Needs attention",   subColor: "#fcd34d", iconClass: "ti-alert-triangle", iconColor: "#fcd34d", bg: "#3a2a1a" },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: "var(--font-open-sans), sans-serif" }}>

      <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
        Candidates
      </h1>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "12px" }}>
        {statCards.map(({ label, value, sub, subColor, iconClass, iconColor, bg }) => (
          <div key={label} style={{ backgroundColor: bg, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className={`ti ${iconClass}`} aria-hidden="true" style={{ fontSize: "22px", color: iconColor }} />
            </div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>{label}</div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "32px", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: subColor }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Candidates List */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header + Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "18px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0, flex: 1 }}>
            Candidates for Election —
          </h2>
          <select
            aria-label="Filter by position"
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            style={{ padding: "8px 32px 8px 14px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-open-sans), sans-serif", fontWeight: 600, color: "#1a2e1f", background: "#fff", cursor: "pointer", minWidth: "160px", appearance: "none" }}
          >
            <option value="all">All Positions</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Positions + Candidate Cards */}
        {filteredPositions.map((pos) => {
          const posCandidates = candidates.filter((c) => c.position_id === pos.id);
          return (
            <div key={pos.id} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", paddingBottom: "8px", borderBottom: "1.5px solid #e2e8f0" }}>
                {pos.name}
              </div>
              {posCandidates.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#94a3b8" }}>No candidates for this position yet.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px" }}>
                  {posCandidates.map((c) => {
                    const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.pending;
                    return (
                      <div key={c.id} style={{ background: "#1a2e1f", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 14px 16px", gap: "10px" }}>
                        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2.5px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 700, color: "#fff" }}>
                          {getInitials(c.full_name)}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.3 }}>{c.full_name}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 1.4 }}>
                          {c.section} · {c.strand}
                        </div>
                        {c.tagline && (
                          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textAlign: "center", fontStyle: "italic" }}>&ldquo;{c.tagline}&rdquo;</div>
                        )}
                        <div style={{ padding: "5px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", marginTop: "4px", background: st.background, color: st.color }}>
                          {st.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}