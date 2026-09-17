"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getCurrentAdmin } from "../auth/queries";
import type { AdminFormState } from "../form-state";
import type { AdminSchool } from "../dashboard/queries";

const electionSettingsSchema = z.object({
  description: z
    .string()
    .trim()
    .max(600, "Deskripsi terlalu panjang.")
    .optional(),
  electionId: z.string().uuid().optional().or(z.literal("")),
  isTest: z.boolean(),
  resultsVisibility: z.enum(["private", "public"]),
  termLabel: z
    .string()
    .trim()
    .min(3, "Periode kepengurusan minimal 3 karakter.")
    .max(80, "Periode kepengurusan terlalu panjang."),
  title: z
    .string()
    .trim()
    .min(3, "Nama kegiatan minimal 3 karakter.")
    .max(160, "Nama kegiatan terlalu panjang."),
});

export async function saveElectionSettings(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = electionSettingsSchema.safeParse({
    description: formData.get("description"),
    electionId: formData.get("electionId") ?? "",
    isTest: formData.get("isTest") === "true",
    resultsVisibility: formData.get("resultsVisibility") === "public" ? "public" : "private",
    termLabel: formData.get("termLabel"),
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Data pemilihan belum valid.",
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

  const { data: schoolData, error: schoolError } = await supabase
    .from("schools")
    .select("id, name, slug, npsn, logo_url, address, timezone, created_at, updated_at")
    .eq("id", admin.profile.school_id)
    .maybeSingle();
  const school = schoolData as AdminSchool | null;

  if (schoolError || !school) {
    return {
      status: "error",
      message: "Data sekolah belum ditemukan.",
    };
  }

  const payload = {
    description: parsed.data.description || null,
    is_test: parsed.data.isTest,
    results_visibility: parsed.data.resultsVisibility,
    term_label: parsed.data.termLabel,
    title: parsed.data.title,
  };

  const electionId = parsed.data.electionId;
  if (electionId) {
    const { data: existingElection } = await supabase
      .from("elections")
      .select("id, finalized_at, archived_at")
      .eq("id", electionId)
      .eq("school_id", admin.profile.school_id)
      .is("archived_at", null)
      .maybeSingle();

    if (!existingElection) {
      return {
        status: "error",
        message: "Pemilihan aktif tidak ditemukan.",
      };
    }

    if (existingElection?.finalized_at) {
      return {
        status: "error",
        message:
          "Hasil sudah difinalisasi. Pengaturan penting pemilihan tidak dapat diubah.",
      };
    }
  }

  const result = electionId
    ? await supabase
        .from("elections")
        .update(payload)
        .eq("id", electionId)
        .eq("school_id", admin.profile.school_id)
    : await supabase.from("elections").insert({
        ...payload,
        created_by: admin.profile.id,
        school_id: admin.profile.school_id,
        status: "draft",
      });

  if (result.error) {
    return {
      status: "error",
      message:
        "Pengaturan pemilihan belum bisa disimpan. Arsipkan pemilihan aktif terlebih dahulu jika ingin membuat pemilihan baru.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pemilihan");

  return {
    status: "success",
    message: "Pengaturan pemilihan berhasil disimpan.",
  };
}
