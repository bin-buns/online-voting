"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkAndAutoArchive } from "@/lib/election-client";


export default function AutoArchiveChecker() {
  useEffect(() => {
    const supabase = createClient();
    checkAndAutoArchive(supabase).catch((err) => {
      console.error("Auto-archive check failed:", err);
    });
  }, []);

  return null;
}