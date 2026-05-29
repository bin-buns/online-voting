import { createClient } from "@/lib/supabase/server";

export type PosterWithCandidate = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  candidate: {
    photo_url: string | null;
    profile: {
      full_name: string;
    };
    position: {
      name: string;
    };
  };
};

export async function getAllCampaignPosters(): Promise<PosterWithCandidate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_posts")
    .select(`
      id, title, content, image_url, created_at,
      candidate:candidates (
        photo_url,
        profile:profiles ( full_name ),
        position:positions ( name )
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as unknown as PosterWithCandidate[];
}