import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";
import { getCurrentAdmin } from "../auth/queries";
import type { AdminSession } from "../auth/types";

export type AdminSchool = Database["public"]["Tables"]["schools"]["Row"];
export type AdminElection = Database["public"]["Tables"]["elections"]["Row"];

export type AdminDashboardData = {
  admin: AdminSession;
  school: AdminSchool | null;
  election: AdminElection | null;
};

export async function getAdminDashboardData(
  supabase: SupabaseClient<Database>,
): Promise<AdminDashboardData | null> {
  const admin = await getCurrentAdmin(supabase);

  if (!admin) {
    return null;
  }

  const { data: schoolData } = await supabase
    .from("schools")
    .select("id, name, slug, npsn, logo_url, address, timezone, created_at, updated_at")
    .eq("id", admin.profile.school_id)
    .maybeSingle();
  const school = schoolData as AdminSchool | null;

  const { data: electionData } = await supabase
    .from("elections")
    .select(
      "id, school_id, title, description, term_label, starts_at, ends_at, status, results_visibility, published_at, finalized_at, created_by, created_at, updated_at",
    )
    .eq("school_id", admin.profile.school_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const election = electionData as AdminElection | null;

  return {
    admin,
    school,
    election,
  };
}
