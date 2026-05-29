"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type ElectionSettings = {
  id: string;
  title: string;
  voting_starts_at: string;
  voting_ends_at: string;
  results_visible_at: string;
  is_active: boolean;
};

function toLocalInput(iso: string) {
  return new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
    .slice(0, 16)
    .replace(" ", "T");
}

function toManilaISO(localInput: string) {
  // localInput is "YYYY-MM-DDTHH:MM" in Manila time
  // Convert to UTC ISO string for storage
  const date = new Date(localInput + ":00+08:00");
  return date.toISOString();
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        width: "44px", height: "24px", borderRadius: "999px",
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
        background: on ? "#0d6b34" : "#cbd5e1",
      }}
    >
      <span style={{
        position: "absolute", width: "18px", height: "18px",
        borderRadius: "50%", background: "#fff", top: "3px",
        transition: "left 0.2s", left: on ? "23px" : "3px",
      }} />
    </button>
  );
}

function PhaseIndicator({ phase }: { phase: string }) {
  const styles: Record<string, { bg: string; color: string; icon: string; label: string }> = {
    upcoming: { bg: "#fef3c7", color: "#b45309", icon: "ti-clock-hour-4", label: "Upcoming"     },
    voting:   { bg: "#dcfce7", color: "#15803d", icon: "ti-writing",      label: "Voting Open"  },
    closed:   { bg: "#f1f5f9", color: "#475569", icon: "ti-lock",         label: "Voting Closed"},
    results:  { bg: "#ede9fe", color: "#6d28d9", icon: "ti-trophy",       label: "Results Live" },
  };
  const s = styles[phase] ?? styles.upcoming;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      background: s.bg, color: s.color,
      borderRadius: "8px", padding: "6px 12px",
      fontSize: "13px", fontWeight: 700,
    }}>
      <i className={`ti ${s.icon}`} aria-hidden="true" />
      {s.label}
    </div>
  );
}

