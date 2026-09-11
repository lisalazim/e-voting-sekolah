"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getAdminDashboardData } from "../dashboard/queries";
import type { AdminFormState } from "../form-state";
import { initialVoterImportState } from "./form-state";
import type { VoterImportState } from "./form-state";
import { getAdminVoterById } from "./queries";
import type { AdminVoter, VoterImportRow } from "./types";
import { getValidImportRows, parseVoterImportFile } from "./import-parser";

const voterSchema = z.object({
  className: z
    .string()
    .trim()
    .min(1, "Kelas wajib diisi.")
    .max(80, "Nama kelas terlalu panjang."),
  externalId: z
    .string()
    .trim()
    .min(1, "NIS wajib diisi.")
    .max(80, "NIS terlalu panjang."),
  fullName: z
    .string()
    .trim()
    .min(2, "Nama pemilih minimal 2 karakter.")
    .max(160, "Nama pemilih terlalu panjang."),
  gender: z.enum(["L", "P"], {
    error: "Jenis kelamin wajib L atau P.",
  }),
  voterId: z.string().uuid().optional().or(z.literal("")),
});

const importRowsSchema = z.array(
  z.object({
    jenis_kelamin: z.enum(["L", "P"]),
    kelas: z.string().trim().min(1),
    nama: z.string().trim().min(1),
    nis: z.string().trim().min(1),
  }),
);

async function getAdminElectionContext() {
  const supabase = await createSupabaseServerClient();
  const dashboardData = await getAdminDashboardData(supabase);

  if (!dashboardData?.school || !dashboardData.election) {
    return {
      dashboardData,
      supabase,
    };
  }

  return {
    dashboardData,
    supabase,
  };
}

async function getExistingVoters(electionId: string): Promise<AdminVoter[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("voters")
    .select(
      "id, election_id, external_id, full_name, gender, class_name, token_hash, token_issued_at, token_revoked_at, has_voted, voted_at, created_at, updated_at",
    )
    .eq("election_id", electionId);

  return (data ?? []) as AdminVoter[];
}

export async function saveVoter(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = voterSchema.safeParse({
    className: formData.get("className"),
    externalId: formData.get("externalId"),
    fullName: formData.get("fullName"),
    gender: formData.get("gender"),
    voterId: formData.get("voterId") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Data pemilih belum valid.",
    };
  }

  const { dashboardData, supabase } = await getAdminElectionContext();

  if (!dashboardData) {
    return {
      status: "error",
      message: "Sesi admin tidak valid. Silakan masuk kembali.",
    };
  }

  if (!dashboardData.election) {
    return {
      status: "error",
      message: "Buat kegiatan pemilihan terlebih dahulu.",
    };
  }

  const voterId = parsed.data.voterId;
  const existingVoter = voterId
    ? await getAdminVoterById(supabase, dashboardData.election.id, voterId)
    : null;

  if (voterId && !existingVoter) {
    return {
      status: "error",
      message: "Pemilih tidak ditemukan pada pemilihan ini.",
    };
  }

  const { data: duplicateVoter } = await supabase
    .from("voters")
    .select("id")
    .eq("election_id", dashboardData.election.id)
    .eq("external_id", parsed.data.externalId)
    .neq("id", voterId || crypto.randomUUID())
    .maybeSingle();

  if (duplicateVoter) {
    return {
      status: "error",
      message: "NIS sudah terdaftar pada pemilihan ini.",
    };
  }

  const payload = {
    class_name: parsed.data.className,
    external_id: parsed.data.externalId,
    full_name: parsed.data.fullName,
    gender: parsed.data.gender,
  };
  const result = existingVoter
    ? await supabase
        .from("voters")
        .update(payload)
        .eq("id", existingVoter.id)
        .eq("election_id", dashboardData.election.id)
    : await supabase.from("voters").insert({
        ...payload,
        election_id: dashboardData.election.id,
        token_hash: null,
      });

  if (result.error) {
    return {
      status: "error",
      message:
        result.error.code === "23505"
          ? "NIS sudah terdaftar pada pemilihan ini."
          : "Data pemilih belum bisa disimpan.",
    };
  }

  revalidatePath("/admin/pemilih");

  return {
    status: "success",
    message: existingVoter
      ? "Data pemilih berhasil diperbarui."
      : "Pemilih berhasil ditambahkan.",
  };
}

