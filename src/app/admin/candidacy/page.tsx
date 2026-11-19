import { createClient } from "@/lib/supabase/server";
import CandidacyClient from "@/components/admin/CandidacyClient";
import { getElectionSettings } from "@/lib/election";

type RawCandidate = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user_id: string;
  profiles: { full_name: string; student_id: string; section: string | null; strand: string | null } | null;
  positions: { name: string } | null;
  tagline: string | null; bio: string | null; photo_url: string | null;
  candidate_applications: { application_data: Record<string,string>; registration_form_path: string | null; review_remarks: string | null; reviewed_at: string | null; reviewed_by_name: string | null } | null;
};

export default async function AdminCandidacyPage() {
  const supabase = await createClient();
  const settings = await getElectionSettings();

  const [
    { count: total },
    { count: pending },
    { count: approved },
    { count: rejected },
    { data },
  ] = await Promise.all([
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    supabase
      .from("candidates")
      .select("id, status, created_at, user_id, profiles ( full_name, student_id, section, strand ), positions ( name ), tagline, bio, photo_url, candidate_applications(application_data,registration_form_path,review_remarks,reviewed_at,reviewed_by_name)")
  .order("created_at", { ascending: false }),
  ]);

  const initialCandidates = ((data as unknown as RawCandidate[]) ?? []).map((c) => ({
    id:         c.id,
    status:     c.status,
    created_at: c.created_at,
    user_id:    c.user_id,
    full_name:  c.profiles?.full_name  ?? "Unknown",
    student_id: c.profiles?.student_id ?? "—",
    position:   c.positions?.name      ?? "—",
    section: c.profiles?.section ?? "—",
    strand: c.profiles?.strand ?? "—",
    tagline: c.tagline ?? "", bio: c.bio ?? "", photo_url: c.photo_url ?? "",
    application_data: c.candidate_applications?.application_data ?? {}, registration_form_path: c.candidate_applications?.registration_form_path ?? null,
    review_remarks: c.candidate_applications?.review_remarks ?? "", reviewed_at: c.candidate_applications?.reviewed_at ?? null, reviewed_by_name: c.candidate_applications?.reviewed_by_name ?? "",
  }));

  return (
    <CandidacyClient
      initialCandidates={initialCandidates}
      stats={{
        total:    total    ?? 0,
        pending:  pending  ?? 0,
        approved: approved ?? 0,
        rejected: rejected ?? 0,
      }}
      votingStartsAt={settings?.voting_starts_at ?? null}
    />
  );
}
