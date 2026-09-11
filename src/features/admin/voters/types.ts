import type { Database } from "../../../types/database";

export type Gender = "L" | "P";
export type TokenStatusFilter = "missing-token" | "with-token" | "voted";

export type AdminVoter = Database["public"]["Tables"]["voters"]["Row"];

export type VoterImportRow = {
  nis: string;
  nama: string;
  kelas: string;
  jenis_kelamin: Gender;
};

export type VoterImportPreviewRow = VoterImportRow & {
  rowNumber: number;
  status: "valid" | "invalid" | "duplicate";
  reason: string;
};

export type VoterImportSummary = {
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
};

export type VoterImportPreview = {
  rows: VoterImportPreviewRow[];
  summary: VoterImportSummary;
};

export type VoterSearchParams = {
  className?: string;
  gender?: Gender;
  page: number;
  query?: string;
  tokenStatus?: TokenStatusFilter;
};
