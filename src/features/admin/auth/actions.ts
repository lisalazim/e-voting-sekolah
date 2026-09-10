"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getCurrentAdmin } from "./queries";
import type { LoginFormState } from "./types";

function getRequiredText(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function loginAdmin(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = getRequiredText(formData, "email");
  const password = getRequiredText(formData, "password");

  if (!email || !password) {
    return {
      message: "Email dan password wajib diisi.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      message: "Email atau password tidak sesuai.",
    };
  }

  const adminSession = await getCurrentAdmin(supabase);

  if (!adminSession) {
    await supabase.auth.signOut();

    return {
      message: "Akun ini belum memiliki akses admin.",
    };
  }

  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirect("/admin/login");
}
