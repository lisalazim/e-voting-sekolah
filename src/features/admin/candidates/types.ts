import type { Database } from "../../../types/database";

export type AdminCandidate = Database["public"]["Tables"]["candidates"]["Row"];

export type CandidateFormMode = "create" | "edit";
