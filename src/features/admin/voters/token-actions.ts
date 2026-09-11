"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { AdminElection } from "../dashboard/queries";
import { getAdminDashboardData } from "../dashboard/queries";
import type { GeneratedVoterToken, VoterTokenBatchState, VoterTokenSingleState } from "./token-state";
import { initialVoterTokenBatchState, initialVoterTokenSingleState } from "./token-state";
import { generateVoterToken, hashVoterToken } from "./token-utils";
import type { AdminVoter } from "./types";

const MAX_TOKEN_GENERATION_ATTEMPTS = 20;

type TokenVoter = Pick<
  AdminVoter,
  "class_name" | "external_id" | "full_name" | "has_voted" | "id" | "token_hash"
>;

function canCreateTokens(election: AdminElection): boolean {
  const startsAt = new Date(election.starts_at).getTime();

  return (
    (election.status === "draft" || election.status === "scheduled") &&
    Number.isFinite(startsAt) &&
    startsAt > Date.now()
  );
}

function getTokenBlockedMessage(election: AdminElection): string {
  if (election.status === "open") {
    return "Token tidak dapat dibuat saat pemilihan sudah dibuka.";
  }

  if (election.status === "closed" || election.status === "archived") {
    return "Token tidak dapat dibuat setelah pemilihan selesai.";
  }

  return "Token hanya dapat dibuat sebelum jadwal pemilihan dimulai.";
}

async function getTokenContext() {
  const supabase = await createSupabaseServerClient();
  const dashboardData = await getAdminDashboardData(supabase);

  return {
    dashboardData,
    supabase,
  };
}

function createUniqueToken(usedHashes: Set<string>): GeneratedVoterToken["token"] {
  for (let attempt = 0; attempt < MAX_TOKEN_GENERATION_ATTEMPTS; attempt += 1) {
    const token = generateVoterToken();
    const tokenHash = hashVoterToken(token);

    if (!usedHashes.has(tokenHash)) {
      usedHashes.add(tokenHash);
      return token;
    }
  }

  throw new Error("Token unik belum bisa dibuat. Coba ulangi proses.");
}

async function getUsedTokenHashes(electionId: string): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("voters")
    .select("token_hash")
    .eq("election_id", electionId)
    .not("token_hash", "is", null);

  return new Set(
    ((data ?? []) as Pick<AdminVoter, "token_hash">[])
      .map((row) => row.token_hash)
      .filter((tokenHash): tokenHash is string => Boolean(tokenHash)),
  );
}

export async function generateMissingVoterTokens(
  _previousState: VoterTokenBatchState,
): Promise<VoterTokenBatchState> {
  void _previousState;

  const { dashboardData, supabase } = await getTokenContext();

  if (!dashboardData) {
    return {
      ...initialVoterTokenBatchState,
      status: "error",
      message: "Sesi admin tidak valid. Silakan masuk kembali.",
    };
  }

  if (!dashboardData.school || !dashboardData.election) {
    return {
      ...initialVoterTokenBatchState,
      status: "error",
      message: "Buat pengaturan sekolah dan pemilihan terlebih dahulu.",
    };
  }

  if (!canCreateTokens(dashboardData.election)) {
    return {
      ...initialVoterTokenBatchState,
      status: "error",
      message: getTokenBlockedMessage(dashboardData.election),
    };
  }

  const { data: votersData, error: votersError } = await supabase
    .from("voters")
    .select("id, external_id, full_name, class_name, token_hash, has_voted")
    .eq("election_id", dashboardData.election.id)
    .eq("has_voted", false)
    .is("token_hash", null)
    .order("class_name", { ascending: true })
    .order("full_name", { ascending: true });

  if (votersError) {
    return {
      ...initialVoterTokenBatchState,
      status: "error",
      message: "Daftar pemilih belum bisa dibaca.",
    };
  }

  const voters = (votersData ?? []) as TokenVoter[];

  if (voters.length === 0) {
    return {
      ...initialVoterTokenBatchState,
      status: "success",
      message: "Tidak ada pemilih tanpa token.",
    };
  }

  const generatedTokens: GeneratedVoterToken[] = [];
  const usedHashes = await getUsedTokenHashes(dashboardData.election.id);
  const issuedAt = new Date().toISOString();

  try {
    for (const voter of voters) {
      const token = createUniqueToken(usedHashes);
      const tokenHash = hashVoterToken(token);
      const { data: updatedVoter, error: updateError } = await supabase
        .from("voters")
        .update({
          token_hash: tokenHash,
          token_issued_at: issuedAt,
          token_revoked_at: null,
        })
        .eq("id", voter.id)
        .eq("election_id", dashboardData.election.id)
        .is("token_hash", null)
        .eq("has_voted", false)
        .select("id")
        .maybeSingle();

      if (updateError || !updatedVoter) {
        return {
          ...initialVoterTokenBatchState,
          status: "error",
          message: "Sebagian token belum bisa disimpan. Jalankan ulang untuk pemilih yang belum memiliki token.",
        };
      }

      generatedTokens.push({
        kelas: voter.class_name ?? "",
        nama: voter.full_name,
        nis: voter.external_id,
        token,
      });
    }
  } catch (error) {
    return {
      ...initialVoterTokenBatchState,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Token belum bisa dibuat. Periksa konfigurasi server.",
    };
  }

  await supabase.from("audit_logs").insert({
    action: "voter_tokens.generated",
    actor_id: dashboardData.admin.profile.id,
    entity_id: dashboardData.election.id,
    entity_type: "election",
    metadata: {
      count: generatedTokens.length,
    },
    school_id: dashboardData.school.id,
  });

  revalidatePath("/admin/pemilih");

  return {
    message: `${generatedTokens.length} token berhasil dibuat. Token asli hanya tampil sekali pada hasil ini.`,
    status: "success",
    tokens: generatedTokens,
  };
}

