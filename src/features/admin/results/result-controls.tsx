"use client";

import { useActionState } from "react";

import { initialAdminFormState } from "../form-state";
import {
  finalizeResults,
  publishResults,
  unpublishResults,
} from "./actions";

type ResultControlsProps = {
  isAnnouncementStarted: boolean;
  isClosed: boolean;
  isFinalized: boolean;
  isPublished: boolean;
};

export function ResultControls({
  isAnnouncementStarted,
  isClosed,
  isFinalized,
  isPublished,
}: ResultControlsProps) {
  const [finalizeState, finalizeAction, isFinalizing] = useActionState(
    finalizeResults,
    initialAdminFormState,
  );
  const [publishState, publishAction, isPublishing] = useActionState(
    publishResults,
    initialAdminFormState,
  );
  const [unpublishState, unpublishAction, isUnpublishing] = useActionState(
    unpublishResults,
    initialAdminFormState,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <form
          action={finalizeAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Finalisasi hasil? Setelah finalisasi, kandidat dan pengaturan penting pemilihan tidak dapat diedit melalui UI.",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <button
            className="min-h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!isClosed || isFinalized || isFinalizing}
            type="submit"
          >
            {isFinalizing ? "Memfinalisasi..." : "Finalisasi Hasil"}
          </button>
        </form>

        <form
          action={publishAction}
          onSubmit={(event) => {
            if (!window.confirm("Tandai hasil siap diumumkan?")) {
              event.preventDefault();
            }
          }}
        >
          <button
            className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            disabled={!isFinalized || isPublished || isPublishing}
            type="submit"
          >
            {isPublishing ? "Menyimpan..." : "Siap Diumumkan"}
          </button>
        </form>

        <form
          action={unpublishAction}
          onSubmit={(event) => {
            if (!window.confirm("Batalkan status siap diumumkan?")) {
              event.preventDefault();
            }
          }}
        >
          <button
            className="min-h-10 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            disabled={!isPublished || isAnnouncementStarted || isUnpublishing}
            type="submit"
          >
            {isUnpublishing ? "Membatalkan..." : "Batalkan Siap Diumumkan"}
          </button>
        </form>
      </div>

      {[finalizeState, publishState, unpublishState]
        .filter((state) => state.message)
        .map((state) => (
          <p
            className={`rounded-md border px-3 py-2 text-sm ${
              state.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
            key={state.message}
          >
            {state.message}
          </p>
        ))}
    </div>
  );
}