export async function deleteVoter(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const voterId = formData.get("voterId");

  if (typeof voterId !== "string") {
    return {
      status: "error",
      message: "Pemilih tidak valid.",
    };
  }

  const { dashboardData, supabase } = await getAdminElectionContext();

  if (!dashboardData?.election) {
    return {
      status: "error",
      message: "Pemilihan belum tersedia.",
    };
  }

  const voter = await getAdminVoterById(supabase, dashboardData.election.id, voterId);

  if (!voter) {
    return {
      status: "error",
      message: "Pemilih tidak ditemukan.",
    };
  }

  if (voter.has_voted) {
    return {
      status: "error",
      message: "Pemilih yang sudah memberikan suara tidak boleh dihapus.",
    };
  }

  const { error } = await supabase
    .from("voters")
    .delete()
    .eq("id", voter.id)
    .eq("election_id", dashboardData.election.id)
    .eq("has_voted", false);

  if (error) {
    return {
      status: "error",
      message: "Pemilih belum bisa dihapus.",
    };
  }

  revalidatePath("/admin/pemilih");

  return {
    status: "success",
    message: "Pemilih berhasil dihapus.",
  };
}

export async function previewVoterImport(
  _previousState: VoterImportState,
  formData: FormData,
): Promise<VoterImportState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      ...initialVoterImportState,
      status: "error",
      message: "Pilih file .xlsx atau .csv terlebih dahulu.",
    };
  }

  const { dashboardData } = await getAdminElectionContext();

  if (!dashboardData?.election) {
    return {
      ...initialVoterImportState,
      status: "error",
      message: "Buat kegiatan pemilihan terlebih dahulu.",
    };
  }

  try {
    const existingVoters = await getExistingVoters(dashboardData.election.id);
    const preview = await parseVoterImportFile(file, existingVoters);
    const validRowsJson = JSON.stringify(getValidImportRows(preview));

    return {
      message: "Preview impor berhasil dibuat. Periksa data sebelum konfirmasi.",
      preview,
      status: "success",
      validRowsJson,
    };
  } catch (error) {
    return {
      ...initialVoterImportState,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "File belum bisa diproses.",
    };
  }
}

export async function confirmVoterImport(
  _previousState: VoterImportState,
  formData: FormData,
): Promise<VoterImportState> {
  const rowsJson = formData.get("validRowsJson");

  if (typeof rowsJson !== "string") {
    return {
      ...initialVoterImportState,
      status: "error",
      message: "Data preview tidak valid. Unggah file kembali.",
    };
  }

  let rawRows: unknown;

  try {
    rawRows = JSON.parse(rowsJson);
  } catch {
    return {
      ...initialVoterImportState,
      status: "error",
      message: "Data preview tidak valid. Unggah file kembali.",
    };
  }

  const parsedRows = importRowsSchema.safeParse(rawRows);

  if (!parsedRows.success || parsedRows.data.length === 0) {
    return {
      ...initialVoterImportState,
      status: "error",
      message: "Tidak ada baris valid untuk diimpor.",
    };
  }

  const { dashboardData, supabase } = await getAdminElectionContext();

  if (!dashboardData?.election) {
    return {
      ...initialVoterImportState,
      status: "error",
      message: "Pemilihan belum tersedia.",
    };
  }

  const election = dashboardData.election;
  const existingVoters = await getExistingVoters(election.id);
  const existingNis = new Set(existingVoters.map((voter) => voter.external_id));
  const rowsToInsert = parsedRows.data.filter((row) => !existingNis.has(row.nis));

  if (rowsToInsert.length !== parsedRows.data.length) {
    return {
      ...initialVoterImportState,
      status: "error",
      message:
        "Sebagian NIS sudah ada sejak preview dibuat. Unggah file kembali untuk preview terbaru.",
    };
  }

  const { error } = await supabase.from("voters").insert(
    rowsToInsert.map((row: VoterImportRow) => ({
      class_name: row.kelas,
      election_id: election.id,
      external_id: row.nis,
      full_name: row.nama,
      gender: row.jenis_kelamin,
      token_hash: null,
    })),
  );

  if (error) {
    return {
      ...initialVoterImportState,
      status: "error",
      message: "Data pemilih belum bisa diimpor.",
    };
  }

  revalidatePath("/admin/pemilih");

  return {
    ...initialVoterImportState,
    status: "success",
    message: `${rowsToInsert.length} pemilih berhasil diimpor.`,
  };
}
