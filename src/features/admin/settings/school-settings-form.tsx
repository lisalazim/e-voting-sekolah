"use client";

import { useActionState } from "react";

import { initialAdminFormState } from "../form-state";
import { updateSchoolSettings } from "./actions";

type SchoolSettingsFormProps = {
  adminName: string;
  schoolName: string;
  schoolSlug: string;
  timezone: string;
};

export function SchoolSettingsForm({
  adminName,
  schoolName,
  schoolSlug,
  timezone,
}: SchoolSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateSchoolSettings,
    initialAdminFormState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="schoolName">
            Nama sekolah
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={schoolName}
            id="schoolName"
            name="schoolName"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="schoolSlug">
            Slug sekolah
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={schoolSlug}
            id="schoolSlug"
            name="schoolSlug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="timezone">
            Zona waktu
          </label>
          <select
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={timezone || "Asia/Jakarta"}
            id="timezone"
            name="timezone"
            required
          >
            <option value="Asia/Jakarta">Asia/Jakarta</option>
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="adminName">
            Nama admin/pengelola
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            defaultValue={adminName}
            id="adminName"
            name="adminName"
            required
          />
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
        {isPending ? "Menyimpan..." : "Simpan pengaturan"}
      </button>
    </form>
  );
}
