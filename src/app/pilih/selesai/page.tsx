import type { Metadata } from "next";
import Link from "next/link";

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
        <Link
          className="mt-5 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          href="/"
        >
          Kembali ke beranda
        </Link>
      </section>
    </main>
  );
}
