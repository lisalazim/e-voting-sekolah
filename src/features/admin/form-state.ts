export type AdminFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialAdminFormState: AdminFormState = {
  status: "idle",
  message: "",
};
