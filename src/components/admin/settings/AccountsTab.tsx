"use client";
import { useState, useRef } from "react";

type Student = {
  id: string;
  full_name: string;
  student_id: string;
  section: string | null;
  strand: string | null;
  role: string;
  is_active?: boolean;
};

const STRANDS = ["ICT", "STEM", "ABM", "HUMSS"];

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
  onSuccess: (name: string, emailSent: boolean, emailError?: string) => void;
}) {
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; error?: string } | null>(null);

  async function handleReset() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/admin/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: student.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reset password");
      setGeneratedPassword(json.temporary_password);
      setEmailStatus({ sent: json.email_sent, error: json.email_error });
      onSuccess(student.full_name, json.email_sent, json.email_error);
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

          {generatedPassword ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#14532d", borderRadius: 9, padding: 12 }}>
              <strong>Generated temporary password</strong>
              <p style={{ fontSize: 12 }}>Shown only once. Resetting starts a fresh 15-day period from the student’s next successful login.</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: emailStatus?.sent ? "#15803d" : "#be123c" }}>{emailStatus?.sent ? "Temporary password emailed to the student." : `Password email failed: ${emailStatus?.error ?? "unknown email error"}. Share the shown password securely.`}</p>
              <code style={{ userSelect: "all", fontSize: 16 }}>{generatedPassword}</code>
              <button type="button" onClick={() => { void navigator.clipboard.writeText(generatedPassword); }} style={{ marginLeft: 10, border: 0, borderRadius: 7, padding: "7px 10px", background: "#0d6b34", color: "#fff", cursor: "pointer" }}>Copy</button>
            </div>
          ) : <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>A new secure temporary password will be generated. The student must change it within 15 days of their next successful login.</p>}
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
              onClick={generatedPassword ? onClose : handleReset}
              disabled={loading}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#0d6b34", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "var(--font-open-sans), sans-serif" }}
            >
              <i className="ti ti-key" aria-hidden="true" style={{ marginRight: "6px" }} />
              {generatedPassword ? "Close" : loading ? "Generating…" : "Generate New Password"}
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

  const [form, setForm] = useState({ first_name: "", middle_name: "", last_name: "", suffix: "N/A", student_id: "", section: "", strand: "ICT", email: "" });
  const [generatedCredentials, setGeneratedCredentials] = useState<{ name: string; email: string; password: string; email_sent: boolean; email_error?: string }[]>([]);

  const [touched, setTouched] = useState({ email: false });

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const emailError = touched.email && form.email && !isValidEmail(form.email)
    ? "Please enter a valid email (e.g. juan@tsc.edu.ph)"
    : undefined;

  async function handleCreateStudent() {
    if (!form.first_name.trim() || !form.last_name.trim()) { showToast("First name and last name are required.", "error"); return; }
    if (!form.student_id.trim())                         { showToast("Student ID is required.", "error"); return; }
    if (!form.email.trim() || !isValidEmail(form.email)) { setTouched((p) => ({ ...p, email: true })); showToast("Please enter a valid email address.", "error"); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/admin/create-student", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create account");
      const fullName = [form.first_name.trim(), form.middle_name.trim(), form.last_name.trim(), form.suffix === "N/A" ? "" : form.suffix].filter(Boolean).join(" ");
      showToast(json.email_sent ? `Account created and temporary password emailed to ${form.email}.` : `Account created, but email failed: ${json.email_error ?? "unknown email error"}.`, json.email_sent ? "success" : "error");
      setGeneratedCredentials([{ name: fullName, email: form.email, password: json.temporary_password, email_sent: json.email_sent, email_error: json.email_error }]);
      setForm({ first_name: "", middle_name: "", last_name: "", suffix: "N/A", student_id: "", section: "", strand: "ICT", email: "" });
      setTouched({ email: false });
      setStudents((prev) => [...prev, {
        id: json.id, full_name: fullName, student_id: form.student_id,
        section: form.section || null, strand: form.strand || null, role: "voter",
      }]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error creating account", "error");
    }
    setLoading(false);
  }

  async function handleToggleActive(id: string, name: string, currentlyActive: boolean) {
    const isDeactivating = currentlyActive;
    const msg            = isDeactivating
      ? `Deactivate account for ${name}? They won't be able to log in.`
      : `Reactivate account for ${name}? They will be able to log in again.`;

    if (!confirm(msg)) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/student-active", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_id: id, is_active: !currentlyActive }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Account update failed");
      showToast(isDeactivating ? `${name} has been deactivated` : `${name} has been reactivated`, "success");
      setStudents((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !currentlyActive } : s));
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to ${isDeactivating ? "deactivate" : "reactivate"} account`, "error");
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
      const credentials: { name: string; email: string; password: string; email_sent: boolean; email_error?: string }[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const [first_name, middle_name, last_name, suffix, student_id, section, strand, email] = cols;

        if (!first_name || !last_name || !student_id || !email) { failed++; errors.push(`Skipped: missing required fields — "${line.slice(0, 40)}"`); continue; }
        if (!isValidEmail(email)) { failed++; errors.push(`Skipped ${first_name} ${last_name}: invalid email`); continue; }

        const res  = await fetch("/api/admin/create-student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_name, middle_name, last_name, suffix, student_id, section, strand, email }) });
        const json = await res.json();
        if (res.ok) { created++; credentials.push({ name: json.full_name, email, password: json.temporary_password, email_sent: json.email_sent, email_error: json.email_error }); } else { failed++; errors.push(`${first_name} ${last_name}: ${json.error}`); }
      }

      if (errors.length > 0) console.warn("CSV errors:", errors);
      showToast(`Imported ${created} account${created !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} skipped)` : ""}!`, created > 0 ? "success" : "error");
      if (credentials.length) setGeneratedCredentials(credentials);
      setCsvFile(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to import CSV", "error");
    }
    setLoading(false);
  }

  function downloadTemplate() {
    const csv = ["first_name,middle_name,last_name,suffix,student_id,section,strand,email", "Juan,,Dela Cruz,N/A,202310001,11 Lovelace,ICT,juan@tsc.edu.ph", "Maria,Isabel,Santos,Jr.,202310002,11 Darwin,STEM,maria@tsc.edu.ph"].join("\n");
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

      {generatedCredentials.length > 0 && (
        <div role="status" style={{ border: "1px solid #86efac", background: "#f0fdf4", borderRadius: 12, padding: 18, color: "#14532d" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Temporary password delivery</div>
          <div style={{ fontSize: 13, marginBottom: 10 }}>The app emails each password. Passwords are shown here as a backup. The 15-day change period starts at the student’s first successful login.</div>
          <div style={{ display: "grid", gap: 8 }}>{generatedCredentials.map((credential) => <div key={credential.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", background: "#fff", border: "1px solid #bbf7d0", borderRadius: 8, padding: 10 }}><div><strong>{credential.name}</strong><div style={{ fontSize: 12 }}>{credential.email}</div><div style={{ fontSize: 12, fontWeight: 700, color: credential.email_sent ? "#15803d" : "#be123c", margin: "3px 0" }}>{credential.email_sent ? "Temporary password email sent" : `Email failed: ${credential.email_error ?? "unknown email error"}`}</div><code style={{ fontSize: 14, userSelect: "all" }}>{credential.password}</code></div><button type="button" onClick={() => { void navigator.clipboard.writeText(credential.password); showToast("Temporary password copied.", "success"); }} style={{ border: 0, borderRadius: 7, padding: "8px 12px", background: "#0d6b34", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Copy</button></div>)}</div>
          <button type="button" onClick={() => setGeneratedCredentials([])} style={{ marginTop: 10, border: "1px solid #bbf7d0", borderRadius: 7, padding: "8px 12px", background: "#fff", color: "#14532d", cursor: "pointer" }}>Dismiss</button>
        </div>
      )}

      {/* Modals */}
      {resetTarget && (
        <ResetPasswordModal
          student={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={(name, emailSent, emailError) => { showToast(emailSent ? `Password reset and emailed to ${name}.` : `Password reset for ${name}, but email failed: ${emailError ?? "unknown email error"}.`, emailSent ? "success" : "error"); setStudents((prev) => prev.map((s) => s.id === resetTarget.id ? { ...s, is_active: true } : s)); }}
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
            Required columns: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>first_name, middle_name, last_name, suffix, student_id, section, strand, email</code>. A temporary password is generated for each student.
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
          <InputField label="First Name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="e.g. Juan" />
          <InputField label="Middle Name (optional)" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} placeholder="e.g. Santos" />
          <InputField label="Last Name *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="e.g. Dela Cruz" />
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "5px" }}>Suffix</div>
            <select value={form.suffix} onChange={(e) => setForm({ ...form, suffix: e.target.value })} style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font-open-sans), sans-serif", color: "#1a2e1f", outline: "none", background: "#f8fafc" }}>
              {["N/A", "Jr.", "Sr.", "II", "III", "IV"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <InputField label="Student ID *"         value={form.student_id}  onChange={(e) => setForm({ ...form, student_id:  e.target.value })} placeholder="e.g. 202310001" />
          <InputField label="Section"              value={form.section}     onChange={(e) => setForm({ ...form, section:     e.target.value })} placeholder="e.g. 11 Lovelace" />
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "5px" }}>Strand</div>
            <select value={form.strand} onChange={(e) => setForm({ ...form, strand: e.target.value })} style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font-open-sans), sans-serif", color: "#1a2e1f", outline: "none", background: "#f8fafc" }}>
              {STRANDS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <InputField label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onBlur={() => setTouched((p) => ({ ...p, email: true }))} placeholder="e.g. juan@tsc.edu.ph" error={emailError} />
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#64748b", background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>A secure temporary password will be generated automatically and shown once after account creation.</div>
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
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: s.is_active !== false ? "#0d6b34" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                          {s.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </div>
                        {s.full_name}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b", fontFamily: "monospace" }}>{s.student_id}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{s.section ?? "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{s.strand ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: s.is_active !== false ? "#dcfce7" : "#f1f5f9", color: s.is_active !== false ? "#15803d" : "#64748b", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>
                        {s.is_active !== false ? "Active" : "Inactive"}
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
                        {s.is_active !== false ? (
                          <button
                            style={{ ...btnStyle("danger"), padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => handleToggleActive(s.id, s.full_name, s.is_active !== false)}
                            disabled={loading}
                            title="Deactivate account"
                          >
                            <i className="ti ti-user-off" aria-hidden="true" />Deactivate
                          </button>
                        ) : (
                          <button
                            style={{ ...btnStyle("success"), padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => handleToggleActive(s.id, s.full_name, s.is_active !== false)}
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
