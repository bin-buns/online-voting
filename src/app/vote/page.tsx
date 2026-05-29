import { AppShell } from "@/components/AppShell";
import { castVote } from "@/app/actions/vote";
import { requireAuth } from "@/lib/auth";
import { getElectionSettings } from "@/lib/election";
import { createClient } from "@/lib/supabase/server";
import { getElectionPhase } from "@/types/database";

export default async function VotePage() {
  const { profile } = await requireAuth(["voter", "candidate"]);
  const settings = await getElectionSettings();
  const phase = settings ? getElectionPhase(settings) : "upcoming";
  const supabase = await createClient();

  const { data: positions } = await supabase
    .from("positions")
    .select("id, name, candidates(id, tagline, profiles(full_name), status)")
    .order("sort_order", { ascending: true });

  const { data: myVotes } = await supabase
    .from("votes")
    .select("position_id, candidate_id")
    .eq("voter_id", profile.id);

  const votedPositions = new Set((myVotes ?? []).map((v) => v.position_id));

  if (phase !== "voting") {
    return (
      <AppShell profile={profile}>
        <div className="card">
          <h1 className="text-2xl font-bold">Voting</h1>
          <p className="mt-2 text-[var(--muted)]">
            {phase === "upcoming" && "Voting has not started yet."}
            {phase === "closed" && "Voting has ended. Await results on the scheduled date."}
            {phase === "results" && "Voting is closed. See the results page."}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile}>
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Cast your vote</h1>
          <p className="text-[var(--muted)]">One vote per position. You cannot change your vote.</p>
        </header>
        {(positions ?? []).map((position) => {
          const approved = (position.candidates ?? []).filter((c) => c.status === "approved");
          const alreadyVoted = votedPositions.has(position.id);

          return (
            <article key={position.id} className="card space-y-3">
              <h2 className="text-lg font-semibold">{position.name}</h2>
              {alreadyVoted ? (
                <p className="text-sm text-[var(--success)]">You already voted for this position.</p>
              ) : approved.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No candidates to vote for.</p>
              ) : (
                <ul className="space-y-2">
                  {approved.map((c) => {
                    const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                    return (
                      <li key={c.id}>
                        <form
                          action={castVote}
                          className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] p-3"
                        >
                          <div>
                            <p className="font-medium">{p?.full_name}</p>
                            <p className="text-sm text-[var(--muted)]">{c.tagline}</p>
                          </div>
                          <div>
                            <input type="hidden" name="candidate_id" value={c.id} />
                            <input type="hidden" name="position_id" value={position.id} />
                            <button type="submit" className="btn btn-primary text-sm">
                              Vote
                            </button>
                          </div>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
