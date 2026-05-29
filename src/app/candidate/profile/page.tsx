import { AppShell } from "@/components/AppShell";
import { applyForPosition } from "@/app/actions/candidate";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function CandidateProfilePage() {
  const { profile } = await requireAuth(["candidate"]);
  const supabase = await createClient();

  const { data: positions } = await supabase.from("positions").select("id, name").order("sort_order");
  const { data: myCandidacies } = await supabase
    .from("candidates")
    .select("*, positions(name)")
    .eq("user_id", profile.id);

  return (
    <AppShell profile={profile}>
      <section className="grid gap-8 lg:grid-cols-2">
        <article className="card space-y-4">
          <h1 className="text-xl font-bold">Apply for a position</h1>
          <form action={applyForPosition} className="space-y-3">
            <select className="input" name="position_id" required>
              <option value="">Select position</option>
              {(positions ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input className="input" name="tagline" placeholder="Campaign tagline" />
            <textarea className="input" name="bio" placeholder="Your platform / agenda" rows={5} required />
            <button type="submit" className="btn btn-primary">
              Submit application
            </button>
          </form>
          <p className="text-xs text-[var(--muted)]">
            Admin must approve your application before voters can see you.
          </p>
        </article>
        <article className="card">
          <h2 className="mb-4 text-xl font-bold">Your candidacies</h2>
          <ul className="space-y-3">
            {(myCandidacies ?? []).map((c) => (
              <li key={c.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                <p className="font-semibold">{c.positions?.name}</p>
                <p>Status: {c.status}</p>
                <p className="mt-1">{c.tagline}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </AppShell>
  );
}
