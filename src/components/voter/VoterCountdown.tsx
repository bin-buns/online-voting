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
  countdownLabel,
}: {
  targetDate: string;
  phase: string;
  countdownLabel: string;
}) {
  // Start with identical markup on the server and first client render; the
  // countdown is initialized after mount to avoid Date.now() hydration drift.
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null);

  useEffect(() => {
    if (phase === "closed" || phase === "results") {
      setTime(null);
      return;
    }
    setTime(getTimeLeft(targetDate));
    const interval = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate, phase]);

  const phaseLabel = countdownLabel;

  const units = [
    { value: time?.days ?? 0,  label: "DAYS"    },
    { value: time?.hours ?? 0, label: "HOURS"   },
    { value: time?.mins ?? 0,  label: "MINUTES" },
    { value: time?.secs ?? 0,  label: "SECONDS" },
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

      {phase === "closed" || phase === "results" ? (
        <div role="status" style={{ color: "#fff", fontSize: "18px", fontWeight: 700, letterSpacing: "0.04em" }}>
          {phase === "results" ? "Election results are available." : "Voting is closed. The countdown has stopped."}
        </div>
      ) : <>
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
        {time ? pad(value) : "--"}
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
      </>}
    </div>
  );
}
