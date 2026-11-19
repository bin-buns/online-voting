"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { updateCandidateStatus, deleteCandidate, getCandidateRegistrationDocumentUrl } from "../../app/actions/candidate";

// ── Types ─────────────────────────────────────────────────────────────────────

type Candidate = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  full_name: string;
  student_id: string;
  position: string;
  section: string; strand: string; tagline: string; bio: string; photo_url: string;
  application_data: Record<string,string>; registration_form_path: string | null;
  review_remarks: string; reviewed_at: string | null; reviewed_by_name: string;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type Filter = "all" | "pending" | "approved" | "rejected";

type RawCandidate = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { full_name: string; student_id: string; section?: string | null; strand?: string | null } | null;
  positions: { name: string } | null;
  tagline?: string | null; bio?: string | null; photo_url?: string | null;
  candidate_applications?: { application_data: Record<string,string> | null; registration_form_path: string | null; review_remarks: string | null; reviewed_at: string | null; reviewed_by_name: string | null } | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, { color: string; bg: string; label: string }> = {
  approved: { color: "#15803d", bg: "#dcfce7", label: "Approved" },
  pending:  { color: "#b45309", bg: "#fef3c7", label: "Pending"  },
  rejected: { color: "#be123c", bg: "#ffe4e6", label: "Rejected" },
};

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  candidate,
  locked,
  onClose,
  onUpdate,
  onDelete,
}: {
  candidate: Candidate;
  locked: boolean;
  onClose: () => void;
  onUpdate: (id: string, status: "approved" | "rejected") => void;
  onDelete: (id: string) => void;
}) {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentLoading, setDocumentLoading] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState("");

  async function handleDelete() {
  setLoading(true);
  setError("");

  const result = await deleteCandidate(candidate.id, candidate.user_id);
  if (result.error) { setError(result.error); setLoading(false); return; }

  onDelete(candidate.id);
  setLoading(false);
  onClose();
}

  async function handleOpenRegistrationForm() {
    setDocumentLoading(true); setError("");
    try { const result = await getCandidateRegistrationDocumentUrl(candidate.id); if (result.error || !result.url) setError(result.error ?? "Could not open the document."); else setDocumentUrl(result.url); }
    catch { setError("Could not create a secure link to the registration form."); }
    setDocumentLoading(false);
  }

  async function handleAction(newStatus: "approved" | "rejected") {
  setLoading(true);
  setError("");

  const result = await updateCandidateStatus(candidate.id, candidate.user_id, newStatus, reviewRemarks);
  if (result.error) { setError(result.error); setLoading(false); return; }

  onUpdate(candidate.id, newStatus);
  setLoading(false);
  onClose();
}

  const st = STATUS_COLOR[candidate.status] ?? STATUS_COLOR.pending;
  const initials = candidate.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={`${candidate.full_name} candidacy review`} style={{
        background: "#fff", borderRadius: "20px", width: "min(960px, 96vw)", maxWidth: "960px",
        maxHeight: "calc(100vh - 32px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden",
        animation: "modalIn 0.18s ease",
      }}>
        <div className="candidate-review-topbar">
          <div><h2>Candidate Review</h2><p>Review the student profile and candidacy application</p></div>
          <button onClick={onClose} aria-label="Close candidate review" className="candidate-review-close">×</button>
        </div>

        <div className="candidate-review-columns">
          <section className="candidate-review-column candidate-review-profile">
            <h3>Candidate Profile</h3>
            {candidate.photo_url ? <Image src={candidate.photo_url} alt={candidate.full_name + " candidate portrait"} width={120} height={120} unoptimized className="candidate-review-avatar" /> : <div className="candidate-review-avatar candidate-review-initials">{initials}</div>}
            <h4>{candidate.full_name}</h4>
            <p className="candidate-review-position">{candidate.position}</p>
            <span className="candidate-review-status" style={{ color: st.color, background: st.bg }}>{st.label}</span>
            <div className="candidate-review-profile-note">Use the information in the next panels to review this application.</div>
          </section>

          <section className="candidate-review-column">
            <h3>Student Information</h3>
            <div className="candidate-review-fields">
              {[
                ["Student ID", candidate.student_id],
                ["Section", candidate.section || "—"],
                ["Strand", candidate.strand || "—"],
                ["Applied", new Date(candidate.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })],
              ].map(([label, value]) => <div className="candidate-review-field" key={label}><strong>{label}</strong><span>{value}</span></div>)}
            </div>
            <div className="candidate-review-info-card"><strong>School Year</strong><p>{candidate.application_data.school_year || "Not provided"}</p></div>
            <div className="candidate-review-info-card"><strong>Contact Number</strong><p>{candidate.application_data.contact_number || "Not provided"}</p></div>
            <div className="candidate-review-info-card"><strong>Academic Standing / GPA</strong><p>{candidate.application_data.academic_standing || "Not provided"}</p></div>
            <div className="candidate-review-info-card"><strong>Previous School Year Average</strong><p>{candidate.application_data.previous_average || "Not provided"}</p></div>
            <div className="candidate-review-info-card"><strong>Academic Awards</strong><p>{candidate.application_data.academic_awards || "None listed"}</p></div>
            <div className="candidate-review-info-card"><strong>School Evaluation</strong><p>{candidate.reviewed_by_name ? `Reviewed by ${candidate.reviewed_by_name}${candidate.reviewed_at ? ` · ${new Date(candidate.reviewed_at).toLocaleDateString("en-PH")}` : ""}` : "Awaiting administrator review"}</p>{candidate.review_remarks&&<p><b>Remarks:</b> {candidate.review_remarks}</p>}</div>
            <div className="candidate-review-document"><strong>Registration Form / Grade Evidence</strong>
              {documentUrl ? <a href={documentUrl} target="_blank" rel="noreferrer">Open uploaded document</a> : <button type="button" onClick={handleOpenRegistrationForm} disabled={documentLoading || !candidate.registration_form_path}>{documentLoading ? "Preparing secure link…" : candidate.registration_form_path ? "View private document" : "No document uploaded"}</button>}
              <small>Private link expires after five minutes.</small>
            </div>
          </section>

          <section className="candidate-review-column">
            <h3>Campaign Information</h3>
            <div className="candidate-review-info-card">
              <strong>Campaign slogan</strong>
              <p title={candidate.tagline || "Not provided"}>{candidate.tagline || "Not provided"}</p>
            </div>
            <div className="candidate-review-info-card candidate-review-bio-card">
              <strong>Candidate bio / credentials</strong>
              <p title={candidate.bio || "Not provided"}>{candidate.bio || "Not provided"}</p>
            </div>
            <div className="candidate-review-info-card"><strong>Previous leadership</strong><p>{candidate.application_data.leadership_held === "yes" ? candidate.application_data.leadership_details || "Details not provided" : candidate.application_data.leadership_held === "no" ? "No previous position" : "Not provided"}</p></div>
            <div className="candidate-review-info-card"><strong>Organizations and clubs</strong><p>{candidate.application_data.organizations || "Not provided"}</p></div>
            <div className="candidate-review-info-card"><strong>Volunteer / school activities</strong><p>{candidate.application_data.volunteer_experience || "Not provided"}</p></div>
            <details className="candidate-review-answers"><summary>View candidate responses</summary><div>{[["Why this student wants to represent",candidate.application_data.why_representative],["Candidate qualities",candidate.application_data.candidate_qualities],["Plans or projects",candidate.application_data.student_plans],["How they will represent student concerns",candidate.application_data.represent_student_concerns],["Balancing academics and leadership",candidate.application_data.balance_responsibilities]].map(([label,value])=><section key={label}><strong>{label}</strong><p>{value || "Not provided"}</p></section>)}</div></details>          </section>
        </div>

        {error && <div className="candidate-review-error" role="alert">{error}</div>}

        {locked ? (
          <div className="candidate-review-footer"><p style={{ marginRight: "auto", color: "#9a3412", fontSize: 13, fontWeight: 700 }}>Review actions are locked because voting has started.</p></div>
        ) : confirmDelete ? (
          <div className="candidate-review-footer candidate-review-delete-confirm">
            <p><i className="ti ti-alert-triangle" aria-hidden="true" /> This permanently deletes the application and allows the student to reapply. Continue?</p>
            <button onClick={() => setConfirmDelete(false)} disabled={loading} className="candidate-review-secondary-button">Cancel</button>
            <button onClick={handleDelete} disabled={loading} className="candidate-review-delete-button">{loading ? "Deleting…" : "Yes, Delete Application"}</button>
          </div>
        ) : (
          <div className="candidate-review-footer">
            <label className="candidate-review-remarks">Administrator remarks (optional)<textarea value={reviewRemarks} onChange={e=>setReviewRemarks(e.target.value)} maxLength={1000} placeholder="Add review notes or a reason for disapproval" /></label>
            {candidate.status !== "rejected" && <button disabled={loading} onClick={() => handleAction("rejected")} className="candidate-review-secondary-button">{candidate.status === "approved" ? "Revoke Approval" : "Reject Candidate"}</button>}
            {candidate.status !== "approved" && <button disabled={loading} onClick={() => handleAction("approved")} className="candidate-review-approve-button">{loading ? "Saving…" : candidate.status === "rejected" ? "Approve Candidate" : "Approve Candidate"}</button>}
            <button onClick={() => setConfirmDelete(true)} disabled={loading} className="candidate-review-delete-link"><i className="ti ti-trash" aria-hidden="true" /> Delete Application</button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CandidacyClient({
  initialCandidates,
  stats: initialStats,
  votingStartsAt,
}: {
  initialCandidates: Candidate[];
  stats: Stats;
  votingStartsAt: string | null;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [stats, setStats]           = useState<Stats>(initialStats);
  const [filter, setFilter]         = useState<Filter>("all");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Candidate | null>(null);
  const [electionStarted, setElectionStarted] = useState(false);

  useEffect(() => {
    const update = () => setElectionStarted(Boolean(votingStartsAt && Date.now() >= new Date(votingStartsAt).getTime()));
    update();
    const timer = setInterval(update, 15_000);
    return () => clearInterval(timer);
  }, [votingStartsAt]);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAll() {
      const [
        { count: total },
        { count: pending },
        { count: approved },
        { count: rejected },
        { data },
      ] = await Promise.all([
        supabase.from("candidates").select("*", { count: "exact", head: true }),
        supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase
          .from("candidates")
          .select(`id, user_id, status, created_at, tagline, bio, photo_url, candidate_applications(application_data,registration_form_path,review_remarks,reviewed_at,reviewed_by_name), profiles ( full_name, student_id, section, strand ), positions ( name )`)
          .order("created_at", { ascending: false }),
      ]);

      setCandidates(((data as unknown as RawCandidate[]) ?? []).map((c) => ({
        id:         c.id,
        user_id:    c.user_id,
        status:     c.status,
        created_at: c.created_at,
        full_name:  c.profiles?.full_name  ?? "Unknown",
        student_id: c.profiles?.student_id ?? "—",
        position:   c.positions?.name      ?? "—",
        section: c.profiles?.section ?? "—", strand: c.profiles?.strand ?? "—",
        tagline: c.tagline ?? "", bio: c.bio ?? "", photo_url: c.photo_url ?? "",
        application_data: c.candidate_applications?.application_data ?? {}, registration_form_path: c.candidate_applications?.registration_form_path ?? null,
        review_remarks: c.candidate_applications?.review_remarks ?? "", reviewed_at: c.candidate_applications?.reviewed_at ?? null, reviewed_by_name: c.candidate_applications?.reviewed_by_name ?? "",
      })));

      setStats({ total: total ?? 0, pending: pending ?? 0, approved: approved ?? 0, rejected: rejected ?? 0 });
    }

    fetchAll();

    const channel = supabase
      .channel("candidacy-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
  function handleDelete(id: string) {
    const oldStatus = candidates.find((c) => c.id === id)?.status ?? "pending";
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setStats((prev) => ({
      ...prev,
      total:       Math.max(0, prev.total - 1),
      [oldStatus]: Math.max(0, prev[oldStatus] - 1),
    }));
  }
  function handleUpdate(id: string, newStatus: "approved" | "rejected") {
    const oldStatus = candidates.find((c) => c.id === id)?.status ?? "pending";
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    setStats((prev) => ({
      ...prev,
      [oldStatus]: Math.max(0, prev[oldStatus] - 1),
      [newStatus]: prev[newStatus] + 1,
    }));
  }

  const filtered = candidates.filter((c) => {
    const matchFilter = filter === "all" || c.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.position.toLowerCase().includes(q)  ||
      c.student_id.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // ── Same card structure as dashboard ────────────────────────────────────────
  const statCards = [

  {

    label: "Total Submitted", value: stats.total,

    sub: "All applications", subColor: "#7dd3fc",

    iconClass: "ti-file-text", iconColor: "#7dd3fc", bg: "#1e293b",

  },
    {
      label: "Pending Review", value: stats.pending,
      sub: stats.pending ? "Need Review" : "All reviewed", subColor: "#fcd34d",
      iconClass: "ti-clock-hour-4", iconColor: "#fcd34d", bg: "#3a2a1a",
    },
    {
      label: "Approved", value: stats.approved,
      sub: "Cleared to run", subColor: "#4ade80",
      iconClass: "ti-user-check", iconColor: "#4ade80", bg: "#1a3a2a",
    },
    {
      label: "Rejected", value: stats.rejected,
      sub: stats.rejected ? "Denied" : "None rejected", subColor: "#f87171",
      iconClass: "ti-user-x", iconColor: "#f87171", bg: "#3a1a1a",
    },
  ];

  const filterTabs: { key: Filter; label: string }[] = [
    { key: "all",      label: "All"      },
    { key: "pending",  label: "Pending"  },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1 style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "22px", fontWeight: 700,
        color: "#0d6b34", letterSpacing: "0.04em",
        textTransform: "uppercase", margin: 0,
      }}>
        Candidacy
      </h1>

      {/* ── Stat Cards — identical structure to dashboard ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "12px" }}>
        {statCards.map(({ label, value, sub, subColor, iconClass, iconColor, bg }) => (
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

      {/* ── Table Card ── */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
        }}>
          <h2 style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "16px", fontWeight: 700, color: "#0d6b34",
            letterSpacing: "0.04em", textTransform: "uppercase", margin: 0, flex: 1,
          }}>
            Candidacy Applications
          </h2>

          <div style={{ position: "relative" }}>
            <i className="ti ti-search" style={{
              position: "absolute", left: "10px", top: "50%",
              transform: "translateY(-50%)", color: "#94a3b8", fontSize: "15px",
            }} />
            <input
              type="text"
              placeholder="Search name, position, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: "32px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px",
                border: "1px solid #e2e8f0", borderRadius: "8px",
                fontSize: "13px", color: "#1e293b", outline: "none",
                width: "220px", background: "#f8fafc",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            {filterTabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: "5px 14px", borderRadius: "6px", border: "none",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                  background: filter === key ? "#0d6b34" : "transparent",
                  color:      filter === key ? "#fff"    : "#64748b",
                }}
              >
                {label}
                {key !== "all" && (
                  <span style={{
                    marginLeft: "5px", fontSize: "10px", borderRadius: "999px", padding: "1px 6px",
                    background: filter === key ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                    color:      filter === key ? "#fff" : "#64748b",
                  }}>
                    {stats[key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Name", "Student ID", "Position", "Status", "Applied", "Action"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left",
                    fontSize: "11px", fontWeight: 700, color: "#94a3b8",
                    letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                    No candidates found.
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => {
                  const st = STATUS_COLOR[c.status] ?? STATUS_COLOR.pending;
                  const initials = c.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.1s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%",
                            background: "#0d6b34", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "11px", fontWeight: 700, color: "#fff",
                          }}>
                            {initials}
                          </div>
                          <span style={{ fontWeight: 600, color: "#1e293b" }}>{c.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#475569", fontFamily: "monospace" }}>{c.student_id}</td>
                      <td style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>{c.position}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          display: "inline-block", background: st.bg, color: st.color,
                          borderRadius: "6px", padding: "3px 10px",
                          fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em",
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(c.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => setSelected(c)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            padding: "6px 14px", borderRadius: "8px", border: "1px solid #e2e8f0",
                            background: "#fff", color: "#0d6b34", fontWeight: 700, fontSize: "12px",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#0d6b34"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                        >
                          <i className="ti ti-eye" /> {electionStarted ? "View" : "Review"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#94a3b8" }}>
            Showing {filtered.length} of {candidates.length} application{candidates.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {selected && (
        <ReviewModal
          candidate={selected}
          locked={electionStarted}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
