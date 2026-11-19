import { createClient } from "@/lib/supabase/server";
import { getElectionSettings } from "@/lib/election";
import { getElectionPhase } from "@/types/database";
import LiveVotingClient from "@/components/admin/LiveVotingClient";

type VoterRow = { id: string; full_name: string };
type VoteRow = { voter_id: string; candidate_id: string | null; position_id: string };
type RawCandidate = {
  id: string;
  status: string;
  photo_url: string | null;
  profiles: { full_name: string } | null;
};
type RawPosition = { id: string; name: string; sort_order: number; candidates: RawCandidate[] };

const hiddenPositions = (name: string) => {
  const normalized = name.trim().toLowerCase();
  return normalized.includes("gas representative") || normalized.includes("tvl representative");
};

export default async function AdminVotesPage() {
  const supabase = await createClient();
  const [
    { data: voterRows },
    { data: voteRows },
    { data: posData },
    settings,
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("role", ["voter", "candidate"]),
    supabase.from("votes").select("voter_id, candidate_id, position_id"),
    supabase.from("positions").select("id, name, sort_order, candidates(id, status, photo_url, profiles(full_name))").order("sort_order", { ascending: true }),
    getElectionSettings(),
  ]);

  const voters = (voterRows ?? []) as VoterRow[];
  const votes = (voteRows ?? []) as VoteRow[];
  const participated = new Set(votes.map((vote) => vote.voter_id));
  const positions = ((posData as unknown as RawPosition[]) ?? [])
    .filter((position) => !hiddenPositions(position.name))
    .map(({ id, name }) => ({ id, name }));
  const candidateVotes = new Map<string, number>();
  const ballots = new Map<string, { total: number; abstentions: number }>();
  for (const vote of votes) {
    const metric = ballots.get(vote.position_id) ?? { total: 0, abstentions: 0 };
    metric.total += 1;
    if (vote.candidate_id) candidateVotes.set(vote.candidate_id, (candidateVotes.get(vote.candidate_id) ?? 0) + 1);
    else metric.abstentions += 1;
    ballots.set(vote.position_id, metric);
  }

  const candidates = ((posData as unknown as RawPosition[]) ?? [])
    .filter((position) => !hiddenPositions(position.name))
    .flatMap((position) => (position.candidates ?? [])
      .filter((candidate) => candidate.status === "approved")
      .map((candidate) => ({
        id: candidate.id,
        full_name: candidate.profiles?.full_name ?? "Unknown",
        photo_url: candidate.photo_url,
        vote_count: candidateVotes.get(candidate.id) ?? 0,
        position_id: position.id,
      })));

  return (
    <LiveVotingClient
      initialStats={{ totalVoters: voters.length, voted: participated.size, notVoted: Math.max(0, voters.length - participated.size) }}
      initialPositions={positions}
      initialCandidates={candidates}
      initialBallots={Object.fromEntries(ballots)}
      initialParticipants={voters.map((voter) => ({ id: voter.id, full_name: voter.full_name, hasVoted: participated.has(voter.id) }))}
      phase={settings ? getElectionPhase(settings) : "upcoming"}
    />
  );
}
