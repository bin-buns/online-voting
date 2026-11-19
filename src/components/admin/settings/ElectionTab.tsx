"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { snapshotAndResetElection } from "@/lib/election-client";
import { endElectionNow, resetAllVotes } from "@/app/actions/admin";


type ConfirmModal = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  stage?: 1 | 2;
} | null;

function DangerRow({ title, subtitle, buttonLabel, icon, onClick }: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px", borderRadius: "10px",
      background: "#fff5f5", border: "1px solid #fecdd3", gap: "16px",
      marginBottom: "10px",
    }}>
      <div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#be123c" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{subtitle}</div>
      </div>
      <button
        onClick={onClick}
        style={{
          display: "inline-flex", alignItems: "center", gap: "7px",
          padding: "9px 16px", borderRadius: "9px", cursor: "pointer",
          background: "#ffe4e6", color: "#be123c",
          border: "1px solid #fecdd3", fontSize: "13px", fontWeight: 700,
          fontFamily: "var(--font-open-sans), sans-serif", whiteSpace: "nowrap",
          transition: "all 0.15s",
        }}
      >
        <i className={`ti ${icon}`} aria-hidden="true" />
        {buttonLabel}
      </button>
    </div>
  );
}

function SectionCard({ icon, iconBg, iconColor, title, subtitle, children }: {
  icon: string; iconBg: string; iconColor: string;
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: "18px", color: iconColor }} />
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "15px", fontWeight: 700, color: "#1a2e1f", letterSpacing: "0.03em", textTransform: "uppercase" }}>{title}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

