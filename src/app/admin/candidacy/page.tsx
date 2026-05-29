import { createClient } from "@/lib/supabase/server";
import CandidacyClient from "@/components/admin/CandidacyClient";

type RawCandidate = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user_id: string;
  profiles: { full_name: string; student_id: string } | null;
  positions: { name: string } | null;
};

export default async function AdminCandidacyPage() {
  const supabase = await createClient();

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
      .select("id, status, created_at, user_id, profiles ( full_name, student_id ), positions ( name )")
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
    />
  );
}