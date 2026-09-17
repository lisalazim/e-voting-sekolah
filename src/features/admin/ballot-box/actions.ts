"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminFormState } from "../form-state";
import { getAdminBallotBoxData } from "./queries";
import { getReadinessChecklist, isReadyToOpen } from "./status";
import type { BallotBoxTransition, ElectionStatus } from "./types";

const transitionSchema = z.object({
  transition: z.enum(["open", "pause", "close"]),
});

type TransitionRule = {
  allowedFrom: ElectionStatus[];
  target: ElectionStatus;
};

function getTransitionRule(transition: BallotBoxTransition): TransitionRule {
  const rules: Record<BallotBoxTransition, TransitionRule> = {
    close: {
      allowedFrom: ["open", "paused"],
      target: "closed",
    },
    open: {
      allowedFrom: ["draft", "scheduled", "paused"],
      target: "open",
    },
    pause: {
      allowedFrom: ["open"],
      target: "paused",
    },
  };

  return rules[transition];
}

function getTransitionSuccessMessage(transition: BallotBoxTransition): string {
  const messages: Record<BallotBoxTransition, string> = {
    close: "Kotak suara berhasil ditutup.",
    open: "Kotak suara berhasil dibuka.",
    pause: "Pemilihan berhasil dijeda.",
  };

  return messages[transition];
}

function getTransitionErrorMessage(transition: BallotBoxTransition): string {
  const messages: Record<BallotBoxTransition, string> = {
    close: "Kotak suara belum bisa ditutup.",
    open: "Kotak suara belum bisa dibuka.",
    pause: "Pemilihan belum bisa dijeda.",
  };

  return messages[transition];
}

export async function updateBallotBoxStatus(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  void _previousState;

  const parsed = transitionSchema.safeParse({
    transition: formData.get("transition"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Aksi kotak suara tidak valid.",
    };
  }

  const transition = parsed.data.transition;
  const supabase = await createSupabaseServerClient();
  const data = await getAdminBallotBoxData(supabase);

  if (!data) {
    return {
      status: "error",
      message: "Sesi admin tidak valid. Silakan masuk kembali.",
    };
  }

  if (!data.school || !data.election) {
    return {
      status: "error",
      message: "Buat pengaturan sekolah dan pemilihan terlebih dahulu.",
    };
  }

  const rule = getTransitionRule(transition);

  if (data.election.status === "closed" || data.election.status === "archived") {
    return {
      status: "error",
      message: "Status selesai tidak dapat dibuka kembali melalui UI.",
    };
  }

  if (data.election.finalized_at || data.election.archived_at) {
    return {
      status: "error",
      message: "Pemilihan yang sudah difinalisasi atau diarsipkan tidak dapat diubah.",
    };
  }

  if (!rule.allowedFrom.includes(data.election.status)) {
    return {
      status: "error",
      message: getTransitionErrorMessage(transition),
    };
  }

  if (transition === "open") {
    const checklist = getReadinessChecklist(data.election, data.summary);

    if (!isReadyToOpen(checklist)) {
      return {
        status: "error",
        message: "Checklist persiapan belum lengkap.",
      };
    }
  }

  const { data: updatedElection, error } = await supabase
    .from("elections")
    .update({
      status: rule.target,
    })
    .eq("id", data.election.id)
    .eq("school_id", data.school.id)
    .is("archived_at", null)
    .is("finalized_at", null)
    .in("status", rule.allowedFrom)
    .select("id, status")
    .maybeSingle();

  if (error || !updatedElection) {
    return {
      status: "error",
      message: "Status kotak suara sudah berubah. Muat ulang halaman dan coba lagi.",
    };
  }

  await supabase.from("audit_logs").insert({
    action: "election.status_changed",
    actor_id: data.admin.profile.id,
    entity_id: data.election.id,
    entity_type: "election",
    metadata: {
      from: data.election.status,
      to: rule.target,
      transition,
    },
    school_id: data.school.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/kotak-suara");
  revalidatePath("/admin/pemilihan");

  return {
    status: "success",
    message: getTransitionSuccessMessage(transition),
  };
}
