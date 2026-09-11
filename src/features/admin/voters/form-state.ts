import type { VoterImportPreview } from "./types";

export type VoterImportState = {
  message: string;
  preview: VoterImportPreview | null;
  status: "idle" | "success" | "error";
  validRowsJson: string;
};

export const initialVoterImportState: VoterImportState = {
  message: "",
  preview: null,
  status: "idle",
  validRowsJson: "[]",
};
