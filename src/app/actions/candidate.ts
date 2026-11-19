"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCandidacySubmitted, notifyCandidacyDecision } from "@/lib/notify-events";
import { getElectionSettings } from "@/lib/election";
import { logAudit } from "@/lib/audit";

async function electionHasStarted() {
  const settings = await getElectionSettings();
  return !settings || Date.now() >= new Date(settings.voting_starts_at).getTime();
}

async function candidateRegistrationIsOpen() {
  const settings = await getElectionSettings();
  const now = Date.now();
  return Boolean(settings && settings.is_active &&
    now >= new Date(settings.candidate_registration_starts_at).getTime() &&
    now < new Date(settings.candidate_registration_ends_at).getTime());
}

function candidateCanRepresentStrand(positionName: string, strand: string | null) {
  if (!strand) return false;
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string[]> = {
    ict: ["ict", "informationandcommunicationstechnology", "informationandcommunicationtechnology"],
    abm: ["abm", "accountancybusinessandmanagement"],
    stem: ["stem", "sciencetechnologyengineeringandmathematics"],
    humss: ["humss", "humanitiesandsocialsciences"],
    gas: ["gas", "generalacademicstrand"],
    tvl: ["tvl", "technicalvocationalandlivelihood"],
  };
  const key = normalize(strand);
  const known = Object.entries(aliases).find(([shortName, names]) =>
    key === shortName || names.some((alias) => key.includes(alias))
  );
  const choices = known?.[1] ?? [key];
  const position = normalize(positionName);
  return choices.some((alias) => alias && position.includes(alias));
}

