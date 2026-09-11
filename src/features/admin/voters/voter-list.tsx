import Link from "next/link";

import { DeleteVoterForm } from "./delete-voter-form";
import { RegenerateVoterTokenForm } from "./regenerate-voter-token-form";
import type { AdminVoter } from "./types";

type VoterListProps = {
  voters: AdminVoter[];
};

export function VoterList({ voters }: VoterListProps) {
  if (voters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Belum ada pemilih
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Tambahkan pemilih manual atau impor dari file .xlsx/.csv.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">NIS</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kelas</th>
              <th className="px-4 py-3 font-medium">JK</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {voters.map((voter) => {
              const statusLabel = voter.has_voted
                ? "Sudah memilih"
                : voter.token_hash
                  ? "Token sudah dibuat"
                  : "Belum dibuatkan token";
              const statusClass = voter.has_voted
                ? "bg-emerald-50 text-emerald-700"
                : voter.token_hash
                  ? "bg-amber-50 text-amber-800"
                  : "bg-slate-100 text-slate-600";

              return (
                <tr key={voter.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {voter.external_id}
                  </td>
                  <td className="min-w-56 px-4 py-3 font-medium text-slate-950">
                    {voter.full_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {voter.class_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {voter.gender ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        href={`/admin/pemilih?edit=${voter.id}`}
                      >
                        Edit
                      </Link>
                      <RegenerateVoterTokenForm
                        disabled={voter.has_voted}
                        hasToken={Boolean(voter.token_hash)}
                        voterId={voter.id}
                      />
                      <DeleteVoterForm
                        disabled={voter.has_voted}
                        voterId={voter.id}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
