import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";
import { getAdminDashboardData } from "../dashboard/queries";
import type { AdminDashboardData } from "../dashboard/queries";
import type { AdminCandidate } from "./types";

export type AdminCandidatesData = AdminDashboardData & {
  candidates: AdminCandidate[];
  editedCandidate: AdminCandidate | null;
};

export async function getAdminCandidatesData(
  supabase: SupabaseClient<Database>,
  editedCandidateId?: string,
): Promise<AdminCandidatesData | null> {
  const dashboardData = await getAdminDashboardData(supabase);

  if (!dashboardData) {
    return null;
  }

  if (!dashboardData.election) {
    return {
      ...dashboardData,
      candidates: [],
      editedCandidate: null,
    };
  }

  const { data: candidatesData } = await supabase
    .from("candidates")
    .select(
      "id, election_id, ballot_number, name, class_name, photo_url, vision, mission, is_active, created_at, updated_at",
    )
    .eq("election_id", dashboardData.election.id)
    .order("ballot_number", { ascending: true });
  const candidates = (candidatesData ?? []) as AdminCandidate[];
  const editedCandidate =
    editedCandidateId
      ? candidates.find((candidate) => candidate.id === editedCandidateId) ?? null
      : null;

  return {
    ...dashboardData,
    candidates,
    editedCandidate,
  };
}