export async function submitCandidacyApplication(formData: FormData) {
  const { profile } = await requireAuth(["voter", "candidate"]);
  if (!(await candidateRegistrationIsOpen())) return { ok: false as const, error: "Candidate registration is currently closed." };
  const supabase = await createClient();
  const positionId = String(formData.get("position_id") ?? "").trim();
  const registrationFile = formData.get("registration_form");
  const maxDocumentBytes = 10 * 1024 * 1024;
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
  const tagline = String(formData.get("tagline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  if (!positionId) return { ok: false as const, error: "Select the position you are applying for." };
  const { data: selectedPosition } = await supabase.from("positions").select("name").eq("id", positionId).maybeSingle();
  if (!selectedPosition) return { ok: false as const, error: "The selected position is unavailable." };
  if (selectedPosition.name.toLowerCase().includes("representative")) {
    if (!candidateCanRepresentStrand(selectedPosition.name, profile.strand)) {
      return { ok: false as const, error: "You may only apply for the representative position matching your saved strand." };
    }
  }
  if (!tagline || tagline.length > 120) return { ok: false as const, error: "Add a campaign slogan of 120 characters or fewer." };
  if (bio.length > 3000) return { ok: false as const, error: "Keep your bio at 3,000 characters or fewer." };
  if (!(registrationFile instanceof File) || registrationFile.size === 0) return { ok: false as const, error: "Upload your registration form or official grade report." };
  if (registrationFile.size > maxDocumentBytes) return { ok: false as const, error: "The supporting document must be 10 MB or smaller." };
  if (!allowedTypes.has(registrationFile.type)) return { ok: false as const, error: "Upload a PDF, JPG, or PNG document." };

  const keys = ["school_year", "contact_number", "academic_standing", "previous_average", "academic_awards", "leadership_held", "leadership_details", "organizations", "volunteer_experience", "why_representative", "candidate_qualities", "student_plans", "represent_student_concerns", "balance_responsibilities", "declaration_signature", "declaration_date"] as const;
  const applicationData: Record<string, string> = {};
  for (const key of keys) applicationData[key] = String(formData.get(key) ?? "").trim();
  applicationData.declaration_date = new Date().toISOString().slice(0, 10);
  if (!["yes", "no"].includes(applicationData.leadership_held)) return { ok: false as const, error: "Select Yes or No for prior leadership experience." };
  const required = ["school_year", "contact_number", "academic_standing", "previous_average", "leadership_held", "organizations", "volunteer_experience", "why_representative", "candidate_qualities", "student_plans", "represent_student_concerns", "balance_responsibilities", "declaration_signature"];
  if (required.some((key) => !applicationData[key])) return { ok: false as const, error: "Complete all required application fields." };
  if (applicationData.leadership_held === "yes" && !applicationData.leadership_details) return { ok: false as const, error: "Describe your previous leadership experience, or select No." };
  if (applicationData.declaration_signature.toLowerCase() !== profile.full_name.trim().toLowerCase()) return { ok: false as const, error: "Type your registered full name as your declaration signature." };
  if (applicationData.school_year.length > 40 || applicationData.contact_number.length > 40) return { ok: false as const, error: "One of the personal information fields is too long." };
  if (keys.some((key) => applicationData[key].length > (key.startsWith("why_") || key.includes("qualities") || key.includes("plans") || key.includes("concerns") || key.includes("balance") ? 2000 : key === "declaration_signature" ? 120 : key === "school_year" || key === "contact_number" ? 40 : key === "leadership_held" ? 3 : 1000))) return { ok: false as const, error: "Some answers are too long. Please shorten them and try again." };

  const extension = registrationFile.type === "application/pdf" ? "pdf" : registrationFile.type === "image/png" ? "png" : "jpg";
  const documentPath = profile.id + "/" + crypto.randomUUID() + "." + extension;
  const { error: uploadError } = await supabase.storage.from("candidate-registration-forms").upload(documentPath, registrationFile, { upsert: false, contentType: registrationFile.type });
  if (uploadError) return { ok: false as const, error: "Could not upload the supporting document: " + uploadError.message };

  const { data: candidate, error: candidateError } = await supabase.from("candidates").insert({
    user_id: profile.id,
    position_id: positionId,
    tagline,
    bio,
    photo_url: String(formData.get("photo_url") ?? "").trim() || null,
    status: "pending",
  }).select("id").single();
  if (candidateError || !candidate) {
    await supabase.storage.from("candidate-registration-forms").remove([documentPath]);
    return { ok: false as const, error: candidateError?.message ?? "Could not create the application." };
  }

  const { error: applicationError } = await supabase.from("candidate_applications").insert({
    candidate_id: candidate.id,
    applicant_id: profile.id,
    application_data: applicationData,
    registration_form_path: documentPath,
  });
  if (applicationError) {
    await createAdminClient().from("candidates").delete().eq("id", candidate.id);
    await supabase.storage.from("candidate-registration-forms").remove([documentPath]);
    return { ok: false as const, error: applicationError.message };
  }

  await notifyCandidacySubmitted(profile.id, positionId);
  revalidatePath("/dashboard/candidacy");
  revalidatePath("/admin/candidacy");
  return { ok: true as const };
}

export async function getCandidateRegistrationDocumentUrl(candidateId: string) {
  await requireAuth(["admin"]);
  const supabase = await createClient();
  const { data: candidate, error } = await supabase.from("candidate_applications").select("registration_form_path").eq("candidate_id", candidateId).single();
  if (error || !candidate?.registration_form_path) return { error: "No registration form was uploaded for this application." };
  const { data, error: signedUrlError } = await createAdminClient().storage.from("candidate-registration-forms").createSignedUrl(candidate.registration_form_path, 300);
  if (signedUrlError || !data?.signedUrl) return { error: "Could not create a secure document link." };
  return { url: data.signedUrl };
}

export async function applyForPosition(formData: FormData) {
  const { profile } = await requireAuth(["candidate", "voter"]);
  if (!(await candidateRegistrationIsOpen())) throw new Error("Candidate registration is currently closed.");
  const supabase = await createClient();

  const { error } = await supabase.from("candidates").insert({
    user_id: profile.id,
    position_id: String(formData.get("position_id")),
    tagline: String(formData.get("tagline") || ""),
    bio: String(formData.get("bio") || ""),
    status: "pending",
  });

  if (error) throw new Error(error.message);

  // Confirmation email to the student + alert to admin(s). Never throws.
  await notifyCandidacySubmitted(profile.id, String(formData.get("position_id")));

  revalidatePath("/candidate/profile");
}

export async function createCampaignPost(formData: FormData) {
  const { profile } = await requireAuth(["candidate"]);
  if (await electionHasStarted()) throw new Error("Campaign posting is closed because the election has started.");
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const candidate_id = String(formData.get("candidate_id") ?? "");
  const { data: approvedCandidate } = await supabase.from("candidates")
    .select("id")
    .eq("id", candidate_id)
    .eq("user_id", profile.id)
    .eq("status", "approved")
    .maybeSingle();
  if (!approvedCandidate) throw new Error("You can publish campaign posters only after your candidacy is approved.");
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
  newStatus: "approved" | "rejected",
  remarks = ""
) {
  const adminSession = await requireAuth(["admin"]); // only admins may approve/reject
  if (await electionHasStarted()) return { error: "Candidacy reviews are locked after the election starts." };
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: candidateOwner, error: ownerError } = await supabase.from("candidates").select("user_id").eq("id", candidateId).single();
  if (ownerError || !candidateOwner || candidateOwner.user_id !== userId) return { error: "Candidate application not found." };

  const { error: candidateError } = await supabase
    .from("candidate_applications")
    .upsert({ candidate_id: candidateId, applicant_id: candidateOwner.user_id, review_remarks: remarks.trim() || null, reviewed_by_name: adminSession.profile.full_name, reviewed_at: new Date().toISOString() }, { onConflict: "candidate_id" });

  if (candidateError) return { error: candidateError.message };

  const { error: statusError } = await supabase.from("candidates").update({ status: newStatus }).eq("id", candidateId);
  if (statusError) return { error: statusError.message };

  const newRole = newStatus === "approved" ? "candidate" : "voter";

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", candidateOwner.user_id);

  if (profileError) return { error: profileError.message };

  // Email the student the decision. Never throws or blocks the review.
  await notifyCandidacyDecision(candidateId, candidateOwner.user_id, newStatus);
  await logAudit({ action: `Candidacy ${newStatus}`, detail: `${candidateOwner.user_id} application ${candidateId} set to ${newStatus}${remarks.trim() ? `; remarks: ${remarks.trim()}` : ""}`, category: "candidate" });

  return { success: true };
}

export async function deleteCandidate(candidateId: string, userId: string) {
  const session = await requireAuth(["admin"]);
  if (await electionHasStarted()) return { error: "Candidacy applications cannot be deleted after the election starts." };
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: candidate } = await supabase.from("candidates").select("user_id").eq("id", candidateId).single();
  const { data: application } = await supabase.from("candidate_applications").select("registration_form_path").eq("candidate_id", candidateId).maybeSingle();
  if (!candidate || candidate.user_id !== userId) return { error: "Candidate application not found." };
  if (application?.registration_form_path) {
    const { error: fileError } = await adminSupabase.storage.from("candidate-registration-forms").remove([application.registration_form_path]);
    if (fileError) return { error: "Could not remove the private registration document: " + fileError.message };
  }

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

  await logAudit({ action: "Candidacy application deleted", detail: `${session.profile.full_name} deleted application ${candidateId} for ${userId}`, category: "candidate" });

  return { success: true };
}

