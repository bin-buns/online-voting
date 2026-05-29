import { createClient } from "@/lib/supabase/server";
import SettingsClient from "@/components/admin/SettingsClient";

type ProfileRow = {
  id: string;
  full_name: string;
  student_id: string;
  section: string | null;
  strand: string | null;
  role: string;
};

type AuditRow = {
  id: string;
  action: string;
  detail: string;
  created_at: string;
  admin_name: string;
  category: string;
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const [{ data: students }, { data: auditLogs }] = await Promise.all([
  supabase
    .from("profiles")
    .select("id, full_name, student_id, section, strand, role")
    .eq("role", "voter")
    .order("full_name", { ascending: true }),
  supabase
    .from("audit_logs")
    .select("id, action, detail, created_at, admin_name, category")
    .order("created_at", { ascending: false })
    .limit(50),
]);

  return (
    <SettingsClient
      initialStudents={(students as unknown as ProfileRow[]) ?? []}
      initialAuditLogs={(auditLogs as unknown as AuditRow[]) ?? []}
    />
  );
}