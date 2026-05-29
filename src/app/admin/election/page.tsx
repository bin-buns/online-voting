import { updateElectionSchedule } from "@/app/actions/admin";
import { requireAuth } from "@/lib/auth";
import { getElectionSettings } from "@/lib/election";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminElectionPage() {
  await requireAuth(["admin"]);
  const settings = await getElectionSettings();

  if (!settings) {
    return (
      <p>No election settings found. Run supabase/schema.sql first.</p>
    );
  }

  return (
    <section className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Election schedule</h1>
        <p className="text-sm text-[var(--muted)]">
          Results appear automatically when the current time passes &quot;Results visible&quot;.
        </p>
      </header>
      <form action={updateElectionSchedule} className="card space-y-4">
        <div>
          <label className="label" htmlFor="title">Election title</label>
          <input className="input" id="title" name="title" defaultValue={settings.title} />
        </div>
        <div>
          <label className="label" htmlFor="voting_starts_at">Voting starts</label>
          <input
            className="input"
            type="datetime-local"
            id="voting_starts_at"
            name="voting_starts_at"
            defaultValue={toLocalInput(settings.voting_starts_at)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="voting_ends_at">Voting ends</label>
          <input
            className="input"
            type="datetime-local"
            id="voting_ends_at"
            name="voting_ends_at"
            defaultValue={toLocalInput(settings.voting_ends_at)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="results_visible_at">Results visible (smart unlock)</label>
          <input
            className="input"
            type="datetime-local"
            id="results_visible_at"
            name="results_visible_at"
            defaultValue={toLocalInput(settings.results_visible_at)}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={settings.is_active} />
          Election is active
        </label>
        <button type="submit" className="btn btn-primary">Save schedule</button>
      </form>
    </section>
  );
}
