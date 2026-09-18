"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "../../lib/supabase/server";
import {
  getVoterTokenFormat,
  normalizeVoterToken,
} from "../../utils/voter-token";
import { hashVoterToken } from "../admin/voters/token-utils";
import { getVotingStatusMessage } from "./messages";
import {
  VOTER_SESSION_MAX_AGE_SECONDS,
  clearVoterSessionCookie,
  generateVoterSessionSecret,
  getVoterSessionHash,
  hashVoterSessionSecret,
  setVoterSessionCookie,
} from "./session";
import type { VotingFormState } from "./state";

const tokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Masukkan 6 digit token.")
    .transform(normalizeVoterToken)
    .refine((token) => getVoterTokenFormat(token) !== null, {
      message: "Token harus terdiri dari 6 angka.",
    }),
});

const voteSchema = z.object({
  candidateId: z.string().uuid("Pilih kandidat terlebih dahulu."),
});

type SupabaseRpcError = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

const sensitiveIdentifierPattern =
  /\b(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{64})\b/gi;

function sanitizeRpcErrorField(value: string | null | undefined): string | null {
  return value ? value.replace(sensitiveIdentifierPattern, "[REDACTED]") : null;
}

function isConnectionError(error: SupabaseRpcError): boolean {
  const message = error.message?.toLowerCase() ?? "";

  return (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("socket") ||
    message.includes("econn")
  );
}

function logCastVoteRpcError(error: SupabaseRpcError): void {
  console.error("[voting.cast_vote] Supabase RPC error", {
    code: sanitizeRpcErrorField(error.code),
    details: sanitizeRpcErrorField(error.details),
    hint: sanitizeRpcErrorField(error.hint),
    message: sanitizeRpcErrorField(error.message),
  });
}

function getLoginMessage(status: string): string {
  if (status === "already_voted") {
    return "Token sudah digunakan.";
  }

  if (status === "invalid_token") {
    return "Token tidak ditemukan.";
  }

  return getVotingStatusMessage(status);
}

export async function loginVoterWithToken(
  _previousState: VotingFormState,
  formData: FormData,
): Promise<VotingFormState> {
  void _previousState;

  const parsed = tokenSchema.safeParse({
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Token tidak valid.",
    };
  }

  let tokenHash: string;

  try {
    tokenHash = hashVoterToken(parsed.data.token);
  } catch {
    return {
      status: "error",
      message: "Token belum bisa diperiksa. Hubungi panitia.",
    };
  }

  const sessionSecret = generateVoterSessionSecret();
  const sessionHash = hashVoterSessionSecret(sessionSecret);
  const expiresAt = new Date(
    Date.now() + VOTER_SESSION_MAX_AGE_SECONDS * 1000,
  ).toISOString();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_voter_session", {
    p_expires_at: expiresAt,
    p_session_hash: sessionHash,
    p_token_hash: tokenHash,
  });

  if (error) {
    return {
      status: "error",
      message: "Koneksi gagal. Coba lagi beberapa saat.",
    };
  }

  const resultStatus = data?.[0]?.status ?? "invalid_token";

  if (resultStatus !== "success") {
    return {
      status: "error",
      message: getLoginMessage(resultStatus),
    };
  }

  await setVoterSessionCookie(sessionSecret);
  redirect("/pilih/kandidat");
}

export async function submitVote(
  _previousState: VotingFormState,
  formData: FormData,
): Promise<VotingFormState> {
  void _previousState;

  const parsed = voteSchema.safeParse({
    candidateId: formData.get("candidateId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Pilih kandidat terlebih dahulu.",
    };
  }

  const sessionHash = await getVoterSessionHash();

  if (!sessionHash) {
    return {
      status: "error",
      message: "Sesi pemilih tidak valid. Masukkan token kembali.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cast_vote", {
    p_candidate_id: parsed.data.candidateId,
    p_session_hash: sessionHash,
  });

  if (error) {
    logCastVoteRpcError(error);

    return {
      status: "error",
      message: isConnectionError(error)
        ? "Koneksi gagal. Coba lagi beberapa saat."
        : "Suara belum bisa dicatat karena terjadi kesalahan pada server.",
    };
  }

  const resultStatus = data?.[0]?.status ?? "session_invalid";

  if (resultStatus !== "success") {
    return {
      status: "error",
      message: getVotingStatusMessage(resultStatus),
    };
  }

  await clearVoterSessionCookie();
  redirect("/pilih/selesai");
}

export async function prepareNextVoter(): Promise<void> {
  await clearVoterSessionCookie();
  redirect("/pilih");
}
