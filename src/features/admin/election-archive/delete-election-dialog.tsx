"use client";

import { useActionState, useState } from "react";

import { initialAdminFormState } from "../form-state";
import { deleteArchivedTestElection } from "./actions";

type DeleteElectionDialogProps = {
  electionId: string;
  electionTitle: string;
  termLabel: string | null;
};

export function DeleteElectionDialog({
  electionId,
  electionTitle,
  termLabel,
}: DeleteElectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [state, action, isPending] = useActionState(
    deleteArchivedTestElection,
    initialAdminFormState,
  );
  const isConfirmed = confirmation === "HAPUS";

  return (
    <div className="space-y-3">
      <button
        className="min-h-10 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Hapus Permanen
      </button>

      {state.message && !isOpen ? (
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

      {isOpen ? (
        <div
          aria-labelledby={`delete-election-title-${electionId}`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl sm:p-6">
            <h3
              className="text-lg font-semibold text-slate-950"
              id={`delete-election-title-${electionId}`}
            >
              Hapus pemilihan percobaan secara permanen?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-900">{electionTitle}</span>
              {termLabel ? `, periode ${termLabel}` : ""}. Tindakan ini akan
              menghapus kandidat, pemilih, token hash, sesi, suara, dan hasil.
              Data tidak dapat dipulihkan.
            </p>
            <p className="mt-3 text-sm font-medium text-red-700">
              Ketik HAPUS untuk melanjutkan.
            </p>

            <form action={action} className="mt-4 space-y-4">
              <input name="electionId" type="hidden" value={electionId} />
              <input
                autoComplete="off"
                className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                name="confirmation"
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="HAPUS"
                value={confirmation}
              />
              {state.message ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.message}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="min-h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={isPending}
                  onClick={() => {
                    setConfirmation("");
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="min-h-10 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!isConfirmed || isPending}
                  type="submit"
                >
                  {isPending ? "Menghapus..." : "Hapus Permanen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
