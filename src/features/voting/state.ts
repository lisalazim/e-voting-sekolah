export type VotingFormState = {
  message: string;
  status: "idle" | "success" | "error";
};

export const initialVotingFormState: VotingFormState = {
  message: "",
  status: "idle",
};
