"use client";
import { useState } from "react";
import AccountsTab     from "@/components/admin/settings/AccountsTab";
import AccessibilityTab from "@/components/admin/settings/AccessibilityTab";
import ElectionTab     from "@/components/admin/settings/ElectionTab";
import SystemTab       from "@/components/admin/settings/SystemTab";
import AuditTab        from "@/components/admin/settings/AuditTab";
import ScheduleTab from "@/components/admin/settings/ScheduleTab";

type Student = {
  id: string;
  full_name: string;
  student_id: string;
  section: string | null;
  strand: string | null;
  role: string;
};

type AuditLog = {
  id: string;
  action: string;
  detail: string | null;
  created_at: string;
  admin_name: string;
  category: string;
};

type Tab = "accounts" | "accessibility" | "schedule" | "election" | "system" | "audit";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "accounts",      label: "Accounts",      icon: "ti-users"       },
  { key: "accessibility", label: "Accessibility",  icon: "ti-accessible"  },
  { key: "schedule",      label: "Schedule",       icon: "ti-calendar"    }, // ← new
  { key: "election",      label: "Election",       icon: "ti-settings-2"  },
  { key: "system",        label: "System",         icon: "ti-adjustments" },
  { key: "audit",         label: "Audit Log",      icon: "ti-file-text"   },
];

export default function SettingsClient({
  initialStudents,
  initialAuditLogs,
}: {
  initialStudents:  Student[];
  initialAuditLogs: AuditLog[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("accounts");

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "var(--font-open-sans), sans-serif" }}>

      <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
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
      {activeTab === "accounts"      && <AccountsTab      initialStudents={initialStudents} />}
      {activeTab === "accessibility" && <AccessibilityTab />}
      {activeTab === "election"      && <ElectionTab />}
      {activeTab === "system"        && <SystemTab />}
      {activeTab === "audit"         && <AuditTab         initialLogs={initialAuditLogs} />}
      {activeTab === "schedule" && <ScheduleTab />}
    </section>
  );
}