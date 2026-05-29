"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getElectionSettings } from "@/lib/election";
import { getElectionPhase } from "@/types/database";

export async function castVote(formData: FormData) {
  const { profile } = await requireAuth(["voter", "candidate"]);
  const settings = await getElectionSettings();

  if (!settings || getElectionPhase(settings) !== "voting") {
    throw new Error("Voting is not open right now.");
  }

  const candidateId = String(formData.get("candidate_id"));
  const positionId = String(formData.get("position_id"));
  const supabase = await createClient();

  const { error } = await supabase.from("votes").insert({
    voter_id: profile.id,
    candidate_id: candidateId,
    position_id: positionId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/vote");
  revalidatePath("/dashboard");
}
