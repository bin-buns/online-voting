import { createClient } from "@/lib/supabase/server";
import type { ElectionSettings } from "@/types/database";

export async function getElectionSettings(): Promise<ElectionSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("election_settings").select("*").eq("id", 1).single();
  return data as ElectionSettings | null;
}
