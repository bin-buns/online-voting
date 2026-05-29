"use client";
import { useEffect } from "react";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Sync screen reader setting from localStorage to <html>
    try {
      const stored = localStorage.getItem("svs_accessibility");
      if (stored) {
        const settings = JSON.parse(stored);
        const root = document.documentElement;
        root.setAttribute("data-dark",          String(settings.darkMode));
        root.setAttribute("data-high-contrast", String(settings.highContrast));
        root.setAttribute("data-screen-reader", String(settings.screenReader));
        root.setAttribute("data-reduce-motion", String(settings.reduceMotion));
        root.setAttribute("data-font-size",     settings.fontSize ?? "medium");
        if (settings.fontSize) {
          const fontMap: Record<string, string> = {
            small: "13px", medium: "15px", large: "18px", xlarge: "22px",
          };
          root.style.setProperty("--base-font-size", fontMap[settings.fontSize]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <>
      <a href="#main-content" className="sr-skip-link">
        Skip to main content
      </a>
      {children}
    </>
  );
}