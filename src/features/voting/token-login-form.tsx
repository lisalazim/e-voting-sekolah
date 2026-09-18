"use client";

import { useActionState, useState } from "react";

import { formatVoterTokenInput, normalizeVoterToken } from "../../utils/voter-token";
import { loginVoterWithToken } from "./actions";
import { initialVotingFormState } from "./state";

export function TokenLoginForm() {
  const [token, setToken] = useState("");
  const [state, formAction, isPending] = useActionState(
    loginVoterWithToken,
    initialVotingFormState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="token-input">
          Token pemilih
        </label>
        <input name="token" type="hidden" value={normalizeVoterToken(token)} />
        <input
          autoComplete="one-time-code"
          autoFocus
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-4 text-center text-2xl font-bold tracking-[0.16em] text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          enterKeyHint="done"
          id="token-input"
          inputMode="numeric"
          onChange={(event) => setToken(formatVoterTokenInput(event.target.value))}
          placeholder="Masukkan 6 digit token"
          required
          type="text"
          value={token}
        />
        <p className="text-center text-xs text-slate-500">
          Ketik enam angka. Tanda hubung akan dibuat otomatis.
        </p>
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
        className="min-h-11 w-full rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Memeriksa token..." : "Masuk"}
      </button>
    </form>
  );
}
