import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CampaignPostsClient from "@/components/candidate/CampaignPostsClient";

export default async function CandidateCampaignPage() {
  const { profile } = await requireAuth(["candidate"]);
  const supabase = await createClient();

  const { data: candidacies } = await supabase
    .from("candidates")
    .select("id, status, positions(name)")
    .eq("user_id", profile.id)
    .eq("status", "approved");

  const approvedId = candidacies?.[0]?.id ?? null;

  const { data: posts } = approvedId
    ? await supabase
        .from("campaign_posts")
        .select("*")
        .eq("candidate_id", approvedId)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <CampaignPostsClient
      initialPosts={posts ?? []}
      approvedId={approvedId}
    />
  );
}