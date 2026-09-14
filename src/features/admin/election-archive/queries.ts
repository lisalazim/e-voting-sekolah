import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";
import type { AdminCandidate } from "../candidates/types";
import { getCurrentAdmin } from "../auth/queries";
import type { AdminSession } from "../auth/types";
import type { AdminElection, AdminSchool } from "../dashboard/queries";
import type { AdminVoter } from "../voters/types";
import type { ArchivedElection } from "./types";

export type AdminElectionArchiveData = {
  admin: AdminSession;
  archivedElections: ArchivedElection[];
  currentElection: AdminElection | null;
  school: AdminSchool | null;
};

type VoteRow = Pick<Database["public"]["Tables"]["votes"]["Row"], "candidate_id">;

function percentage(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 10000) / 100;
}

function getWinnerState(candidateResults: ArchivedElection["candidateResults"]) {
  if (candidateResults.length === 0) {
    return { type: "none" as const };
  }

  const topVoteCount = Math.max(
    ...candidateResults.map((result) => result.voteCount),
  );

  if (topVoteCount <= 0) {
    return { type: "none" as const };
  }

  const topCandidates = candidateResults.filter(
    (result) => result.voteCount === topVoteCount,
  );

  if (topCandidates.length === 1) {
    return {
      candidate: topCandidates[0],
      type: "single" as const,
    };
  }

  return {
    candidates: topCandidates,
    type: "tie" as const,
  };
}

async function getArchivedElectionDetails(
  supabase: SupabaseClient<Database>,
  election: AdminElection,
): Promise<ArchivedElection> {
  const { data: votersData } = await supabase
    .from("voters")
    .select("id, has_voted")
    .eq("election_id", election.id);
  const voters = (votersData ?? []) as Pick<AdminVoter, "has_voted" | "id">[];
  const votedCount = voters.filter((voter) => voter.has_voted).length;

  const { data: votesData } = await supabase
    .from("votes")
    .select("candidate_id")
    .eq("election_id", election.id);
  const votes = (votesData ?? []) as VoteRow[];
  const totalValidVotes = votes.length;

  const { data: candidatesData } = await supabase
    .from("candidates")
    .select("id, ballot_number, name")
    .eq("election_id", election.id)
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
  const tiedTopCount =
    topVoteCount > 0
      ? candidates.filter((candidate) => {
          return (counts.get(candidate.id) ?? 0) === topVoteCount;
        }).length
      : 0;
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
    ...election,
    candidateResults,
    summary: {
      notVotedCount: voters.length - votedCount,
      participationPercentage: percentage(votedCount, voters.length),
      totalValidVotes,
      totalVoters: voters.length,
      votedCount,
    },
    winnerState: getWinnerState(candidateResults),
  };
}

export async function getAdminElectionArchiveData(
  supabase: SupabaseClient<Database>,
): Promise<AdminElectionArchiveData | null> {
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

  const electionSelect =
    "id, school_id, title, description, term_label, starts_at, ends_at, status, results_visibility, published_at, finalized_at, finalized_by, announcement_started_at, results_revealed_at, archived_at, is_test, created_by, created_at, updated_at";

  const { data: currentElectionData } = await supabase
    .from("elections")
    .select(electionSelect)
    .eq("school_id", admin.profile.school_id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentElection = currentElectionData as AdminElection | null;

  const { data: archivedElectionData } = await supabase
    .from("elections")
    .select(electionSelect)
    .eq("school_id", admin.profile.school_id)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });
  const archivedElectionRows = (archivedElectionData ?? []) as AdminElection[];
  const archivedElections = await Promise.all(
    archivedElectionRows.map((election) =>
      getArchivedElectionDetails(supabase, election),
    ),
  );

  return {
    admin,
    archivedElections,
    currentElection,
    school,
  };
}
