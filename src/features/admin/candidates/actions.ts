"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminFormState } from "../form-state";
import { getAdminDashboardData } from "../dashboard/queries";
import type { AdminCandidate } from "./types";
import {
  CANDIDATE_PHOTO_BUCKET,
  CANDIDATE_PHOTO_MIME_TYPES,
  MAX_CANDIDATE_PHOTO_SIZE,
  getCandidatePhotoPath,
  removeCandidatePhoto,
} from "./storage";

const candidateSchema = z.object({
  ballotNumber: z.coerce
    .number({
      error: "Nomor urut wajib berupa angka.",
    })
    .int("Nomor urut wajib berupa bilangan bulat.")
    .positive("Nomor urut wajib berupa bilangan positif."),
  candidateId: z.string().uuid().optional().or(z.literal("")),
  className: z
    .string()
    .trim()
    .min(1, "Kelas wajib diisi.")
    .max(80, "Nama kelas terlalu panjang."),
  isActive: z.boolean(),
  mission: z
    .string()
    .trim()
    .max(1200, "Misi maksimal 1200 karakter.")
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nama kandidat minimal 2 karakter.")
    .max(160, "Nama kandidat terlalu panjang."),
  vision: z
    .string()
    .trim()
    .max(800, "Visi maksimal 800 karakter.")
    .optional(),
});

function getOptionalPhoto(formData: FormData): File | null {
  const value = formData.get("photo");

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function validatePhoto(file: File | null): string | null {
  if (!file) {
    return null;
  }

  if (!CANDIDATE_PHOTO_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
    return "Foto hanya boleh JPG, PNG, atau WebP.";
  }

  if (file.size > MAX_CANDIDATE_PHOTO_SIZE) {
    return "Ukuran foto maksimal 2 MB.";
  }

  return null;
}

async function findExistingCandidate(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  candidateId: string,
  electionId: string,
): Promise<AdminCandidate | null> {
  const { data } = await supabase
    .from("candidates")
    .select(
      "id, election_id, ballot_number, name, class_name, photo_url, vision, mission, is_active, created_at, updated_at",
    )
    .eq("id", candidateId)
    .eq("election_id", electionId)
    .maybeSingle();

  return data as AdminCandidate | null;
}

export async function saveCandidate(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const photo = getOptionalPhoto(formData);
  const photoError = validatePhoto(photo);

  if (photoError) {
    return {
      status: "error",
      message: photoError,
    };
  }

  const parsed = candidateSchema.safeParse({
    ballotNumber: formData.get("ballotNumber"),
    candidateId: formData.get("candidateId") ?? "",
    className: formData.get("className"),
    isActive: formData.get("isActive") === "on",
    mission: formData.get("mission"),
    name: formData.get("name"),
    vision: formData.get("vision"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Data kandidat belum valid.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const dashboardData = await getAdminDashboardData(supabase);

  if (!dashboardData) {
    return {
      status: "error",
      message: "Sesi admin tidak valid. Silakan masuk kembali.",
    };
  }

  if (!dashboardData.school || !dashboardData.election) {
    return {
      status: "error",
      message: "Buat pengaturan sekolah dan pemilihan terlebih dahulu.",
    };
  }

  if (dashboardData.election.finalized_at) {
    return {
      status: "error",
      message: "Hasil sudah difinalisasi. Data kandidat tidak dapat diubah.",
    };
  }

  const candidateId = parsed.data.candidateId || crypto.randomUUID();
  const existingCandidate = parsed.data.candidateId
    ? await findExistingCandidate(
        supabase,
        parsed.data.candidateId,
        dashboardData.election.id,
      )
    : null;

  if (parsed.data.candidateId && !existingCandidate) {
    return {
      status: "error",
      message: "Kandidat tidak ditemukan pada pemilihan sekolah ini.",
    };
  }

  const { data: duplicateCandidateData } = await supabase
    .from("candidates")
    .select("id")
    .eq("election_id", dashboardData.election.id)
    .eq("ballot_number", parsed.data.ballotNumber)
    .neq("id", candidateId)
    .maybeSingle();

  if (duplicateCandidateData) {
    return {
      status: "error",
      message: "Nomor urut sudah digunakan kandidat lain.",
    };
  }

  let uploadedPhotoUrl: string | null = null;

  if (photo) {
    const photoPath = getCandidatePhotoPath(
      dashboardData.school.id,
      candidateId,
      photo,
    );
    const { error: uploadError } = await supabase.storage
      .from(CANDIDATE_PHOTO_BUCKET)
      .upload(photoPath, photo, {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        status: "error",
        message: "Foto kandidat belum bisa diunggah.",
      };
    }

    uploadedPhotoUrl = supabase.storage
      .from(CANDIDATE_PHOTO_BUCKET)
      .getPublicUrl(photoPath).data.publicUrl;
  }

  const payload = {
    ballot_number: parsed.data.ballotNumber,
    class_name: parsed.data.className,
    election_id: dashboardData.election.id,
    is_active: parsed.data.isActive,
    mission: parsed.data.mission || null,
    name: parsed.data.name,
    photo_url: uploadedPhotoUrl ?? existingCandidate?.photo_url ?? null,
    vision: parsed.data.vision || null,
  };

  const result = existingCandidate
    ? await supabase
        .from("candidates")
        .update(payload)
        .eq("id", existingCandidate.id)
        .eq("election_id", dashboardData.election.id)
    : await supabase.from("candidates").insert({
        ...payload,
        id: candidateId,
      });

  if (result.error) {
    if (uploadedPhotoUrl) {
      await removeCandidatePhoto(supabase, uploadedPhotoUrl);
    }

    return {
      status: "error",
      message:
        result.error.code === "23505"
          ? "Nomor urut sudah digunakan kandidat lain."
          : "Data kandidat belum bisa disimpan.",
    };
  }

  if (uploadedPhotoUrl && existingCandidate?.photo_url) {
    await removeCandidatePhoto(supabase, existingCandidate.photo_url);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/kandidat");

  return {
    status: "success",
    message: existingCandidate
      ? "Kandidat berhasil diperbarui."
      : "Kandidat berhasil ditambahkan.",
  };
}

export async function deleteCandidate(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const candidateId = formData.get("candidateId");

  if (typeof candidateId !== "string") {
    return {
      status: "error",
      message: "Kandidat tidak valid.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const dashboardData = await getAdminDashboardData(supabase);

  if (!dashboardData?.election) {
    return {
      status: "error",
      message: "Pemilihan belum tersedia.",
    };
  }

  if (dashboardData.election.finalized_at) {
    return {
      status: "error",
      message: "Hasil sudah difinalisasi. Data kandidat tidak dapat dihapus.",
    };
  }

  const existingCandidate = await findExistingCandidate(
    supabase,
    candidateId,
    dashboardData.election.id,
  );

  if (!existingCandidate) {
    return {
      status: "error",
      message: "Kandidat tidak ditemukan.",
    };
  }

  const { error } = await supabase
    .from("candidates")
    .delete()
    .eq("id", existingCandidate.id)
    .eq("election_id", dashboardData.election.id);

  if (error) {
    return {
      status: "error",
      message: "Kandidat belum bisa dihapus.",
    };
  }

  await removeCandidatePhoto(supabase, existingCandidate.photo_url);
  revalidatePath("/admin");
  revalidatePath("/admin/kandidat");

  return {
    status: "success",
    message: "Kandidat berhasil dihapus.",
  };
}
