"use client";

import { useActionState } from "react";

import {
  generateMissingVoterTokens,
  regenerateAllUnvotedVoterTokens,
} from "./token-actions";
import { initialVoterTokenBatchState } from "./token-state";
import type { GeneratedVoterToken } from "./token-state";

type TokenBatchPanelProps = {
  missingTokenCount: number;
  votedCount: number;
  withTokenCount: number;
};

function escapeCsvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadTokenCsv(tokens: GeneratedVoterToken[]) {
  const header = "nama,kelas,token";
  const rows = tokens.map((token) =>
    [
      token.nama,
      token.kelas,
      token.token,
    ]
      .map(escapeCsvValue)
      .join(","),
  );
  const csv = `\uFEFF${[header, ...rows].join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "token-pemilih.csv";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 0);
}

export function TokenBatchPanel({
  missingTokenCount,
  votedCount,
  withTokenCount,
}: TokenBatchPanelProps) {
  const [generateState, generateFormAction, isGenerating] = useActionState(
    generateMissingVoterTokens,
    initialVoterTokenBatchState,
  );
  const [regenerateState, regenerateFormAction, isRegenerating] =
    useActionState(
      regenerateAllUnvotedVoterTokens,
      initialVoterTokenBatchState,
    );
  const displayTokens =
    regenerateState.tokens.length > 0
      ? regenerateState.tokens
      : generateState.tokens;
  const hasTokens = displayTokens.length > 0;
  const canRegenerateAll = missingTokenCount === 0 && withTokenCount > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Token pemilih
          </p>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">
            Pembuatan token akses
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Token asli hanya ditampilkan sekali setelah dibuat. Unduh CSV
            hasil pembuatan dan simpan di tempat yang aman untuk dicetak atau
            dibagikan oleh panitia.
          </p>
          <p className="mt-2 max-w-2xl text-sm font-medium text-amber-800">
            CSV token hanya dapat diunduh segera setelah pembuatan atau
            regenerasi.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <form
            action={generateFormAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "Buat token untuk semua pemilih yang belum memiliki token?",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <button
              className="min-h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isGenerating || missingTokenCount === 0}
              type="submit"
            >
              {isGenerating ? "Membuat token..." : "Generate token"}
            </button>
          </form>
          {canRegenerateAll ? (
            <form
              action={regenerateFormAction}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    [
                      "Regenerasi semua token pemilih yang belum memilih?",
                      "",
                      "Semua token lama milik pemilih yang belum memilih akan dibatalkan.",
                      "Kartu/file token lama tidak akan berlaku.",
                      "Token pemilih yang sudah memilih tidak akan diubah.",
                    ].join("\n"),
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <button
                className="min-h-10 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                disabled={isRegenerating}
                type="submit"
              >
                {isRegenerating
                  ? "Meregenerasi token..."
                  : "Regenerasi Semua Token yang Belum Memilih"}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Belum dibuat
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {missingTokenCount}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Sudah dibuat
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {withTokenCount}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Sudah memilih
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {votedCount}
          </p>
        </div>
      </div>

      {generateState.message ? (
        <p
          className={`mt-4 text-sm ${
            generateState.status === "success"
              ? "text-emerald-700"
              : "text-red-700"
          }`}
        >
          {generateState.message}
        </p>
      ) : null}

      {regenerateState.message ? (
        <p
          className={`mt-4 text-sm ${
            regenerateState.status === "success"
              ? "text-emerald-700"
              : "text-red-700"
          }`}
        >
          {regenerateState.message}
        </p>
      ) : null}

      {hasTokens ? (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Simpan token sekarang
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Token di bawah tidak dapat ditampilkan kembali setelah halaman
            ditutup atau dimuat ulang. Jangan unggah file token ke tempat
            publik.
          </p>
          <button
            className="mt-4 min-h-10 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
            onClick={() => downloadTokenCsv(displayTokens)}
            type="button"
          >
            Unduh CSV Token Sekarang
          </button>
          <div className="mt-4 max-h-72 overflow-auto rounded-md border border-amber-200 bg-white">
            <table className="min-w-full divide-y divide-amber-100 text-sm">
              <thead className="bg-amber-100 text-left text-amber-950">
                <tr>
                  <th className="px-3 py-2 font-medium">Nama</th>
                  <th className="px-3 py-2 font-medium">Kelas</th>
                  <th className="px-3 py-2 font-medium">Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {displayTokens.map((token) => (
                  <tr key={`${token.nama}-${token.kelas}-${token.token}`}>
                    <td className="px-3 py-2">{token.nama}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {token.kelas}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold">
                      {token.token}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
