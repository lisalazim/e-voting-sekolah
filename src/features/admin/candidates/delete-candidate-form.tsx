"use client";

import { useActionState } from "react";

import { initialAdminFormState } from "../form-state";
import { deleteCandidate } from "./actions";

type DeleteCandidateFormProps = {
  candidateId: string;
};

export function DeleteCandidateForm({ candidateId }: DeleteCandidateFormProps) {
  const [state, formAction, isPending] = useActionState(
    deleteCandidate,
    initialAdminFormState,
  );

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Hapus kandidat ini? Foto kandidat juga akan dibersihkan jika memungkinkan.",
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input name="candidateId" type="hidden" value={candidateId} />
      <button
        className="min-h-10 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Menghapus..." : "Hapus"}
      </button>
      {state.message ? (
        <p
          className={`text-xs ${
            state.status === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
