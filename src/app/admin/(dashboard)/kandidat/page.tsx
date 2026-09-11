import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CandidateForm } from "../../../../features/admin/candidates/candidate-form";
import { CandidateList } from "../../../../features/admin/candidates/candidate-list";
import { getAdminCandidatesData } from "../../../../features/admin/candidates/queries";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Kandidat | E-Voting Sekolah",
  description: "Pengelolaan calon Ketua OSIS.",
};

type CandidatePageProps = {
  searchParams: Promise<{
    edit?: string | string[];
  }>;
};

export default async function AdminCandidatesPage({
  searchParams,
}: CandidatePageProps) {
  const params = await searchParams;
  const editedCandidateId =
    typeof params.edit === "string" ? params.edit : undefined;
  const supabase = await createSupabaseServerClient();
  const data = await getAdminCandidatesData(supabase, editedCandidateId);

  if (!data) {
    redirect("/admin/login");
  }

  if (!data.school || !data.election) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Kandidat
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Pengelolaan Kandidat
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Buat pengaturan sekolah dan kegiatan pemilihan terlebih dahulu
            sebelum menambahkan kandidat.
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

  const isEditing = Boolean(data.editedCandidate);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
              Kandidat
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Calon Ketua OSIS
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Kelola kandidat untuk kegiatan {data.election.title}.
            </p>
          </div>
          {isEditing ? (
            <Link
              className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/admin/kandidat"
            >
              Tambah kandidat baru
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-slate-950">
            {isEditing ? "Edit kandidat" : "Tambah kandidat"}
          </h3>
          <p className="text-sm leading-6 text-slate-600">
            Nomor urut harus unik dalam satu kegiatan pemilihan.
          </p>
        </div>
        <CandidateForm
          candidate={data.editedCandidate}
          mode={isEditing ? "edit" : "create"}
        />
      </div>

      <CandidateList candidates={data.candidates} />
    </section>
  );
}
