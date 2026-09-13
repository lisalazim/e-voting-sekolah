"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminFormState } from "../form-state";
import { getAdminResultsData } from "./queries";

async function getResultsActionContext() {
  const supabase = await createSupabaseServerClient();
  const data = await getAdminResultsData(supabase);

  return {
    data,
    supabase,
  };
}

export async function finalizeResults(
  _previousState: AdminFormState,
): Promise<AdminFormState> {
  void _previousState;

  const { data, supabase } = await getResultsActionContext();

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
      message: "Hasil hanya dapat difinalisasi setelah kotak suara ditutup.",
    };
  }

  if (data.election.finalized_at) {
    return {
      status: "error",
      message: "Hasil sudah difinalisasi.",
    };
  }

  const now = new Date().toISOString();
  const { data: updatedElection, error } = await supabase
    .from("elections")
    .update({
      finalized_at: now,
      finalized_by: data.admin.profile.id,
    })
    .eq("id", data.election.id)
    .eq("school_id", data.school.id)
    .eq("status", "closed")
    .is("finalized_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updatedElection) {
    return {
      status: "error",
      message: "Hasil belum bisa difinalisasi. Muat ulang halaman dan coba lagi.",
    };
  }

  await supabase.from("audit_logs").insert({
    action: "results.finalized",
    actor_id: data.admin.profile.id,
    entity_id: data.election.id,
    entity_type: "election",
    metadata: {
      total_valid_votes: data.summary.totalValidVotes,
    },
    school_id: data.school.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/hasil");

  return {
    status: "success",
    message: "Hasil berhasil difinalisasi.",
  };
}

export async function publishResults(
  _previousState: AdminFormState,
): Promise<AdminFormState> {
  void _previousState;

  const { data, supabase } = await getResultsActionContext();

  if (!data?.school || !data.election) {
    return {
      status: "error",
      message: "Pemilihan belum tersedia.",
    };
  }

  if (!data.election.finalized_at) {
    return {
      status: "error",
      message: "Finalisasi hasil terlebih dahulu.",
    };
  }

  const { data: updatedElection, error } = await supabase
    .from("elections")
    .update({
      published_at: new Date().toISOString(),
    })
    .eq("id", data.election.id)
    .eq("school_id", data.school.id)
    .not("finalized_at", "is", null)
    .is("published_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updatedElection) {
    return {
      status: "error",
      message: "Status siap diumumkan belum bisa diaktifkan.",
    };
  }

  await supabase.from("audit_logs").insert({
    action: "results.published",
    actor_id: data.admin.profile.id,
    entity_id: data.election.id,
    entity_type: "election",
    metadata: {
      ready_to_announce: true,
    },
    school_id: data.school.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/hasil");

  return {
    status: "success",
    message: "Hasil ditandai siap diumumkan.",
  };
}

export async function unpublishResults(
  _previousState: AdminFormState,
): Promise<AdminFormState> {
  void _previousState;

  const { data, supabase } = await getResultsActionContext();

  if (!data?.school || !data.election) {
    return {
      status: "error",
      message: "Pemilihan belum tersedia.",
    };
  }

  if (!data.election.published_at) {
    return {
      status: "error",
      message: "Hasil belum ditandai siap diumumkan.",
    };
  }

  const { data: updatedElection, error } = await supabase
    .from("elections")
    .update({
      published_at: null,
    })
    .eq("id", data.election.id)
    .eq("school_id", data.school.id)
    .not("published_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error || !updatedElection) {
    return {
      status: "error",
      message: "Status siap diumumkan belum bisa dibatalkan.",
    };
  }

  await supabase.from("audit_logs").insert({
    action: "results.unpublished",
    actor_id: data.admin.profile.id,
    entity_id: data.election.id,
    entity_type: "election",
    metadata: {
      ready_to_announce: false,
    },
    school_id: data.school.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/hasil");

  return {
    status: "success",
    message: "Status siap diumumkan dibatalkan.",
  };
}
