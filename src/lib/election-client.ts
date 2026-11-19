import type { SupabaseClient } from "@supabase/supabase-js";
import type { ElectionSettings } from "@/types/database";

type CandidateRow = {
  id: string;
  position_id: string;
  status: string;
  profiles: { full_name: string } | null;
};

type PositionRow = {
  id: string;
  name: string;
  sort_order: number;
  max_winners: number;
};

type VoteRow = { candidate_id: string; position_id: string };

export async function snapshotAndResetElection(
  supabase: SupabaseClient,
  settings: ElectionSettings,
  opts: { autoArchived: boolean }
) {
  const [{ data: positions, error: posError }, { data: candidates, error: candError }, { data: votes, error: voteError }] =
    await Promise.all([
      supabase.from("positions").select("id, name, sort_order, max_winners").order("sort_order", { ascending: true }),
      supabase.from("candidates").select("id, position_id, status, profiles(full_name)"),
      supabase.from("votes").select("candidate_id, position_id"),
    ]);

  if (posError) throw new Error(posError.message);
  if (candError) throw new Error(candError.message);
  if (voteError) throw new Error(voteError.message);

  const positionRows  = (positions ?? []) as PositionRow[];
  const candidateRows = (candidates ?? []) as unknown as CandidateRow[];
  const voteRows      = (votes ?? []) as VoteRow[];

  const voteCounts = new Map<string, number>();
  voteRows.forEach((v) => {
    voteCounts.set(v.candidate_id, (voteCounts.get(v.candidate_id) ?? 0) + 1);
  });

  const results = positionRows.map((pos) => ({
    position: pos.name,
    max_winners: pos.max_winners,
    candidates: candidateRows
      .filter((c) => c.position_id === pos.id)
      .map((c) => ({
        name: c.profiles?.full_name ?? "Unknown",
        votes: voteCounts.get(c.id) ?? 0,
        status: c.status,
      }))
      .sort((a, b) => b.votes - a.votes),
  }));

  const totalVotes = voteRows.length;

  const { count: totalVoters } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "voter");

  // If a previous run saved the archive but failed during cleanup, reuse it and
  // finish the cleanup instead of leaving the election permanently half-archived.
  const { data: existingArchive, error: archiveLookupError } = await supabase
    .from("election_archives")
    .select("id")
    .eq("title", settings.title)
    .eq("voting_ends_at", settings.voting_ends_at)
    .maybeSingle();
  if (archiveLookupError) throw new Error(archiveLookupError.message);

  if (!existingArchive) {
    const { error: insertError } = await supabase.from("election_archives").insert({
      title: settings.title,
      voting_starts_at: settings.voting_starts_at,
      voting_ends_at: settings.voting_ends_at,
      results_visible_at: settings.results_visible_at,
      auto_archived: opts.autoArchived,
      total_voters: totalVoters ?? 0,
      total_votes: totalVotes,
      results,
    });
    if (insertError) throw new Error(insertError.message);
  }

  const { error: votesDeleteError } = await supabase.from("votes").delete().not("id", "is", null);
  if (votesDeleteError) throw new Error(votesDeleteError.message);
  const { error: candidatesDeleteError } = await supabase.from("candidates").delete().not("id", "is", null);
  if (candidatesDeleteError) throw new Error(candidatesDeleteError.message);
  const { error: closeElectionError } = await supabase.from("election_settings").update({ is_active: false }).eq("id", settings.id);
  if (closeElectionError) throw new Error(closeElectionError.message);

  await fetch("/api/admin/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: opts.autoArchived ? "Election auto-archived" : "Election archived",
      detail: `"${settings.title}" archived with ${totalVotes} votes across ${results.length} positions`,
      category: "election",
    }),
  });
}

export async function checkAndAutoArchive(supabase: SupabaseClient) {
  const { data: settings } = await supabase
    .from("election_settings")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!settings) return { archived: false };

  const due = new Date((settings as ElectionSettings).archive_at).getTime() <= Date.now();
  if (!due) return { archived: false };

  await snapshotAndResetElection(supabase, settings as ElectionSettings, { autoArchived: true });
  return { archived: true };
}
