import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database";
import type {
  PublicAnnouncementState,
  PublicAnnouncementStatus,
  PublicCandidateResult,
  PublicFinalResults,
} from "./types";

type AnnouncementStateRow =
  Database["public"]["Functions"]["get_public_announcement_state"]["Returns"][number];
type FinalResultsRow =
  Database["public"]["Functions"]["get_public_final_results"]["Returns"][number];

const announcementStatuses: PublicAnnouncementStatus[] = [
  "not_ready",
  "waiting",
  "counting_down",
  "revealed",
];

function toAnnouncementStatus(status: string): PublicAnnouncementStatus {
  if (announcementStatuses.includes(status as PublicAnnouncementStatus)) {
    return status as PublicAnnouncementStatus;
  }

  return "not_ready";
}

function mapAnnouncementState(row: AnnouncementStateRow): PublicAnnouncementState {
  return {
    announcementStartedAt: row.announcement_started_at,
    electionTermLabel: row.election_term_label,
    electionTitle: row.election_title,
    resultsRevealedAt: row.results_revealed_at,
    schoolLogoUrl: row.school_logo_url,
    schoolName: row.school_name,
    serverNow: row.server_now,
    status: toAnnouncementStatus(row.status),
  };
}

export async function getPublicAnnouncementState(
  supabase: SupabaseClient<Database>,
): Promise<PublicAnnouncementState> {
  const { data } = await supabase.rpc("get_public_announcement_state");
  const row = data?.[0];

  if (!row) {
    return {
      announcementStartedAt: null,
      electionTermLabel: null,
      electionTitle: null,
      resultsRevealedAt: null,
      schoolLogoUrl: null,
      schoolName: null,
      serverNow: new Date().toISOString(),
      status: "not_ready",
    };
  }

  return mapAnnouncementState(row);
}

function mapCandidate(row: FinalResultsRow): PublicCandidateResult | null {
  if (!row.candidate_id || !row.candidate_name || row.ballot_number === null) {
    return null;
  }

  return {
    ballotNumber: row.ballot_number,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    candidatePhotoUrl: row.candidate_photo_url,
    isTiedTop: row.is_tied_top,
    isTop: row.is_top,
    percentage: row.percentage,
    voteCount: row.vote_count,
  };
}

export async function getPublicFinalResults(
  supabase: SupabaseClient<Database>,
): Promise<
  | { status: "success"; results: PublicFinalResults }
  | { status: "not_ready" | "not_revealed" }
> {
  const { data } = await supabase.rpc("get_public_final_results");
  const rows = data ?? [];
  const firstRow = rows[0];

  if (!firstRow || firstRow.status === "not_ready") {
    return { status: "not_ready" };
  }

  if (firstRow.status === "not_revealed") {
    return { status: "not_revealed" };
  }

  if (!firstRow.school_name || !firstRow.election_title) {
    return { status: "not_ready" };
  }

  const candidates = rows.flatMap((row) => {
    const candidate = mapCandidate(row);
    return candidate ? [candidate] : [];
  });

  return {
    status: "success",
    results: {
      candidates,
      electionTermLabel: firstRow.election_term_label,
      electionTitle: firstRow.election_title,
      schoolLogoUrl: firstRow.school_logo_url,
      schoolName: firstRow.school_name,
      totalValidVotes: firstRow.total_valid_votes,
    },
  };
}
