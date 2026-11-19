"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function updateElectionSchedule(formData: FormData) {
  await requireAuth(["admin"]);
  const supabase = await createClient();

  const scheduleDate = (name: string) => {
    const value = String(formData.get(name) ?? "");
    const date = new Date(`${value}:00+08:00`);
    if (!value || Number.isNaN(date.getTime())) throw new Error("Enter all election dates and times.");
    return date;
  };
  const registrationStarts = scheduleDate("candidate_registration_starts_at");
  const registrationEnds = scheduleDate("candidate_registration_ends_at");
  const starts = scheduleDate("voting_starts_at");
  const scheduledEnd = new Date(starts.getTime() + 24 * 60 * 60 * 1000);
  const enteredEnd = scheduleDate("voting_ends_at");
  const ends = enteredEnd < scheduledEnd && enteredEnd.getTime() <= Date.now() ? enteredEnd : scheduledEnd;
  const results = scheduleDate("results_visible_at");
  const archive = scheduleDate("archive_at");
  if (registrationEnds <= registrationStarts) throw new Error("Candidate registration end must be after its start.");
  if (registrationEnds > starts) throw new Error("Candidate registration must end by the time voting starts.");
  if (ends <= starts) throw new Error("Voting end must be after voting start.");
  if (results < ends) throw new Error("Results must be visible after voting ends.");
  if (archive < results) throw new Error("Archive time must be after results are visible.");

  const { error } = await supabase
    .from("election_settings")
    .update({
      title: String(formData.get("title")),
      candidate_registration_starts_at: registrationStarts.toISOString(),
      candidate_registration_ends_at: registrationEnds.toISOString(),
      voting_starts_at: starts.toISOString(),
      voting_ends_at: ends.toISOString(),
      results_visible_at: results.toISOString(),
      archive_at: archive.toISOString(),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) throw new Error(error.message);
  await logAudit({ action: "Election schedule updated", detail: `Title: ${String(formData.get("title"))}; candidate registration ${registrationStarts.toISOString()} to ${registrationEnds.toISOString()}; voting ${starts.toISOString()} to ${ends.toISOString()}`, category: "election" });
  revalidatePath("/admin/election");
  revalidatePath("/dashboard");
  revalidatePath("/results");
  revalidatePath("/vote");
  revalidatePath("/dashboard/vote");
}

export async function createPosition(formData: FormData) {
  const session = await requireAuth(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("positions").insert({
    name: String(formData.get("name")),
    description: String(formData.get("description") || ""),
    max_winners: Number(formData.get("max_winners") || 1),
    sort_order: Number(formData.get("sort_order") || 0),
  });

  if (error) throw new Error(error.message);
  await logAudit({ action: "Election position created", detail: `${session.profile.full_name} created ${String(formData.get("name"))}`, category: "election" });
  revalidatePath("/admin/positions");
}

export async function endElectionNow() {
  const session = await requireAuth(["admin"]);
  const supabase = await createClient();
  const { data: settings, error: readError } = await supabase.from("election_settings").select("title, voting_starts_at, voting_ends_at, is_active").eq("id", 1).single();
  if (readError || !settings) throw new Error("Could not load the election schedule.");
  const now = new Date();
  if (!settings.is_active || now < new Date(settings.voting_starts_at) || now >= new Date(settings.voting_ends_at)) {
    throw new Error("Voting is not currently open.");
  }
  const { error } = await supabase.from("election_settings").update({ voting_ends_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", 1);
  if (error) throw new Error(error.message);
  await logAudit({ action: "Election ended early", detail: `${session.profile.full_name} ended “${settings.title}” at ${now.toISOString()}`, category: "election" });
  revalidatePath("/admin/election");
  revalidatePath("/admin/votes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/vote");
  revalidatePath("/vote");
  revalidatePath("/results");
}

export async function resetAllVotes() {
  const session = await requireAuth(["admin"]);
  const admin = createAdminClient();
  const { data: deleted, error } = await admin
    .from("votes")
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) throw new Error(`Could not reset votes: ${error.message}`);

  await logAudit({
    action: "Reset all votes",
    detail: `${deleted?.length ?? 0} cast votes were permanently deleted by ${session.profile.full_name}`,
    category: "votes",
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/votes");
  revalidatePath("/admin/results");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/vote");
  revalidatePath("/results");
  revalidatePath("/vote");
  return { deletedCount: deleted?.length ?? 0 };
}

export async function reviewCandidate(formData: FormData) {
  const session = await requireAuth(["admin"]);
  const supabase = await createClient();
  const { data: election } = await supabase.from("election_settings").select("voting_starts_at").eq("id", 1).maybeSingle();
  if (!election || Date.now() >= new Date(election.voting_starts_at).getTime()) {
    throw new Error("Candidacy reviews are locked after the election starts.");
  }
  const candidateId = String(formData.get("candidate_id"));
  const status = String(formData.get("status"));
  const { data: candidate } = await supabase.from("candidates").select("position_id, profiles(full_name)").eq("id", candidateId).maybeSingle();

  const { error } = await supabase
    .from("candidates")
    .update({ status })
    .eq("id", candidateId);

  if (error) throw new Error(error.message);
  const candidateProfile = candidate?.profiles as unknown as { full_name: string } | null;
  await logAudit({ action: "Candidate reviewed", detail: `${session.profile.full_name} set ${candidateProfile?.full_name ?? candidateId} to ${status}`, category: "candidate" });
  revalidatePath("/admin/candidates");
  revalidatePath("/candidates");
}
