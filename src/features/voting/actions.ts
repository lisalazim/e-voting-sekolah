"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "../../lib/supabase/server";
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
  token: z.string().trim().min(1, "Masukkan token pemilih."),
});

const voteSchema = z.object({
  candidateId: z.string().uuid("Pilih kandidat terlebih dahulu."),
});

function getLoginMessage(status: string): string {
  if (status === "already_voted") {
    return "Token tidak valid atau tidak dapat digunakan.";
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
    return {
      status: "error",
      message: "Koneksi gagal. Coba lagi beberapa saat.",
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
