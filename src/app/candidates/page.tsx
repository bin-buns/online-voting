import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type CampaignPost = { id: string; title: string; content: string };
type CandidateRow = {
  id: string;
  tagline: string | null;
  bio: string | null;
  status: string;
  profiles: { full_name: string; student_id: string } | { full_name: string; student_id: string }[] | null;
  campaign_posts?: CampaignPost[];
};
type PositionRow = {
  id: string;
  name: string;
  description: string | null;
  candidates?: CandidateRow[];
};

function profileName(profiles: CandidateRow["profiles"]) {
  if (!profiles) return { full_name: "Unknown", student_id: "" };
  return Array.isArray(profiles) ? profiles[0] : profiles;
}

export default async function CandidatesPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data } = await supabase
    .from("positions")
    .select(
      "id, name, description, candidates(id, tagline, bio, status, profiles(full_name, student_id), campaign_posts(id, title, content))"
    )
    .order("sort_order", { ascending: true });

  const positions = (data ?? []) as PositionRow[];

  return (
    <AppShell profile={profile}>
      <section className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold">Candidates & campaigns</h1>
          <p className="text-[var(--muted)]">
            Review each candidate&apos;s platform before voting.
          </p>
        </header>
        {positions.map((position) => {
          const approved = (position.candidates ?? []).filter((c) => c.status === "approved");
          return (
            <article key={position.id} className="card space-y-4">
              <h2 className="text-xl font-semibold">{position.name}</h2>
              <p className="text-sm text-[var(--muted)]">{position.description}</p>
              {approved.length === 0 ? (
                <p className="text-sm">No approved candidates yet.</p>
              ) : (
                <ul className="space-y-6">
                  {approved.map((c) => {
                    const p = profileName(c.profiles);
                    return (
                      <li key={c.id} className="rounded-lg border border-[var(--border)] p-4">
                        <p className="font-semibold">
                          {p.full_name} · {p.student_id}
                        </p>
                        <p className="text-sm text-[var(--primary)]">{c.tagline}</p>
                        <p className="mt-2 text-sm">{c.bio}</p>
                        {(c.campaign_posts ?? []).map((post) => (
                          <div key={post.id} className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                            <p className="font-medium">{post.title}</p>
                            <p className="mt-1 whitespace-pre-wrap">{post.content}</p>
                          </div>
                        ))}
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
