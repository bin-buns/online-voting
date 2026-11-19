"use client";

import { useEffect, useState } from "react";

type DisplaySettings = { darkMode: boolean; magnifier: boolean };
const DEFAULTS: DisplaySettings = { darkMode: false, magnifier: false };

function Toggle({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onClick} style={{ width: 46, height: 26, border: 0, borderRadius: 999, background: checked ? "#0d6b34" : "#cbd5e1", padding: 3, cursor: "pointer", transition: "background .2s" }}><span style={{ display: "block", width: 20, height: 20, borderRadius: "50%", background: "#fff", transform: checked ? "translateX(20px)" : "translateX(0)", transition: "transform .2s" }} /></button>;
}

export default function AccessibilityTab({ includeMagnifier = false }: { includeMagnifier?: boolean }) {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("svs_accessibility");
      if (raw) {
        const previous = JSON.parse(raw) as Partial<DisplaySettings>;
        setSettings({ darkMode: previous.darkMode === true, magnifier: includeMagnifier && previous.magnifier === true });
      }
    } catch { /* Ignore invalid local preferences. */ }
    const root = document.documentElement;
    root.removeAttribute("data-high-contrast");
    root.removeAttribute("data-screen-reader");
    root.removeAttribute("data-reduce-motion");
    root.removeAttribute("data-font-size");
    root.style.removeProperty("--base-font-size");
    root.style.removeProperty("--transition-speed");
  }, [includeMagnifier]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-dark", String(settings.darkMode));
    root.setAttribute("data-magnifier", String(includeMagnifier && settings.magnifier));
    root.style.zoom = includeMagnifier && settings.magnifier ? "1.1" : "";
  }, [settings, includeMagnifier]);

  function save() {
    const stored = { ...settings, magnifier: includeMagnifier && settings.magnifier };
    localStorage.setItem("svs_accessibility", JSON.stringify(stored));
    window.dispatchEvent(new Event("svs-accessibility-change"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    setSettings(DEFAULTS);
    localStorage.removeItem("svs_accessibility");
    document.documentElement.setAttribute("data-dark", "false");
    document.documentElement.style.zoom = "";
    window.dispatchEvent(new Event("svs-accessibility-change"));
  }

  const rows = [
    { key: "darkMode" as const, icon: "ti-moon-stars", title: "Dark mode", text: "Use a softer charcoal theme with readable text and calm contrast." },
    ...(includeMagnifier ? [{ key: "magnifier" as const, icon: "ti-zoom-in", title: "Magnifier", text: "Enlarge the interface slightly for easier reading." }] : []),
  ];

  return (
    <div style={{ maxWidth: 760, background: "var(--display-card, #fff)", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 28px rgba(15, 23, 42, .05)" }}>
      <div style={{ padding: "20px 22px", borderBottom: "1px solid #eef2f6", display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, color: "#0d6b34", background: "#ecfdf3", fontSize: 20 }}><i className="ti ti-adjustments" aria-hidden="true" /></span>
        <div><h2 style={{ margin: 0, color: "#173b2a", fontSize: 17 }}>Display preferences</h2><p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>Choose a comfortable look for this device.</p></div>
      </div>
      <div style={{ padding: "4px 22px 8px" }}>
        {rows.map((row) => (
          <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "17px 0", borderBottom: "1px solid #eef2f6" }}>
            <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 11, background: "#f1f5f9", color: "#475569", fontSize: 19 }}><i className={`ti ${row.icon}`} aria-hidden="true" /></span>
            <div style={{ flex: 1 }}><div style={{ color: "#1e293b", fontSize: 14, fontWeight: 750 }}>{row.title}</div><div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{row.text}</div></div>
            <Toggle checked={settings[row.key]} onClick={() => setSettings((current) => ({ ...current, [row.key]: !current[row.key] }))} label={`Toggle ${row.title}`} />
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 22px 20px", display: "flex", gap: 10 }}>
        <button onClick={save} style={{ padding: "10px 18px", border: 0, borderRadius: 9, color: "#fff", background: saved ? "#15803d" : "#0d6b34", fontWeight: 750, cursor: "pointer" }}>{saved ? "Saved" : "Save preferences"}</button>
        <button onClick={reset} style={{ padding: "10px 18px", border: "1px solid #cbd5e1", borderRadius: 9, color: "#475569", background: "transparent", fontWeight: 700, cursor: "pointer" }}>Reset</button>
      </div>
    </div>
  );
}
