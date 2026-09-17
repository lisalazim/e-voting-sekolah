export type PublicAnnouncementStatus =
  | "not_ready"
  | "waiting"
  | "counting_down"
  | "revealed";

export type PublicAnnouncementState = {
  announcementStartedAt: string | null;
  electionTermLabel: string | null;
  electionTitle: string | null;
  resultsRevealedAt: string | null;
  schoolLogoUrl: string | null;
  schoolName: string | null;
  serverNow: string;
  status: PublicAnnouncementStatus;
};

export type PublicCandidateResult = {
  ballotNumber: number;
  candidateClassName: string | null;
  candidateId: string;
  candidateName: string;
  candidatePhotoUrl: string | null;
  isTiedTop: boolean;
  isTop: boolean;
  percentage: number;
  voteCount: number;
};

export type PublicFinalResults = {
  electionTermLabel: string | null;
  electionTitle: string;
  schoolLogoUrl: string | null;
  schoolName: string;
  totalValidVotes: number;
  candidates: PublicCandidateResult[];
};
