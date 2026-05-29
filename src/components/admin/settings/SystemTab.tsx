"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type SystemSettings = {
  system_name:      string;
  show_results:     boolean;
  maintenance_mode: boolean;
};

const DEFAULT: SystemSettings = {
  system_name:      "Theresian School of Cavite — Smart Voting System",
  show_results:     true,
  maintenance_mode: false,
};

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

function SettingRow({ icon, iconColor, label, subtitle, children }: {
  icon: string; iconColor: string;
  label: string; subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderBottom: "1px solid #f8fafc", gap: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: "18px", color: iconColor }} />
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a2e1f" }}>{label}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionCard({ icon, iconBg, iconColor, title, subtitle, children }: {
  icon: string; iconBg: string; iconColor: string;
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: "18px", color: iconColor }} />
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>{title}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

export default function SystemTab() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT);
  const [logoUrl, setLogoUrl]   = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Load settings from Supabase on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .single();
      if (data) {
        setSettings({
          system_name:      data.system_name      ?? DEFAULT.system_name,
          show_results:     data.show_results     ?? DEFAULT.show_results,
          maintenance_mode: data.maintenance_mode ?? DEFAULT.maintenance_mode,
        });
        setLogoUrl(data.logo_url ?? null);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          id:               1,
          system_name:      settings.system_name,
          show_results:     settings.show_results,
          maintenance_mode: settings.maintenance_mode,
          logo_url:         logoUrl,
        });
      if (error) throw new Error(error.message);

      await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:   "System preferences updated",
          detail:   `System name: "${settings.system_name}", Maintenance: ${settings.maintenance_mode}, Show results: ${settings.show_results}`,
          category: "system",
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      showToast("System preferences saved!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save", "error");
    }
    setSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Logo must be under 2MB", "error");
      return;
    }
    try {
      const supabase  = createClient();
      const ext       = file.name.split(".").pop();
      const path      = `logos/school-logo.${ext}`;
      const { error } = await supabase.storage
        .from("system-assets")
        .upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);

      const { data } = supabase.storage
        .from("system-assets")
        .getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      showToast("Logo uploaded successfully!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    }
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

      {/* Identity */}
      <SectionCard icon="ti-school" iconBg="#f0fdf4" iconColor="#0d6b34" title="System Identity" subtitle="Configure the name and logo shown across the system">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* System name */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "5px" }}>System Name</div>
            <input
              value={settings.system_name}
              onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
              style={{ width: "100%", maxWidth: "480px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font-open-sans), sans-serif", color: "#1a2e1f", outline: "none", background: "#f8fafc" }}
            />
          </div>

          {/* Logo upload */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>School Logo</div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "12px", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {logoUrl ? (
                  <Image src={logoUrl} alt="School logo" width={60} height={60} style={{ objectFit: "cover" }} />
                ) : (
                  <i className="ti ti-school" aria-hidden="true" style={{ fontSize: "24px", color: "#94a3b8" }} />
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif" }}>
                  <i className="ti ti-upload" aria-hidden="true" />
                  Upload Logo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                </label>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>PNG, JPG or SVG · Max 2MB</div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Behavior */}
      <SectionCard icon="ti-adjustments" iconBg="#ede9fe" iconColor="#6d28d9" title="System Behavior" subtitle="Control how the system behaves for students and the public">
        <div style={{ paddingTop: "4px" }}>
          <SettingRow icon="ti-chart-bar" iconColor="#0d6b34" label="Show Results to Public" subtitle="Allow non-admin users to view election results after voting ends">
            <Toggle
              on={settings.show_results}
              onToggle={() => setSettings((p) => ({ ...p, show_results: !p.show_results }))}
              label="Toggle public results"
            />
          </SettingRow>
          <SettingRow icon="ti-tools" iconColor="#b45309" label="Maintenance Mode" subtitle="Temporarily lock all voting pages — students will see a maintenance message">
            <Toggle
              on={settings.maintenance_mode}
              onToggle={() => setSettings((p) => ({ ...p, maintenance_mode: !p.maintenance_mode }))}
              label="Toggle maintenance mode"
            />
          </SettingRow>
        </div>

        {/* Maintenance warning */}
        {settings.maintenance_mode && (
          <div style={{ marginTop: "12px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" style={{ fontSize: "18px", color: "#b45309", flexShrink: 0 }} />
            <div style={{ fontSize: "13px", color: "#b45309", fontWeight: 600 }}>
              Maintenance mode is ON — students cannot access voting pages right now.
            </div>
          </div>
        )}
      </SectionCard>

      {/* System info */}
      <SectionCard icon="ti-info-circle" iconBg="#e0f2fe" iconColor="#0369a1" title="System Information" subtitle="Current build and version details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { label: "System",    value: "Smart Voting System"    },
            { label: "School",    value: "Theresian School of Cavite" },
            { label: "Stack",     value: "Next.js 15 + Supabase"  },
            { label: "Subject",   value: "ITEC 101A"               },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a2e1f" }}>{value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

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
          <i className={`ti ${saved ? "ti-check" : "ti-device-floppy"}`} aria-hidden="true" />
          {saving ? "Saving…" : saved ? "Saved!" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}