export default function ScheduleTab() {
  const [settings, setSettings]   = useState<ElectionSettings | null>(null);
  const [form, setForm]           = useState({
    title:              "",
    voting_starts_at:   "",
    voting_ends_at:     "",
    results_visible_at: "",
    is_active:          true,
  });
  const [phase, setPhase]         = useState("upcoming");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [validationError, setValidationError] = useState("");

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function computePhase(s: ElectionSettings) {
    const now       = Date.now();
    const starts    = new Date(s.voting_starts_at).getTime();
    const ends      = new Date(s.voting_ends_at).getTime();
    const results   = new Date(s.results_visible_at).getTime();
    if (now < starts)  return "upcoming";
    if (now < ends)    return "voting";
    if (now < results) return "closed";
    return "results";
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("election_settings")
        .select("*")
        .single();

      if (data) {
        setSettings(data as ElectionSettings);
        setPhase(computePhase(data as ElectionSettings));
        setForm({
          title:              data.title,
          voting_starts_at:   toLocalInput(data.voting_starts_at),
          voting_ends_at:     toLocalInput(data.voting_ends_at),
          results_visible_at: toLocalInput(data.results_visible_at),
          is_active:          data.is_active,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  function validate() {
    const starts  = new Date(form.voting_starts_at).getTime();
    const ends    = new Date(form.voting_ends_at).getTime();
    const results = new Date(form.results_visible_at).getTime();

    if (!form.title.trim())           return "Election title is required.";
    if (!form.voting_starts_at)       return "Voting start date is required.";
    if (!form.voting_ends_at)         return "Voting end date is required.";
    if (!form.results_visible_at)     return "Results visible date is required.";
    if (ends <= starts)               return "Voting end must be after voting start.";
    if (results < ends)               return "Results date must be after voting ends.";
    return "";
  }

  async function handleSave() {
    const err = validate();
    if (err) { setValidationError(err); return; }
    setValidationError("");
    setSaving(true);

    try {
      const supabase = createClient();
      const payload = {
        title:              form.title,
        voting_starts_at:   toManilaISO(form.voting_starts_at),
        voting_ends_at:     toManilaISO(form.voting_ends_at),
        results_visible_at: toManilaISO(form.results_visible_at),
        is_active:          form.is_active,
      };

      const { error } = settings
        ? await supabase.from("election_settings").update(payload).eq("id", settings.id)
        : await supabase.from("election_settings").insert(payload);

      if (error) throw new Error(error.message);

      // Recompute phase preview
      setPhase(computePhase({
        ...payload,
        id: settings?.id ?? "",
      }));

      await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:   "Election schedule updated",
          detail:   `Title: "${form.title}" | Voting: ${form.voting_starts_at} → ${form.voting_ends_at} | Results: ${form.results_visible_at}`,
          category: "election",
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      showToast("Election schedule saved successfully!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save", "error");
    }
    setSaving(false);
  }

  const fieldStyle = {
    width: "100%", border: "1px solid #e2e8f0", borderRadius: "8px",
    padding: "10px 12px", fontSize: "13px",
    fontFamily: "var(--font-open-sans), sans-serif",
    color: "#1a2e1f", outline: "none", background: "#f8fafc",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    fontSize: "12px", fontWeight: 700, color: "#64748b",
    display: "block", marginBottom: "6px",
    textTransform: "uppercase" as const, letterSpacing: "0.05em",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px", color: "#94a3b8", fontSize: "14px" }}>
        <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: "24px", marginRight: "10px" }} />
        Loading election settings…
      </div>
    );
  }

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

      {/* Current phase banner */}
      <div style={{
        background: "#fff", borderRadius: "16px",
        border: "1px solid #e2e8f0", padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            Current Election Phase
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a2e1f" }}>
            {form.title || "No election configured"}
          </div>
        </div>
        <PhaseIndicator phase={phase} />
      </div>

      {/* Schedule form */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-calendar" aria-hidden="true" style={{ fontSize: "18px", color: "#0d6b34" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>
              Election Schedule
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>
              All times are in Philippine Standard Time (UTC+8)
            </div>
          </div>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>Election Title *</label>
            <input
              style={fieldStyle}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. S.Y. 2025-2026 Student Council Election"
            />
          </div>

          {/* Date grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

            {/* Voting starts */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>
                <i className="ti ti-player-play" aria-hidden="true" style={{ marginRight: "5px", color: "#0d6b34" }} />
                Voting Starts *
              </label>
              <input
                type="datetime-local"
                style={fieldStyle}
                value={form.voting_starts_at}
                onChange={(e) => setForm({ ...form, voting_starts_at: e.target.value })}
              />
              {form.voting_starts_at && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  PST: {new Date(form.voting_starts_at + ":00+08:00").toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "full", timeStyle: "short" })}
                </div>
              )}
            </div>

            {/* Voting ends */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>
                <i className="ti ti-player-stop" aria-hidden="true" style={{ marginRight: "5px", color: "#be123c" }} />
                Voting Ends *
              </label>
              <input
                type="datetime-local"
                style={fieldStyle}
                value={form.voting_ends_at}
                onChange={(e) => setForm({ ...form, voting_ends_at: e.target.value })}
              />
              {form.voting_ends_at && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  PST: {new Date(form.voting_ends_at + ":00+08:00").toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "full", timeStyle: "short" })}
                </div>
              )}
            </div>

            {/* Results visible */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>
                <i className="ti ti-trophy" aria-hidden="true" style={{ marginRight: "5px", color: "#6d28d9" }} />
                Results Visible At *
                <span style={{ fontWeight: 400, textTransform: "none", color: "#94a3b8", fontSize: "11px", marginLeft: "6px" }}>
                  Results auto-unlock when this time passes
                </span>
              </label>
              <input
                type="datetime-local"
                style={fieldStyle}
                value={form.results_visible_at}
                onChange={(e) => setForm({ ...form, results_visible_at: e.target.value })}
              />
              {form.results_visible_at && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  PST: {new Date(form.results_visible_at + ":00+08:00").toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "full", timeStyle: "short" })}
                </div>
              )}
            </div>
          </div>

          {/* Active toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", background: "#f8fafc",
            borderRadius: "10px", border: "1px solid #e2e8f0",
          }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a2e1f" }}>
                <i className="ti ti-circle-check" aria-hidden="true" style={{ marginRight: "6px", color: "#0d6b34" }} />
                Election Is Active
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                Disabling this hides the election from voters
              </div>
            </div>
            <Toggle
              on={form.is_active}
              onToggle={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              label="Toggle election active"
            />
          </div>

          {/* Timeline preview */}
          {form.voting_starts_at && form.voting_ends_at && form.results_visible_at && (
            <div style={{ background: "#1a2e1f", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                Timeline Preview
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { icon: "ti-player-play", color: "#4ade80", label: "Voting Opens",  value: form.voting_starts_at   },
                  { icon: "ti-player-stop", color: "#f87171", label: "Voting Closes", value: form.voting_ends_at     },
                  { icon: "ti-trophy",      color: "#c084fc", label: "Results Live",  value: form.results_visible_at },
                ].map(({ icon, color, label, value }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: "16px", color, flexShrink: 0 }} />
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", minWidth: "100px", fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: "12px", color: "#fff", fontWeight: 700 }}>
                      {new Date(value + ":00+08:00").toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" />
              {validationError}
            </div>
          )}

          {/* Save */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "10px 20px", borderRadius: "10px", border: "none",
                background: saved ? "#059669" : "#0d6b34", color: "#fff",
                fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--font-open-sans), sans-serif",
                opacity: saving ? 0.7 : 1, transition: "background 0.2s",
              }}
            >
              <i className={`ti ${saved ? "ti-check" : "ti-calendar"}`} aria-hidden="true" />
              {saving ? "Saving…" : saved ? "Saved!" : "Save Schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}