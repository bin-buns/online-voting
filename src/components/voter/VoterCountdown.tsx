"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTimeLeft(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000) / 60000),
    secs:  Math.floor((diff % 60000) / 1000),
    done:  diff === 0,
  };
}

export default function VoterCountdown({
  targetDate,
  phase,
}: {
  targetDate: string;
  phase: string;
}) {
  const [time, setTime] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const phaseLabel =
    phase === "voting"  ? "Voting Closes In" :
    phase === "results" ? "Results Are Live" :
                          "Election Day";

  const units = [
    { value: time.days,  label: "DAYS"    },
    { value: time.hours, label: "HOURS"   },
    { value: time.mins,  label: "MINUTES" },
    { value: time.secs,  label: "SECONDS" },
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
    }}>
      {/* Label */}
      <div style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "clamp(2rem, 2.5vw, 1.3rem)",
        fontWeight: 700,
        color: "#f5e642",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}>
        {phaseLabel}
      </div>

      {/* Countdown boxes */}
<div style={{ display: "flex", gap: "12px", fontSize: "initial" }}>
  {units.map(({ value, label }) => (
    <div key={label} style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: "6px",
      background: "rgba(255,255,255,0.15)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.25)",
      borderRadius: "12px",
      padding: "33px 35px 29px",
      minWidth: "100px",
    }}>
      <span style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "64px",          // ← hardcoded, not clamp
        fontWeight: 700,
        color: "#fff",
        lineHeight: 1,
        letterSpacing: "0.02em",
        textShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}>
        {pad(value)}
      </span>
      <span style={{
        fontSize: "10px",          // ← already fixed, stays 10px
        fontWeight: 700,
        color: "rgba(255,255,255,0.75)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  ))}
</div>
    </div>
  );
}