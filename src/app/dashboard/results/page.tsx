import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { getElectionSettings } from "@/lib/election";
import { getElectionPhase } from "@/types/database";
import ElectionResultPageClient from "@/components/voter/ElectionResultPageClient";

type RawCandidate = {
  id: string;
  tagline: string | null;
  photo_url: string | null;
  profiles: { full_name: string } | null;
  positions: { id: string; name: string; sort_order: number } | null;
};

type RawVote = {
  candidate_id: string | null;
  position_id: string;
};

export default async function ElectionResultPage() {
  await requireAuth(["voter", "candidate"]);
  const supabase = await createClient();

  const [settings, { data: candidatesData }, { data: positionsData }, { data: votesData }, { count: totalVoters }] =
    await Promise.all([
      getElectionSettings(),

      supabase
        .from("candidates")
        .select(`
          id, tagline, photo_url,
          profiles ( full_name ),
          positions ( id, name, sort_order )
        `)
        .eq("status", "approved"),

      supabase
        .from("positions")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),

      supabase
        .from("votes")
        .select("candidate_id, position_id"),

      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "voter"),
    ]);

  const phase = settings ? getElectionPhase(settings) : "upcoming";

  const positions = (positionsData ?? []).map((p) => ({
    id:         p.id,
    name:       p.name,
    sort_order: p.sort_order,
  }));

  const candidates = ((candidatesData as unknown as RawCandidate[]) ?? []).map((c) => ({
    id:            c.id,
    full_name:     c.profiles?.full_name ?? "Unknown",
    tagline:       c.tagline,
    photo_url:     c.photo_url,
    position_id:   c.positions?.id         ?? "",
    position_name: c.positions?.name       ?? "—",
    sort_order:    c.positions?.sort_order ?? 0,
  }));

  // Tally votes and abstains per candidate and position
  const votes = (votesData as unknown as RawVote[]) ?? [];

  const voteMap: Record<string, number>   = {}; // candidate_id → vote count
  const abstainMap: Record<string, number> = {}; // position_id → abstain count

  votes.forEach((v) => {
    if (v.candidate_id) {
      voteMap[v.candidate_id] = (voteMap[v.candidate_id] ?? 0) + 1;
    } else {
      abstainMap[v.position_id] = (abstainMap[v.position_id] ?? 0) + 1;
    }
  });

  return (
    <ElectionResultPageClient
      positions={positions}
      candidates={candidates}
      voteMap={voteMap}
      abstainMap={abstainMap}
      totalVoters={totalVoters ?? 0}
      phase={phase}
      electionTitle={settings?.title ?? "Election"}
    />
  );
}
