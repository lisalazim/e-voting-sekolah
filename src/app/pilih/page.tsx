import type { Metadata } from "next";

import { TokenLoginForm } from "../../features/voting/token-login-form";

export const metadata: Metadata = {
  title: "Masuk Pemilih | E-Voting Sekolah",
  description: "Masuk ke pemilihan menggunakan token pemilih.",
};

export default function VoterLoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          E-Voting Sekolah
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Masuk Pemilih
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Masukkan token yang diberikan panitia. Token hanya digunakan untuk
          membuka sesi pemilihan sementara.
        </p>
        <div className="mt-6">
          <TokenLoginForm />
        </div>
      </section>
    </main>
  );
}
