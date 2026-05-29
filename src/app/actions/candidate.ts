"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function applyForPosition(formData: FormData) {
  const { profile } = await requireAuth(["candidate", "voter"]);
  const supabase = await createClient();

  const { error } = await supabase.from("candidates").insert({
    user_id: profile.id,
    position_id: String(formData.get("position_id")),
    tagline: String(formData.get("tagline") || ""),
    bio: String(formData.get("bio") || ""),
    status: "pending",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/candidate/profile");
}

export async function createCampaignPost(formData: FormData) {
  await requireAuth(["candidate"]);
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const candidate_id = formData.get("candidate_id") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const imageFile = formData.get("image") as File | null;

  let image_url: string | null = null;

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop();
    const fileName = `poster-${candidate_id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await adminSupabase.storage
      .from("candidate-photos")
      .upload(fileName, imageFile, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = adminSupabase.storage
      .from("candidate-photos")
      .getPublicUrl(fileName);

    image_url = urlData.publicUrl;
  }

  const { error } = await supabase.from("campaign_posts").insert({
    candidate_id,
    title,
    content,
    image_url,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/candidate/campaign");
  revalidatePath("/dashboard");
}

export async function updateCandidateStatus(
  candidateId: string,
  userId: string,
  newStatus: "approved" | "rejected"
) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { error: candidateError } = await supabase
    .from("candidates")
    .update({ status: newStatus })
    .eq("id", candidateId);

  if (candidateError) return { error: candidateError.message };

  const newRole = newStatus === "approved" ? "candidate" : "voter";

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  return { success: true };
}

export async function deleteCandidate(candidateId: string, userId: string) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { error: deleteError } = await supabase
    .from("candidates")
    .delete()
    .eq("id", candidateId);

  if (deleteError) return { error: deleteError.message };

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({ role: "voter" })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  return { success: true };
}

export async function updateCampaignPost(postId: string, formData: FormData) {
  await requireAuth(["candidate"]);
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const imageFile = formData.get("image") as File | null;

  let image_url: string | null = null;

  // Get existing image_url first
  const { data: existing } = await supabase
    .from("campaign_posts")
    .select("image_url")
    .eq("id", postId)
    .single();

  image_url = existing?.image_url ?? null;

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop();
    const fileName = `poster-${postId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await adminSupabase.storage
      .from("candidate-photos")
      .upload(fileName, imageFile, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = adminSupabase.storage
      .from("candidate-photos")
      .getPublicUrl(fileName);

    image_url = urlData.publicUrl;
  }

  const { error } = await supabase
    .from("campaign_posts")
    .update({ title, content, image_url })
    .eq("id", postId);

  if (error) throw new Error(error.message);
  revalidatePath("/candidate/campaign");
  revalidatePath("/dashboard");
}

export async function deleteCampaignPost(postId: string) {
  await requireAuth(["candidate"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaign_posts")
    .delete()
    .eq("id", postId);

  if (error) throw new Error(error.message);
  revalidatePath("/candidate/campaign");
  revalidatePath("/dashboard");
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirm  = formData.get("confirm")  as string;

  if (password !== confirm) throw new Error("Passwords do not match.");
  if (password.length < 8)  throw new Error("Password must be at least 8 characters.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}