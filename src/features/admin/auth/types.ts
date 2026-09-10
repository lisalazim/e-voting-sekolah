import type { User } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";

export type AdminProfile = Database["public"]["Tables"]["profiles"]["Row"];

export type AdminSession = {
  user: User;
  profile: AdminProfile;
};

export type LoginFormState = {
  message: string;
};

export const initialLoginFormState: LoginFormState = {
  message: "",
};
