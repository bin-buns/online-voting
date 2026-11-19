import { updateElectionSchedule } from "@/app/actions/admin";
import { requireAuth } from "@/lib/auth";
import { getElectionSettings } from "@/lib/election";
import VotingEndField from "@/components/admin/VotingEndField";

function toLocalInput(iso: string) {
  return new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
    .slice(0, 16)
    .replace(" ", "T");
}

function endAfter24Hours(startIso: string) {
  return toLocalInput(new Date(new Date(startIso).getTime() + 24 * 60 * 60 * 1000).toISOString());
}

function displayedEnd(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return end > start && Date.now() >= end ? toLocalInput(endIso) : endAfter24Hours(startIso);
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
          <label className="label" htmlFor="candidate_registration_starts_at">Candidate registration starts</label>
          <input className="input" type="datetime-local" id="candidate_registration_starts_at" name="candidate_registration_starts_at" defaultValue={toLocalInput(settings.candidate_registration_starts_at)} required />
        </div>
        <div>
          <label className="label" htmlFor="candidate_registration_ends_at">Candidate registration ends</label>
          <input className="input" type="datetime-local" id="candidate_registration_ends_at" name="candidate_registration_ends_at" defaultValue={toLocalInput(settings.candidate_registration_ends_at)} required />
          <p className="mt-1 text-xs text-[var(--muted)]">Registration must end by the voting start time.</p>
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
          <VotingEndField initialValue={displayedEnd(settings.voting_starts_at, settings.voting_ends_at)} />
          <p className="mt-1 text-xs text-[var(--muted)]">Voting closes automatically 24 hours after it starts.</p>
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
        <div>
          <label className="label" htmlFor="archive_at">Archive election</label>
          <input
            className="input"
            type="datetime-local"
            id="archive_at"
            name="archive_at"
            defaultValue={toLocalInput(settings.archive_at)}
            required
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Use Philippine time. The election stays active until its scheduled archive time.</p>
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
