"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateCandidateStatus, deleteCandidate } from "../../app/actions/candidate";

// ── Types ─────────────────────────────────────────────────────────────────────

type Candidate = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  full_name: string;
  student_id: string;
  position: string;
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
  profiles: { full_name: string; student_id: string } | null;
  positions: { name: string } | null;
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
  onClose,
  onUpdate,
  onDelete,
}: {
  candidate: Candidate;
  onClose: () => void;
  onUpdate: (id: string, status: "approved" | "rejected") => void;
  onDelete: (id: string) => void;
}) {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
  setLoading(true);
  setError("");

  const result = await deleteCandidate(candidate.id, candidate.user_id);
  if (result.error) { setError(result.error); setLoading(false); return; }

  onDelete(candidate.id);
  setLoading(false);
  onClose();
}

  async function handleAction(newStatus: "approved" | "rejected") {
  setLoading(true);
  setError("");

  const result = await updateCandidateStatus(candidate.id, candidate.user_id, newStatus);
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
      <div style={{
        background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "440px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden",
        animation: "modalIn 0.18s ease",
      }}>
        {/* Header */}
        <div style={{ background: "#0d6b34", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "42px", height: "42px", borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#fff",
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>{candidate.full_name}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)" }}>Candidacy Review</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px",
            width: "32px", height: "32px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "18px", lineHeight: 1,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {([
              { label: "Position",   value: candidate.position   },
              { label: "Student ID", value: candidate.student_id },
              { label: "Applied", value: new Date(candidate.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) },
              { label: "Status", value: (
                <span style={{ color: st.color, background: st.bg, borderRadius: "6px", padding: "2px 10px", fontSize: "12px", fontWeight: 700 }}>
                  {st.label}
                </span>
              )},
            ] as { label: string; value: React.ReactNode }[]).map(({ label, value }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{value}</div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {/* Confirm delete state */}
          {confirmDelete ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "#fff5f5", border: "1px solid #fecdd3", borderRadius: "10px", padding: "12px 14px", fontSize: "13px", color: "#be123c", fontWeight: 600 }}>
                <i className="ti ti-alert-triangle" style={{ marginRight: "6px" }} />
                This will permanently delete the application and allow the student to reapply. Are you sure?
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={loading}
                  style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#be123c", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
                >
                  <i className="ti ti-trash" style={{ marginRight: "6px" }} />
                  {loading ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                {candidate.status !== "rejected" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("rejected")}
                    style={{
                      flex: 1, padding: "11px", borderRadius: "10px", border: "2px solid #fecdd3",
                      background: "#fff", color: "#be123c", fontWeight: 700, fontSize: "14px",
                      cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#ffe4e6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                  >
                    <i className="ti ti-x" style={{ marginRight: "6px" }} />
                    {candidate.status === "approved" ? "Revoke" : "Reject"}
                  </button>
                )}
                {candidate.status !== "approved" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("approved")}
                    style={{
                      flex: 1, padding: "11px", borderRadius: "10px", border: "none",
                      background: "#0d6b34", color: "#fff", fontWeight: 700, fontSize: "14px",
                      cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#0a5229"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#0d6b34"; }}
                  >
                    <i className="ti ti-check" style={{ marginRight: "6px" }} />
                    {loading ? "Saving…" : candidate.status === "rejected" ? "Approve Instead" : "Approve"}
                  </button>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
                style={{
                  width: "100%", padding: "10px", borderRadius: "10px",
                  border: "2px dashed #fecdd3", background: "#fff5f5",
                  color: "#be123c", fontWeight: 700, fontSize: "13px",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "6px", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#ffe4e6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff5f5"; }}
              >
                <i className="ti ti-trash" aria-hidden="true" />
                Delete Application
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>
                  
                </span>
              </button>
            </div>
          )}
        </div>
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
}: {
  initialCandidates: Candidate[];
  stats: Stats;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [stats, setStats]           = useState<Stats>(initialStats);
  const [filter, setFilter]         = useState<Filter>("all");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Candidate | null>(null);

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
          .select(`id, user_id, status, created_at, profiles ( full_name, student_id ), positions ( name )`)
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
                          <i className="ti ti-eye" /> Review
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
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}