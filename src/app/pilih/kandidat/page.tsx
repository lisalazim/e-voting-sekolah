import type { Metadata } from "next";
import Link from "next/link";

import { getVotingStatusMessage } from "../../../features/voting/messages";
import { getVotingContext } from "../../../features/voting/queries";
import { getVoterSessionHash } from "../../../features/voting/session";
import { VoteCandidateForm } from "../../../features/voting/vote-candidate-form";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Pilih Kandidat | E-Voting Sekolah",
  description: "Pilih kandidat pada E-Voting Sekolah.",
};

export default async function VotingCandidatesPage() {
  const sessionHash = await getVoterSessionHash();

  if (!sessionHash) {
    return <VotingBlocked message="Sesi pemilih tidak valid. Masukkan token kembali." />;
  }

  const supabase = await createSupabaseServerClient();
  const result = await getVotingContext(supabase, sessionHash);

  if (!result.context) {
    return <VotingBlocked message={getVotingStatusMessage(result.status)} />;
  }

  if (result.context.candidates.length === 0) {
    return <VotingBlocked message="Belum ada kandidat aktif untuk pemilihan ini." />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:py-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Pilih kandidat
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {result.context.electionTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Periode: {result.context.electionTermLabel ?? "-"}
          </p>
        </div>

        <VoteCandidateForm candidates={result.context.candidates} />
      </section>
    </main>
  );
}

function VotingBlocked({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Belum dapat memilih
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <Link
          className="mt-5 inline-flex min-h-10 items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          href="/pilih"
        >
          Masukkan token
        </Link>
      </section>
    </main>
  );
}
