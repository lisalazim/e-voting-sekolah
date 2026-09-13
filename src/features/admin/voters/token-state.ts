export type GeneratedVoterToken = {
  kelas: string;
  nama: string;
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
  status: "idle",
  token: "",
};
