import type { AdminElection } from "../dashboard/queries";
import type { CandidateResult, ResultsSummary, WinnerState } from "../results/types";

export type ArchivedElection = AdminElection & {
  candidateResults: CandidateResult[];
  summary: ResultsSummary;
  winnerState: WinnerState;
};
