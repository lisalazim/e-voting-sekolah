"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminFormState } from "../form-state";
import { getAdminDashboardData } from "../dashboard/queries";

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
