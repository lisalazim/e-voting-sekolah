import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Admin | E-Voting Sekolah",
  description: "Kerangka dashboard admin E-Voting Sekolah.",
};

const setupItems = [
  "Profil sekolah",
  "Periode pemilihan",
  "Data kandidat",
  "Daftar pemilih",
] as const;

export default function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Kerangka Dashboard
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Dashboard Admin
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Area ini disiapkan sebagai fondasi admin. Form pengelolaan data,
          impor pemilih, proses voting, dan rekap hasil belum dibuat pada fase
          ini.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {setupItems.map((item) => (
          <div
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            key={item}
          >
            <h3 className="text-base font-semibold text-slate-950">{item}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Disiapkan untuk fase pengembangan berikutnya.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
