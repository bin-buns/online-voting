"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type Position = { id: string; name: string };

type ExistingApplication = {
  id: string;
  status: string;
  position_id: string;
  position_name: string;
};

type Props = {
  profile: {
    id: string;
    full_name: string;
    student_id: string;
    strand: string | null;
  };
  positions: Position[];
  existingApplication: ExistingApplication | null;
};

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:  { color: "#b45309", bg: "#fef3c7", label: "Under Review",   icon: "ti-clock-hour-4" },
  approved: { color: "#15803d", bg: "#dcfce7", label: "Approved",       icon: "ti-circle-check" },
  rejected: { color: "#be123c", bg: "#ffe4e6", label: "Rejected",       icon: "ti-circle-x"     },
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function SubmitCandidacyClient({ profile, positions, existingApplication }: Props) {
const defaultPositionId = (() => {
  if (profile.strand) {
    const repPosition = positions.find((p) =>
      p.name.toLowerCase().includes(profile.strand!.toLowerCase()) &&
      p.name.toLowerCase().includes("representative")
    );
    if (repPosition) return repPosition.id;
  }
  return positions[0]?.id ?? "";
})();

  const [positionId, setPositionId] = useState(defaultPositionId);
  const [tagline, setTagline]       = useState("");
  const [bio, setBio]               = useState("");
  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [agreed, setAgreed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [submitted, setSubmitted]   = useState(false);
  const [currentApp, setCurrentApp]         = useState(existingApplication);

  useEffect(() => {
    const supabase = createClient();

    async function checkApplication() {
      const { data } = await supabase
        .from("candidates")
        .select("id, status, position_id, positions ( name )")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (!data) {
        // Application was deleted by admin — reset to form
        setCurrentApp(null);
        setSubmitted(false);
      } else {
        type ExistingRaw = {
          id: string;
          status: string;
          position_id: string;
          positions: { name: string } | null;
        };
        const raw = data as unknown as ExistingRaw;
        setCurrentApp({
          id:            raw.id,
          status:        raw.status,
          position_id:   raw.position_id,
          position_name: raw.positions?.name ?? "—",
        });
      }
    }

    // Check immediately on mount
    checkApplication();

    // Subscribe to real-time changes on this student's candidacy
    const channel = supabase
      .channel("candidacy-status")
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "candidates",
          filter: `user_id=eq.${profile.id}`,
        },
        checkApplication
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.id]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!agreed) { setError("Please confirm that all information is true and correct."); return; }
    if (!positionId) { setError("Please select a position."); return; }
    if (!tagline.trim()) { setError("Please enter a campaign slogan."); return; }

    setLoading(true);
    setError("");

    const supabase = createClient();
    let photo_url: string | null = null;

    // Upload photo if provided
    if (photoFile) {
      const ext  = photoFile.name.split(".").pop();
      const path = `candidates/${profile.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("candidate-photos")
        .upload(path, photoFile, { upsert: true });

      if (uploadErr) {
        setError("Photo upload failed: " + uploadErr.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("candidate-photos")
        .getPublicUrl(path);
      photo_url = urlData.publicUrl;
    }

    const { error: insertErr } = await supabase.from("candidates").insert({
      user_id:     profile.id,
      position_id: positionId,
      tagline:     tagline.trim(),
      bio:         bio.trim() || null,
      photo_url,
      status:      "pending",
    });

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  // ── Already submitted view ────────────────────────────────────────────────

  if (currentApp || submitted) {
  const app = currentApp ?? { status: "pending", position_name: positions.find(p => p.id === positionId)?.name ?? "—" };
    const st  = STATUS_STYLE[app.status] ?? STATUS_STYLE.pending;

    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <h1 style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "22px", fontWeight: 700,
          color: "#0d6b34", letterSpacing: "0.04em",
          textTransform: "uppercase", margin: 0,
        }}>
          Submit Candidacy
        </h1>

        <div style={{
          background: "#fff", borderRadius: "20px",
          border: "1px solid #e2e8f0", overflow: "hidden",
          maxWidth: "520px",
        }}>
          {/* Green header */}
          <div style={{ background: "#0d6b34", padding: "28px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {getInitials(profile.full_name)}
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#fff" }}>{profile.full_name}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>ID: {profile.student_id}</div>
            </div>
          </div>

          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: st.bg, borderRadius: "12px", padding: "14px 16px" }}>
              <i className={`ti ${st.icon}`} style={{ fontSize: "24px", color: st.color }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: st.color }}>{st.label}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Your application is currently {app.status === "pending" ? "being reviewed by the admin." : app.status === "approved" ? "approved. You are cleared to run." : "rejected. Contact the admin for details."}
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { label: "Applied For",  value: app.position_name },
                { label: "Student ID",   value: profile.student_id },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{value}</div>
                </div>
              ))}
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
              {app.status === "rejected"
                ? "You may contact the admin to appeal or reapply."
                : "You will be notified once the admin reviews your application."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────

  const selectedPosition = positions.find((p) => p.id === positionId);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1 style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "22px", fontWeight: 700,
        color: "#0d6b34", letterSpacing: "0.04em",
        textTransform: "uppercase", margin: 0,
      }}>
        Submit Candidacy
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

        {/* ── Left — main form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Personal info card */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ background: "#0d6b34", padding: "16px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Personal Profile
              </div>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Name + ID — read only from profile */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                    Full Name
                  </label>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                    {profile.full_name}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                    Student ID
                  </label>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: "#1e293b", fontFamily: "monospace" }}>
                    {profile.student_id}
                  </div>
                </div>
              </div>

              {/* Position */}
<div>
  <label style={{
    fontSize: "12px", fontWeight: 700, color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.05em",
    display: "block", marginBottom: "6px",
  }}>
    Target Position <span style={{ color: "#be123c" }}>*</span>
  </label>

  {/* Regular positions */}
  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    <div style={{
      fontSize: "11px", fontWeight: 700, color: "#94a3b8",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      General Positions
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      {positions
        .filter((p) => !p.name.toLowerCase().includes("representative"))
        .map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPositionId(p.id)}
            style={{
              padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
              fontSize: "13px", fontWeight: 700, textAlign: "left",
              transition: "all 0.15s",
              border: positionId === p.id
                ? "2px solid #0d6b34"
                : "1.5px solid #e2e8f0",
              background: positionId === p.id ? "#f0fdf4" : "#fff",
              color: positionId === p.id ? "#0d6b34" : "#1e293b",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <i className={`ti ${
                p.name === "Mayor"      ? "ti-building-community" :
                p.name === "Vice Mayor" ? "ti-user-star"          :
                p.name === "Secretary"  ? "ti-file-text"          :
                p.name === "Treasurer"  ? "ti-cash"               :
                p.name === "Auditor"    ? "ti-calculator"         :
                                          "ti-speakerphone"
              }`} aria-hidden="true" style={{ fontSize: "16px" }} />
              {p.name}
            </div>
            {positionId === p.id && (
              <i className="ti ti-check" aria-hidden="true" style={{
                float: "right", fontSize: "14px", color: "#0d6b34",
              }} />
            )}
          </button>
        ))}
    </div>

    {/* Representative section */}
    {positions.some((p) => p.name.toLowerCase().includes("representative")) && (
      <>
        <div style={{
          fontSize: "11px", fontWeight: 700, color: "#94a3b8",
          textTransform: "uppercase", letterSpacing: "0.05em",
          marginTop: "8px",
        }}>
          Strand Representative
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {positions
            .filter((p) => p.name.toLowerCase().includes("representative"))
            .map((p) => {
              const isMyStrand =
                profile.strand &&
                p.name.toLowerCase().includes(profile.strand.toLowerCase());
              const isSelected = positionId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPositionId(p.id)}
                  style={{
                    padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                    fontSize: "13px", fontWeight: 700, textAlign: "left",
                    transition: "all 0.15s", position: "relative",
                    border: isSelected
                      ? "2px solid #0d6b34"
                      : isMyStrand
                      ? "2px solid #86efac"
                      : "1.5px solid #e2e8f0",
                    background: isSelected
                      ? "#f0fdf4"
                      : isMyStrand
                      ? "#f0fdf4"
                      : "#fff",
                    color: isSelected ? "#0d6b34" : isMyStrand ? "#15803d" : "#1e293b",
                    opacity: isMyStrand || isSelected ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="ti ti-users" aria-hidden="true" style={{ fontSize: "16px" }} />
                    {p.name}
                  </div>
                  {isMyStrand && !isSelected && (
                    <span style={{
                      position: "absolute", top: "-8px", right: "8px",
                      background: "#0d6b34", color: "#fff",
                      fontSize: "9px", fontWeight: 700,
                      borderRadius: "4px", padding: "2px 6px",
                      letterSpacing: "0.04em",
                    }}>
                      YOUR STRAND
                    </span>
                  )}
                  {isSelected && (
                    <i className="ti ti-check" aria-hidden="true" style={{
                      float: "right", fontSize: "14px", color: "#0d6b34",
                    }} />
                  )}
                </button>
              );
            })}
        </div>
      </>
    )}
  </div>
{/* Hint for auto-selected representative */}
  {profile.strand &&
    positions.find((p) => p.id === positionId)
      ?.name.toLowerCase().includes(profile.strand.toLowerCase()) &&
    positions.find((p) => p.id === positionId)
      ?.name.toLowerCase().includes("representative") && (
    <div style={{
      marginTop: "8px", fontSize: "12px", color: "#0d6b34",
      fontWeight: 600, display: "flex", alignItems: "center", gap: "5px",
      background: "#f0fdf4", borderRadius: "8px", padding: "8px 12px",
    }}>
      <i className="ti ti-info-circle" aria-hidden="true" />
      Auto-selected based on your strand ({profile.strand})
    </div>
  )}
              </div>
            </div>
          </div>

          {/* Campaign content card */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ background: "#1a2e1f", padding: "16px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Campaign Content
              </div>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Tagline */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                  Campaign Slogan <span style={{ color: "#be123c" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. To Build is to BITS"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={120}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: "1.5px solid #e2e8f0", fontSize: "14px", color: "#1e293b",
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0d6b34"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", textAlign: "right" }}>
                  {tagline.length}/120
                </div>
              </div>

              {/* Bio */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                  Key Credentials / Bio <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>(optional)</span>
                </label>
                <textarea
                  placeholder="List your achievements, experience, and reasons for running..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: "1.5px solid #e2e8f0", fontSize: "14px", color: "#1e293b",
                    outline: "none", resize: "vertical", boxSizing: "border-box",
                    fontFamily: "inherit", lineHeight: 1.6,
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0d6b34"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right — photo + summary + submit ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Photo upload */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ background: "#0d6b34", padding: "16px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Candidate Photo
              </div>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              {/* Preview */}
              <div style={{
                width: "120px", height: "120px", borderRadius: "50%",
                border: "3px solid #e2e8f0", overflow: "hidden",
                background: "#f8fafc", position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {photoPreview ? (
                  <Image src={photoPreview} alt="Preview" fill style={{ objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <i className="ti ti-user" style={{ fontSize: "32px", color: "#cbd5e1" }} />
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>No photo</span>
                  </div>
                )}
              </div>

              <label style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 18px", borderRadius: "8px",
                border: "1.5px solid #0d6b34", color: "#0d6b34",
                fontSize: "12px", fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <i className="ti ti-upload" />
                {photoPreview ? "Change Photo" : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
              </label>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
                JPG, PNG or WEBP<br />Recommended: square, min 250×250px
              </p>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "#1a2e1f", borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Application Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Name",     value: profile.full_name          },
                { label: "ID",       value: profile.student_id         },
                { label: "Position", value: selectedPosition?.name ?? "—" },
                { label: "Slogan",   value: tagline || "—"             },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: "#fff", fontWeight: 600, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agreement + Submit */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
              <div
                onClick={() => setAgreed(!agreed)}
                style={{
                  width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px",
                  border: `2px solid ${agreed ? "#0d6b34" : "#cbd5e1"}`,
                  background: agreed ? "#0d6b34" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {agreed && <i className="ti ti-check" style={{ fontSize: "11px", color: "#fff" }} />}
              </div>
              <span style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                I hereby confirm that all information provided is <strong>true and correct</strong>, and I understand the responsibilities of running for office.
              </span>
            </label>

            {error && (
              <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <button
              disabled={loading || !agreed}
              onClick={handleSubmit}
              style={{
                width: "100%", padding: "13px", borderRadius: "10px", border: "none",
                background: agreed ? "#0d6b34" : "#e2e8f0",
                color: agreed ? "#fff" : "#94a3b8",
                fontFamily: "var(--font-oswald), sans-serif",
                fontSize: "16px", fontWeight: 700, letterSpacing: "0.06em",
                cursor: loading || !agreed ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (agreed && !loading) e.currentTarget.style.background = "#0a5229"; }}
              onMouseLeave={(e) => { if (agreed) e.currentTarget.style.background = "#0d6b34"; }}
            >
              {loading ? "Submitting…" : "SUBMIT APPLICATION"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}