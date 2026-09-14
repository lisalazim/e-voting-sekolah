"use client";

import { useActionState } from "react";

import { initialAdminFormState } from "../form-state";
import { archiveCurrentElection } from "./actions";

type ArchiveElectionButtonProps = {
  canArchive: boolean;
};

export function ArchiveElectionButton({ canArchive }: ArchiveElectionButtonProps) {
  const [state, action, isPending] = useActionState(
    archiveCurrentElection,
    initialAdminFormState,
  );

  return (
    <div className="space-y-3">
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Arsipkan pemilihan ini? Data kandidat, pemilih, suara, audit log, dan hasil lama tetap disimpan. Pemilihan yang sudah diarsipkan tidak menjadi pemilihan aktif.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <button
          className="min-h-10 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          disabled={!canArchive || isPending}
          type="submit"
        >
          {isPending ? "Mengarsipkan..." : "Arsipkan Pemilihan"}
        </button>
      </form>

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
    </div>
  );
}
