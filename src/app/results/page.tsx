import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth";
import { getElectionSettings } from "@/lib/election";
import { createClient } from "@/lib/supabase/server";
import { getElectionPhase } from "@/types/database";

export default async function ResultsPage() {
  const { profile } = await requireAuth();
  const settings = await getElectionSettings();
  const phase = settings ? getElectionPhase(settings) : "upcoming";

  if (!settings || phase !== "results") {
    return (
      <AppShell profile={profile}>
        <div className="card">
          <h1 className="text-2xl font-bold">Election results</h1>
          <p className="mt-2 text-[var(--muted)]">
            Results will appear automatically on{" "}
            {settings
              ? new Date(settings.results_visible_at).toLocaleString()
              : "the date set by the admin"}
            .
          </p>
        </div>
      </AppShell>
    );
  }

  const supabase = await createClient();
  const { data: positions } = await supabase.from("positions").select("id, name").order("sort_order");

  const results = await Promise.all(
    (positions ?? []).map(async (position) => {
      const { data: rows } = await supabase
        .from("votes")
        .select("candidate_id, candidates(id, profiles(full_name))")
        .eq("position_id", position.id);

      const tally = new Map<string, { name: string; count: number }>();
      for (const row of rows ?? []) {
        const id = row.candidate_id as string;
        const candidate = row.candidates as { profiles?: { full_name?: string } } | null;
        const name = candidate?.profiles?.full_name ?? "Unknown";
        const current = tally.get(id) ?? { name, count: 0 };
        current.count += 1;
        tally.set(id, current);
      }

      const ranked = [...tally.values()].sort((a, b) => b.count - a.count);
      return { position, ranked };
    })
  );

  return (
    <AppShell profile={profile}>
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Official results</h1>
          <p className="text-[var(--muted)]">
            Published automatically on {new Date(settings.results_visible_at).toLocaleString()}.
          </p>
        </header>
        {results.map(({ position, ranked }) => (
          <article key={position.id} className="card">
            <h2 className="mb-3 text-lg font-semibold">{position.name}</h2>
            {ranked.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No votes recorded.</p>
            ) : (
              <ol className="space-y-2">
                {ranked.map((r, index) => (
                  <li key={`${position.id}-${r.name}`} className="flex justify-between text-sm">
                    <span>
                      #{index + 1} {r.name}
                    </span>
                    <span className="font-semibold">{r.count} votes</span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
