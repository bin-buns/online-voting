"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type VoteRow = { id: string };
type ProfileRow = { full_name: string };
type CandidateRow = {
  id: string;
  status: string;                          // ← add this
  profiles: ProfileRow | null;
  votes: VoteRow[];
};
type PositionRow = { 
  id: string; 
  name: string; 
  sort_order: number; 
  candidates: CandidateRow[] };

type Candidate = {
  id: string;
  full_name: string;
  vote_count: number;
};

type Position = {
  id: string;
  name: string;
  candidates: Candidate[];
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function getColor(index: number) {
  const colors = ["#0d6b34", "#1d4ed8", "#7c3aed", "#b45309", "#be123c"];
  return colors[index % colors.length];
}

export default function LiveVoteSnapshot({ initialData }: { initialData: Position[] }) {
  const [positions, setPositions] = useState<Position[]>(initialData);

  async function fetchVotes() {
  const supabase = createClient();
  const { data } = await supabase
    .from("positions")
    .select(`
      id, name, sort_order,
      candidates!inner (
        id,
        status,
        profiles ( full_name ),
        votes ( id )
      )
    `)
    .eq("candidates.status", "approved")
    .order("sort_order", { ascending: true });

  if (!data) return;

  const mapped: Position[] = (data as unknown as PositionRow[]).map((pos) => ({
    id: pos.id,
    name: pos.name,
    candidates: (pos.candidates ?? [])
      .filter((c) => c.status === "approved")
      .map((c) => ({
        id: c.id,
        full_name: c.profiles?.full_name ?? "Unknown",
        vote_count: c.votes?.length ?? 0,
      }))
      .sort((a, b) => b.vote_count - a.vote_count),
  }));

  setPositions(mapped);
}

  useEffect(() => {
    const supabase = createClient();
    fetchVotes();

    const channel = supabase
      .channel("votes-snapshot")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, fetchVotes)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div style={{
      background: "#fff", borderRadius: "16px",
      padding: "24px", border: "1px solid #e2e8f0",
      fontFamily: "var(--font-open-sans), sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "20px", fontWeight: 700,
          color: "#0d6b34", letterSpacing: "0.04em",
          textTransform: "uppercase", margin: 0,
        }}>
          Live Vote Snapshot
        </h2>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "#dcfce7", borderRadius: "999px",
          padding: "4px 12px", fontSize: "12px", fontWeight: 700, color: "#15803d",
        }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#15803d", display: "inline-block" }} />
          Live
        </div>
      </div>

      {/* Positions */}
      {positions.length === 0 ? (
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>No positions or votes yet.</p>
      ) : (
        positions.map((pos) => {
          const maxVotes = Math.max(1, ...pos.candidates.map((c) => c.vote_count));
          return (
            <div key={pos.id} style={{ marginBottom: "24px" }}>
              <div style={{
                fontSize: "13px", fontWeight: 700, color: "#64748b",
                letterSpacing: "0.06em", textTransform: "uppercase",
                marginBottom: "12px", paddingBottom: "6px",
                borderBottom: "1px solid #e2e8f0",
              }}>
                {pos.name}
              </div>

              {pos.candidates.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#94a3b8" }}>No candidates yet.</p>
              ) : (
                pos.candidates.map((c, i) => {
                  const pct = Math.round((c.vote_count / maxVotes) * 100);
                  const isLeading = i === 0 && c.vote_count > 0;
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        background: getColor(i),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "13px", fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {getInitials(c.full_name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a2e1f", marginBottom: "5px" }}>
                          {c.full_name}
                          {isLeading && (
                            <span style={{
                              fontSize: "10px", fontWeight: 700,
                              background: "#fef9c3", color: "#854d0e",
                              borderRadius: "4px", padding: "2px 6px", marginLeft: "6px",
                            }}>
                              LEADING
                            </span>
                          )}
                        </div>
                        <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: "999px",
                            width: `${pct}%`,
                            background: i === 0 ? "#0d6b34" : "#94a3b8",
                            transition: "width 0.6s ease",
                          }} />
                        </div>
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0d6b34", minWidth: "48px", textAlign: "right" }}>
                        {c.vote_count} {c.vote_count === 1 ? "vote" : "votes"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })
      )}
    </div>
  );
}