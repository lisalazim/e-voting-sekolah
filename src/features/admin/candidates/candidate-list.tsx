import Link from "next/link";

import { DeleteCandidateForm } from "./delete-candidate-form";
import type { AdminCandidate } from "./types";

type CandidateListProps = {
  candidates: AdminCandidate[];
};

export function CandidateList({ candidates }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Belum ada kandidat
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Tambahkan calon Ketua OSIS untuk kegiatan pemilihan yang aktif.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {candidates.map((candidate) => (
        <article
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          key={candidate.id}
        >
          <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {candidate.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`Foto ${candidate.name}`}
                  className="h-full w-full object-cover"
                  src={candidate.photo_url}
                />
              ) : (
                <span className="px-3 text-center text-xs text-slate-500">
                  Tanpa foto
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Nomor urut {candidate.ballot_number}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">
                    {candidate.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Kelas {candidate.class_name}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                    candidate.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {candidate.is_active ? "Aktif" : "Tidak aktif"}
                </span>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-slate-700">Visi</dt>
                  <dd className="mt-1 line-clamp-3 text-slate-600">
                    {candidate.vision || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Misi</dt>
                  <dd className="mt-1 line-clamp-3 text-slate-600">
                    {candidate.mission || "-"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  href={`/admin/kandidat?edit=${candidate.id}`}
                >
                  Edit
                </Link>
                <DeleteCandidateForm candidateId={candidate.id} />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
