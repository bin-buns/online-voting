import { NextResponse, after } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendElectionNotice, type ElectionRow } from "@/lib/election-notices";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return NextResponse.json({
      code: "ADMIN_SESSION_REQUIRED",
      error: "Your administrator verification has expired or is missing. Sign in again and complete the verification code to send the schedule notice.",
    }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin.from("election_settings").select("*").eq("id", 1).single();
  if (error || !row) return NextResponse.json({ error: error?.message ?? "No election schedule found." }, { status: 404 });
  const election = row as ElectionRow & Record<string, unknown>;
  if (!election.is_active) return NextResponse.json({ skipped: "Election is not active." });

  const { data: claimed, error: claimError } = await admin
    .from("election_settings")
    .update({ schedule_notice_sent_at: new Date().toISOString() })
    .eq("id", election.id)
    .is("schedule_notice_sent_at", null)
    .select("id");
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  if (!claimed?.length) return NextResponse.json({ queued: false, reason: "This schedule has already been announced." });

  after(async () => {
    try {
      const result = await sendElectionNotice("scheduled", election);
      if (result.total > 0 && result.sent === 0) {
        await admin.from("election_settings").update({ schedule_notice_sent_at: null }).eq("id", election.id);
      }
    } catch (sendError) {
      console.error("[election-email] schedule announcement failed:", sendError);
      await admin.from("election_settings").update({ schedule_notice_sent_at: null }).eq("id", election.id);
    }
  });
  return NextResponse.json({ queued: true });
}
