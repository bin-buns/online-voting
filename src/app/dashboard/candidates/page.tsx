import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import CandidatesPageClient from "@/components/voter/CandidatesPageClient";

type RawCandidate = {
  id: string;
  tagline: string | null;
  bio: string | null;
  photo_url: string | null;
  status: string;
  profiles: { full_name: string; student_id: string } | null;
  positions: { id: string; name: string; sort_order: number } | null;
};

export default async function CandidatesPage() {
  await requireAuth(["voter", "candidate"]);

  const supabase = await createClient();

  const { data: positionsData } = await supabase
    .from("positions")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });

  const { data: candidatesData } = await supabase
    .from("candidates")
    .select(`
      id, tagline, bio, photo_url, status,
      profiles ( full_name, student_id ),
      positions ( id, name, sort_order )
    `)
    .eq("status", "approved");

  const positions = (positionsData ?? []).map((p) => ({
    id:         p.id,
    name:       p.name,
    sort_order: p.sort_order,
  }));

  const candidates = ((candidatesData as unknown as RawCandidate[]) ?? []).map((c) => ({
    id:         c.id,
    full_name:  c.profiles?.full_name  ?? "Unknown",
    student_id: c.profiles?.student_id ?? "—",
    tagline:    c.tagline,
    bio:        c.bio,
    photo_url:  c.photo_url,
    position_id:   c.positions?.id         ?? "",
    position_name: c.positions?.name       ?? "—",
    sort_order:    c.positions?.sort_order ?? 0,
  }));

  return (
    <CandidatesPageClient
      positions={positions}
      candidates={candidates}
    />
  );
}
