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

export default function CountdownTimer({
  targetDate,
  label,
  phase,
}: {
  targetDate: string;
  label: string;
  phase: string;
}) {
  const [time, setTime] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const phaseColor = phase === "voting"  ? "#4ade80" :
                     phase === "results" ? "#a5b4fc" : "#fcd34d";
  const phaseLabel = phase === "voting"  ? "Voting Open"     :
                     phase === "results" ? "Results Visible" : "Upcoming";

  const units = [
    { value: time.days,  label: "Days"  },
    { value: time.hours, label: "Hours" },
    { value: time.mins,  label: "Mins"  },
    { value: time.secs,  label: "Secs"  },
  ];

  return (
    <>
      <style>{`
        .cd-box {
          background: #0d6b34;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 28px 8px 22px;
          gap: 8px;
          min-height: 140px;
        }
        .cd-box .cd-number,
.cd-box .cd-number * {
  font-family: var(--font-oswald), sans-serif !important;
  font-size: 64px !important;
  font-weight: 700 !important;
  color: #fff !important;
  line-height: 1 !important;
  letter-spacing: 0.02em !important;
}
        .cd-label {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: rgba(255,255,255,0.65) !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }
      `}</style>

      <div style={{
        background: "#1a2e1f", borderRadius: "16px", padding: "24px 28px",
        fontSize: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "4px" }}>
          <div style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "20px", fontWeight: 700, color: "#fff",
            letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            Election Countdown
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(255,255,255,0.1)", borderRadius: "999px",
            padding: "4px 12px", fontSize: "12px", fontWeight: 700, color: phaseColor,
          }}>
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: phaseColor, display: "inline-block",
            }} />
            {phaseLabel}
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
          {label}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "12px" }}>
          {units.map(({ value, label: unitLabel }) => (
            <div key={unitLabel} className="cd-box">
              <span className="cd-number">
                {pad(value)}
              </span>
              <span className="cd-label">
                {unitLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}