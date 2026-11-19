import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import SubmitCandidacyClient from "@/components/voter/SubmitCandidacyClient";
import { getElectionSettings } from "@/lib/election";
import { createAdminClient } from "@/lib/supabase/admin";

const requestedPositions = [
  { name: "Mayor", description: "Student Council Mayor", sort_order: 1 },
  { name: "Vice Mayor", description: "Student Council Vice Mayor", sort_order: 2 },
  { name: "Secretary", description: "Student Council Secretary", sort_order: 3 },
  { name: "Treasurer", description: "Student Council Treasurer", sort_order: 4 },
  { name: "Auditor", description: "Student Council Auditor", sort_order: 5 },
  { name: "PRO", description: "Public Relations Officer", sort_order: 6 },
  { name: "ICT Representative", description: "ICT strand representative", sort_order: 7 },
  { name: "ABM Representative", description: "ABM strand representative", sort_order: 8 },
  { name: "STEM Representative", description: "STEM strand representative", sort_order: 9 },
  { name: "HUMSS Representative", description: "HUMSS strand representative", sort_order: 10 },
];

export default async function SubmitCandidacyPage() {
  const session = await requireAuth(["voter", "candidate"]);
  const supabase = await createClient();
  const settings = await getElectionSettings();
  const now = Date.now();
  const candidacyOpen = Boolean(settings && settings.is_active &&
    now >= new Date(settings.candidate_registration_starts_at).getTime() &&
    now < new Date(settings.candidate_registration_ends_at).getTime());

  const { data: existing } = await supabase
    .from("candidates")
    .select("id, status, position_id, positions ( name )")
    .eq("user_id", session.profile.id)
    .maybeSingle();

  const positionsAdmin = createAdminClient();
  const positionsResponse = await positionsAdmin
    .from("positions")
    .select("id, name")
    .order("sort_order", { ascending: true });
  let positionsData = positionsResponse.data;
  const positionsError = positionsResponse.error;
  if (positionsError) throw new Error(`Unable to load candidacy positions: ${positionsError.message}`);

  // Ensure the requested ballot positions are available even on databases
  // where the default position seed migration has not been run yet.
  const normalizePosition = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const presentNames = new Set((positionsData ?? []).map((position) => normalizePosition(position.name)));
  const missingPositions = requestedPositions.filter((position) => !presentNames.has(normalizePosition(position.name)));
  if (missingPositions.length) {
    const { error: seedError } = await positionsAdmin.from("positions").upsert(missingPositions, { onConflict: "name" });
    if (seedError) throw new Error(`Unable to prepare candidacy positions: ${seedError.message}`);
    const refreshed = await positionsAdmin
      .from("positions")
      .select("id, name")
      .order("sort_order", { ascending: true });
    if (refreshed.error) throw new Error(`Unable to reload candidacy positions: ${refreshed.error.message}`);
    positionsData = refreshed.data;
  }

  // Also fetch the voter's strand
  const { data: profileData } = await supabase
    .from("profiles")
    .select("strand")
    .eq("id", session.profile.id)
    .single();

  const positions = (positionsData ?? []).map((p) => ({
    id:   p.id,
    name: normalizePosition(p.name) === "pro" ? "PRO" : p.name,
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
        section:    session.profile.section ?? null,
      }}
      positions={positions}
      existingApplication={existingApp}
      candidacyOpen={candidacyOpen}
      registrationStartsAt={settings?.candidate_registration_starts_at ?? null}
      registrationEndsAt={settings?.candidate_registration_ends_at ?? null}
    />
  );
}
