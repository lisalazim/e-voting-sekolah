"use client";

import { useActionState, useState } from "react";

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
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
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
      <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="sr-only">Pilih kandidat</legend>
        {candidates.map((candidate) => {
          const isSelected = selectedCandidateId === candidate.id;

          return (
            <article
              className={`flex min-w-0 flex-col rounded-lg border p-6 shadow-sm transition ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
              key={candidate.id}
            >
              <div className="aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                {candidate.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-full w-full object-cover object-top"
                    src={candidate.photoUrl}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-semibold text-slate-400">
                    {candidate.ballotNumber}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col pt-4">
                <input
                  checked={isSelected}
                  className="sr-only"
                  name="candidateId"
                  onChange={() => setSelectedCandidateId(candidate.id)}
                  required
                  type="radio"
                  value={candidate.id}
                />
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-700">
                  Nomor {candidate.ballotNumber}
                </p>
                <h2 className="mt-1 break-words text-xl font-semibold text-slate-950">
                  {candidate.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {candidate.className ?? "-"}
                </p>
                {candidate.vision || candidate.mission ? (
                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                    {candidate.vision ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Visi</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {candidate.vision}
                        </p>
                      </div>
                    ) : null}
                    {candidate.mission ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Misi</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {candidate.mission}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <button
                  aria-pressed={isSelected}
                  className={`mt-4 min-h-11 w-full rounded-md px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                    isSelected
                      ? "bg-emerald-700 text-white hover:bg-emerald-800"
                      : "border border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50"
                  }`}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  type="button"
                >
                  {isSelected ? "Kandidat Dipilih" : "Pilih Kandidat"}
                </button>
              </div>
            </article>
          );
        })}
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

      <div className="flex w-full justify-center pt-2">
        <button
          className="min-h-11 w-full max-w-[340px] rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isPending || !selectedCandidateId}
          type="submit"
        >
          {isPending ? "Mengirim suara..." : "Konfirmasi dan Kirim Suara"}
        </button>
      </div>
    </form>
  );
}
