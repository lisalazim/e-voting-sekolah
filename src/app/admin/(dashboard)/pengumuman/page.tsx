import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AnnouncementControls } from "../../../../features/admin/announcement/announcement-controls";
import { getAdminAnnouncementData } from "../../../../features/admin/announcement/queries";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { formatDateTimeForZone } from "../../../../utils/date-time";

export const metadata: Metadata = {
  title: "Pengumuman | E-Voting Sekolah",
  description: "Kontrol pengumuman hasil publik E-Voting Sekolah.",
};

function getAnnouncementStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    counting_down: "Countdown sedang berjalan",
    not_ready: "Belum siap diumumkan",
    ready: "Siap dimulai",
    revealed: "Hasil telah diumumkan",
  };

  return labels[status] ?? "Belum siap diumumkan";
}

export default async function AdminAnnouncementPage() {
  const supabase = await createSupabaseServerClient();
  const data = await getAdminAnnouncementData(supabase);

  if (!data) {
    redirect("/admin/login");
  }

  if (!data.school || !data.election) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Pengumuman
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Pengumuman Hasil
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Buat kegiatan pemilihan terlebih dahulu.
          </p>
          <Link
            className="mt-5 inline-flex min-h-10 items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            href="/admin/pemilihan"
          >
            Atur pemilihan
          </Link>
        </div>
      </section>
    );
  }

  const canStart = data.checklist.every((item) => item.isReady);
  const timeZone = data.school.timezone;

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Pengumuman
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {data.election.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Periode: {data.election.term_label ?? "-"}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Status pengumuman
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {getAnnouncementStatusLabel(data.announcementStatus)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            Checklist kesiapan
          </h3>
          <div className="mt-4 space-y-3">
            {data.checklist.map((item) => (
              <div
                className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                key={item.label}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-flex size-5 items-center justify-center rounded-full text-xs font-bold ${
                    item.isReady
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.isReady ? "OK" : "!"}
                </span>
                <p className="text-slate-700">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            Layar publik
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Countdown 10 detik dimulai pada halaman publik saat tombol mulai
            ditekan.
          </p>
          <Link
            className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            href="/pengumuman"
            target="_blank"
          >
            Buka layar publik
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          Mulai pengumuman
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Setelah dimulai, waktu reveal disimpan di server. Refresh halaman
          publik tidak akan mengulang countdown dari awal.
        </p>
        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            Mulai:{" "}
            {data.election.announcement_started_at
              ? formatDateTimeForZone(
                  data.election.announcement_started_at,
                  timeZone,
                )
              : "-"}
          </p>
          <p>
            Reveal:{" "}
            {data.election.results_revealed_at
              ? formatDateTimeForZone(data.election.results_revealed_at, timeZone)
              : "-"}
          </p>
        </div>
        <div className="mt-5">
          <AnnouncementControls canStart={canStart} />
        </div>
      </div>
    </section>
  );
}
