import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";
import { getAdminDashboardData } from "../dashboard/queries";
import type { AdminDashboardData } from "../dashboard/queries";
import type { AdminCandidate } from "../candidates/types";
import type { AdminVoter } from "../voters/types";
import type { CandidateResult, ResultsSummary, WinnerState } from "./types";

export type AdminResultsData = AdminDashboardData & {
  candidateResults: CandidateResult[];
  canShowCandidateResults: boolean;
  summary: ResultsSummary;
  winnerState: WinnerState;
};

function percentage(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 10000) / 100;
}

function getWinnerState(results: CandidateResult[]): WinnerState {
  if (results.length === 0) {
    return { type: "none" };
  }

  const topVoteCount = Math.max(...results.map((result) => result.voteCount));

  if (topVoteCount <= 0) {
    return { type: "none" };
  }

  const topCandidates = results.filter(
    (result) => result.voteCount === topVoteCount,
  );

  if (topCandidates.length === 1) {
    return {
      type: "single",
      candidate: topCandidates[0],
    };
  }

  return {
    type: "tie",
    candidates: topCandidates,
  };
}

export async function getAdminResultsData(
  supabase: SupabaseClient<Database>,
): Promise<AdminResultsData | null> {
  const dashboardData = await getAdminDashboardData(supabase);

  if (!dashboardData) {
    return null;
  }

  if (!dashboardData.election) {
    return {
      ...dashboardData,
      canShowCandidateResults: false,
      candidateResults: [],
      summary: {
        notVotedCount: 0,
        participationPercentage: 0,
        totalValidVotes: 0,
        totalVoters: 0,
        votedCount: 0,
      },
      winnerState: { type: "none" },
    };
  }

  const electionId = dashboardData.election.id;
  const { data: votersData } = await supabase
    .from("voters")
    .select("id, has_voted")
    .eq("election_id", electionId);
  const voters = (votersData ?? []) as Pick<AdminVoter, "has_voted" | "id">[];
  const votedCount = voters.filter((voter) => voter.has_voted).length;

  const { data: votesData } = await supabase
    .from("votes")
    .select("candidate_id")
    .eq("election_id", electionId);
  const votes = (votesData ?? []) as Pick<
    Database["public"]["Tables"]["votes"]["Row"],
    "candidate_id"
  >[];
  const totalValidVotes = votes.length;
  const summary = {
    notVotedCount: voters.length - votedCount,
    participationPercentage: percentage(votedCount, voters.length),
    totalValidVotes,
    totalVoters: voters.length,
    votedCount,
  };
  const canShowCandidateResults = dashboardData.election.status === "closed";

  if (!canShowCandidateResults) {
    return {
      ...dashboardData,
      canShowCandidateResults,
      candidateResults: [],
      summary,
      winnerState: { type: "none" },
    };
  }

  const { data: candidatesData } = await supabase
    .from("candidates")
    .select("id, ballot_number, name")
    .eq("election_id", electionId)
    .order("ballot_number", { ascending: true });
  const candidates = (candidatesData ?? []) as Pick<
    AdminCandidate,
    "ballot_number" | "id" | "name"
  >[];
  const counts = votes.reduce((voteCounts, vote) => {
    voteCounts.set(vote.candidate_id, (voteCounts.get(vote.candidate_id) ?? 0) + 1);
    return voteCounts;
  }, new Map<string, number>());
  const topVoteCount = counts.size > 0 ? Math.max(...counts.values()) : 0;
  const topCandidateIds = new Set(
    candidates
      .filter((candidate) => (counts.get(candidate.id) ?? 0) === topVoteCount)
      .map((candidate) => candidate.id),
  );
  const tiedTopCount = topVoteCount > 0 ? topCandidateIds.size : 0;
  const candidateResults = candidates.map((candidate) => {
    const voteCount = counts.get(candidate.id) ?? 0;

    return {
      ballotNumber: candidate.ballot_number,
      candidateId: candidate.id,
      isTiedTop: topVoteCount > 0 && tiedTopCount > 1 && voteCount === topVoteCount,
      name: candidate.name,
      percentage: percentage(voteCount, totalValidVotes),
      voteCount,
    };
  });

  return {
    ...dashboardData,
    canShowCandidateResults,
    candidateResults,
    summary,
    winnerState: getWinnerState(candidateResults),
  };
}
