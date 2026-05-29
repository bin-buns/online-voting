"use client";

import { useState } from "react";
import Image from "next/image";

type Candidate = {
  id: string;
  full_name: string;
  student_id: string;
  tagline: string | null;
  bio: string | null;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const FRAME_COLORS = [
  "#b8860b", "#8b6914", "#c9a84c", "#a0732a", "#d4a843",
];

function getFrameColor(index: number) {
  return FRAME_COLORS[index % FRAME_COLORS.length];
}

// ── Candidate Modal ───────────────────────────────────────────────────────────

function CandidateModal({
  candidate,
  onClose,
}: {
  candidate: Candidate;
  onClose: () => void;
}) {
  const initials = getInitials(candidate.full_name);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "24px",
        width: "100%", maxWidth: "500px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
        overflow: "hidden",
        animation: "candidateModalIn 0.2s ease",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header with photo */}
        <div style={{
          background: "linear-gradient(135deg, #1a2e1f 0%, #0d6b34 100%)",
          padding: "32px 24px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
          position: "relative",
        }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: "14px", right: "14px",
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: "8px", width: "32px", height: "32px",
              cursor: "pointer", color: "#fff", fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>

          {/* Photo */}
          <div style={{
            width: "110px", height: "110px", borderRadius: "50%",
            border: "4px solid #f5e642",
            overflow: "hidden", flexShrink: 0,
            background: "#1a2e1f",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}>
            {candidate.photo_url ? (
              <Image
                src={candidate.photo_url}
                alt={candidate.full_name}
                fill
                style={{ objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "36px", fontWeight: 700, color: "#fff" }}>
                {initials}
              </span>
            )}
          </div>

          {/* Name + position */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-oswald), sans-serif",
              fontSize: "22px", fontWeight: 700, color: "#f5e642",
              letterSpacing: "0.03em", lineHeight: 1.2,
            }}>
              {candidate.full_name}
            </div>
            <div style={{
              marginTop: "6px", display: "inline-block",
              background: "rgba(245,230,66,0.15)",
              border: "1px solid rgba(245,230,66,0.3)",
              borderRadius: "999px", padding: "3px 14px",
              fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              {candidate.position_name}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Student ID */}
          <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Student ID</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>{candidate.student_id}</span>
          </div>

          {/* Tagline / Slogan */}
          {candidate.tagline && (
            <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "14px 16px", borderLeft: "4px solid #0d6b34" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#0d6b34", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                Campaign Slogan
              </div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a2e1f", fontStyle: "italic", lineHeight: 1.5 }}>
                &ldquo;{candidate.tagline}&rdquo;
              </div>
            </div>
          )}

          {/* Bio / Credentials */}
          {candidate.bio && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Key Credentials &amp; Platform
              </div>
              <div style={{
                fontSize: "14px", color: "#475569", lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}>
                {candidate.bio}
              </div>
            </div>
          )}

          {!candidate.tagline && !candidate.bio && (
            <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
              No additional information provided yet.
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes candidateModalIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Candidate Card ────────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  index,
  onClick,
}: {
  candidate: Candidate;
  index: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const frameColor = getFrameColor(index);
  const initials   = getInitials(candidate.full_name);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "10px", cursor: "pointer",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        transition: "transform 0.2s ease",
      }}
    >
      {/* Picture frame */}
      <div style={{
        position: "relative",
        padding: "10px",
        background: `linear-gradient(135deg, ${frameColor} 0%, #f5d675 40%, ${frameColor} 60%, #c9a84c 100%)`,
        borderRadius: "6px",
        boxShadow: hovered
          ? `0 16px 40px rgba(0,0,0,0.35), 0 0 0 3px ${frameColor}`
          : `0 6px 20px rgba(0,0,0,0.2)`,
        transition: "box-shadow 0.2s ease",
      }}>
        {/* Inner frame border */}
        <div style={{
          position: "absolute", inset: "5px",
          border: `2px solid rgba(255,255,255,0.4)`,
          borderRadius: "3px", pointerEvents: "none", zIndex: 1,
        }} />

        {/* Photo */}
        <div style={{
          width: "160px", height: "180px",
          overflow: "hidden", borderRadius: "2px",
          background: "#1a2e1f", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {candidate.photo_url ? (
            <Image
              src={candidate.photo_url}
              alt={candidate.full_name}
              fill
              style={{ objectFit: "cover", objectPosition: "top" }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "42px", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                {initials}
              </span>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                No Photo
              </span>
            </div>
          )}

          {/* Hover overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(13,107,52,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <i className="ti ti-eye" style={{ fontSize: "28px", color: "#fff" }} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff", letterSpacing: "0.08em" }}>
                VIEW PROFILE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Name below frame */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "14px", fontWeight: 700,
          color: hovered ? "#0d6b34" : "#1a2e1f",
          letterSpacing: "0.02em", lineHeight: 1.3,
          transition: "color 0.2s ease",
          maxWidth: "180px",
        }}>
          {candidate.full_name}
        </div>
        {candidate.tagline && (
          <div style={{
            fontSize: "11px", color: "#64748b",
            fontStyle: "italic", marginTop: "3px",
            maxWidth: "180px", lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            &ldquo;{candidate.tagline}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CandidatesPageClient({
  positions,
  candidates,
}: {
  positions: Position[];
  candidates: Candidate[];
}) {
  const [selected, setSelected] = useState<Candidate | null>(null);

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
      
      <h1 style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "22px", fontWeight: 700,
        color: "#0d6b34", letterSpacing: "0.04em",
        textTransform: "uppercase", margin: 0,
      }}>
        Candidates for Election
      </h1>

      {positions.length === 0 ? (
        <div style={{
          background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
          padding: "64px", textAlign: "center",
        }}>
          <i className="ti ti-users" style={{ fontSize: "40px", color: "#cbd5e1", display: "block", marginBottom: "12px" }} />
          <p style={{ margin: 0, fontSize: "15px", color: "#94a3b8", fontWeight: 600 }}>
            No candidates yet.
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#cbd5e1" }}>
            Check back once candidacy applications are approved.
          </p>
        </div>
      ) : (
        positions.map((pos) => {
          const posCandidates = candidates
            .filter((c) => c.position_id === pos.id)
            .sort((a, b) => a.full_name.localeCompare(b.full_name));

          if (posCandidates.length === 0) return null;

          return (
            <div key={pos.id} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Position header */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to right, #0d6b34, transparent)" }} />
                <h2 style={{
                  fontFamily: "var(--font-oswald), sans-serif",
                  fontSize: "20px", fontWeight: 700,
                  color: "#0d6b34", letterSpacing: "0.06em",
                  textTransform: "uppercase", margin: 0,
                  textShadow: "0 1px 2px rgba(13,107,52,0.15)",
                }}>
                  {pos.name}
                </h2>
                <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to left, #0d6b34, transparent)" }} />
              </div>

              {/* Candidates grid — auto-fills, wraps at any count */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "32px 40px",
                justifyContent: "center",
              }}>
                {posCandidates.map((c, i) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    index={i}
                    onClick={() => setSelected(c)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Modal */}
      {selected && (
        <CandidateModal
          candidate={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
    </div>
);
}
