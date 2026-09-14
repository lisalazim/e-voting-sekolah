import type { ReactNode } from "react";
import Link from "next/link";

import { logoutAdmin } from "../../features/admin/auth/actions";

type AdminShellProps = {
  adminName: string;
  children: ReactNode;
};

export function AdminShell({ adminName, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              E-Voting Sekolah
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-600">
              Masuk sebagai{" "}
              <span className="font-medium text-slate-950">{adminName}</span>
            </p>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[220px_1fr] lg:px-8">
        <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <nav aria-label="Navigasi admin" className="space-y-1">
            <Link
              className="block rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
              href="/admin"
            >
              Ringkasan
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/pengaturan"
            >
              Pengaturan
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/pemilihan"
            >
              Pemilihan
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/kandidat"
            >
              Kandidat
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/pemilih"
            >
              Pemilih
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/kotak-suara"
            >
              Kotak Suara
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/hasil"
            >
              Hasil
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/pengumuman"
            >
              Pengumuman
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/arsip-pemilihan"
            >
              Arsip Pemilihan
            </Link>
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
