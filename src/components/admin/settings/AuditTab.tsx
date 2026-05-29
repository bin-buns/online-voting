"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type AuditLog = {
  id: string;
  action: string;
  detail: string | null;
  created_at: string;
  admin_name: string;
  category: string;
};

type CategoryFilter = "all" | "candidate" | "account" | "election" | "system" | "votes" | "general";

const CATEGORY_STYLES: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  candidate: { bg: "#dcfce7", color: "#15803d", dot: "#0d6b34", label: "Candidate" },
  account:   { bg: "#e0f2fe", color: "#0369a1", dot: "#0369a1", label: "Account"   },
  election:  { bg: "#ede9fe", color: "#6d28d9", dot: "#6d28d9", label: "Election"  },
  system:    { bg: "#fef3c7", color: "#b45309", dot: "#b45309", label: "System"    },
  votes:     { bg: "#ffe4e6", color: "#be123c", dot: "#be123c", label: "Votes"     },
  general:   { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8", label: "General"   },
};

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "candidate", label: "Candidate" },
  { key: "account",   label: "Account"   },
  { key: "election",  label: "Election"  },
  { key: "system",    label: "System"    },
  { key: "votes",     label: "Votes"     },
  { key: "general",   label: "General"   },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return "Just now";
  if (mins  < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hr${hours !== 1 ? "s" : ""} ago`;
  if (days  <  7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function AuditTab({
  initialLogs,
}: {
  initialLogs: AuditLog[];
}) {
  const [logs, setLogs]         = useState<AuditLog[]>(initialLogs);
  const [filter, setFilter]     = useState<CategoryFilter>("all");
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchLogs() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setLogs(data as AuditLog[]);
    setLoading(false);
  }

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel  = supabase
      .channel("audit-logs-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function exportCSV() {
    const rows = [
      "Timestamp,Admin,Action,Detail,Category",
      ...filtered.map((l) =>
        `"${new Date(l.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}","${l.admin_name}","${l.action}","${l.detail ?? ""}","${l.category}"`
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Audit log exported!", "success");
  }

  const filtered = logs.filter((l) => {
    const matchCat    = filter === "all" || l.category === filter;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      l.action.toLowerCase().includes(q)      ||
      l.admin_name.toLowerCase().includes(q)  ||
      (l.detail ?? "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Count per category for badges
  const counts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
          background: toast.type === "success" ? "#0d6b34" : "#be123c",
          color: "#fff", borderRadius: "10px", padding: "12px 20px",
          fontSize: "13px", fontWeight: 700,
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <i className={`ti ${toast.type === "success" ? "ti-check" : "ti-x"}`} aria-hidden="true" />
          {toast.msg}
        </div>
      )}

      {/* Header card */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-file-text" aria-hidden="true" style={{ fontSize: "18px", color: "#0d6b34" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>Audit Log</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>Complete record of all admin actions — {logs.length} entries total</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={fetchLogs}
              disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif" }}
            >
              <i className={`ti ti-refresh ${loading ? "ti-spin" : ""}`} aria-hidden="true" />
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              onClick={exportCSV}
              style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 14px", borderRadius: "8px", border: "none", background: "#0d6b34", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif" }}
            >
              <i className="ti ti-download" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <i className="ti ti-search" aria-hidden="true" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "15px" }} />
            <input
              type="text"
              placeholder="Search action, admin, or detail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: "32px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", color: "#1a2e1f", outline: "none", background: "#f8fafc", fontFamily: "var(--font-open-sans), sans-serif" }}
            />
          </div>

          {/* Category filters */}
          <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", borderRadius: "8px", padding: "3px", flexWrap: "wrap" }}>
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: "5px 12px", borderRadius: "6px", border: "none",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  fontFamily: "var(--font-open-sans), sans-serif", transition: "all 0.15s",
                  background: filter === key ? "#0d6b34" : "transparent",
                  color:      filter === key ? "#fff"    : "#64748b",
                  display: "flex", alignItems: "center", gap: "5px",
                }}
              >
                {label}
                {key !== "all" && counts[key] ? (
                  <span style={{
                    fontSize: "10px", borderRadius: "999px", padding: "1px 5px",
                    background: filter === key ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                    color:      filter === key ? "#fff" : "#64748b",
                  }}>
                    {counts[key]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Log entries */}
        <div style={{ padding: "8px 20px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
              <i className="ti ti-file-off" aria-hidden="true" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }} />
              No audit logs found.
            </div>
          ) : (
            filtered.map((log, i) => {
              const style   = CATEGORY_STYLES[log.category] ?? CATEGORY_STYLES.general;
              const isOpen  = expanded === log.id;
              return (
                <div
                  key={log.id}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f8fafc" : "none" }}
                >
                  <div
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 0", cursor: "pointer" }}
                  >
                    {/* Dot */}
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: style.dot, flexShrink: 0, marginTop: "6px" }} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a2e1f" }}>{log.action}</div>
                        <span style={{ fontSize: "10px", fontWeight: 700, borderRadius: "4px", padding: "2px 7px", background: style.bg, color: style.color }}>
                          {style.label}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {log.admin_name} · {timeAgo(log.created_at)}
                      </div>
                      {isOpen && log.detail && (
                        <div style={{ marginTop: "8px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "12px", color: "#475569", lineHeight: 1.6, borderLeft: `3px solid ${style.dot}` }}>
                          {log.detail}
                        </div>
                      )}
                    </div>

                    {/* Timestamp + expand */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {log.detail && (
                        <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} aria-hidden="true" style={{ fontSize: "14px", color: "#94a3b8" }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Showing {filtered.length} of {logs.length} entries</span>
            <span>Auto-updates in real time</span>
          </div>
        )}
      </div>
    </div>
  );
}