"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import {
  createCampaignPost,
  updateCampaignPost,
  deleteCampaignPost,
} from "@/app/actions/candidate";

type Post = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  candidate_id: string;
};

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

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({
  post,
  onClose,
  onSaved,
}: {
  post: Post;
  onClose: () => void;
  onSaved: (updated: Post) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(post.image_url);
  const imageRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateCampaignPost(post.id, fd);
        onSaved({
          ...post,
          title:     fd.get("title") as string,
          content:   fd.get("content") as string,
          image_url: preview,
        });
        onClose();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      }
    });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "520px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        animation: "modalIn 0.18s ease",
      }}>
        {/* Header */}
        <div style={{
          background: "#0d6b34", padding: "18px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>Edit Poster</span>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px",
            width: "32px", height: "32px", cursor: "pointer", color: "#fff", fontSize: "18px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>Title</label>
            <input
              name="title"
              defaultValue={post.title}
              required
              style={{
                border: "1.5px solid #e5e7eb", borderRadius: "10px",
                padding: "10px 14px", fontSize: "14px", outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
            <textarea
              name="content"
              defaultValue={post.content}
              required
              rows={5}
              style={{
                border: "1.5px solid #e5e7eb", borderRadius: "10px",
                padding: "10px 14px", fontSize: "14px", outline: "none",
                fontFamily: "inherit", resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Image <span style={{ fontWeight: 400, color: "#9ca3af", textTransform: "none" }}>(optional)</span>
            </label>
            <input
              ref={imageRef}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              style={{ fontSize: "13px" }}
            />
            {preview && (
              <div style={{ position: "relative", width: "100%", height: "180px", borderRadius: "10px", overflow: "hidden", marginTop: "6px" }}>
                <Image src={preview} alt="Preview" fill style={{ objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => { setPreview(null); if (imageRef.current) imageRef.current.value = ""; }}
                  style={{
                    position: "absolute", top: "8px", right: "8px",
                    background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "6px",
                    color: "#fff", fontSize: "12px", fontWeight: 700,
                    padding: "4px 10px", cursor: "pointer",
                  }}
                >✕ Remove</button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid #f0f1f5" }}>
            <button type="button" onClick={onClose} style={{
              padding: "10px 20px", borderRadius: "10px", border: "1.5px solid #e5e7eb",
              background: "#fff", color: "#374151", fontWeight: 700, fontSize: "13.5px", cursor: "pointer",
            }}>Cancel</button>
            <button type="submit" disabled={isPending} style={{
              padding: "10px 22px", borderRadius: "10px", border: "none",
              background: "#0d6b34", color: "#fff", fontWeight: 700, fontSize: "13.5px",
              cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
            }}>
              {isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
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

// ── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({
  postId,
  onClose,
  onDeleted,
}: {
  postId: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCampaignPost(postId);
        onDeleted(postId);
        onClose();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      }
    });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "400px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden",
        animation: "modalIn 0.18s ease",
      }}>
        <div style={{ background: "#0d6b34", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>Delete Poster</span>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px",
            width: "32px", height: "32px", cursor: "pointer", color: "#fff", fontSize: "18px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
              {error}
            </div>
          )}
          <div style={{ background: "#fff5f5", border: "1px solid #fecdd3", borderRadius: "10px", padding: "14px", fontSize: "13.5px", color: "#be123c", fontWeight: 600 }}>
            Are you sure you want to delete this poster? This cannot be undone.
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "10px 20px", borderRadius: "10px", border: "1.5px solid #e5e7eb",
              background: "#fff", color: "#374151", fontWeight: 700, fontSize: "13.5px", cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleDelete} disabled={isPending} style={{
              padding: "10px 22px", borderRadius: "10px", border: "none",
              background: "#be123c", color: "#fff", fontWeight: 700, fontSize: "13.5px",
              cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
            }}>
              {isPending ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CampaignPostsClient({
  initialPosts,
  approvedId,
}: {
  initialPosts: Post[];
  approvedId: string | null;
}) {
  const [posts, setPosts]           = useState<Post[]>(initialPosts);
  const [editPost, setEditPost]     = useState<Post | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError]           = useState("");
  const [preview, setPreview]       = useState<string | null>(null);
  const imageRef                    = useRef<HTMLInputElement>(null);
  const formRef                     = useRef<HTMLFormElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      try {
        await createCampaignPost(fd);
        form.reset();
        setPreview(null);
        setError("");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      }
    });
  }

  function handleSaved(updated: Post) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* Page title */}
      <div>
        <h1 style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "22px", fontWeight: 700,
          color: "#0d6b34", letterSpacing: "0.04em",
          textTransform: "uppercase", margin: "0 0 4px",
        }}>My Campaign Posters</h1>
        <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>
          Create and manage your campaign posters — voters will see them on the dashboard.
        </p>
      </div>

      <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "1fr 1fr" }}>

        {/* ── Create Form ── */}
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ background: "#0d6b34", padding: "16px 20px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#fff" }}>New Poster</h2>
          </div>
          <div style={{ padding: "20px" }}>
            {!approvedId ? (
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                You need an approved candidacy before creating posters.
              </p>
            ) : (
              <form ref={formRef} onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <input type="hidden" name="candidate_id" value={approvedId} />

                {error && (
                  <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>Title</label>
                  <input
                    name="title"
                    placeholder="e.g. My Vision for the School"
                    required
                    style={{
                      border: "1.5px solid #e5e7eb", borderRadius: "10px",
                      padding: "10px 14px", fontSize: "14px", outline: "none", fontFamily: "inherit",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
                  <textarea
                    name="content"
                    placeholder="Share your platform, goals, and what you stand for…"
                    required
                    rows={5}
                    style={{
                      border: "1.5px solid #e5e7eb", borderRadius: "10px",
                      padding: "10px 14px", fontSize: "14px", outline: "none",
                      fontFamily: "inherit", resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Image <span style={{ fontWeight: 400, color: "#9ca3af", textTransform: "none" }}>(optional)</span>
                  </label>
                  <input
                    ref={imageRef}
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    style={{ fontSize: "13px" }}
                  />
                  {preview && (
                    <div style={{ position: "relative", width: "100%", height: "160px", borderRadius: "10px", overflow: "hidden", marginTop: "6px" }}>
                      <Image src={preview} alt="Preview" fill style={{ objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => { setPreview(null); if (imageRef.current) imageRef.current.value = ""; }}
                        style={{
                          position: "absolute", top: "8px", right: "8px",
                          background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "6px",
                          color: "#fff", fontSize: "12px", fontWeight: 700,
                          padding: "4px 10px", cursor: "pointer",
                        }}
                      >✕ Remove</button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    padding: "11px", borderRadius: "10px", border: "none",
                    background: "#0d6b34", color: "#fff", fontWeight: 700,
                    fontSize: "14px", cursor: isPending ? "not-allowed" : "pointer",
                    opacity: isPending ? 0.6 : 1, transition: "opacity 0.15s",
                  }}
                >
                  {isPending ? "Publishing…" : "Publish Poster"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Posts List ── */}
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ background: "#0d6b34", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#fff" }}>Your Posters</h2>
            <span style={{
              background: "rgba(255,255,255,0.2)", borderRadius: "999px",
              padding: "2px 10px", fontSize: "12px", fontWeight: 700, color: "#fff",
            }}>{posts.length}</span>
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "600px", overflowY: "auto" }}>
            {posts.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>No posters yet</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px" }}>Create your first poster using the form.</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} style={{
                  border: "1px solid #e2e8f0", borderRadius: "12px",
                  overflow: "hidden", transition: "border-color 0.15s",
                }}>
                  {/* Post image */}
                  {post.image_url && (
                    <div style={{ position: "relative", width: "100%", height: "140px" }}>
                      <Image src={post.image_url} alt={post.title} fill style={{ objectFit: "cover" }} />
                    </div>
                  )}

                  <div style={{ padding: "14px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                      {post.title}
                    </p>
                    <p style={{
                      margin: "0 0 10px", fontSize: "13px", color: "#64748b", lineHeight: 1.5,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                    }}>
                      {post.content}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>{timeAgo(post.created_at)}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => setEditPost(post)}
                          style={{
                            padding: "5px 14px", borderRadius: "8px",
                            border: "1px solid #e2e8f0", background: "#fff",
                            color: "#0d6b34", fontWeight: 700, fontSize: "12px", cursor: "pointer",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#0d6b34"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(post.id)}
                          style={{
                            padding: "5px 14px", borderRadius: "8px",
                            border: "1px solid #fecdd3", background: "#fff5f5",
                            color: "#be123c", fontWeight: 700, fontSize: "12px", cursor: "pointer",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#ffe4e6"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff5f5"; }}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {editPost && (
        <EditModal
          post={editPost}
          onClose={() => setEditPost(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteId && (
        <DeleteModal
          postId={deleteId}
          onClose={() => setDeleteId(null)}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}