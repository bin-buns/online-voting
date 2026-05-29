import { createClient } from "@/lib/supabase/server";
import CandidatesClient from "@/components/admin/CandidatesClient";

type RawCandidate = {
  id: string;
  status: "approved" | "pending" | "rejected";
  tagline: string | null;
  profiles: { full_name: string; student_id: string; section: string; strand: string } | null;
  positions: { id: string; name: string } | null;
  photo_url: string | null;
};

export default async function AdminCandidatesPage() {
  const supabase = await createClient();

  const [{ data: rawCandidates }, { data: positionsData }] = await Promise.all([
    supabase
      .from("candidates")
      .select("id, status, tagline, profiles ( full_name, student_id, section, strand ), positions ( id, name )")
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
    supabase
      .from("positions")
      .select("id, name")
      .order("sort_order", { ascending: true }),
  ]);

  const candidates = ((rawCandidates as unknown as RawCandidate[]) ?? []).map((c) => ({
    id:            c.id,
    full_name:     c.profiles?.full_name  ?? "Unknown",
    student_id:    c.profiles?.student_id ?? "—",
    section:       c.profiles?.section    ?? "—",
    strand:        c.profiles?.strand     ?? "—",
    tagline:       c.tagline              ?? "",
    status:        c.status,
    position_id:   c.positions?.id        ?? "",
    position_name: c.positions?.name      ?? "—",
  }));

  const positions = positionsData ?? [];
  const filledPositionIds = new Set(candidates.map((c) => c.position_id));

  const stats = {
    total:           candidates.length,
    filledPositions: filledPositionIds.size,
    totalPositions:  positions.length,
    approved:        candidates.filter((c) => c.status === "approved").length,
    incomplete:      candidates.filter((c) => c.status === "pending").length,
  };

  return (
    <CandidatesClient
      candidates={candidates}
      positions={positions}
      stats={stats}
    />
  );
}