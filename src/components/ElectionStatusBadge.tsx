import {
  type ElectionPhase,
  type ElectionSettings,
  getElectionPhase,
} from "@/types/database";

const labels: Record<ElectionPhase, string> = {
  upcoming: "Voting not started",
  voting: "Voting open",
  closed: "Voting closed",
  results: "Results published",
};

const classes: Record<ElectionPhase, string> = {
  upcoming: "badge badge-closed",
  voting: "badge badge-voting",
  closed: "badge badge-closed",
  results: "badge badge-results",
};

export function ElectionStatusBadge({ settings }: { settings: ElectionSettings }) {
  const phase = getElectionPhase(settings);
  return <span className={classes[phase]}>{labels[phase]}</span>;
}
