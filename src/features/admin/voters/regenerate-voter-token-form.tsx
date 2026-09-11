"use client";

import { useActionState } from "react";

import { regenerateVoterToken } from "./token-actions";
import { initialVoterTokenSingleState } from "./token-state";

type RegenerateVoterTokenFormProps = {
  disabled: boolean;
  hasToken: boolean;
  voterId: string;
};

export function RegenerateVoterTokenForm({
  disabled,
  hasToken,
  voterId,
}: RegenerateVoterTokenFormProps) {
  const [state, formAction, isPending] = useActionState(
    regenerateVoterToken,
    initialVoterTokenSingleState,
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

        if (
          !window.confirm(
            hasToken
              ? "Regenerasi token akan membatalkan token lama. Lanjutkan?"
              : "Buat token untuk pemilih ini?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="voterId" type="hidden" value={voterId} />
      <button
        className="min-h-10 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        disabled={disabled || isPending}
        type="submit"
      >
        {isPending ? "Memproses..." : hasToken ? "Regenerasi token" : "Buat token"}
      </button>
      {state.message ? (
        <div
          className={`max-w-72 text-xs leading-5 ${
            state.status === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          <p>{state.message}</p>
          {state.token ? (
            <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 p-2 font-mono text-sm font-semibold text-amber-950">
              {state.nis} - {state.token}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
