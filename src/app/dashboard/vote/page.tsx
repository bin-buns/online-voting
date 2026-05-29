import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { getElectionSettings } from "@/lib/election";
import { getElectionPhase } from "@/types/database";
import VotePageClient from "@/components/voter/VotePageClient";

type RawCandidate = {
  id: string;
  tagline: string | null;
  photo_url: string | null;
  profiles: { full_name: string } | null;
  positions: { id: string; name: string; sort_order: number } | null;
};

type RawVote = {
  position_id: string;
};

export default async function VotePage() {
  const session = await requireAuth(["voter", "candidate"]);
  const supabase = await createClient();

  const [settings, { data: candidatesData }, { data: positionsData }, { data: votesData }] =
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

      // Check which positions this voter has already voted in
      supabase
        .from("votes")
        .select("position_id")
        .eq("voter_id", session.profile.id),
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

  // Positions the voter has already voted in (including abstain — stored as null candidate)
  const votedPositionIds = new Set(
    ((votesData as unknown as RawVote[]) ?? []).map((v) => v.position_id)
  );

  return (
    <VotePageClient
      voterId={session.profile.id}
      positions={positions}
      candidates={candidates}
      votedPositionIds={Array.from(votedPositionIds)}
      phase={phase}
      electionTitle={settings?.title ?? "Election"}
    />
  );
}
