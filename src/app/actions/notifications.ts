"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { emailNotification } from "@/lib/notify-email";

type PostInput = {
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "urgent";
  audience: "all" | "voter" | "candidate" | "admin";
  sendEmail: boolean;
};

export async function postNotification(input: PostInput) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return { ok: false, error: "Title and message are required." };
  if (title.length > 120) return { ok: false, error: "Title is too long (max 120)." };
  if (body.length > 1000) return { ok: false, error: "Message is too long (max 1000)." };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("notifications")
    .insert({
      title,
      body,
      type: input.type,
      audience: input.audience,
      send_email: input.sendEmail,
      created_by: session.user.id,
    })
    .select("id")
    .single();

  if (error || !row) return { ok: false, error: error?.message ?? "Failed to post." };

  let emailsSent = 0;
  let emailError: string | undefined;

  if (input.sendEmail) {
    const result = await emailNotification({ title, body, type: input.type, audience: input.audience });
    emailsSent = result.sent;
    emailError = result.error;
    await supabase.from("notifications").update({ emails_sent: emailsSent }).eq("id", row.id);
  }

  return { ok: true, emailsSent, emailError };
}