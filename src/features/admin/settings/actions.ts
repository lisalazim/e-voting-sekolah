"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminFormState } from "../form-state";
import { getCurrentAdmin } from "../auth/queries";

const schoolSettingsSchema = z.object({
  adminName: z
    .string()
    .trim()
    .min(2, "Nama admin minimal 2 karakter.")
    .max(120, "Nama admin terlalu panjang."),
  schoolName: z
    .string()
    .trim()
    .min(3, "Nama sekolah minimal 3 karakter.")
    .max(160, "Nama sekolah terlalu panjang."),
  schoolSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.",
    ),
  timezone: z.literal("Asia/Jakarta", {
    error: "Zona waktu yang didukung saat ini adalah Asia/Jakarta.",
  }),
});

export async function updateSchoolSettings(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = schoolSettingsSchema.safeParse({
    adminName: formData.get("adminName"),
    schoolName: formData.get("schoolName"),
    schoolSlug: formData.get("schoolSlug"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Data pengaturan belum valid.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const admin = await getCurrentAdmin(supabase);

  if (!admin) {
    return {
      status: "error",
      message: "Sesi admin tidak valid. Silakan masuk kembali.",
    };
  }

  const { adminName, schoolName, schoolSlug, timezone } = parsed.data;

  const { error: schoolError } = await supabase
    .from("schools")
    .update({
      name: schoolName,
      slug: schoolSlug,
      timezone,
    })
    .eq("id", admin.profile.school_id);

  if (schoolError) {
    return {
      status: "error",
      message:
        schoolError.code === "23505"
          ? "Slug sekolah sudah digunakan. Pilih slug lain."
          : "Pengaturan sekolah belum bisa disimpan.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: adminName,
    })
    .eq("id", admin.profile.id)
    .eq("school_id", admin.profile.school_id);

  if (profileError) {
    return {
      status: "error",
      message: "Nama admin belum bisa disimpan.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pengaturan");

  return {
    status: "success",
    message: "Pengaturan sekolah berhasil disimpan.",
  };
}
