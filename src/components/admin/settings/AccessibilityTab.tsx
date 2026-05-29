"use client";
import { useState, useEffect } from "react";

type FontSize = "small" | "medium" | "large" | "xlarge";
type Settings = {
  darkMode:       boolean;
  highContrast:   boolean;
  screenReader:   boolean;
  reduceMotion:   boolean;
  magnifier:      boolean;
  fontSize:       FontSize;
};

const FONT_SIZES: { key: FontSize; label: string; size: string }[] = [
  { key: "small",  label: "Small",       size: "13px" },
  { key: "medium", label: "Medium",      size: "15px" },
  { key: "large",  label: "Large",       size: "18px" },
  { key: "xlarge", label: "Extra Large", size: "22px" },
];

const DEFAULT_SETTINGS: Settings = {
  darkMode:     false,
  highContrast: false,
  screenReader: false,
  reduceMotion: false,
  magnifier:    false,
  fontSize:     "medium",
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
        borderRadius: "50%", background: "#fff",
        top: "3px", transition: "left 0.2s",
        left: on ? "23px" : "3px",
      }} />
    </button>
  );
}

function SettingRow({ icon, iconColor, label, subtitle, children }: {
  icon: string;
  iconColor: string;
  label: string;
  subtitle: string;
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

export default function AccessibilityTab() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved]       = useState(false);
  const [preview, setPreview]   = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("svs_accessibility");
      if (stored) setSettings(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Apply settings to document in real time
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-dark",          String(settings.darkMode));
    root.setAttribute("data-high-contrast", String(settings.highContrast));
    root.setAttribute("data-reduce-motion", String(settings.reduceMotion));
    root.setAttribute("data-screen-reader", String(settings.screenReader));
    root.setAttribute("data-font-size",     settings.fontSize);

    const fontMap: Record<FontSize, string> = {
      small: "13px", medium: "15px", large: "18px", xlarge: "22px",
    };
    root.style.setProperty("--base-font-size", fontMap[settings.fontSize]);

    if (settings.reduceMotion) {
      root.style.setProperty("--transition-speed", "0s");
    } else {
      root.style.removeProperty("--transition-speed");
    }
  }, [settings]);

  function toggle(key: keyof Settings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function saveSettings() {
    localStorage.setItem("svs_accessibility", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function resetDefaults() {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem("svs_accessibility");
  }

  const rows: {
    key: keyof Settings;
    icon: string;
    iconColor: string;
    label: string;
    subtitle: string;
    type: "toggle" | "font";
  }[] = [
    { key: "darkMode",     icon: "ti-moon",           iconColor: "#6d28d9", label: "Dark Mode",          subtitle: "Reduce eye strain in low-light environments",           type: "toggle" },
    { key: "highContrast", icon: "ti-circle-half-2",  iconColor: "#0369a1", label: "High Contrast Mode", subtitle: "Stronger color contrast for visual impairments",        type: "toggle" },
    { key: "screenReader", icon: "ti-volume",         iconColor: "#0d6b34", label: "Screen Reader Mode", subtitle: "Optimize layout and labels for screen reader software", type: "toggle" },
    { key: "reduceMotion", icon: "ti-player-pause",   iconColor: "#b45309", label: "Reduce Motion",      subtitle: "Minimize animations for motion-sensitive users",        type: "toggle" },
    { key: "magnifier",    icon: "ti-zoom-in",        iconColor: "#0369a1", label: "Magnifier",          subtitle: "Enable on-screen magnification tool",                   type: "toggle" },
    { key: "fontSize",     icon: "ti-text-size",      iconColor: "#be123c", label: "Font Size",          subtitle: "Adjust text size across the entire system",             type: "font"   },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Main settings card */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-accessible" aria-hidden="true" style={{ fontSize: "18px", color: "#6d28d9" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>Accessibility Options</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>Make the system easier to use for all students</div>
          </div>
        </div>

        <div style={{ padding: "4px 20px 20px" }}>
          {rows.map(({ key, icon, iconColor, label, subtitle, type }) => (
            <SettingRow key={key} icon={icon} iconColor={iconColor} label={label} subtitle={subtitle}>
              {type === "toggle" ? (
                <Toggle
                  on={settings[key] as boolean}
                  onToggle={() => toggle(key)}
                  label={`Toggle ${label}`}
                />
              ) : (
                <div style={{ display: "flex", gap: "6px" }}>
                  {FONT_SIZES.map(({ key: fk, label: fl, size }) => (
                    <button
                      key={fk}
                      aria-label={`Font size ${fl}`}
                      onClick={() => setSettings((prev) => ({ ...prev, fontSize: fk }))}
                      style={{
                        width: "38px", height: "38px", borderRadius: "8px", cursor: "pointer",
                        border: "2px solid", transition: "all 0.15s", fontWeight: 700,
                        fontSize: size,
                        borderColor:  settings.fontSize === fk ? "#0d6b34" : "#e2e8f0",
                        background:   settings.fontSize === fk ? "#f0fdf4" : "#fff",
                        color:        settings.fontSize === fk ? "#0d6b34" : "#64748b",
                      }}
                    >
                      A
                    </button>
                  ))}
                </div>
              )}
            </SettingRow>
          ))}
        </div>
      </div>

      {/* Preview card */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-eye" aria-hidden="true" style={{ fontSize: "18px", color: "#0d6b34" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>Preview</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>See how your settings affect the UI</div>
            </div>
          </div>
          <button
            onClick={() => setPreview((p) => !p)}
            style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif" }}
          >
            <i className={`ti ${preview ? "ti-eye-off" : "ti-eye"}`} aria-hidden="true" />
            {preview ? "Hide" : "Show"} Preview
          </button>
        </div>

        {preview && (
          <div style={{ padding: "20px" }}>
            <div style={{
              background: settings.highContrast ? "#000" : settings.darkMode ? "#1a2e1f" : "#f4faf5",
              borderRadius: "12px", padding: "20px",
              filter: settings.highContrast ? "contrast(1.5)" : "none",
            }}>
              <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: settings.fontSize === "small" ? "16px" : settings.fontSize === "large" ? "22px" : settings.fontSize === "xlarge" ? "26px" : "18px", fontWeight: 700, color: settings.darkMode || settings.highContrast ? "#fff" : "#0d6b34", marginBottom: "8px" }}>
                Smart Voting System
              </div>
              <p style={{ fontSize: settings.fontSize === "small" ? "12px" : settings.fontSize === "large" ? "16px" : settings.fontSize === "xlarge" ? "20px" : "14px", color: settings.darkMode || settings.highContrast ? "rgba(255,255,255,0.75)" : "#64748b", marginBottom: "12px" }}>
                This is a preview of how the text and colors will appear with your current accessibility settings.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ background: "#0d6b34", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}>
                  Cast Vote
                </div>
                <div style={{ background: settings.darkMode ? "rgba(255,255,255,0.1)" : "#fff", color: settings.darkMode ? "#fff" : "#0d6b34", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, border: "1px solid #0d6b34" }}>
                  View Results
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active settings summary */}
      <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "14px 16px", border: "1px solid #bbf7d0" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#15803d", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Currently Active
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {(Object.entries(settings) as [keyof Settings, Settings[keyof Settings]][])
            .filter(([key, val]) => key !== "fontSize" && val === true)
            .map(([key]) => (
              <span key={key} style={{ background: "#0d6b34", color: "#fff", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                {key === "darkMode" ? "Dark Mode" : key === "highContrast" ? "High Contrast" : key === "screenReader" ? "Screen Reader" : key === "reduceMotion" ? "Reduce Motion" : "Magnifier"}
              </span>
            ))}
          <span style={{ background: "#0d6b34", color: "#fff", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
            Font: {FONT_SIZES.find((f) => f.key === settings.fontSize)?.label}
          </span>
          {Object.values(settings).every((v, i) => Object.keys(settings)[i] === "fontSize" ? v === "medium" : v === false) && (
            <span style={{ color: "#64748b", fontSize: "12px" }}>No accessibility features active</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={saveSettings}
          style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "10px", border: "none", background: saved ? "#059669" : "#0d6b34", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif", transition: "background 0.2s" }}
        >
          <i className={`ti ${saved ? "ti-check" : "ti-device-floppy"}`} aria-hidden="true" />
          {saved ? "Saved!" : "Save Settings"}
        </button>
        <button
          onClick={resetDefaults}
          style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif" }}
        >
          <i className="ti ti-refresh" aria-hidden="true" />
          Reset Defaults
        </button>
      </div>
    </div>
  );
}