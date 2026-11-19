"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type CandidateResult = { name: string; votes: number; status: string };
type PositionResult  = { position: string; max_winners: number; candidates: CandidateResult[] };

type ArchiveRow = {
  id: string;
  title: string;
  voting_starts_at: string;
  voting_ends_at: string;
  results_visible_at: string;
  archived_at: string;
  auto_archived: boolean;
  total_voters: number;
  total_votes: number;
  results: PositionResult[];
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
  });
}

function winnersOf(position: PositionResult) {
  if (!position.candidates.length) return "—";
  const top = [...position.candidates].sort((a, b) => b.votes - a.votes).slice(0, position.max_winners || 1);
  return top.map((c) => `${c.name} (${c.votes})`).join(", ");
}

export default function ArchiveTab() {
  const [rows, setRows]       = useState<ArchiveRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("election_archives")
        .select("*")
        .order("archived_at", { ascending: false });
      setRows((data ?? []) as ArchiveRow[]);
      setLoading(false);
    }
    load();
  }, []);

  function exportArchiveCSV(row: ArchiveRow) {
    const lines = ["Position,Candidate,Votes,Status"];
    row.results.forEach((pos) => {
      pos.candidates.forEach((c) => {
        lines.push(`${pos.position},${c.name},${c.votes},${c.status}`);
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${row.title.replace(/\s+/g, "_")}_archived_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cardStyle = {
    background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden",
  };
  const btnStyle = {
    display: "inline-flex" as const, alignItems: "center" as const, gap: "7px",
    padding: "8px 14px", borderRadius: "9px", fontSize: "13px", fontWeight: 700,
    fontFamily: "var(--font-open-sans), sans-serif", cursor: "pointer",
    background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
  <div>
    <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "24px", fontWeight: 700, color: "#1a2e1f", textTransform: "uppercase", letterSpacing: "0.03em" }}>
      Election Archive
    </h1>
    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
      {rows.length} past election{rows.length === 1 ? "" : "s"} on record
    </div>
  </div>
</div>

      {loading && (
        <div style={{ ...cardStyle, padding: "48px", textAlign: "center", color: "#94a3b8" }}>
          <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: "24px" }} />
          <div style={{ marginTop: "8px", fontSize: "13px" }}>Loading archived elections…</div>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div style={{ ...cardStyle, padding: "48px", textAlign: "center", color: "#94a3b8" }}>
          <i className="ti ti-archive-off" aria-hidden="true" style={{ fontSize: "28px" }} />
          <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: 700, color: "#475569" }}>No archived elections yet</div>
          <div style={{ fontSize: "13px", marginTop: "4px" }}>
            Archived elections will show up here once one is archived from Settings → Election.
          </div>
        </div>
      )}

      {rows.map((row) => {
        const isOpen = expanded === row.id;
        return (
          <div key={row.id} style={cardStyle}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a2e1f" }}>{row.title}</div>
                  {row.auto_archived && (
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#b45309", background: "#fef3c7", borderRadius: "6px", padding: "2px 8px" }}>
                      AUTO-ARCHIVED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  Voting: {fmt(row.voting_starts_at)} → {fmt(row.voting_ends_at)}
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                  Archived {fmt(row.archived_at)} · {row.total_votes} votes cast · {row.total_voters} eligible voters
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={btnStyle} onClick={() => exportArchiveCSV(row)}>
                  <i className="ti ti-file-spreadsheet" aria-hidden="true" />Export CSV
                </button>
                <button style={btnStyle} onClick={() => setExpanded(isOpen ? null : row.id)}>
                  <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} aria-hidden="true" />
                  {isOpen ? "Hide Results" : "View Results"}
                </button>
              </div>
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {row.results.map((pos) => (
                  <div key={pos.position}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a2e1f", marginBottom: "6px" }}>
                      {pos.position}
                      <span style={{ fontWeight: 400, color: "#0d6b34", marginLeft: "8px", fontSize: "12px" }}>
                        Winner{pos.max_winners > 1 ? "s" : ""}: {winnersOf(pos)}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {pos.candidates
                        .sort((a, b) => b.votes - a.votes)
                        .map((c) => (
                          <div key={c.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", padding: "4px 0" }}>
                            <span>{c.name}</span>
                            <span style={{ fontWeight: 700 }}>{c.votes} votes</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}