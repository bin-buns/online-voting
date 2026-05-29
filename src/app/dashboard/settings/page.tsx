import { requireAuth } from "@/lib/auth";
import VoterSettingsClient from "@/components/voter/VoterSettingsClient";

export default async function VoterSettingsPage() {
  const { profile } = await requireAuth(["voter", "candidate"]);
  return <VoterSettingsClient profile={profile} />;
}