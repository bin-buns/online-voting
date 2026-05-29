"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  voterId: string;
  positions: Position[];
  candidates: Candidate[];
  votedPositionIds: string[];
  phase: string;
  electionTitle: string;
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// Format name as "LASTNAME, FIRSTNAME M."
function formatName(full_name: string) {
  const parts = full_name.trim().split(" ");
  if (parts.length === 1) return full_name.toUpperCase();
  const last  = parts[parts.length - 1].toUpperCase();
  const first = parts.slice(0, -1).join(" ").toUpperCase();
  return `${last},\n${first}`;
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  candidateName,
  positionName,
  isAbstain,
  loading,
  onConfirm,
  onCancel,
}: {
  candidateName: string;
  positionName: string;
  isAbstain: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px",
        width: "100%", maxWidth: "400px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        overflow: "hidden",
        animation: "voteModalIn 0.18s ease",
      }}>
        {/* Header */}
        <div style={{
          background: isAbstain ? "#1e293b" : "#0d6b34",
          padding: "20px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        }}>
          <i
            className={`ti ${isAbstain ? "ti-hand-stop" : "ti-checkbox"}`}
            style={{ fontSize: "32px", color: "#fff" }}
          />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", textAlign: "center" }}>
            {isAbstain ? "Confirm Abstain" : "Confirm Vote"}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#475569", textAlign: "center", lineHeight: 1.6 }}>
            {isAbstain ? (
              <>You are about to <strong>abstain</strong> from voting for <strong>{positionName}</strong>. This cannot be undone.</>
            ) : (
              <>You are about to cast your vote for <strong>{candidateName}</strong> as <strong>{positionName}</strong>. This cannot be undone.</>
            )}
          </p>

          <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
            <i className="ti ti-lock" style={{ fontSize: "16px", color: "#94a3b8" }} />
            Your vote is final and cannot be changed after submission.
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1, padding: "11px", borderRadius: "10px",
                border: "1.5px solid #e2e8f0", background: "#fff",
                color: "#64748b", fontWeight: 700, fontSize: "14px",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1, padding: "11px", borderRadius: "10px", border: "none",
                background: isAbstain ? "#1e293b" : "#0d6b34",
                color: "#fff", fontWeight: 700, fontSize: "14px",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Submitting…" : isAbstain ? "Yes, Abstain" : "Yes, Vote"}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes voteModalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VotePageClient({
  voterId,
  positions,
  candidates,
  votedPositionIds,
  phase,
  electionTitle,
}: Props) {
  const [voted, setVoted]       = useState<Set<string>>(new Set(votedPositionIds));
  const [confirm, setConfirm]   = useState<{
    candidateId: string | null;
    candidateName: string;
    positionId: string;
    positionName: string;
    isAbstain: boolean;
  } | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const totalPositions = positions.filter((p) =>
    candidates.some((c) => c.position_id === p.id)
  ).length;
  const votedCount = positions.filter((p) =>
    voted.has(p.id) && candidates.some((c) => c.position_id === p.id)
  ).length;
  const allDone = votedCount === totalPositions && totalPositions > 0;

  function openConfirm(candidate: Candidate) {
    setError("");
    setConfirm({
      candidateId:   candidate.id,
      candidateName: candidate.full_name,
      positionId:    candidate.position_id,
      positionName:  candidate.position_name,
      isAbstain:     false,
    });
  }

  function openAbstain(position: Position) {
    setError("");
    setConfirm({
      candidateId:   null,
      candidateName: "",
      positionId:    position.id,
      positionName:  position.name,
      isAbstain:     true,
    });
  }

  async function handleConfirm() {
    if (!confirm) return;
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: err } = await supabase.from("votes").insert({
      voter_id:     voterId,
      candidate_id: confirm.candidateId,   // null = abstain
      position_id:  confirm.positionId,
    });

    if (err) {
      // Unique constraint = already voted
      if (err.code === "23505") {
        setError("You have already voted for this position.");
      } else {
        setError(err.message);
      }
      setLoading(false);
      setConfirm(null);
      return;
    }

    setVoted((prev) => new Set([...prev, confirm.positionId]));
    setSuccess(
      confirm.isAbstain
        ? `You abstained from ${confirm.positionName}.`
        : `Vote cast for ${confirm.candidateName}!`
    );
    setTimeout(() => setSuccess(""), 3000);
    setLoading(false);
    setConfirm(null);
  }

  // ── Phase gates ───────────────────────────────────────────────────────────

  if (phase === "upcoming") {
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
        <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Vote
        </h1>
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "64px", textAlign: "center" }}>
          <i className="ti ti-clock-hour-4" style={{ fontSize: "44px", color: "#fcd34d", display: "block", marginBottom: "16px" }} />
          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "20px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
            Voting Has Not Started Yet
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            Please wait for the election period to begin.
          </p>
        </div>
      </section>
      </div>
    );
  }

  if (phase === "closed" || phase === "results") {
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
        <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Vote
        </h1>
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "64px", textAlign: "center" }}>
          <i className="ti ti-lock" style={{ fontSize: "44px", color: "#94a3b8", display: "block", marginBottom: "16px" }} />
          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "20px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
            Voting Is Closed
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            The election period has ended. Check the results page.
          </p>
        </div>
      </section>
      </div>
    );
  }

  // ── Voting UI (phase === "voting") ────────────────────────────────────────

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
    <section style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 4px" }}>
            {electionTitle}
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Click <strong>VOTE</strong> to select a candidate, or <strong>ABSTAIN</strong> to skip a position.
          </p>
        </div>

        {/* Progress */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "12px 18px", display: "flex", flexDirection: "column", gap: "6px", minWidth: "180px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
            <span>Progress</span>
            <span style={{ color: allDone ? "#0d6b34" : "#1e293b" }}>{votedCount}/{totalPositions}</span>
          </div>
          <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "999px",
              width: totalPositions > 0 ? `${Math.round((votedCount / totalPositions) * 100)}%` : "0%",
              background: allDone ? "#0d6b34" : "#fcd34d",
              transition: "width 0.4s ease",
            }} />
          </div>
          {allDone && (
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0d6b34", display: "flex", alignItems: "center", gap: "4px" }}>
              <i className="ti ti-circle-check" /> All positions voted!
            </div>
          )}
        </div>
      </div>

      {/* Success toast */}
      {success && (
        <div style={{
          background: "#dcfce7", color: "#15803d", borderRadius: "10px",
          padding: "12px 16px", fontSize: "14px", fontWeight: 600,
          display: "flex", alignItems: "center", gap: "8px",
          animation: "voteModalIn 0.2s ease",
        }}>
          <i className="ti ti-circle-check" style={{ fontSize: "18px" }} />
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Positions */}
      {positions.map((pos) => {
        const posCandidates = candidates
          .filter((c) => c.position_id === pos.id)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));

        if (posCandidates.length === 0) return null;

        const hasVoted = voted.has(pos.id);

        return (
          <div key={pos.id} style={{
            background: "#fff", borderRadius: "16px",
            border: `1.5px solid ${hasVoted ? "#bbf7d0" : "#e2e8f0"}`,
            overflow: "hidden", transition: "border-color 0.3s",
          }}>
            {/* Position header */}
            <div style={{
              background: hasVoted ? "#f0fdf4" : "#f8fafc",
              padding: "14px 20px",
              borderBottom: `1px solid ${hasVoted ? "#bbf7d0" : "#e2e8f0"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              transition: "background 0.3s",
            }}>
              <h2 style={{
                fontFamily: "var(--font-oswald), sans-serif",
                fontSize: "18px", fontWeight: 700,
                color: hasVoted ? "#0d6b34" : "#1e293b",
                letterSpacing: "0.04em", textTransform: "uppercase", margin: 0,
              }}>
                {pos.name}
              </h2>
              {hasVoted && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#0d6b34" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "16px" }} />
                  Done
                </div>
              )}
            </div>

            {/* Candidates row */}
            <div style={{ padding: "20px" }}>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                justifyContent: "center",
              }}>
                {posCandidates.map((c) => (
                  <div key={c.id} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: "0",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    overflow: "hidden",
                    width: "200px",
                    flexShrink: 0,
                    border: "1.5px solid #e2e8f0",
                    opacity: hasVoted ? 0.6 : 1,
                    transition: "opacity 0.3s",
                  }}>
                    {/* Photo */}
                    <div style={{ position: "relative", width: "100%", height: "130px", background: "#1a2e1f", flexShrink: 0 }}>
                      {c.photo_url ? (
                        <Image
                          src={c.photo_url}
                          alt={c.full_name}
                          fill
                          style={{ objectFit: "cover", objectPosition: "top" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "36px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
                            {getInitials(c.full_name)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div style={{
                      padding: "10px 12px 12px",
                      width: "100%", boxSizing: "border-box",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                    }}>
                      <div style={{
                        fontFamily: "var(--font-oswald), sans-serif",
                        fontSize: "13px", fontWeight: 700,
                        color: "#1e293b", textAlign: "center",
                        letterSpacing: "0.03em", lineHeight: 1.3,
                        whiteSpace: "pre-line",
                      }}>
                        {formatName(c.full_name)}
                      </div>

                      {/* Vote button */}
                      <button
                        disabled={hasVoted}
                        onClick={() => !hasVoted && openConfirm(c)}
                        style={{
                          width: "100%", padding: "9px",
                          borderRadius: "8px", border: "none",
                          background: hasVoted ? "#e2e8f0" : "#0d6b34",
                          color: hasVoted ? "#94a3b8" : "#fff",
                          fontFamily: "var(--font-oswald), sans-serif",
                          fontSize: "15px", fontWeight: 700,
                          letterSpacing: "0.08em",
                          cursor: hasVoted ? "not-allowed" : "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { if (!hasVoted) e.currentTarget.style.background = "#0a5229"; }}
                        onMouseLeave={(e) => { if (!hasVoted) e.currentTarget.style.background = "#0d6b34"; }}
                      >
                        VOTE
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Abstain */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
                <button
                  disabled={hasVoted}
                  onClick={() => !hasVoted && openAbstain(pos)}
                  style={{
                    padding: "10px 40px", borderRadius: "8px", border: "none",
                    background: hasVoted ? "#e2e8f0" : "#dc2626",
                    color: hasVoted ? "#94a3b8" : "#fff",
                    fontFamily: "var(--font-oswald), sans-serif",
                    fontSize: "16px", fontWeight: 700,
                    letterSpacing: "0.08em",
                    cursor: hasVoted ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!hasVoted) e.currentTarget.style.background = "#b91c1c"; }}
                  onMouseLeave={(e) => { if (!hasVoted) e.currentTarget.style.background = "#dc2626"; }}
                >
                  ABSTAIN
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* All done banner */}
      {allDone && (
        <div style={{
          background: "#0d6b34", borderRadius: "16px", padding: "24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
          animation: "voteModalIn 0.3s ease",
        }}>
          <i className="ti ti-trophy" style={{ fontSize: "36px", color: "#f5e642" }} />
          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "20px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>
            Thank You For Voting!
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.75)", textAlign: "center" }}>
            Your votes have been recorded. Results will be published after the election period.
          </p>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          candidateName={confirm.candidateName}
          positionName={confirm.positionName}
          isAbstain={confirm.isAbstain}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
      </div>
  );
}
