import type { Database } from "../../../types/database";

export type ElectionStatus = Database["public"]["Enums"]["election_status"];

export type BallotBoxTransition = "open" | "pause" | "close";

export type BallotBoxSummary = {
  activeCandidateCount: number;
  missingTokenCount: number;
  notVotedCount: number;
  totalVoterCount: number;
  votedCount: number;
  withTokenCount: number;
};

export type BallotBoxChecklistItem = {
  isReady: boolean;
  label: string;
};
