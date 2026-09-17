import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BallotBoxControls } from "../../../../features/admin/ballot-box/ballot-box-controls";
import { getAdminBallotBoxData } from "../../../../features/admin/ballot-box/queries";
import {
  getDatabaseStatusLabel,
  getReadinessChecklist,
  isReadyToOpen,
} from "../../../../features/admin/ballot-box/status";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { formatDateTimeForZone } from "../../../../utils/date-time";

export const metadata: Metadata = {
  title: "Kotak Suara | E-Voting Sekolah",
  description: "Kontrol status kotak suara E-Voting Sekolah.",
};

export default async function AdminBallotBoxPage() {
  const supabase = await createSupabaseServerClient();
  const data = await getAdminBallotBoxData(supabase);

  if (!data) {
    redirect("/admin/login");
  }

  if (!data.school || !data.election) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Kotak suara
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Kontrol Kotak Suara
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Buat identitas sekolah dan kegiatan pemilihan terlebih dahulu.
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

  const timeZone = data.school.timezone;
  const checklist = getReadinessChecklist(data.election, data.summary);
  const readyToOpen = isReadyToOpen(checklist);
  const summaryItems = [
    {
      label: "Kandidat aktif",
      value: data.summary.activeCandidateCount,
    },
    {
      label: "Pemilih",
      value: data.summary.totalVoterCount,
    },
    {
      label: "Memiliki token",
      value: data.summary.withTokenCount,
    },
    {
      label: "Sudah memilih",
      value: data.summary.votedCount,
    },
    {
      label: "Belum memilih",
      value: data.summary.notVotedCount,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Kotak suara
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
              Status kotak suara
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {getDatabaseStatusLabel(data.election.status)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            Informasi jadwal (tidak mengendalikan kotak suara)
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Mulai</p>
              <p className="mt-2 text-base text-slate-950">
                {formatDateTimeForZone(data.election.starts_at, timeZone)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Selesai</p>
              <p className="mt-2 text-base text-slate-950">
                {formatDateTimeForZone(data.election.ends_at, timeZone)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            Ringkasan kesiapan
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div className="rounded-md border border-slate-200 p-3" key={item.label}>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          Checklist sebelum membuka
        </h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {checklist.map((item) => (
            <li
              className={`rounded-md border px-3 py-2 text-sm ${
                item.isReady
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
              key={item.label}
            >
              {item.isReady ? "Siap" : "Belum siap"} - {item.label}
            </li>
          ))}
        </ul>
        {!readyToOpen ? (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Tombol buka dinonaktifkan sampai seluruh checklist terpenuhi.
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          Operasi kotak suara
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Semua perubahan status diverifikasi ulang di server berdasarkan status
          database terkini dan sekolah admin yang sedang masuk.
        </p>
        <div className="mt-5">
          <BallotBoxControls
            databaseStatus={data.election.status}
            isReadyToOpen={readyToOpen}
          />
        </div>
      </div>
    </section>
  );
}
