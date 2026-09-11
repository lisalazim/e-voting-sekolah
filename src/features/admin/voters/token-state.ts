export type GeneratedVoterToken = {
  kelas: string;
  nama: string;
  nis: string;
  token: string;
};

export type VoterTokenBatchState = {
  message: string;
  status: "idle" | "success" | "error";
  tokens: GeneratedVoterToken[];
};

export type VoterTokenSingleState = {
  message: string;
  nama: string;
  nis: string;
  status: "idle" | "success" | "error";
  token: string;
};

export const initialVoterTokenBatchState: VoterTokenBatchState = {
  message: "",
  status: "idle",
  tokens: [],
};

export const initialVoterTokenSingleState: VoterTokenSingleState = {
  message: "",
  nama: "",
  nis: "",
  status: "idle",
  token: "",
};
