"use client";

import { useEffect, useState } from "react";

function endAfter24Hours(start: string) {
  if (!start) return "";
  const opensAt = new Date(`${start}:00+08:00`);
  if (Number.isNaN(opensAt.getTime())) return "";
  return new Date(opensAt.getTime() + 24 * 60 * 60 * 1000)
    .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
    .slice(0, 16)
    .replace(" ", "T");
}

export default function VotingEndField({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const startInput = document.getElementById("voting_starts_at") as HTMLInputElement | null;
    if (!startInput) return;

    const updateEnd = () => setValue(endAfter24Hours(startInput.value));
    updateEnd();
    startInput.addEventListener("input", updateEnd);
    startInput.addEventListener("change", updateEnd);
    return () => {
      startInput.removeEventListener("input", updateEnd);
      startInput.removeEventListener("change", updateEnd);
    };
  }, []);

  return (
    <input
      className="input"
      type="datetime-local"
      id="voting_ends_at"
      name="voting_ends_at"
      value={value}
      readOnly
    />
  );
}
