"use client";

import { useActionState } from "react";

import {
  confirmVoterImport,
  previewVoterImport,
} from "./actions";
import { initialVoterImportState } from "./form-state";

export function VoterImportForm() {
  const [previewState, previewAction, isPreviewPending] = useActionState(
    previewVoterImport,
    initialVoterImportState,
  );
  const [confirmState, confirmAction, isConfirmPending] = useActionState(
    confirmVoterImport,
    initialVoterImportState,
  );

  return (
    <div className="space-y-5">
      <form action={previewAction} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="file">
            File pemilih
          </label>
          <input
            accept=".xlsx,.csv"
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
            id="file"
            name="file"
            required
            type="file"
          />
          <p className="text-xs leading-5 text-slate-500">
            Format: nis, nama, kelas, jenis_kelamin. Maksimal 1.500 baris dan
            2 MB.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="min-h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isPreviewPending}
            type="submit"
          >
            {isPreviewPending ? "Membaca file..." : "Preview impor"}
          </button>
          <a
            className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            href="/admin/template-pemilih"
          >
            Unduh template
          </a>
        </div>
      </form>

      {previewState.message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            previewState.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {previewState.message}
        </p>
      ) : null}

      {previewState.preview ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Valid: {previewState.preview.summary.validCount}
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Tidak valid: {previewState.preview.summary.invalidCount}
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Duplikat: {previewState.preview.summary.duplicateCount}
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Baris</th>
                  <th className="px-3 py-2 font-medium">NIS</th>
                  <th className="px-3 py-2 font-medium">Nama</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {previewState.preview.rows.slice(0, 100).map((row) => (
                  <tr key={`${row.rowNumber}-${row.nis}`}>
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.nis}</td>
                    <td className="px-3 py-2">{row.nama}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={confirmAction}>
            <input
              name="validRowsJson"
              type="hidden"
              value={previewState.validRowsJson}
            />
            <button
              className="min-h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isConfirmPending || previewState.preview.summary.validCount === 0}
              type="submit"
            >
              {isConfirmPending ? "Mengimpor..." : "Konfirmasi impor"}
            </button>
          </form>
        </div>
      ) : null}

      {confirmState.message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            confirmState.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {confirmState.message}
        </p>
      ) : null}
    </div>
  );
}
