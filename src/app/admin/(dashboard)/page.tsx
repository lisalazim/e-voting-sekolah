import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminDashboardData } from "../../../features/admin/dashboard/queries";
import { getElectionStatusLabel } from "../../../features/admin/ballot-box/status";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { formatDateTimeForZone } from "../../../utils/date-time";

export const metadata: Metadata = {
  title: "Dashboard Admin | E-Voting Sekolah",
  description: "Ringkasan pengaturan E-Voting Sekolah.",
};

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const data = await getAdminDashboardData(supabase);

  if (!data) {
    redirect("/admin/login");
  }

  const timeZone = data.school?.timezone ?? "Asia/Jakarta";

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Ringkasan
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Dashboard Admin
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Pantau identitas sekolah dan kegiatan pemilihan yang sedang
          dikonfigurasi.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Nama sekolah</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            {data.school?.name ?? "Belum tersedia"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Slug: {data.school?.slug ?? "-"} - Zona waktu: {timeZone}
          </p>
          <Link
            className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            href="/admin/pengaturan"
          >
            Atur sekolah
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Status pemilihan</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            {data.election
              ? getElectionStatusLabel(data.election.status)
              : "Belum dibuat"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Finalisasi: {data.election?.finalized_at ? "sudah final" : "belum final"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Pengumuman:{" "}
            {data.election?.announcement_started_at
              ? "sudah dimulai"
              : "belum dimulai"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/hasil"
            >
              Lihat hasil
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/pengumuman"
            >
              Pengumuman
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/arsip-pemilihan"
            >
              Arsip
            </Link>
          </div>
        </div>
      </div>

      {data.election ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Nama kegiatan</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {data.election.title}
              </p>
              {data.election.is_test ? (
                <p className="mt-1 text-sm font-medium text-amber-700">
                  Pemilihan Percobaan
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Periode kepengurusan
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {data.election.term_label ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Informasi jadwal mulai
              </p>
              <p className="mt-2 text-base text-slate-950">
                {formatDateTimeForZone(data.election.starts_at, timeZone)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Informasi jadwal selesai
              </p>
              <p className="mt-2 text-base text-slate-950">
                {formatDateTimeForZone(data.election.ends_at, timeZone)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">
            Kegiatan pemilihan belum dibuat
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Buat kegiatan pemilihan untuk menentukan nama kegiatan dan periode
            kepengurusan. Kotak suara kemudian dibuka secara manual oleh admin.
          </p>
          <Link
            className="mt-5 inline-flex min-h-10 items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            href="/admin/pemilihan"
          >
            Buat pengaturan pemilihan
          </Link>
        </div>
      )}
    </section>
  );
}
