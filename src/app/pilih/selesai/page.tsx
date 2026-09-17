import type { Metadata } from "next";

import { prepareNextVoter } from "../../../features/voting/actions";

export const metadata: Metadata = {
  title: "Suara Tercatat | E-Voting Sekolah",
  description: "Suara pemilih berhasil dicatat.",
};

export default function VotingFinishedPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          E-Voting Sekolah
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Suara berhasil dicatat
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Terima kasih. Halaman ini tidak menampilkan pilihan Anda kembali
          untuk menjaga kerahasiaan suara.
        </p>
        <form action={prepareNextVoter} className="mt-5">
          <button
            className="inline-flex min-h-10 items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            type="submit"
          >
            Pemilih Berikutnya
          </button>
        </form>
      </section>
    </main>
  );
}
