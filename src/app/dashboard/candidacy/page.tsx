import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import SubmitCandidacyClient from "@/components/voter/SubmitCandidacyClient";

export default async function SubmitCandidacyPage() {
  const session = await requireAuth(["voter", "candidate"]);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("candidates")
    .select("id, status, position_id, positions ( name )")
    .eq("user_id", session.profile.id)
    .maybeSingle();

  const { data: positionsData } = await supabase
    .from("positions")
    .select("id, name")
    .order("sort_order", { ascending: true });

  // Also fetch the voter's strand
  const { data: profileData } = await supabase
    .from("profiles")
    .select("strand")
    .eq("id", session.profile.id)
    .single();

  const positions = (positionsData ?? []).map((p) => ({
    id:   p.id,
    name: p.name,
  }));

  type ExistingRaw = {
    id: string;
    status: string;
    position_id: string;
    positions: { name: string } | null;
  };

  const existingApp = existing
    ? {
        id:            (existing as unknown as ExistingRaw).id,
        status:        (existing as unknown as ExistingRaw).status,
        position_id:   (existing as unknown as ExistingRaw).position_id,
        position_name: (existing as unknown as ExistingRaw).positions?.name ?? "—",
      }
    : null;

  return (
    <SubmitCandidacyClient
      profile={{
        id:         session.profile.id,
        full_name:  session.profile.full_name,
        student_id: session.profile.student_id,
        strand:     profileData?.strand ?? null,
      }}
      positions={positions}
      existingApplication={existingApp}
    />
  );
}