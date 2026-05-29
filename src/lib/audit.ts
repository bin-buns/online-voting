import { createClient } from "@/lib/supabase/server";

type AuditCategory =
  | "candidate"
  | "account"
  | "election"
  | "system"
  | "votes"
  | "general";

export async function logAudit({
  action,
  detail,
  category = "general",
}: {
  action: string;
  detail?: string;
  category?: AuditCategory;
}) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase.from("audit_logs").insert({
      admin_id:   user.id,
      admin_name: profile?.full_name ?? "Unknown Admin",
      action,
      detail,
      category,
    });
  } catch {
    // Audit logging should never crash the main action
  }
}