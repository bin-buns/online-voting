import { createClient } from "@/lib/supabase/server";
import { getElectionSettings } from "@/lib/election";
import { getElectionPhase } from "@/types/database";
import { requireAuth } from "@/lib/auth";
import Image from "next/image";
import VoterCountdown from "@/components/voter/VoterCountdown";
import VoterDashboardClient from "@/components/voter/VoterDashboardClient";
import ScrollIndicator from "@/components/voter/ScrollIndicator";

type RawPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  candidates: {
    id: string;
    profiles: { full_name: string } | null;
    positions: { name: string } | null;
    photo_url: string | null;
  } | null;
};

export default async function VoterDashboardPage() {
  await requireAuth(["voter", "candidate"]);

  const supabase = await createClient();

  const [settings, { data: postsData }] = await Promise.all([
    getElectionSettings(),
    supabase
      .from("campaign_posts")
      .select(`
        id, title, content, image_url, created_at,
        candidates (
          id,
          profiles ( full_name ),
          positions ( name )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  supabase
  .from("campaign_posts")
  .select(`
    id, title, content, image_url, created_at,
    candidates (
      id,
      photo_url,
      profiles ( full_name ),
      positions ( name )
    )
  `)

  const phase = settings ? getElectionPhase(settings) : "upcoming";

  const posts = ((postsData as unknown as RawPost[]) ?? []).map((p) => ({
    id:           p.id,
    title:        p.title,
    content:      p.content,
    image_url:    p.image_url,
    created_at:   p.created_at,
    candidate_id: p.candidates?.id ?? "",
    author:       p.candidates?.profiles?.full_name ?? "Unknown",
    position:     p.candidates?.positions?.name     ?? "—",
    photo_url:    p.candidates?.photo_url ?? null,
  }));

  const targetDate = settings
    ? phase === "upcoming" ? settings.voting_starts_at
    : phase === "voting"   ? settings.voting_ends_at
    :                        settings.results_visible_at
    : null;

  return (
    <>
      <div style={{
  position: "fixed",
  top: 0,
  left: "240px",   // ← was "inset: 0"
  right: 0,
  bottom: 0,
  zIndex: 0,
}}>
        <Image
          src="/Background.jpg"
          alt=""
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(13,107,52,0.5) 60%, rgba(13,107,52,0.72) 100%)",
        }} />
      </div>

      {/* ── Scrollable content on top ── */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Hero — full viewport height */}
        <div style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.25rem",
          position: "relative",
        }}>
          <Image
            src="/Logo.png"
            alt="Theresian School of Cavite"
            width={200}
            height={200}
            style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))", marginBottom: "14px" }}
            priority
          />

          <h1 style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "clamp(3.4rem, 4vw, 2rem)",
            fontWeight: 700,
            color: "#f5e642",
            textShadow: "1px 1px 0 #0d6b34, -1px -1px 0 #0d6b34, 1px -1px 0 #0d6b34, -1px 1px 0 #0d6b34",
            letterSpacing: "0.03em",
            margin: "0 0 4px", lineHeight: 1.2,
            textAlign: "center",
          }}>
            Theresian School of Cavite
          </h1>
          <p style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "clamp(2.3rem, 3vw, 1.5rem)",
            fontWeight: 700,
            color: "#f5e642",
            textShadow: "1px 1px 0 #0d6b34, -1px -1px 0 #0d6b34, 1px -1px 0 #0d6b34, -1px 1px 0 #0d6b34",
            letterSpacing: "0.03em",
            margin: "0 0 20px",
            textAlign: "center",
          }}>
            Online Voting System
          </p>

          <p style={{
            fontSize: "clamp(1.25rem, 2vw, 1.25rem)",
            color: "rgba(255,255,255,0.92)",
            fontStyle: "italic",
            maxWidth: "420px",
            lineHeight: 1.6,
            margin: "0 0 32px",
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            textAlign: "center",
          }}>
            &ldquo;Welcome to the official online voting portal for Theresian students. Your voice matters — cast your vote securely and fairly.&rdquo;
          </p>

          {targetDate ? (
            <VoterCountdown targetDate={targetDate} phase={phase} />
          ) : (
            <div style={{
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.25)", borderRadius: "16px",
              padding: "20px 32px", color: "#fff", fontSize: "14px", fontWeight: 600,
            }}>
              No election scheduled yet.
            </div>
          )}
          <ScrollIndicator />
        </div>

        {/* campaign posters — scrolls to view */}
        <div style={{
          background: "rgba(249,250,251,0.97)",
          backdropFilter: "blur(8px)",
          padding: "2rem 1.5rem",
          minHeight: "100vh",
        }}>
          <VoterDashboardClient initialPosts={posts} />
        </div>

      </div>
    </>
  );
}