import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";
import type { AdminProfile, AdminSession } from "./types";

export async function getCurrentAdmin(
  supabase: SupabaseClient<Database>,
): Promise<AdminSession | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, school_id, full_name, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as AdminProfile | null;

  if (profileError || !profile || profile.role !== "admin") {
    return null;
  }

  return {
    user,
    profile,
  };
}