export default function ElectionTab() {
  const router = useRouter();
  const [modal, setModal]   = useState<ConfirmModal>(null);
  const [loading, setLoading] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const [toast, setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [votingOpen, setVotingOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("election_settings").select("voting_starts_at, voting_ends_at, is_active").eq("id", 1).maybeSingle().then(({ data }) => {
      if (!data) return;
      const now = Date.now();
      setVotingOpen(data.is_active && now >= new Date(data.voting_starts_at).getTime() && now < new Date(data.voting_ends_at).getTime());
    });
  }, []);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function confirm(config: ConfirmModal) {
    setConfirmWord("");
    setModal(config ? { ...config, stage: 1 } : null);
  }

  async function runAction(action: () => Promise<void>) {
    setLoading(true);
    setModal(null);
    try {
      await action();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    }
    setLoading(false);
  }

  async function resetVotes() {
    const result = await resetAllVotes();
    showToast(`All votes have been reset successfully (${result.deletedCount} deleted).`, "success");
    router.refresh();
  }

  async function fullReset() {
    const supabase = createClient();
    const { error: votesError } = await supabase.from("votes").delete().not("id", "is", null);
    if (votesError) throw new Error(votesError.message);
    const { error: candidatesError } = await supabase.from("candidates").delete().not("id", "is", null);
    if (candidatesError) throw new Error(candidatesError.message);
    await fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "Full election reset", detail: "All votes and candidate applications were deleted; ballot positions were preserved", category: "votes" }),
    });
    showToast("Election reset completed. Ballot positions were preserved.", "success");
  }

  async function exportCSV() {
    const supabase = createClient();
    const { data: positions } = await supabase
      .from("positions")
      .select(`name, candidates ( profiles(full_name), votes(id), status )`)
      .order("sort_order", { ascending: true });

    if (!positions) { showToast("No data to export", "error"); return; }

    const rows = ["Position,Candidate,Votes,Status"];
    type PosResult = { name: string; candidates: { profiles: { full_name: string } | null; votes: { id: string }[]; status: string }[] };
    (positions as unknown as PosResult[]).forEach((pos) => {
      (pos.candidates ?? []).forEach((c) => {
        rows.push(`${pos.name},${c.profiles?.full_name ?? "Unknown"},${c.votes?.length ?? 0},${c.status}`);
      });
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `election_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Results exported successfully!", "success");
  }

  async function exportVotersList() {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name, student_id, section, strand")
      .eq("role", "voter")
      .order("full_name");

    if (!data) { showToast("No voters to export", "error"); return; }

    const rows = ["Full Name,Student ID,Section,Strand",
      ...data.map((v) => `${v.full_name},${v.student_id},${v.section ?? ""},${v.strand ?? ""}`)
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `voters_list_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Voters list exported!", "success");
  }

  async function archiveElection() {
  const supabase = createClient();

  const { data: settings, error: settingsError } = await supabase
    .from("election_settings")
    .select("*")
    .eq("is_active", true)
    .single();

  if (settingsError || !settings) {
    throw new Error("No active election found to archive.");
  }

  await snapshotAndResetElection(supabase, settings, { autoArchived: false });
}

  const btnStyle = (variant: "primary" | "secondary") => ({
    display: "inline-flex" as const, alignItems: "center" as const, gap: "7px",
    padding: "9px 16px", borderRadius: "9px", fontSize: "13px", fontWeight: 700,
    fontFamily: "var(--font-open-sans), sans-serif", cursor: "pointer",
    transition: "all 0.15s", border: "none" as const,
    ...(variant === "primary"
      ? { background: "#0d6b34", color: "#fff" }
      : { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
          background: toast.type === "success" ? "#0d6b34" : "#be123c",
          color: "#fff", borderRadius: "10px", padding: "12px 20px",
          fontSize: "13px", fontWeight: 700,
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <i className={`ti ${toast.type === "success" ? "ti-check" : "ti-x"}`} aria-hidden="true" />
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "420px", overflow: "hidden" }}>
            <div style={{ background: "#be123c", padding: "20px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-alert-triangle" aria-hidden="true" style={{ fontSize: "20px", color: "#fff" }} />
              </div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#fff" }}>{modal.title}</div>
            </div>
            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: "14px", color: "#475569", marginBottom: "20px", lineHeight: 1.6 }}>{modal.message}</p>
              {modal.stage === 2 && <div style={{ marginBottom: 16 }}><label htmlFor="danger-confirm-word" style={{ display:"block",fontSize:12,fontWeight:700,marginBottom:6 }}>Type CONFIRM to enable this irreversible action</label><input id="danger-confirm-word" value={confirmWord} onChange={e=>setConfirmWord(e.target.value)} autoComplete="off" style={{width:"100%",padding:10,border:"1px solid #cbd5e1",borderRadius:8}} /></div>}
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setModal(null)} style={{ ...btnStyle("secondary"), flex: 1 }}>
                  Cancel
                </button>
                <button
                  onClick={() => modal.stage === 1 ? setModal({ ...modal, stage: 2 }) : runAction(modal.onConfirm)}
                  disabled={loading || (modal.stage === 2 && confirmWord.trim() !== "CONFIRM")}
                  style={{ flex: 1, padding: "9px 16px", borderRadius: "9px", border: "none", background: "#be123c", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif", opacity: loading ? 0.6 : 1 }}
                >
                  <i className="ti ti-alert-triangle" aria-hidden="true" style={{ marginRight: "6px" }} />
                  {loading ? "Processing…" : modal.stage === 1 ? "Review and Continue" : modal.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      <SectionCard icon="ti-download" iconBg="#dcfce7" iconColor="#15803d" title="Export Data" subtitle="Download election data for records and archiving">
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button style={btnStyle("secondary")} onClick={exportCSV}>
            <i className="ti ti-file-spreadsheet" aria-hidden="true" />Export Results CSV
          </button>
          <button style={btnStyle("secondary")} onClick={exportVotersList}>
            <i className="ti ti-users" aria-hidden="true" />Export Voters List
          </button>
          <button
            style={btnStyle("secondary")}
            onClick={() => confirm({
              title: "Archive This Election?",
              message: "This will snapshot the current results into the archive, then clear all votes, candidates, and positions so you can set up the next election. This cannot be undone.",
              confirmLabel: "Yes, Archive Election",
              onConfirm: async () => {
                await archiveElection();
                router.push("/admin/settings/archive");
              },
            })}
          >
            <i className="ti ti-archive" aria-hidden="true" />Archive Election
          </button>
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard icon="ti-alert-triangle" iconBg="#ffe4e6" iconColor="#be123c" title="Danger Zone" subtitle="Irreversible actions — each requires confirmation before executing">
        {votingOpen && <DangerRow
          title="End Voting Now"
          subtitle="Close the ballot immediately. Results still follow the scheduled release time."
          buttonLabel="End Voting"
          icon="ti-player-stop"
          onClick={() => confirm({
            title: "End Voting Now?",
            message: "Voters will no longer be able to submit ballots. The scheduled results release time stays in place.",
            confirmLabel: "Yes, End Voting Now",
            onConfirm: async () => { await endElectionNow(); setVotingOpen(false); router.refresh(); },
          })}
        />}
        <DangerRow
          title="Reset All Votes"
          subtitle="Permanently deletes all cast votes. Cannot be undone."
          buttonLabel="Reset Votes"
          icon="ti-trash"
          onClick={() => confirm({
            title: "Reset All Votes?",
            message: "This will permanently delete ALL cast votes from the database. This action cannot be undone. Are you absolutely sure?",
            confirmLabel: "Yes, Reset All Votes",
            onConfirm: resetVotes,
          })}
        />
        <DangerRow
          title="Full Election Reset"
          subtitle="Removes all votes and candidate applications while keeping ballot positions."
          buttonLabel="Full Reset"
          icon="ti-alert-triangle"
          onClick={() => confirm({
            title: "Full Election Reset?",
            message: "This permanently deletes ALL votes and candidate applications. Your ballot positions will remain available for the next election. This CANNOT be undone.",
            confirmLabel: "Yes, Reset Everything",
            onConfirm: fullReset,
          })}
        />
      </SectionCard>
    </div>
  );
}
