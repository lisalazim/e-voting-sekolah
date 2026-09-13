import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminResultsData } from "../../../../features/admin/results/queries";
import { ResultControls } from "../../../../features/admin/results/result-controls";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { formatDateTimeForZone } from "../../../../utils/date-time";

export const metadata: Metadata = {
  title: "Hasil | E-Voting Sekolah",
  description: "Penghitungan dan finalisasi hasil E-Voting Sekolah.",
};

function formatPercentage(value: number): string {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

export default async function AdminResultsPage() {
  const supabase = await createSupabaseServerClient();
  const data = await getAdminResultsData(supabase);

  if (!data) {
    redirect("/admin/login");
  }

  if (!data.school || !data.election) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Hasil
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Penghitungan Hasil
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

  const timeZone = data.school.timezone;
  const summaryItems = [
    {
      label: "Total pemilih",
      value: data.summary.totalVoters,
    },
    {
      label: "Sudah memilih",
      value: data.summary.votedCount,
    },
    {
      label: "Belum memilih",
      value: data.summary.notVotedCount,
    },
    {
      label: "Partisipasi",
      value: formatPercentage(data.summary.participationPercentage),
    },
    {
      label: "Suara sah tercatat",
      value: data.summary.totalValidVotes,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Hasil
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
              Status hasil
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {data.election.finalized_at ? "Final" : "Belum final"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data.election.published_at
                ? "Siap diumumkan"
                : "Belum siap diumumkan"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summaryItems.map((item) => (
          <div
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            key={item.label}
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {!data.canShowCandidateResults ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-amber-950">
            Perolehan kandidat disembunyikan
          </h3>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Sebelum kotak suara ditutup, admin hanya dapat melihat partisipasi
            agregat. Perolehan suara kandidat akan tersedia setelah status
            pemilihan `closed`.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-950">
              Perolehan suara kandidat
            </h3>
            {data.winnerState.type === "single" ? (
              <p className="mt-2 text-sm text-emerald-700">
                Suara tertinggi: {data.winnerState.candidate.name}
              </p>
            ) : data.winnerState.type === "tie" ? (
              <p className="mt-2 text-sm text-amber-700">
                Hasil seri pada suara tertinggi. Tidak ada pemenang tunggal
                otomatis.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Belum ada suara untuk menentukan suara tertinggi.
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Nomor</th>
                  <th className="px-4 py-3 font-medium">Nama kandidat</th>
                  <th className="px-4 py-3 font-medium">Suara</th>
                  <th className="px-4 py-3 font-medium">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.candidateResults.map((result) => (
                  <tr key={result.candidateId}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {result.ballotNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-950">
                      {result.name}
                      {result.isTiedTop ? (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                          Seri tertinggi
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {result.voteCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatPercentage(result.percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          Finalisasi dan publikasi
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Finalisasi tidak menghitung ulang isi suara. Rekap selalu dibaca dari
          agregasi langsung tabel `votes`.
        </p>
        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            Finalisasi:{" "}
            {data.election.finalized_at
              ? formatDateTimeForZone(data.election.finalized_at, timeZone)
              : "-"}
          </p>
          <p>
            Siap diumumkan:{" "}
            {data.election.published_at
              ? formatDateTimeForZone(data.election.published_at, timeZone)
              : "-"}
          </p>
        </div>
        <div className="mt-5">
          <ResultControls
            isClosed={data.election.status === "closed"}
            isFinalized={Boolean(data.election.finalized_at)}
            isPublished={Boolean(data.election.published_at)}
          />
        </div>
      </div>
    </section>
  );
}
