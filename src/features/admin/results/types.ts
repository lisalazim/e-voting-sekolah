export type CandidateResult = {
  ballotNumber: number;
  candidateId: string;
  isTiedTop: boolean;
  name: string;
  percentage: number;
  voteCount: number;
};

export type ResultsSummary = {
  notVotedCount: number;
  participationPercentage: number;
  totalValidVotes: number;
  totalVoters: number;
  votedCount: number;
};

export type WinnerState =
  | {
      type: "none";
    }
  | {
      type: "single";
      candidate: CandidateResult;
    }
  | {
      type: "tie";
      candidates: CandidateResult[];
    };
