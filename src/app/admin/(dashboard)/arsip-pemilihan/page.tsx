import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ArchiveElectionButton } from "../../../../features/admin/election-archive/archive-election-button";
import { DeleteElectionDialog } from "../../../../features/admin/election-archive/delete-election-dialog";
import { getAdminElectionArchiveData } from "../../../../features/admin/election-archive/queries";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { formatDateTimeForZone } from "../../../../utils/date-time";

export const metadata: Metadata = {
  title: "Arsip Pemilihan | E-Voting Sekolah",
  description: "Arsip pemilihan lama E-Voting Sekolah.",
};

function formatPercentage(value: number): string {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    archived: "Diarsipkan",
    closed: "Ditutup",
    draft: "Draf",
    open: "Dibuka",
    paused: "Dijeda",
    scheduled: "Terjadwal",
  };

  return labels[status] ?? status;
}

export default async function AdminElectionArchivePage() {
  const supabase = await createSupabaseServerClient();
  const data = await getAdminElectionArchiveData(supabase);

  if (!data) {
    redirect("/admin/login");
  }

  if (!data.school) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Data sekolah belum tersedia</h2>
        <p className="mt-2 text-sm leading-6">
          Lengkapi data sekolah sebelum mengelola arsip pemilihan.
        </p>
      </section>
    );
  }

  const timeZone = data.school.timezone;
  const canArchive =
    data.currentElection?.status === "closed" &&
    Boolean(data.currentElection.finalized_at);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Arsip
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Arsip Pemilihan
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Simpan hasil lama sebagai arsip, lalu buat pemilihan baru tanpa
          membuka kembali pemilihan yang sudah selesai.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          Pemilihan aktif
        </h3>
        {data.currentElection ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
            <div>
              <p className="text-xl font-semibold text-slate-950">
                {data.currentElection.title}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Periode: {data.currentElection.term_label ?? "-"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Jadwal:{" "}
                {formatDateTimeForZone(data.currentElection.starts_at, timeZone)}
                {" - "}
                {formatDateTimeForZone(data.currentElection.ends_at, timeZone)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Status: {getStatusLabel(data.currentElection.status)}
                {data.currentElection.is_test ? " - Pemilihan Percobaan" : ""}
              </p>
            </div>
            <ArchiveElectionButton canArchive={canArchive} />
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-sm leading-6 text-slate-600">
              Tidak ada pemilihan aktif. Pemilihan baru akan dibuat sebagai
              draf dan tidak menyalin kandidat, pemilih, token, sesi, suara,
              finalisasi, atau pengumuman dari arsip lama.
            </p>
            <Link
              className="mt-4 inline-flex min-h-10 items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              href="/admin/pemilihan"
            >
              Buat Pemilihan Baru
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {data.archivedElections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">
              Belum ada arsip pemilihan
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Pemilihan lama akan tampil di sini setelah diarsipkan.
            </p>
          </div>
        ) : (
          data.archivedElections.map((election) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              key={election.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xl font-semibold text-slate-950">
                    {election.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Periode: {election.term_label ?? "-"}
                    {election.is_test ? " - Pemilihan Percobaan" : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Jadwal: {formatDateTimeForZone(election.starts_at, timeZone)}
                    {" - "}
                    {formatDateTimeForZone(election.ends_at, timeZone)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Diarsipkan:{" "}
                    {election.archived_at
                      ? formatDateTimeForZone(election.archived_at, timeZone)
                      : "-"}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  {getStatusLabel(election.status)}
                </span>
              </div>

              {election.is_test ? (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <DeleteElectionDialog
                    electionId={election.id}
                    electionTitle={election.title}
                    termLabel={election.term_label}
                  />
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <SummaryCard label="Pemilih" value={election.summary.totalVoters} />
                <SummaryCard label="Sudah memilih" value={election.summary.votedCount} />
                <SummaryCard
                  label="Partisipasi"
                  value={formatPercentage(election.summary.participationPercentage)}
                />
                <SummaryCard
                  label="Suara sah"
                  value={election.summary.totalValidVotes}
                />
              </div>

              {election.candidateResults.length > 0 ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nomor</th>
                        <th className="px-4 py-3 font-medium">Kandidat</th>
                        <th className="px-4 py-3 font-medium">Suara</th>
                        <th className="px-4 py-3 font-medium">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {election.candidateResults.map((candidate) => (
                        <tr key={candidate.candidateId}>
                          <td className="whitespace-nowrap px-4 py-3">
                            {candidate.ballotNumber}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-950">
                            {candidate.name}
                            {candidate.isTiedTop ? (
                              <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                                Seri tertinggi
                              </span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {candidate.voteCount}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {formatPercentage(candidate.percentage)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
