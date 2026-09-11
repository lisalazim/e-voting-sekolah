import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import {
  getAdminVotersData,
  normalizeGender,
  normalizeTokenStatus,
} from "../../../../features/admin/voters/queries";
import { TokenBatchPanel } from "../../../../features/admin/voters/token-batch-panel";
import { VoterFilters } from "../../../../features/admin/voters/voter-filters";
import { VoterForm } from "../../../../features/admin/voters/voter-form";
import { VoterImportForm } from "../../../../features/admin/voters/voter-import-form";
import { VoterList } from "../../../../features/admin/voters/voter-list";
import { VoterPagination } from "../../../../features/admin/voters/voter-pagination";

export const metadata: Metadata = {
  title: "Pemilih | E-Voting Sekolah",
  description: "Pengelolaan daftar pemilih E-Voting Sekolah.",
};

type VotersPageProps = {
  searchParams: Promise<{
    edit?: string | string[];
    jk?: string | string[];
    kelas?: string | string[];
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export default async function AdminVotersPage({ searchParams }: VotersPageProps) {
  const params = await searchParams;
  const query = getSingleParam(params.q);
  const className = getSingleParam(params.kelas);
  const gender = normalizeGender(getSingleParam(params.jk) ?? null);
  const tokenStatus = normalizeTokenStatus(getSingleParam(params.status) ?? null);
  const page = Number(getSingleParam(params.page) ?? "1");
  const editedVoterId = getSingleParam(params.edit);
  const supabase = await createSupabaseServerClient();
  const data = await getAdminVotersData(
    supabase,
    {
      className,
      gender,
      page: Number.isFinite(page) ? page : 1,
      query,
      tokenStatus,
    },
    editedVoterId,
  );

  if (!data) {
    redirect("/admin/login");
  }

  if (!data.school || !data.election) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Pemilih
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Daftar Pemilih
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Buat pengaturan sekolah dan kegiatan pemilihan terlebih dahulu
            sebelum menambahkan pemilih.
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

  const currentSearchParams = new URLSearchParams();

  if (query) currentSearchParams.set("q", query);
  if (className) currentSearchParams.set("kelas", className);
  if (gender) currentSearchParams.set("jk", gender);
  if (tokenStatus) currentSearchParams.set("status", tokenStatus);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
              Pemilih
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Daftar Pemilih
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Kelola pemilih untuk kegiatan {data.election.title}. NIS
              diperlakukan sebagai teks agar angka nol di depan tetap aman.
            </p>
          </div>
          {data.editedVoter ? (
            <Link
              className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/pemilih"
            >
              Tambah pemilih baru
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          {data.editedVoter ? "Edit pemilih" : "Tambah pemilih"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Status memilih tidak dapat diubah dari halaman ini.
        </p>
        <div className="mt-5">
          <VoterForm voter={data.editedVoter} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-950">Impor pemilih</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Unggah file untuk preview. Data baru disimpan setelah tombol
          Konfirmasi Impor ditekan.
        </p>
        <div className="mt-5">
          <VoterImportForm />
        </div>
      </div>

      <TokenBatchPanel
        missingTokenCount={data.tokenCounts.missingToken}
        votedCount={data.tokenCounts.voted}
        withTokenCount={data.tokenCounts.withToken}
      />

      <VoterFilters
        classNameValue={className}
        classOptions={data.classOptions}
        gender={gender}
        query={query}
        tokenStatus={tokenStatus}
      />

      <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>Total pemilih: {data.totalCount}</p>
        <p>
          Token dibuat: {data.tokenCounts.withToken} | Belum dibuat:{" "}
          {data.tokenCounts.missingToken}
        </p>
      </div>
      <VoterList voters={data.voters} />
      <VoterPagination
        page={data.page}
        pageCount={data.pageCount}
        searchParams={currentSearchParams}
      />
    </section>
  );
}
