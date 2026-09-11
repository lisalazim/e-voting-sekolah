"use client";

import { useActionState } from "react";

import { toDateTimeLocalValue } from "../../../utils/date-time";
import type { AdminElection, AdminSchool } from "../dashboard/queries";
import { initialAdminFormState } from "../form-state";
import { saveElectionSettings } from "./actions";

type ElectionSettingsFormProps = {
  election: AdminElection | null;
  school: AdminSchool;
};

export function ElectionSettingsForm({ election, school }: ElectionSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveElectionSettings,
    initialAdminFormState,
  );
  const resultsArePublic = election?.results_visibility === "public";

  return (
    <form action={formAction} className="space-y-5">
      <input name="electionId" type="hidden" value={election?.id ?? ""} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="title">
            Nama kegiatan
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={election?.title ?? "Pemilihan Ketua OSIS"}
            id="title"
            name="title"
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="termLabel">
            Periode kepengurusan
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={election?.term_label ?? ""}
            id="termLabel"
            name="termLabel"
            placeholder="Contoh: 2026/2027"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="startsAt">
            Tanggal dan jam mulai
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={toDateTimeLocalValue(election?.starts_at ?? null, school.timezone)}
            id="startsAt"
            name="startsAt"
            required
            type="datetime-local"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="endsAt">
            Tanggal dan jam selesai
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={toDateTimeLocalValue(election?.ends_at ?? null, school.timezone)}
            id="endsAt"
            name="endsAt"
            required
            type="datetime-local"
          />
        </div>
      </div>

      <label className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <input
          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700"
          defaultChecked={resultsArePublic}
          name="resultsVisibility"
          type="checkbox"
          value="public"
        />
        <span>
          Hasil boleh ditampilkan setelah diumumkan oleh panitia.
        </span>
      </label>

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
        {isPending ? "Menyimpan..." : "Simpan pemilihan"}
      </button>
    </form>
  );
}
