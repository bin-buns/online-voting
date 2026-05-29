"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type Post = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  candidate_id: string;
  author: string;
  position: string;
  photo_url: string | null; // ← NEW
};

type RawPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  candidates: {
    id: string;
    photo_url: string | null; // ← NEW
    profiles: { full_name: string } | null;
    positions: { name: string } | null;
  } | null;
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Avatar helper (photo or initials fallback) ────────────────────────────────

function Avatar({
  photo_url,
  name,
  size = 40,
  fontSize = 14,
}: {
  photo_url: string | null;
  name: string;
  size?: number;
  fontSize?: number;
}) {
  const [err, setErr] = useState(false);

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#0d6b34", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize, fontWeight: 700, color: "#fff",
      overflow: "hidden", position: "relative",
    }}>
      {photo_url && !err ? (
        <Image
          src={photo_url}
          alt={name}
          fill
          style={{ objectFit: "cover" }}
          onError={() => setErr(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

// ── Post Modal ────────────────────────────────────────────────────────────────

function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px",
        width: "100%", maxWidth: "560px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        overflow: "hidden",
        animation: "modalIn 0.18s ease",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Image */}
        {post.image_url && (
          <div style={{ position: "relative", width: "100%", height: "260px", flexShrink: 0 }}>
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "24px", overflowY: "auto" }}>
          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>

            {/* ← NOW USES PHOTO */}
            <Avatar photo_url={post.photo_url} name={post.author} size={40} fontSize={14} />

            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                {post.author}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {post.position} · {timeAgo(post.created_at)}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                marginLeft: "auto", background: "#f1f5f9", border: "none",
                borderRadius: "8px", width: "32px", height: "32px",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "18px", color: "#64748b",
              }}
            >×</button>
          </div>

          <h2 style={{
            fontSize: "20px", fontWeight: 700, color: "#1e293b",
            margin: "0 0 12px",
            fontFamily: "var(--font-oswald), sans-serif",
            letterSpacing: "0.02em",
          }}>
            {post.title}
          </h2>
          <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.7, margin: 0 }}>
            {post.content}
          </p>
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VoterDashboardClient({
  initialPosts,
}: {
  initialPosts: Post[];
}) {
  const [posts, setPosts]       = useState<Post[]>(initialPosts);
  const [selected, setSelected] = useState<Post | null>(null);
  const [filter, setFilter]     = useState("all");

  useEffect(() => {
    const supabase = createClient();

    async function fetchPosts() {
      const { data } = await supabase
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
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data) return;
      setPosts(((data as unknown as RawPost[]) ?? []).map((p) => ({
        id:           p.id,
        title:        p.title,
        content:      p.content,
        image_url:    p.image_url,
        created_at:   p.created_at,
        candidate_id: p.candidates?.id       ?? "",
        author:       p.candidates?.profiles?.full_name ?? "Unknown",
        position:     p.candidates?.positions?.name     ?? "—",
        photo_url:    p.candidates?.photo_url ?? null, // ← NEW
      })));
    }

    const channel = supabase
      .channel("campaign-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_posts" }, fetchPosts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const positions = ["all", ...Array.from(new Set(posts.map((p) => p.position)))];
  const filtered  = filter === "all" ? posts : posts.filter((p) => p.position === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "18px", fontWeight: 700,
            color: "#0d6b34", letterSpacing: "0.04em",
            textTransform: "uppercase", margin: "0 0 2px",
          }}>
            Campaign Posters
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Read what candidates are campaigning for
          </p>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "#dcfce7", borderRadius: "999px",
          padding: "4px 12px", fontSize: "12px", fontWeight: 700, color: "#15803d",
        }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#15803d", display: "inline-block" }} />
          Live
        </div>
      </div>

      {/* Position filter tabs */}
      {positions.length > 1 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => setFilter(pos)}
              style={{
                padding: "6px 16px", borderRadius: "8px", border: "1.5px solid",
                fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                background:  filter === pos ? "#0d6b34" : "#fff",
                borderColor: filter === pos ? "#0d6b34" : "#e2e8f0",
                color:       filter === pos ? "#fff"    : "#64748b",
              }}
            >
              {pos === "all" ? "All Positions" : pos}
            </button>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
          padding: "48px", textAlign: "center",
        }}>
          <i className="ti ti-speakerphone" style={{ fontSize: "36px", color: "#cbd5e1", display: "block", marginBottom: "12px" }} />
          <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8", fontWeight: 600 }}>
            No campaign posts yet.
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#cbd5e1" }}>
            Check back when candidates start posting.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}>
          {filtered.map((post) => (
            <div
              key={post.id}
              onClick={() => setSelected(post)}
              style={{
                background: "#fff", borderRadius: "16px",
                border: "1px solid #e2e8f0", overflow: "hidden",
                cursor: "pointer", transition: "all 0.18s",
                display: "flex", flexDirection: "column",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(13,107,52,0.12)";
                e.currentTarget.style.borderColor = "#0d6b34";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              {/* Poster image or placeholder */}
              {post.image_url ? (
                <div style={{ position: "relative", width: "100%", height: "180px", flexShrink: 0 }}>
                  <Image src={post.image_url} alt={post.title} fill style={{ objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{
                  width: "100%", height: "180px", flexShrink: 0,
                  background: "linear-gradient(135deg, #1a2e1f 0%, #0d6b34 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: "8px",
                }}>
                  {/* ← PHOTO IN PLACEHOLDER TOO */}
                  <div style={{ width: "56px", height: "56px", borderRadius: "50%", overflow: "hidden", position: "relative" }}>
                    <Avatar photo_url={post.photo_url} name={post.author} size={56} fontSize={20} />
                  </div>
                  <span style={{
                    fontSize: "11px", color: "rgba(255,255,255,0.6)",
                    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Campaign Post
                  </span>
                </div>
              )}

              {/* Card content */}
              <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Position badge */}
                <span style={{
                  display: "inline-block", alignSelf: "flex-start",
                  background: "#f0fdf4", color: "#0d6b34",
                  borderRadius: "6px", padding: "2px 8px",
                  fontSize: "10px", fontWeight: 700,
                  letterSpacing: "0.05em", textTransform: "uppercase",
                }}>
                  {post.position}
                </span>

                {/* Title */}
                <h3 style={{
                  margin: 0, fontSize: "15px", fontWeight: 700,
                  color: "#1e293b", lineHeight: 1.35,
                  fontFamily: "var(--font-oswald), sans-serif",
                  letterSpacing: "0.02em",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }}>
                  {post.title}
                </h3>

                {/* Content preview */}
                <p style={{
                  margin: 0, fontSize: "13px", color: "#64748b",
                  lineHeight: 1.55, flex: 1,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }}>
                  {post.content}
                </p>

                {/* Footer — owner tag */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  paddingTop: "10px", borderTop: "1px solid #f1f5f9",
                }}>
                  {/* ← PHOTO HERE TOO */}
                  <Avatar photo_url={post.photo_url} name={post.author} size={28} fontSize={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "12px", fontWeight: 700, color: "#1e293b",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {post.author}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {post.position}
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", flexShrink: 0 }}>
                    {timeAgo(post.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <PostModal post={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}