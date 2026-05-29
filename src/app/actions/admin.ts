"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateElectionSchedule(formData: FormData) {
  await requireAuth(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("election_settings")
    .update({
      title: String(formData.get("title")),
      voting_starts_at: String(formData.get("voting_starts_at")),
      voting_ends_at: String(formData.get("voting_ends_at")),
      results_visible_at: String(formData.get("results_visible_at")),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/election");
  revalidatePath("/dashboard");
  revalidatePath("/results");
}

export async function createPosition(formData: FormData) {
  await requireAuth(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("positions").insert({
    name: String(formData.get("name")),
    description: String(formData.get("description") || ""),
    max_winners: Number(formData.get("max_winners") || 1),
    sort_order: Number(formData.get("sort_order") || 0),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/positions");
}

export async function reviewCandidate(formData: FormData) {
  await requireAuth(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("candidates")
    .update({ status: String(formData.get("status")) })
    .eq("id", String(formData.get("candidate_id")));

  if (error) throw new Error(error.message);
  revalidatePath("/admin/candidates");
  revalidatePath("/candidates");
}