export async function regenerateVoterToken(
  _previousState: VoterTokenSingleState,
  formData: FormData,
): Promise<VoterTokenSingleState> {
  void _previousState;

  const voterId = formData.get("voterId");

  if (typeof voterId !== "string") {
    return {
      ...initialVoterTokenSingleState,
      status: "error",
      message: "Pemilih tidak valid.",
    };
  }

  const { dashboardData, supabase } = await getTokenContext();

  if (!dashboardData?.school || !dashboardData.election) {
    return {
      ...initialVoterTokenSingleState,
      status: "error",
      message: "Pemilihan belum tersedia.",
    };
  }

  if (!canCreateTokens(dashboardData.election)) {
    return {
      ...initialVoterTokenSingleState,
      status: "error",
      message: getTokenBlockedMessage(dashboardData.election),
    };
  }

  const { data: voterData } = await supabase
    .from("voters")
    .select("id, external_id, full_name, class_name, token_hash, has_voted")
    .eq("id", voterId)
    .eq("election_id", dashboardData.election.id)
    .maybeSingle();
  const voter = voterData as TokenVoter | null;

  if (!voter) {
    return {
      ...initialVoterTokenSingleState,
      status: "error",
      message: "Pemilih tidak ditemukan pada pemilihan ini.",
    };
  }

  if (voter.has_voted) {
    return {
      ...initialVoterTokenSingleState,
      status: "error",
      message: "Token pemilih yang sudah memilih tidak boleh diregenerasi.",
    };
  }

  try {
    const usedHashes = await getUsedTokenHashes(dashboardData.election.id);

    if (voter.token_hash) {
      usedHashes.delete(voter.token_hash);
    }

    const token = createUniqueToken(usedHashes);
    const tokenHash = hashVoterToken(token);
    const { data: updatedVoter, error } = await supabase
      .from("voters")
      .update({
        token_hash: tokenHash,
        token_issued_at: new Date().toISOString(),
        token_revoked_at: null,
      })
      .eq("id", voter.id)
      .eq("election_id", dashboardData.election.id)
      .eq("has_voted", false)
      .select("id")
      .maybeSingle();

    if (error || !updatedVoter) {
      return {
        ...initialVoterTokenSingleState,
        status: "error",
        message: "Token pemilih belum bisa diregenerasi.",
      };
    }

    await supabase.from("audit_logs").insert({
      action: "voter_token.regenerated",
      actor_id: dashboardData.admin.profile.id,
      entity_id: voter.id,
      entity_type: "voter",
      metadata: {
        election_id: dashboardData.election.id,
      },
      school_id: dashboardData.school.id,
    });

    revalidatePath("/admin/pemilih");

    return {
      message: "Token baru berhasil dibuat. Token lama otomatis tidak berlaku.",
      nama: voter.full_name,
      nis: voter.external_id,
      status: "success",
      token,
    };
  } catch (error) {
    return {
      ...initialVoterTokenSingleState,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Token belum bisa diregenerasi. Periksa konfigurasi server.",
    };
  }
}
