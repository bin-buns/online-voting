"use client";

import { useEffect, useState } from "react";

export default function ScrollIndicator() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // The scrollable container is the div with data-scroll-container in layout
    const scroller =
      document.querySelector<HTMLElement>("[data-scroll-container]") ??
      document.documentElement;

    function onScroll() {
      setVisible(scroller.scrollTop < 80);
    }

    scroller.addEventListener("scroll", onScroll);
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: "28px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "6px",
      animation: "siAppear 0.6s ease 1.2s both",
      pointerEvents: "none",
    }}>
      <span style={{
        fontSize: "10px",
        fontWeight: 700,
        color: "rgba(255,255,255,0.65)",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}>
        Scroll for campaign posters
      </span>

      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          width="22" height="13"
          viewBox="0 0 22 13"
          fill="none"
          style={{
            animation: `siChevron 1.5s ease-in-out ${i * 0.2}s infinite`,
            display: "block",
          }}
        >
          <path
            d="M2 2L11 11L20 2"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={1 - i * 0.3}
          />
        </svg>
      ))}

      <style>{`
        @keyframes siChevron {
          0%, 100% { transform: translateY(0px);  opacity: 0.9; }
          50%       { transform: translateY(6px);  opacity: 0.35; }
        }
        @keyframes siAppear {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
        }
      `}</style>
    </div>
  );
}