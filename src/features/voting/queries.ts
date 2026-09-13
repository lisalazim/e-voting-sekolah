import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database";

export type VotingCandidate = {
  ballotNumber: number;
  className: string | null;
  id: string;
  mission: string | null;
  name: string;
  photoUrl: string | null;
  vision: string | null;
};

export type VotingContext = {
  candidates: VotingCandidate[];
  electionTermLabel: string | null;
  electionTitle: string;
};

export async function getVotingContext(
  supabase: SupabaseClient<Database>,
  sessionHash: string,
): Promise<{ context: VotingContext | null; status: string }> {
  const { data, error } = await supabase.rpc("get_voting_context", {
    p_session_hash: sessionHash,
  });

  if (error) {
    return {
      context: null,
      status: "connection_error",
    };
  }

  const rows = data ?? [];
  const firstRow = rows[0];

  if (!firstRow) {
    return {
      context: null,
      status: "session_invalid",
    };
  }

  if (firstRow.status !== "success") {
    return {
      context: null,
      status: firstRow.status,
    };
  }

  return {
    context: {
      candidates: rows
        .filter((row) => row.candidate_id && row.candidate_name)
        .map((row) => ({
          ballotNumber: row.ballot_number ?? 0,
          className: row.candidate_class_name,
          id: row.candidate_id ?? "",
          mission: row.candidate_mission,
          name: row.candidate_name ?? "",
          photoUrl: row.candidate_photo_url,
          vision: row.candidate_vision,
        })),
      electionTermLabel: firstRow.election_term_label,
      electionTitle: firstRow.election_title ?? "Pemilihan",
    },
    status: "success",
  };
}
