"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { localDateTimeToIso } from "../../../utils/date-time";
import { getCurrentAdmin } from "../auth/queries";
import type { AdminFormState } from "../form-state";
import type { AdminSchool } from "../dashboard/queries";

const electionSettingsSchema = z.object({
  electionId: z.string().uuid().optional().or(z.literal("")),
  endsAt: z.string().trim().min(1, "Tanggal dan jam selesai wajib diisi."),
  resultsVisibility: z.enum(["private", "public"]),
  startsAt: z.string().trim().min(1, "Tanggal dan jam mulai wajib diisi."),
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
    electionId: formData.get("electionId") ?? "",
    endsAt: formData.get("endsAt"),
    resultsVisibility: formData.get("resultsVisibility") === "public" ? "public" : "private",
    startsAt: formData.get("startsAt"),
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

  const startsAt = localDateTimeToIso(parsed.data.startsAt, school.timezone);
  const endsAt = localDateTimeToIso(parsed.data.endsAt, school.timezone);

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return {
      status: "error",
      message: "Waktu selesai harus lebih akhir daripada waktu mulai.",
    };
  }

  const payload = {
    ends_at: endsAt,
    results_visibility: parsed.data.resultsVisibility,
    starts_at: startsAt,
    term_label: parsed.data.termLabel,
    title: parsed.data.title,
  };

  const electionId = parsed.data.electionId;
  if (electionId) {
    const { data: existingElection } = await supabase
      .from("elections")
      .select("id, finalized_at")
      .eq("id", electionId)
      .eq("school_id", admin.profile.school_id)
      .maybeSingle();

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
      });

  if (result.error) {
    return {
      status: "error",
      message: "Pengaturan pemilihan belum bisa disimpan.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pemilihan");

  return {
    status: "success",
    message: "Pengaturan pemilihan berhasil disimpan.",
  };
}
