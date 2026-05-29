import { createClient } from "@/lib/supabase/server";
import { getElectionSettings } from "@/lib/election";
import { getElectionPhase } from "@/types/database";
import LiveVotingClient from "@/components/admin/LiveVotingClient";

type RawPosition = {
  id: string;
  name: string;
  sort_order: number;
  candidates: {
    id: string;
    status: string;
    profiles: { full_name: string } | null;
    votes: { id: string }[];
  }[];
};

export default async function AdminVotesPage() {
  const supabase = await createClient();

  const [
    { count: totalVoters },
    { count: voted },
    { data: posData },
    settings,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "voter"),
    supabase.from("votes").select("voter_id", { count: "exact", head: true }),
    supabase.from("positions").select(`
      id, name, sort_order,
      candidates ( id, status, profiles ( full_name ), votes ( id ) )
    `).order("sort_order", { ascending: true }),
    getElectionSettings(),
  ]);

  const tv    = totalVoters ?? 0;
  const v     = voted ?? 0;
  const phase = settings ? getElectionPhase(settings) : "upcoming";

  const positions = ((posData as unknown as RawPosition[]) ?? []).map((p) => ({
    id:   p.id,
    name: p.name,
  }));

  const candidates = ((posData as unknown as RawPosition[]) ?? []).flatMap((pos) =>
    (pos.candidates ?? [])
      .filter((c) => c.status === "approved")
      .map((c) => ({
        id:          c.id,
        full_name:   c.profiles?.full_name ?? "Unknown",
        vote_count:  c.votes?.length ?? 0,
        position_id: pos.id,
      }))
  );

  return (
    <LiveVotingClient
      initialStats={{ totalVoters: tv, voted: v, notVoted: tv - v }}
      initialPositions={positions}
      initialCandidates={candidates}
      phase={phase}
    />
  );
}