import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminConfig } from "../../config/supabase-admin";
import type { Database } from "../../types/database";

export function createSupabaseAdminClient() {
  const { secretKey, url } = getSupabaseAdminConfig();

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
