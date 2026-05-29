"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  full_name: string;
  student_id: string;
  section: string | null;
  strand: string | null;
  role: string;
};

const STRANDS = ["ICT", "STEM", "ABM", "HUMSS", "GAS", "TVL"];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function SectionCard({ icon, iconBg, iconColor, title, subtitle, children }: {
  icon: string; iconBg: string; iconColor: string;
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
          <i className={`ti ${icon}`} aria-hidden="true" style={{ color: iconColor }} />
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

function InputField({ label, error, ...props }: {
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "5px" }}>{label}</div>
      <input
        {...props}
        style={{
          width: "100%", borderRadius: "8px", padding: "8px 12px",
          fontSize: "13px", fontFamily: "var(--font-open-sans), sans-serif",
          color: "#1a2e1f", outline: "none", background: "#f8fafc",
          border: `1px solid ${error ? "#be123c" : "#e2e8f0"}`,
          transition: "border-color 0.15s",
        }}
      />
      {error && (
        <div style={{ fontSize: "11px", color: "#be123c", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
          <i className="ti ti-alert-circle" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({
  student,
  onClose,
  onSuccess,
}: {
  student: Student;
  onClose: () => void;
  onSuccess: (name: string) => void;
}) {
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const passwordError = newPassword && newPassword.length < 8
    ? "Password must be at least 8 characters"
    : undefined;
  const confirmError = confirmPassword && newPassword !== confirmPassword
    ? "Passwords do not match"
    : undefined;

  async function handleReset() {
    if (!newPassword)                { setError("Please enter a new password."); return; }
    if (newPassword.length < 8)      { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/admin/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: student.id, new_password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reset password");
      onSuccess(student.full_name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
    setLoading(false);
  }

  const initials = student.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "420px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: "#0d6b34", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "42px", height: "42px", borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#fff",
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>{student.full_name}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>Reset Password</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "18px" }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Info row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { label: "Student ID", value: student.student_id },
              { label: "Section",    value: student.section ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* New password */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "5px" }}>New Password *</div>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={{
                  width: "100%", borderRadius: "8px", padding: "8px 40px 8px 12px",
                  fontSize: "13px", fontFamily: "var(--font-open-sans), sans-serif",
                  color: "#1a2e1f", outline: "none", background: "#f8fafc",
                  border: `1px solid ${passwordError ? "#be123c" : "#e2e8f0"}`,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew((p) => !p)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "16px" }}
              >
                <i className={`ti ${showNew ? "ti-eye-off" : "ti-eye"}`} aria-hidden="true" />
              </button>
            </div>
            {passwordError && (
              <div style={{ fontSize: "11px", color: "#be123c", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <i className="ti ti-alert-circle" aria-hidden="true" />{passwordError}
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "5px" }}>Confirm Password *</div>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                style={{
                  width: "100%", borderRadius: "8px", padding: "8px 40px 8px 12px",
                  fontSize: "13px", fontFamily: "var(--font-open-sans), sans-serif",
                  color: "#1a2e1f", outline: "none", background: "#f8fafc",
                  border: `1px solid ${confirmError ? "#be123c" : "#e2e8f0"}`,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "16px" }}
              >
                <i className={`ti ${showConfirm ? "ti-eye-off" : "ti-eye"}`} aria-hidden="true" />
              </button>
            </div>
            {confirmError && (
              <div style={{ fontSize: "11px", color: "#be123c", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <i className="ti ti-alert-circle" aria-hidden="true" />{confirmError}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={loading || !!passwordError || !!confirmError}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#0d6b34", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "var(--font-open-sans), sans-serif" }}
            >
              <i className="ti ti-key" aria-hidden="true" style={{ marginRight: "6px" }} />
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({
  student,
  onClose,
  onSuccess,
}: {
  student: Student;
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/admin/delete-student", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: student.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete account");
      onSuccess(student.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
    setLoading(false);
  }

  const initials = student.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "400px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden",
      }}>
        <div style={{ background: "#be123c", padding: "20px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#fff" }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>{student.full_name}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>Delete Account</div>
          </div>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fff5f5", border: "1px solid #fecdd3", borderRadius: "10px", padding: "14px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" style={{ fontSize: "20px", color: "#be123c", flexShrink: 0, marginTop: "1px" }} />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#be123c", marginBottom: "4px" }}>This action is permanent</div>
              <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                Deleting <strong>{student.full_name}</strong> (ID: {student.student_id}) will permanently remove their account and all associated data. This cannot be undone.
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "var(--font-open-sans), sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#be123c", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "var(--font-open-sans), sans-serif" }}
            >
              <i className="ti ti-trash" aria-hidden="true" style={{ marginRight: "6px" }} />
              {loading ? "Deleting…" : "Yes, Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AccountsTab({
  initialStudents,
}: {
  initialStudents: Student[];
}) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [csvFile, setCsvFile]   = useState<File | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);

  // Modal states
  const [resetTarget, setResetTarget]   = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const [form, setForm] = useState({
    full_name: "", student_id: "", section: "",
    strand: "ICT", email: "", password: "",
  });

  const [touched, setTouched] = useState({ email: false, password: false });

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const emailError = touched.email && form.email && !isValidEmail(form.email)
    ? "Please enter a valid email (e.g. juan@tsc.edu.ph)"
    : undefined;

  const passwordError = touched.password && form.password && form.password.length < 8
    ? "Password must be at least 8 characters"
    : undefined;

  async function handleCreateStudent() {
    if (!form.full_name.trim())                          { showToast("Full name is required.", "error"); return; }
    if (!form.student_id.trim())                         { showToast("Student ID is required.", "error"); return; }
    if (!form.email.trim() || !isValidEmail(form.email)) { setTouched((p) => ({ ...p, email: true })); showToast("Please enter a valid email address.", "error"); return; }
    if (form.password.length < 8)                        { setTouched((p) => ({ ...p, password: true })); showToast("Password must be at least 8 characters.", "error"); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/admin/create-student", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create account");
      showToast(`Account created for ${form.full_name}!`, "success");
      setForm({ full_name: "", student_id: "", section: "", strand: "ICT", email: "", password: "" });
      setTouched({ email: false, password: false });
      setStudents((prev) => [...prev, {
        id: json.id, full_name: form.full_name, student_id: form.student_id,
        section: form.section || null, strand: form.strand || null, role: "voter",
      }]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error creating account", "error");
    }
    setLoading(false);
  }

  async function handleToggleActive(id: string, name: string, currentRole: string) {
    const isDeactivating = currentRole === "voter";
    const newRole        = isDeactivating ? "inactive" : "voter";
    const msg            = isDeactivating
      ? `Deactivate account for ${name}? They won't be able to log in.`
      : `Reactivate account for ${name}? They will be able to log in again.`;

    if (!confirm(msg)) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    if (error) {
      showToast(`Failed to ${isDeactivating ? "deactivate" : "reactivate"} account`, "error");
    } else {
      showToast(
        isDeactivating ? `${name} has been deactivated` : `${name} has been reactivated`,
        "success"
      );
      setStudents((prev) => prev.map((s) => s.id === id ? { ...s, role: newRole } : s));
    }
    setLoading(false);
  }

  async function handleCsvImport() {
    if (!csvFile) { showToast("Please select a CSV file first.", "error"); return; }
    setLoading(true);
    try {
      const text  = await csvFile.text();
      const lines = text.trim().split("\n").slice(1);
      let created = 0, failed = 0;
      const errors: string[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const [full_name, student_id, section, strand, email, password] = cols;

        if (!full_name || !email || !password) { failed++; errors.push(`Skipped: missing fields — "${line.slice(0, 40)}"`); continue; }
        if (!isValidEmail(email))               { failed++; errors.push(`Skipped ${full_name}: invalid email`); continue; }
        if (password.length < 8)                { failed++; errors.push(`Skipped ${full_name}: password too short`); continue; }

        const res  = await fetch("/api/admin/create-student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name, student_id, section, strand, email, password }) });
        const json = await res.json();
        if (res.ok) { created++; } else { failed++; errors.push(`${full_name}: ${json.error}`); }
      }

      if (errors.length > 0) console.warn("CSV errors:", errors);
      showToast(`Imported ${created} account${created !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} skipped)` : ""}!`, created > 0 ? "success" : "error");
      setCsvFile(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to import CSV", "error");
    }
    setLoading(false);
  }

  function downloadTemplate() {
    const csv = ["full_name,student_id,section,strand,email,password", "Juan Dela Cruz,202310001,11 Lovelace,ICT,juan@tsc.edu.ph,Password123", "Maria Santos,202310002,11 Darwin,STEM,maria@tsc.edu.ph,Password123"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "students_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = students.filter((s) =>
    !search ||
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase()) ||
    (s.section ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const btnStyle = (variant: "primary" | "secondary" | "danger" | "success") => ({
    display: "inline-flex" as const, alignItems: "center" as const, gap: "7px",
    padding: "9px 16px", borderRadius: "9px", fontSize: "13px", fontWeight: 700,
    fontFamily: "var(--font-open-sans), sans-serif", cursor: "pointer", border: "none",
    transition: "all 0.15s",
    ...(variant === "primary"   ? { background: "#0d6b34", color: "#fff" } :
        variant === "success"   ? { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" } :
        variant === "danger"    ? { background: "#ffe4e6", color: "#be123c", border: "1px solid #fecdd3" } :
                                  { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
          background: toast.type === "success" ? "#0d6b34" : "#be123c",
          color: "#fff", borderRadius: "10px", padding: "12px 20px",
          fontSize: "13px", fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <i className={`ti ${toast.type === "success" ? "ti-check" : "ti-x"}`} aria-hidden="true" />
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {resetTarget && (
        <ResetPasswordModal
          student={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={(name) => { showToast(`Password reset for ${name}!`, "success"); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          student={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={(id) => {
            setStudents((prev) => prev.filter((s) => s.id !== id));
            showToast("Student account deleted.", "success");
          }}
        />
      )}

      {/* CSV Import */}
      <SectionCard icon="ti-upload" iconBg="#e0f2fe" iconColor="#0369a1" title="Import Students via CSV" subtitle="Bulk create student accounts from a spreadsheet">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{ border: `2px dashed ${csvFile ? "#0d6b34" : "#e2e8f0"}`, borderRadius: "10px", padding: "24px", textAlign: "center", background: csvFile ? "#f0fdf4" : "#f8fafc", cursor: "pointer", transition: "all 0.15s" }}
            onClick={() => fileRef.current?.click()}
          >
            <i className={`ti ${csvFile ? "ti-file-check" : "ti-file-spreadsheet"}`} aria-hidden="true" style={{ fontSize: "28px", color: csvFile ? "#0d6b34" : "#94a3b8", display: "block", marginBottom: "8px" }} />
            <div style={{ fontSize: "13px", fontWeight: 600, color: csvFile ? "#0d6b34" : "#475569" }}>
              {csvFile ? csvFile.name : "Drop CSV file here or click to browse"}
            </div>
            {csvFile && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Click to change file</div>}
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            Required columns: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>full_name, student_id, section, strand, email, password</code>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={btnStyle("secondary")} onClick={downloadTemplate}>
              <i className="ti ti-download" aria-hidden="true" />Download Template
            </button>
            <button style={btnStyle("primary")} onClick={handleCsvImport} disabled={loading || !csvFile}>
              <i className="ti ti-upload" aria-hidden="true" />{loading ? "Importing…" : "Import Accounts"}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Add Single Student */}
      <SectionCard icon="ti-user-plus" iconBg="#dcfce7" iconColor="#15803d" title="Add Single Student" subtitle="Manually create one student account">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <InputField label="Full Name *"          value={form.full_name}   onChange={(e) => setForm({ ...form, full_name:   e.target.value })} placeholder="e.g. Juan Dela Cruz" />
          <InputField label="Student ID *"         value={form.student_id}  onChange={(e) => setForm({ ...form, student_id:  e.target.value })} placeholder="e.g. 202310001" />
          <InputField label="Section"              value={form.section}     onChange={(e) => setForm({ ...form, section:     e.target.value })} placeholder="e.g. 11 Lovelace" />
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "5px" }}>Strand</div>
            <select value={form.strand} onChange={(e) => setForm({ ...form, strand: e.target.value })} style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font-open-sans), sans-serif", color: "#1a2e1f", outline: "none", background: "#f8fafc" }}>
              {STRANDS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <InputField label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onBlur={() => setTouched((p) => ({ ...p, email: true }))} placeholder="e.g. juan@tsc.edu.ph" error={emailError} />
          <InputField label="Temporary Password *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onBlur={() => setTouched((p) => ({ ...p, password: true }))} placeholder="Min. 8 characters" error={passwordError} />
        </div>
        <button style={{ ...btnStyle("primary"), marginTop: "16px" }} onClick={handleCreateStudent} disabled={loading}>
          <i className="ti ti-user-plus" aria-hidden="true" />{loading ? "Creating…" : "Create Account"}
        </button>
      </SectionCard>

      {/* Manage Students */}
      <SectionCard icon="ti-users" iconBg="#fef3c7" iconColor="#b45309" title="Manage Student Accounts" subtitle="Search, reset passwords, reactivate, or delete accounts">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <i className="ti ti-search" aria-hidden="true" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "15px" }} />
            <input
              type="text"
              placeholder="Search by name, ID, or section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: "32px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", color: "#1a2e1f", outline: "none", background: "#f8fafc", fontFamily: "var(--font-open-sans), sans-serif" }}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Name", "Student ID", "Section", "Strand", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>No students found.</td></tr>
                ) : filtered.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1a2e1f" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: s.role === "voter" ? "#0d6b34" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                          {s.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </div>
                        {s.full_name}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b", fontFamily: "monospace" }}>{s.student_id}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{s.section ?? "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{s.strand ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: s.role === "voter" ? "#dcfce7" : "#f1f5f9", color: s.role === "voter" ? "#15803d" : "#64748b", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>
                        {s.role === "voter" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {/* Reset Password */}
                        <button
                          style={{ ...btnStyle("secondary"), padding: "5px 10px", fontSize: "11px" }}
                          onClick={() => setResetTarget(s)}
                          title="Reset password"
                        >
                          <i className="ti ti-key" aria-hidden="true" />Reset
                        </button>

                        {/* Deactivate / Reactivate */}
                        {s.role === "voter" ? (
                          <button
                            style={{ ...btnStyle("danger"), padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => handleToggleActive(s.id, s.full_name, s.role)}
                            disabled={loading}
                            title="Deactivate account"
                          >
                            <i className="ti ti-user-off" aria-hidden="true" />Deactivate
                          </button>
                        ) : (
                          <button
                            style={{ ...btnStyle("success"), padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => handleToggleActive(s.id, s.full_name, s.role)}
                            disabled={loading}
                            title="Reactivate account"
                          >
                            <i className="ti ti-user-check" aria-hidden="true" />Reactivate
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          style={{ ...btnStyle("danger"), padding: "5px 10px", fontSize: "11px", background: "#be123c", color: "#fff", border: "none" }}
                          onClick={() => setDeleteTarget(s)}
                          title="Delete account permanently"
                        >
                          <i className="ti ti-trash" aria-hidden="true" />Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            Showing {filtered.length} of {students.length} student{students.length !== 1 ? "s" : ""}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}