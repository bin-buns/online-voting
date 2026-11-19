"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getElectionSettings } from "@/lib/election";
import { getElectionPhase } from "@/types/database";

async function saveVote(candidateId: string | null, positionId: string) {
  const { profile } = await requireAuth(["voter", "candidate"]);
  const settings = await getElectionSettings();

  if (!settings || getElectionPhase(settings) !== "voting") {
    return { ok: false as const, error: "Voting is not currently open. Check the election schedule or contact the administrator." };
  }

  if (!positionId) return { ok: false as const, error: "The selected position is invalid." };
  const supabase = await createClient();

  if (candidateId) {
    const { data: candidate } = await supabase.from("candidates").select("id").eq("id", candidateId).eq("position_id", positionId).eq("status", "approved").maybeSingle();
    if (!candidate) return { ok: false as const, error: "That candidate is not approved for this position." };
  }

  const { error } = await supabase.from("votes").insert({
    voter_id: profile.id,
    candidate_id: candidateId,
    position_id: positionId,
  });

  if (error?.code === "23505") return { ok: false as const, error: "You have already voted for this position." };
  if (error?.code === "42501" || error?.message.toLowerCase().includes("row-level security")) {
    return { ok: false as const, error: "Supabase rejected the ballot. Confirm the election is active and apply the vote security migration in Supabase." };
  }
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/vote");
  revalidatePath("/dashboard/vote");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function submitVote(candidateId: string | null, positionId: string) {
  return saveVote(candidateId, positionId);
}

export async function castVote(formData: FormData): Promise<void> {
  const candidateId = String(formData.get("candidate_id") ?? "") || null;
  const positionId = String(formData.get("position_id") ?? "");
  const result = await saveVote(candidateId, positionId);
  if (!result.ok) throw new Error(result.error);
}
