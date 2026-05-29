"use client";

import { useState, useTransition } from "react";
import AccessibilityTab from "@/components/admin/settings/AccessibilityTab";
import { changePassword } from "@/app/actions/candidate";
import type { Profile } from "@/types/database";

type Tab = "account" | "accessibility" | "about";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "account",       label: "Account",       icon: "ti-user"       },
  { key: "accessibility", label: "Accessibility",  icon: "ti-accessible" },
  { key: "about",         label: "About",          icon: "ti-info-circle"},
];

// ── Account Tab ───────────────────────────────────────────────────────────────

function AccountTab({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback]      = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      try {
        await changePassword(fd);
        setFeedback({ type: "success", msg: "Password changed successfully!" });
        form.reset();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setFeedback({ type: "error", msg });
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Profile Info Card */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-id-badge" style={{ fontSize: "18px", color: "#0d6b34" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>Profile Information</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Your account details</div>
          </div>
        </div>
        <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { label: "Full Name",   value: profile.full_name  },
            { label: "Student ID",  value: profile.student_id },
            { label: "Strand",      value: profile.strand   ?? "—" },
            { label: "Section",     value: profile.section  ?? "—" },
            { label: "Role",        value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Change Password Card */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-lock" style={{ fontSize: "18px", color: "#b45309" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>Change Password</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Must be at least 8 characters</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {feedback && (
            <div style={{
              padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              background: feedback.type === "success" ? "#f0fdf4" : "#fff5f5",
              color:      feedback.type === "success" ? "#15803d" : "#be123c",
              border:     `1px solid ${feedback.type === "success" ? "#bbf7d0" : "#fecdd3"}`,
            }}>
              {feedback.type === "success" ? "✅" : "⚠️"} {feedback.msg}
            </div>
          )}
          {[
            { name: "password", label: "New Password",      placeholder: "Enter new password"     },
            { name: "confirm",  label: "Confirm Password",  placeholder: "Confirm new password"   },
          ].map(({ name, label, placeholder }) => (
            <div key={name} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
              <input
                name={name}
                type="password"
                placeholder={placeholder}
                required
                minLength={8}
                style={{ border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", fontFamily: "inherit" }}
                onFocus={(e)  => { e.currentTarget.style.borderColor = "#0d6b34"; }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={isPending}
            style={{
              alignSelf: "flex-start", padding: "10px 24px", borderRadius: "10px", border: "none",
              background: "#0d6b34", color: "#fff", fontWeight: 700, fontSize: "13.5px",
              cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
              fontFamily: "var(--font-open-sans), sans-serif",
            }}
          >
            {isPending ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── About Tab ─────────────────────────────────────────────────────────────────

function AboutTab() {
  const items = [
    { label: "System",      value: "Theresian School of Cavite — Smart Voting System" },
    { label: "Version",     value: "1.0.0"           },
    { label: "School",      value: "Theresian School of Cavite" },
    { label: "Built with",  value: "Next.js, Supabase, TypeScript" },
    { label: "Purpose",     value: "Official online voting platform for Theresian students" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-info-circle" style={{ fontSize: "18px", color: "#1d4ed8" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>About This System</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>System information and details</div>
          </div>
        </div>
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "0" }}>
          {items.map(({ label, value }, i) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 0", gap: "16px",
              borderBottom: i < items.length - 1 ? "1px solid #f1f5f9" : "none",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", minWidth: "120px" }}>{label}</span>
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#1e293b", textAlign: "right" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "16px 20px", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "12px" }}>
        <i className="ti ti-shield-check" style={{ fontSize: "24px", color: "#0d6b34", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#15803d" }}>Secure & Confidential</div>
          <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "2px" }}>
            Your vote is encrypted and anonymous. The system ensures fair and transparent elections.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VoterSettingsClient({ profile }: { profile: Profile }) {
  const [activeTab, setActiveTab] = useState<Tab>("account");

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "var(--font-open-sans), sans-serif" }}>

      <h1 style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "22px", fontWeight: 700,
        color: "#0d6b34", letterSpacing: "0.04em",
        textTransform: "uppercase", margin: 0,
      }}>
        Settings
      </h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", borderRadius: "10px", padding: "4px", flexWrap: "wrap" }}>
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "8px 16px", borderRadius: "7px", border: "none",
              fontSize: "13px", fontWeight: 700,
              fontFamily: "var(--font-open-sans), sans-serif",
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              background: activeTab === key ? "#0d6b34" : "transparent",
              color:      activeTab === key ? "#fff"    : "#64748b",
            }}
          >
            <i className={`ti ${icon}`} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "account"       && <AccountTab       profile={profile} />}
      {activeTab === "accessibility" && <AccessibilityTab />}
      {activeTab === "about"         && <AboutTab />}
    </section>
  );
}