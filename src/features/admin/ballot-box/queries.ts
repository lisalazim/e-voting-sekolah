import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";
import { getAdminDashboardData } from "../dashboard/queries";
import type { AdminDashboardData } from "../dashboard/queries";
import type { AdminCandidate } from "../candidates/types";
import type { AdminVoter } from "../voters/types";
import type { BallotBoxSummary } from "./types";

export type AdminBallotBoxData = AdminDashboardData & {
  summary: BallotBoxSummary;
};

const emptySummary: BallotBoxSummary = {
  activeCandidateCount: 0,
  missingTokenCount: 0,
  notVotedCount: 0,
  totalVoterCount: 0,
  votedCount: 0,
  withTokenCount: 0,
};

export async function getAdminBallotBoxData(
  supabase: SupabaseClient<Database>,
): Promise<AdminBallotBoxData | null> {
  const dashboardData = await getAdminDashboardData(supabase);

  if (!dashboardData) {
    return null;
  }

  if (!dashboardData.election) {
    return {
      ...dashboardData,
      summary: emptySummary,
    };
  }

  const { data: candidateData } = await supabase
    .from("candidates")
    .select("id, is_active")
    .eq("election_id", dashboardData.election.id);
  const candidates = (candidateData ?? []) as Pick<
    AdminCandidate,
    "id" | "is_active"
  >[];

  const { data: voterData } = await supabase
    .from("voters")
    .select("id, token_hash, has_voted")
    .eq("election_id", dashboardData.election.id);
  const voters = (voterData ?? []) as Pick<
    AdminVoter,
    "has_voted" | "id" | "token_hash"
  >[];
  const votedCount = voters.filter((voter) => voter.has_voted).length;
  const withTokenCount = voters.filter((voter) => Boolean(voter.token_hash)).length;

  return {
    ...dashboardData,
    summary: {
      activeCandidateCount: candidates.filter((candidate) => candidate.is_active)
        .length,
      missingTokenCount: voters.length - withTokenCount,
      notVotedCount: voters.length - votedCount,
      totalVoterCount: voters.length,
      votedCount,
      withTokenCount,
    },
  };
}
