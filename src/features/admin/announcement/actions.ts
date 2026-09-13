"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminFormState } from "../form-state";
import { getAdminAnnouncementData } from "./queries";

export async function startAnnouncement(
  _previousState: AdminFormState,
): Promise<AdminFormState> {
  void _previousState;

  const supabase = await createSupabaseServerClient();
  const data = await getAdminAnnouncementData(supabase);

  if (!data) {
    return {
      status: "error",
      message: "Sesi admin tidak valid. Silakan masuk kembali.",
    };
  }

  if (!data.school || !data.election) {
    return {
      status: "error",
      message: "Pemilihan belum tersedia.",
    };
  }

  if (data.election.status !== "closed") {
    return {
      status: "error",
      message: "Pengumuman hanya dapat dimulai setelah kotak suara ditutup.",
    };
  }

  if (!data.election.finalized_at) {
    return {
      status: "error",
      message: "Finalisasi hasil terlebih dahulu.",
    };
  }

  if (!data.election.published_at) {
    return {
      status: "error",
      message: "Tandai hasil siap diumumkan terlebih dahulu.",
    };
  }

  if (data.election.announcement_started_at) {
    return {
      status: "error",
      message: "Pengumuman sudah pernah dimulai.",
    };
  }

  const startedAt = new Date();
  const revealedAt = new Date(startedAt.getTime() + 10_000);
  const { data: updatedElection, error } = await supabase
    .from("elections")
    .update({
      announcement_started_at: startedAt.toISOString(),
      results_revealed_at: revealedAt.toISOString(),
    })
    .eq("id", data.election.id)
    .eq("school_id", data.school.id)
    .eq("status", "closed")
    .not("finalized_at", "is", null)
    .not("published_at", "is", null)
    .is("announcement_started_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updatedElection) {
    return {
      status: "error",
      message: "Pengumuman belum bisa dimulai. Muat ulang halaman dan coba lagi.",
    };
  }

  await supabase.from("audit_logs").insert({
    action: "results.announcement_started",
    actor_id: data.admin.profile.id,
    entity_id: data.election.id,
    entity_type: "election",
    metadata: {
      countdown_seconds: 10,
    },
    school_id: data.school.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/hasil");
  revalidatePath("/admin/pengumuman");
  revalidatePath("/pengumuman");

  return {
    status: "success",
    message: "Pengumuman dimulai. Countdown publik berjalan selama 10 detik.",
  };
}
