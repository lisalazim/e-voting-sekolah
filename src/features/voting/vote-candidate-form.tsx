"use client";

import { useActionState } from "react";

import { submitVote } from "./actions";
import { initialVotingFormState } from "./state";
import type { VotingCandidate } from "./queries";

type VoteCandidateFormProps = {
  candidates: VotingCandidate[];
};

export function VoteCandidateForm({ candidates }: VoteCandidateFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitVote,
    initialVotingFormState,
  );

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        if (!window.confirm("Kirim suara Anda? Pilihan tidak dapat diubah.")) {
          event.preventDefault();
        }
      }}
    >
      <fieldset className="space-y-4">
        <legend className="sr-only">Pilih kandidat</legend>
        {candidates.map((candidate) => (
          <label
            className="grid cursor-pointer gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition focus-within:border-emerald-600 hover:border-emerald-300 sm:grid-cols-[140px_1fr]"
            key={candidate.id}
          >
            <div className="aspect-square overflow-hidden rounded-md bg-slate-100">
              {candidate.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={candidate.photoUrl}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-semibold text-slate-400">
                  {candidate.ballotNumber}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  className="mt-1 h-5 w-5 accent-emerald-700"
                  name="candidateId"
                  required
                  type="radio"
                  value={candidate.id}
                />
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-700">
                    Nomor {candidate.ballotNumber}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">
                    {candidate.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {candidate.className ?? "-"}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Visi</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {candidate.vision || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Misi</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {candidate.mission || "-"}
                  </p>
                </div>
              </div>
            </div>
          </label>
        ))}
      </fieldset>

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
        className="min-h-11 w-full rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Mengirim suara..." : "Konfirmasi dan Kirim Suara"}
      </button>
    </form>
  );
}
