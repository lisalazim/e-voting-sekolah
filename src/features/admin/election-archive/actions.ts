"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminFormState } from "../form-state";
import { getAdminDashboardData } from "../dashboard/queries";
import { CANDIDATE_PHOTO_BUCKET } from "../candidates/storage";

export async function archiveCurrentElection(
  _previousState: AdminFormState,
): Promise<AdminFormState> {
  void _previousState;

  const supabase = await createSupabaseServerClient();
  const data = await getAdminDashboardData(supabase);

  if (!data) {
    return {
      status: "error",
      message: "Sesi admin tidak valid. Silakan masuk kembali.",
    };
  }

  if (!data.school || !data.election) {
    return {
      status: "error",
      message: "Tidak ada pemilihan aktif yang dapat diarsipkan.",
    };
  }

  if (data.election.status !== "closed") {
    return {
      status: "error",
      message: "Pemilihan hanya dapat diarsipkan setelah kotak suara ditutup.",
    };
  }

  if (!data.election.finalized_at) {
    return {
      status: "error",
      message: "Finalisasi hasil terlebih dahulu sebelum mengarsipkan.",
    };
  }

  const archivedAt = new Date().toISOString();
  const { data: updatedElection, error } = await supabase
    .from("elections")
    .update({
      archived_at: archivedAt,
      status: "archived",
    })
    .eq("id", data.election.id)
    .eq("school_id", data.school.id)
    .eq("status", "closed")
    .not("finalized_at", "is", null)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updatedElection) {
    return {
      status: "error",
      message: "Pemilihan belum bisa diarsipkan. Muat ulang halaman dan coba lagi.",
    };
  }

  await supabase.from("audit_logs").insert({
    action: "election.archived",
    actor_id: data.admin.profile.id,
    entity_id: data.election.id,
    entity_type: "election",
    metadata: {
      archived_at: archivedAt,
    },
    school_id: data.school.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/arsip-pemilihan");
  revalidatePath("/admin/kandidat");
  revalidatePath("/admin/kotak-suara");
  revalidatePath("/admin/hasil");
  revalidatePath("/admin/pemilih");
  revalidatePath("/admin/pemilihan");
  revalidatePath("/admin/pengumuman");
  revalidatePath("/pengumuman");

  return {
    status: "success",
    message: "Pemilihan berhasil diarsipkan tanpa menghapus data lama.",
  };
}

export async function deleteArchivedTestElection(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  void _previousState;

  if (formData.get("confirmation") !== "HAPUS") {
    return {
      status: "error",
      message: "Ketik HAPUS untuk mengonfirmasi penghapusan permanen.",
    };
  }

  const parsedElectionId = z.string().uuid().safeParse(formData.get("electionId"));

  if (!parsedElectionId.success) {
    return {
      status: "error",
      message: "Pemilihan tidak valid.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("delete_archived_test_election", {
    p_election_id: parsedElectionId.data,
  });
  const result = data?.[0];

  if (error || !result) {
    return {
      status: "error",
      message: "Pemilihan percobaan belum dapat dihapus. Coba lagi.",
    };
  }

  const statusMessages: Record<string, string> = {
    forbidden: "Anda tidak memiliki izin untuk menghapus pemilihan ini.",
    not_archived: "Hanya pemilihan yang sudah diarsipkan yang dapat dihapus.",
    not_found: "Pemilihan tidak ditemukan pada sekolah Anda.",
    not_test: "Pemilihan sungguhan tidak dapat dihapus permanen.",
  };

  if (result.status !== "success") {
    return {
      status: "error",
      message: statusMessages[result.status] ?? "Pemilihan tidak dapat dihapus.",
    };
  }

  const photoPaths = result.candidate_photo_paths ?? [];
  let cleanupWarning = "";

  if (photoPaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(CANDIDATE_PHOTO_BUCKET)
      .remove(photoPaths);

    if (storageError) {
      cleanupWarning =
        " Database sudah dihapus, tetapi sebagian foto belum berhasil dibersihkan. Path cleanup telah dicatat pada audit log.";
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/arsip-pemilihan");

  return {
    status: "success",
    message: `Pemilihan percobaan berhasil dihapus permanen.${cleanupWarning}`,
  };
}
