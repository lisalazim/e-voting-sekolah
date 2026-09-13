import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";
import { getAdminDashboardData } from "../dashboard/queries";
import type { AdminDashboardData } from "../dashboard/queries";
import type {
  AdminVoter,
  Gender,
  TokenStatusFilter,
  VoterSearchParams,
} from "./types";

export const VOTERS_PAGE_SIZE = 25;

export type AdminVotersData = AdminDashboardData & {
  classOptions: string[];
  editedVoter: AdminVoter | null;
  page: number;
  pageCount: number;
  tokenCounts: {
    missingToken: number;
    voted: number;
    withToken: number;
  };
  totalCount: number;
  voters: AdminVoter[];
};

export async function getAdminVotersData(
  supabase: SupabaseClient<Database>,
  searchParams: VoterSearchParams,
  editedVoterId?: string,
): Promise<AdminVotersData | null> {
  const dashboardData = await getAdminDashboardData(supabase);

  if (!dashboardData) {
    return null;
  }

  if (!dashboardData.election) {
    return {
      ...dashboardData,
      classOptions: [],
      editedVoter: null,
      page: 1,
      pageCount: 1,
      tokenCounts: {
        missingToken: 0,
        voted: 0,
        withToken: 0,
      },
      totalCount: 0,
      voters: [],
    };
  }

  let votersQuery = supabase
    .from("voters")
    .select(
      "id, election_id, external_id, full_name, gender, class_name, token_hash, token_issued_at, token_revoked_at, has_voted, voted_at, created_at, updated_at",
      { count: "exact" },
    )
    .eq("election_id", dashboardData.election.id);

  if (searchParams.query) {
    const escapedQuery = searchParams.query.replaceAll("%", "\\%");
    votersQuery = votersQuery.ilike("full_name", `%${escapedQuery}%`);
  }

  if (searchParams.className) {
    votersQuery = votersQuery.eq("class_name", searchParams.className);
  }

  if (searchParams.gender) {
    votersQuery = votersQuery.eq("gender", searchParams.gender);
  }

  if (searchParams.tokenStatus === "missing-token") {
    votersQuery = votersQuery.eq("has_voted", false).is("token_hash", null);
  }

  if (searchParams.tokenStatus === "with-token") {
    votersQuery = votersQuery.eq("has_voted", false).not("token_hash", "is", null);
  }

  if (searchParams.tokenStatus === "voted") {
    votersQuery = votersQuery.eq("has_voted", true);
  }

  const page = Math.max(searchParams.page, 1);
  const from = (page - 1) * VOTERS_PAGE_SIZE;
  const to = from + VOTERS_PAGE_SIZE - 1;
  const { count, data: votersData } = await votersQuery
    .order("class_name", { ascending: true })
    .order("full_name", { ascending: true })
    .range(from, to);
  const voters = (votersData ?? []) as AdminVoter[];
  const totalCount = count ?? 0;

  const { data: classData } = await supabase
    .from("voters")
    .select("class_name")
    .eq("election_id", dashboardData.election.id)
    .not("class_name", "is", null)
    .order("class_name", { ascending: true });
  const classOptions = Array.from(
    new Set(
      ((classData ?? []) as Pick<AdminVoter, "class_name">[])
        .map((row) => row.class_name)
        .filter((className): className is string => Boolean(className)),
    ),
  );
  const { data: tokenCountData } = await supabase
    .from("voters")
    .select("id, token_hash, has_voted")
    .eq("election_id", dashboardData.election.id);
  const tokenCountRows = (tokenCountData ?? []) as Pick<
    AdminVoter,
    "has_voted" | "token_hash"
  >[];
  const tokenCounts = tokenCountRows.reduce(
    (counts, voter) => {
      if (voter.has_voted) {
        return {
          ...counts,
          voted: counts.voted + 1,
        };
      }

      if (voter.token_hash) {
        return {
          ...counts,
          withToken: counts.withToken + 1,
        };
      }

      return {
        ...counts,
        missingToken: counts.missingToken + 1,
      };
    },
    {
      missingToken: 0,
      voted: 0,
      withToken: 0,
    },
  );
  const editedVoter = editedVoterId
    ? voters.find((voter) => voter.id === editedVoterId) ??
      ((await getAdminVoterById(
        supabase,
        dashboardData.election.id,
        editedVoterId,
      )) as AdminVoter | null)
    : null;

  return {
    ...dashboardData,
    classOptions,
    editedVoter,
    page,
    pageCount: Math.max(Math.ceil(totalCount / VOTERS_PAGE_SIZE), 1),
    tokenCounts,
    totalCount,
    voters,
  };
}

export async function getAdminVoterById(
  supabase: SupabaseClient<Database>,
  electionId: string,
  voterId: string,
): Promise<AdminVoter | null> {
  const { data } = await supabase
    .from("voters")
    .select(
      "id, election_id, external_id, full_name, gender, class_name, token_hash, token_issued_at, token_revoked_at, has_voted, voted_at, created_at, updated_at",
    )
    .eq("id", voterId)
    .eq("election_id", electionId)
    .maybeSingle();

  return data as AdminVoter | null;
}

export function normalizeGender(value: string | null): Gender | undefined {
  return value === "L" || value === "P" ? value : undefined;
}

export function normalizeTokenStatus(
  value: string | null,
): TokenStatusFilter | undefined {
  return value === "missing-token" || value === "with-token" || value === "voted"
    ? value
    : undefined;
}
