"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email    = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  // Check role and redirect accordingly
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") redirect("/admin/dashboard");
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email     = String(formData.get("email")      ?? "");
  const password  = String(formData.get("password")   ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const fullName  = String(formData.get("full_name")  ?? "");
  const role      = String(formData.get("role")       ?? "voter");
  const strand    = String(formData.get("strand")     ?? "");
  const section   = String(formData.get("section")    ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        student_id: studentId,
        full_name:  fullName,
        role,
        strand,
        section,
      },
    },
  });

  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Account created. You can log in with your email.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
