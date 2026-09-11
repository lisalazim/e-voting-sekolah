"use client";

import { useActionState } from "react";

import { initialAdminFormState } from "../form-state";
import { saveVoter } from "./actions";
import type { AdminVoter } from "./types";

type VoterFormProps = {
  voter: AdminVoter | null;
};

export function VoterForm({ voter }: VoterFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveVoter,
    initialAdminFormState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input name="voterId" type="hidden" value={voter?.id ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="externalId">
            NIS
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={voter?.external_id ?? ""}
            id="externalId"
            name="externalId"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="className">
            Kelas
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={voter?.class_name ?? ""}
            id="className"
            name="className"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="fullName">
            Nama
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={voter?.full_name ?? ""}
            id="fullName"
            name="fullName"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="gender">
            Jenis kelamin
          </label>
          <select
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={voter?.gender ?? "L"}
            id="gender"
            name="gender"
            required
          >
            <option value="L">L</option>
            <option value="P">P</option>
          </select>
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
        {isPending ? "Menyimpan..." : voter ? "Simpan perubahan" : "Tambah pemilih"}
      </button>
    </form>
  );
}
