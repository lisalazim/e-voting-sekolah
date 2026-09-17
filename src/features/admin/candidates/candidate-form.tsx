"use client";

import { useActionState, useState } from "react";

import { initialAdminFormState } from "../form-state";
import { saveCandidate } from "./actions";
import type { AdminCandidate, CandidateFormMode } from "./types";

type CandidateFormProps = {
  candidate: AdminCandidate | null;
  mode: CandidateFormMode;
};

export function CandidateForm({ candidate, mode }: CandidateFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveCandidate,
    initialAdminFormState,
  );
  const [previewUrl, setPreviewUrl] = useState(candidate?.photo_url ?? "");

  return (
    <form action={formAction} className="space-y-5">
      <input name="candidateId" type="hidden" value={candidate?.id ?? ""} />

      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <div className="space-y-3">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Preview foto kandidat"
                className="h-full w-full object-cover"
                src={previewUrl}
              />
            ) : (
              <span className="px-3 text-center text-sm text-slate-500">
                Preview foto
              </span>
            )}
          </div>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
            name="photo"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                setPreviewUrl(URL.createObjectURL(file));
              }
            }}
            type="file"
          />
          <p className="text-xs leading-5 text-slate-500">
            JPG, PNG, atau WebP. Maksimal 2 MB.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="ballotNumber">
              Nomor urut
            </label>
            <input
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              defaultValue={candidate?.ballot_number ?? ""}
              id="ballotNumber"
              min={1}
              name="ballotNumber"
              required
              type="number"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="className">
              Kelas
            </label>
            <input
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              defaultValue={candidate?.class_name ?? ""}
              id="className"
              name="className"
              required
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="name">
              Nama lengkap
            </label>
            <input
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              defaultValue={candidate?.name ?? ""}
              id="name"
              name="name"
              required
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="vision">
              Visi <span className="font-normal text-slate-500">(opsional)</span>
            </label>
            <textarea
              className="min-h-24 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              defaultValue={candidate?.vision ?? ""}
              id="vision"
              maxLength={800}
              name="vision"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="mission">
              Misi <span className="font-normal text-slate-500">(opsional)</span>
            </label>
            <textarea
              className="min-h-28 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              defaultValue={candidate?.mission ?? ""}
              id="mission"
              maxLength={1200}
              name="mission"
            />
          </div>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:col-span-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-emerald-700"
              defaultChecked={candidate?.is_active ?? true}
              name="isActive"
              type="checkbox"
            />
            Kandidat aktif dan dapat tampil pada halaman voting nanti.
          </label>
        </div>
      </div>

      {state.message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="min-h-11 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isPending}
        type="submit"
      >
        {isPending
          ? "Menyimpan..."
          : mode === "edit"
            ? "Simpan perubahan"
            : "Tambah kandidat"}
      </button>
    </form>
  );
}
