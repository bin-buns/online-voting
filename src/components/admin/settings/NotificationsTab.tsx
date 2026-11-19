"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { postNotification } from "@/app/actions/notifications";

type Row = {
  id: string; title: string; body: string; type: string;
  audience: string; send_email: boolean; emails_sent: number; created_at: string;
};

export default function NotificationsTab() {
  const [form, setForm] = useState({
    title: "", body: "",
    type: "info" as "info" | "success" | "warning" | "urgent",
    audience: "all" as "all" | "voter" | "candidate" | "admin",
    sendEmail: false,
  });
  const [history, setHistory] = useState<Row[]>([]);
  const [sending, setSending] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const loadHistory = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, type, audience, send_email, emails_sent, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data ?? []) as Row[]);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handlePost() {
    setSending(true);
    const res = await postNotification(form);
    setSending(false);

    if (!res.ok) { showToast(res.error ?? "Failed to post.", "error"); return; }

    await fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "Notification posted",
        detail: `"${form.title}" → ${form.audience}${form.sendEmail ? ` (${res.emailsSent} emails)` : ""}`,
        category: "election",
      }),
    });

    setForm({ ...form, title: "", body: "" });
    loadHistory();
    showToast(
      res.emailError
        ? `Posted in-app. Email stopped after ${res.emailsSent}: ${res.emailError}`
        : form.sendEmail ? `Posted and emailed to ${res.emailsSent} people.` : "Notification posted.",
      res.emailError ? "error" : "success"
    );
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const target = history.find((row) => row.id === id);
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) { showToast(`Could not delete notification: ${error.message}`, "error"); return; }
    await fetch("/api/admin/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "Notification deleted", detail: target ? `Deleted “${target.title}” sent to ${target.audience}` : `Deleted notification ${id}`, category: "system" }) });
    loadHistory();
  }

  const field = {
    width: "100%", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px",
    fontSize: "13px", background: "#f8fafc", boxSizing: "border-box" as const,
    fontFamily: "var(--font-open-sans), sans-serif", color: "#1a2e1f",
  };
  const label = {
    fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block",
    marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.05em",
  };
  const card = { background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "20px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {showReview && <div role="dialog" aria-modal="true" aria-labelledby="notification-review-title" style={{position:"fixed",inset:0,zIndex:200,background:"rgba(15,23,42,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:480,width:"100%"}}><h2 id="notification-review-title" style={{marginTop:0}}>Review notification</h2><strong>{form.title}</strong><p style={{whiteSpace:"pre-wrap",color:"#475569"}}>{form.body}</p><p style={{fontSize:13,color:"#64748b"}}>Type: {form.type} · Audience: {form.audience}{form.sendEmail ? " · Email delivery enabled" : " · In-app only"}</p><div style={{display:"flex",gap:10,marginTop:20}}><button onClick={()=>setShowReview(false)} disabled={sending} style={{flex:1,padding:10}}>Back to edit</button><button onClick={async()=>{setShowReview(false);await handlePost()}} disabled={sending} style={{flex:1,padding:10,background:"#0d6b34",color:"white",border:0,borderRadius:8}}>{sending?"Publishing…":"Confirm and publish"}</button></div></div></div>}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
          background: toast.type === "success" ? "#0d6b34" : "#be123c", color: "#fff",
          borderRadius: "10px", padding: "12px 20px", fontSize: "13px", fontWeight: 700,
        }}>{toast.msg}</div>
      )}

      <div style={card}>
        <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "16px" }}>
          Post Notification
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={label}>Title *</label>
            <input style={field} value={form.title} maxLength={120}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Voting opens tomorrow at 8:00 AM" />
          </div>
          <div>
            <label style={label}>Message *</label>
            <textarea style={{ ...field, minHeight: "90px", resize: "vertical" }} value={form.body} maxLength={1000}
              onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={label}>Type</label>
              <select style={field} value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label style={label}>Send to</label>
              <select style={field} value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as typeof form.audience })}>
                <option value="all">Everyone</option>
                <option value="voter">Voters only</option>
                <option value="candidate">Candidates only</option>
                <option value="admin">Admins only</option>
              </select>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#1a2e1f" }}>
            <input type="checkbox" checked={form.sendEmail}
              onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })} />
            Also send by email
            <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "11px" }}>
              (Accounts created later also receive email-enabled announcements after setup.)
            </span>
          </label>

          <div>
            <button onClick={()=>{if(!form.title.trim()||!form.body.trim()){showToast("Enter a title and message before reviewing.","error");return;}setShowReview(true)}} disabled={sending}
              style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "10px", border: "none", background: "#0d6b34", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
              <i className="ti ti-send" aria-hidden="true" />
              {sending ? "Sending…" : "Post Notification"}
            </button>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "12px" }}>
          Recent Notifications
        </div>
        {history.length === 0 && <div style={{ fontSize: "13px", color: "#94a3b8" }}>Nothing posted yet.</div>}
        {history.map((n) => (
          <div key={n.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a2e1f" }}>{n.title}</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{n.body}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                {n.type} · to {n.audience} · {new Date(n.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}
                {n.send_email ? ` · ${n.emails_sent} emailed` : ""}
              </div>
            </div>
            <button onClick={() => handleDelete(n.id)} aria-label="Delete notification"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#be123c", fontSize: "18px" }}>
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
