"use client";

import { useActionState } from "react";

import { initialAdminFormState } from "../form-state";
import { deleteVoter } from "./actions";

type DeleteVoterFormProps = {
  disabled: boolean;
  voterId: string;
};

export function DeleteVoterForm({ disabled, voterId }: DeleteVoterFormProps) {
  const [state, formAction, isPending] = useActionState(
    deleteVoter,
    initialAdminFormState,
  );

  return (
    <form
      action={formAction}
      className="space-y-1"
      onSubmit={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        if (!window.confirm("Hapus pemilih ini dari daftar?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="voterId" type="hidden" value={voterId} />
      <button
        className="min-h-10 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        disabled={disabled || isPending}
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
