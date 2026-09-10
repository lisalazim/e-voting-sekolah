export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <div className="w-full rounded-lg border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 md:px-10 md:py-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Template Pemilihan Ketua OSIS
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            E-Voting Sekolah
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Fondasi awal untuk aplikasi e-voting yang dapat dikonfigurasi ulang
            oleh sekolah berbeda tanpa menanam data sekolah, kandidat, jadwal,
            atau daftar pemilih langsung di komponen.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              Data fleksibel
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              Mobile-first
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              Siap dikembangkan bertahap
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
