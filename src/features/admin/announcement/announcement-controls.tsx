"use client";

import { useActionState } from "react";

import { initialAdminFormState } from "../form-state";
import { startAnnouncement } from "./actions";

type AnnouncementControlsProps = {
  canStart: boolean;
};

export function AnnouncementControls({ canStart }: AnnouncementControlsProps) {
  const [state, action, isPending] = useActionState(
    startAnnouncement,
    initialAdminFormState,
  );

  return (
    <div className="space-y-3">
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Mulai pengumuman sekarang? Countdown 10 detik akan dimulai pada layar publik dan tidak dapat diulang.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <button
          className="min-h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canStart || isPending}
          type="submit"
        >
          {isPending ? "Memulai..." : "Mulai Pengumuman"}
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
