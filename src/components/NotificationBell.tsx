"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Notif = { id: string; title: string; body: string; type: string; audience: string; created_at: string };

const TYPE_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  info:    { bg: "#e0f2fe", color: "#0369a1", icon: "ti-info-circle" },
  success: { bg: "#dcfce7", color: "#15803d", icon: "ti-circle-check" },
  warning: { bg: "#fef3c7", color: "#b45309", icon: "ti-alert-triangle" },
  urgent:  { bg: "#ffe4e6", color: "#be123c", icon: "ti-urgent" },
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MessageWithEmailLinks({ body, onEmailClick }: { body: string; onEmailClick: (email: string) => void }) {
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const nodes: React.ReactNode[] = [];
  let previousIndex = 0;
  for (const match of body.matchAll(emailPattern)) {
    const email = match[0];
    const start = match.index ?? 0;
    nodes.push(body.slice(previousIndex, start));
    nodes.push(<a key={`${start}-${email}`} href={`mailto:${email}`} onClick={(event) => { event.stopPropagation(); onEmailClick(email); }} style={{ color: "#0369a1", textDecoration: "underline", overflowWrap: "anywhere" }}>{email}</a>);
    previousIndex = start + email.length;
  }
  nodes.push(body.slice(previousIndex));
  return <>{nodes}</>;
}

export default function NotificationBell({ userId, role }: { userId: string; role: "admin" | "voter" | "candidate" }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: notifs }, { data: reads }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, type, audience, created_at")
        .in("audience", ["all", role])
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("notification_reads").select("notification_id").eq("user_id", userId),
    ]);
    setItems((notifs ?? []) as Notif[]);
    setReadIds(new Set((reads ?? []).map((r) => r.notification_id as string)));
  }, [userId, role]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unread = items.filter((n) => !readIds.has(n.id));

  async function markRead(id: string) {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set(prev).add(id));
    const supabase = createClient();
    await supabase.from("notification_reads").upsert(
      { user_id: userId, notification_id: id },
      { onConflict: "user_id,notification_id", ignoreDuplicates: true }
    );
  }

  async function markAllRead() {
    if (!unread.length) return;
    setReadIds(new Set(items.map((n) => n.id)));
    const supabase = createClient();
    await supabase.from("notification_reads").upsert(
      unread.map((n) => ({ user_id: userId, notification_id: n.id })),
      { onConflict: "user_id,notification_id", ignoreDuplicates: true }
    );
  }

  return (
    <div ref={rootRef} style={{ position: "fixed", top: "14px", right: "24px", zIndex: 40 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
        style={{
          position: "relative", width: "42px", height: "42px", borderRadius: "50%",
          background: "#fff", border: "1px solid #e2e8f0", cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <i className="ti ti-bell" aria-hidden="true" style={{ fontSize: "20px", color: "#0d6b34" }} />
        {unread.length > 0 && (
          <span style={{
            position: "absolute", top: "-4px", right: "-4px", minWidth: "18px", height: "18px",
            borderRadius: "999px", background: "#be123c", color: "#fff",
            fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "0 4px",
          }}>
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-popover" style={{
          position: "absolute", top: "50px", right: 0, width: "min(420px, calc(100vw - 32px))", maxHeight: "min(70vh, 520px)",
          display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff", borderRadius: "14px",
          border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a2e1f" }}>Notifications</div>
            <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0d6b34" }}>
              Mark all read
            </button>
          </div>

          <div className="notification-popover__list" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
          {items.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
              No notifications yet
            </div>
          )}

          {items.map((n) => {
            const s = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
            const isRead = readIds.has(n.id);
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  display: "flex", gap: "10px", padding: "12px 16px", cursor: "pointer",
                  borderBottom: "1px solid #f8fafc", background: isRead ? "#fff" : "#f0fdf4",
                }}
              >
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`ti ${s.icon}`} aria-hidden="true" style={{ color: s.color, fontSize: "16px" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: isRead ? 600 : 700, color: "#1a2e1f" }}>{n.title}</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><MessageWithEmailLinks body={n.body} onEmailClick={() => { void markRead(n.id); setOpen(false); }} /></div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{timeAgo(n.created_at)}</div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
