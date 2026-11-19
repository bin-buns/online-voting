"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AccessibilityController() {
  const pathname = usePathname();
  useEffect(() => {
    const apply = () => {
      try {
        const value = JSON.parse(localStorage.getItem("svs_accessibility") || "{}");
        const root = document.documentElement;
        const magnifierEnabled = window.location.pathname.startsWith("/admin") && value.magnifier === true;
        root.setAttribute("data-dark", String(value.darkMode === true));
        root.setAttribute("data-magnifier", String(magnifierEnabled));
        root.removeAttribute("data-high-contrast");
        root.removeAttribute("data-reduce-motion");
        root.removeAttribute("data-screen-reader");
        root.removeAttribute("data-font-size");
        root.style.removeProperty("--base-font-size");
        root.style.removeProperty("--transition-speed");
        root.style.zoom = magnifierEnabled ? "1.1" : "";
      } catch { /* Ignore invalid local preferences. */ }
    };
    apply();
    window.addEventListener("storage", apply);
    window.addEventListener("svs-accessibility-change", apply);
    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener("svs-accessibility-change", apply);
    };
  }, [pathname]);

  return null;
}