export async function updateCampaignPost(postId: string, formData: FormData) {
  const { profile } = await requireAuth(["candidate"]);
  if (await electionHasStarted()) throw new Error("Campaign posts are locked after the election starts.");
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: existingPost } = await supabase.from("campaign_posts").select("candidate_id").eq("id", postId).maybeSingle();
  if (!existingPost) throw new Error("Campaign post not found.");
  const { data: approvedCandidate } = await supabase.from("candidates").select("id")
    .eq("id", existingPost.candidate_id).eq("user_id", profile.id).eq("status", "approved").maybeSingle();
  if (!approvedCandidate) throw new Error("Only approved candidates can manage campaign posters.");

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
  const { profile } = await requireAuth(["candidate"]);
  if (await electionHasStarted()) throw new Error("Campaign posts are locked after the election starts.");
  const supabase = await createClient();

  const { data: existingPost } = await supabase.from("campaign_posts").select("candidate_id").eq("id", postId).maybeSingle();
  if (!existingPost) throw new Error("Campaign post not found.");
  const { data: approvedCandidate } = await supabase.from("candidates").select("id")
    .eq("id", existingPost.candidate_id).eq("user_id", profile.id).eq("status", "approved").maybeSingle();
  if (!approvedCandidate) throw new Error("Only approved candidates can manage campaign posters.");

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

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const admin = createAdminClient();
    const { error: profileError } = await admin.from("profiles").update({ is_temporary_password: false, password_change_deadline: null, first_login_at: null }).eq("id", user.id);
    if (profileError) throw new Error("Password changed, but the temporary password status could not be cleared. Contact an administrator.");
  }
}
