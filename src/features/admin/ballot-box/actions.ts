"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminFormState } from "../form-state";
import { getAdminBallotBoxData } from "./queries";
import {
  getEffectiveElectionStatus,
  getReadinessChecklist,
  isReadyToOpen,
} from "./status";
import type { BallotBoxTransition, ElectionStatus } from "./types";

const transitionSchema = z.object({
  transition: z.enum(["schedule", "open", "pause", "resume", "close"]),
});

type TransitionRule = {
  allowedFrom: ElectionStatus[];
  target: ElectionStatus;
};

function getTransitionRule(transition: BallotBoxTransition): TransitionRule {
  const rules: Record<BallotBoxTransition, TransitionRule> = {
    close: {
      allowedFrom: ["open"],
      target: "closed",
    },
    open: {
      allowedFrom: ["scheduled"],
      target: "open",
    },
    pause: {
      allowedFrom: ["open"],
      target: "paused",
    },
    resume: {
      allowedFrom: ["paused"],
      target: "open",
    },
    schedule: {
      allowedFrom: ["draft"],
      target: "scheduled",
    },
  };

  return rules[transition];
}

function getTransitionSuccessMessage(transition: BallotBoxTransition): string {
  const messages: Record<BallotBoxTransition, string> = {
    close: "Kotak suara berhasil ditutup.",
    open: "Kotak suara berhasil dibuka.",
    pause: "Pemilihan berhasil dijeda.",
    resume: "Pemilihan berhasil dilanjutkan.",
    schedule: "Pemilihan berhasil dijadwalkan.",
  };

  return messages[transition];
}

function getTransitionErrorMessage(transition: BallotBoxTransition): string {
  const messages: Record<BallotBoxTransition, string> = {
    close: "Kotak suara belum bisa ditutup.",
    open: "Kotak suara belum bisa dibuka.",
    pause: "Pemilihan belum bisa dijeda.",
    resume: "Pemilihan belum bisa dilanjutkan.",
    schedule: "Pemilihan belum bisa dijadwalkan.",
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

  const effectiveStatus = getEffectiveElectionStatus(data.election);
  const rule = getTransitionRule(transition);
  const now = Date.now();
  const startsAt = new Date(data.election.starts_at).getTime();
  const endsAt = new Date(data.election.ends_at).getTime();

  if (data.election.status === "closed" || data.election.status === "archived") {
    return {
      status: "error",
      message: "Status selesai tidak dapat dibuka kembali melalui UI.",
    };
  }

  if (!rule.allowedFrom.includes(data.election.status)) {
    return {
      status: "error",
      message: getTransitionErrorMessage(transition),
    };
  }

  if (transition === "schedule") {
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
      return {
        status: "error",
        message: "Jadwal mulai dan selesai belum valid.",
      };
    }

    if (endsAt <= now) {
      return {
        status: "error",
        message: "Pemilihan tidak dapat dijadwalkan karena waktu selesai sudah terlewati.",
      };
    }
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

  if ((transition === "pause" || transition === "resume") && effectiveStatus === "closed") {
    return {
      status: "error",
      message: "Pemilihan sudah melewati waktu selesai. Tutup kotak suara.",
    };
  }

  const { data: updatedElection, error } = await supabase
    .from("elections")
    .update({
      status: rule.target,
    })
    .eq("id", data.election.id)
    .eq("school_id", data.school.id)
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
