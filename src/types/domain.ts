export type UserRole = "admin" | "committee" | "observer";

export type ElectionStatus = "draft" | "scheduled" | "open" | "closed" | "archived";

export type ResultsVisibility = "private" | "committee" | "public";

export type AuditAction =
  | "school.created"
  | "school.updated"
  | "election.created"
  | "election.updated"
  | "candidate.created"
  | "candidate.updated"
  | "voter.created"
  | "voter.updated"
  | "vote.cast"
  | "results.published";

export type AppTimezone = "Asia/Jakarta";
