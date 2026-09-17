"use client";

import { useActionState } from "react";

import { initialAdminFormState } from "../form-state";
import { updateBallotBoxStatus } from "./actions";
import type { BallotBoxTransition, ElectionStatus } from "./types";

type BallotBoxControlsProps = {
  databaseStatus: ElectionStatus;
  isReadyToOpen: boolean;
};

type ControlConfig = {
  confirmMessage: string;
  disabled: boolean;
  label: string;
  pendingLabel: string;
  transition: BallotBoxTransition;
  variant: "primary" | "secondary" | "danger";
};

function getButtonClass(variant: ControlConfig["variant"]): string {
  const base =
    "min-h-10 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";

  if (variant === "danger") {
    return `${base} border border-red-300 bg-white text-red-700 hover:bg-red-50`;
  }

  if (variant === "secondary") {
    return `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`;
  }

  return `${base} border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`;
}

export function BallotBoxControls({
  databaseStatus,
  isReadyToOpen,
}: BallotBoxControlsProps) {
  const [state, formAction, isPending] = useActionState(
    updateBallotBoxStatus,
    initialAdminFormState,
  );
  const isTerminal = databaseStatus === "closed" || databaseStatus === "archived";
  const controls: ControlConfig[] = [
    {
      confirmMessage: "Buka kotak suara sekarang? Pemilih dengan token akan dapat masuk dan memberikan suara.",
      disabled:
        !["draft", "scheduled", "paused"].includes(databaseStatus) ||
        !isReadyToOpen ||
        isTerminal,
      label: "Buka Kotak Suara",
      pendingLabel: "Membuka...",
      transition: "open",
      variant: "primary",
    },
    {
      confirmMessage: "Jeda pemilihan sementara? Pemilih tidak boleh memberikan suara sampai pemilihan dilanjutkan.",
      disabled: databaseStatus !== "open" || isTerminal,
      label: "Jeda Kotak Suara",
      pendingLabel: "Menjeda...",
      transition: "pause",
      variant: "secondary",
    },
    {
      confirmMessage: [
        "Tutup kotak suara secara permanen?",
        "",
        "Aksi ini tidak dapat dibatalkan melalui UI.",
        "Kotak suara yang sudah ditutup tidak dapat dibuka kembali.",
      ].join("\n"),
      disabled:
        !["open", "paused"].includes(databaseStatus) || isTerminal,
      label: "Tutup Permanen",
      pendingLabel: "Menutup...",
      transition: "close",
      variant: "danger",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {controls.map((control) => (
          <form
            action={formAction}
            key={control.transition}
            onSubmit={(event) => {
              if (
                control.disabled ||
                !window.confirm(control.confirmMessage)
              ) {
                event.preventDefault();
              }
            }}
          >
            <input
              name="transition"
              type="hidden"
              value={control.transition}
            />
            <button
              className={getButtonClass(control.variant)}
              disabled={control.disabled || isPending}
              type="submit"
            >
              {isPending ? control.pendingLabel : control.label}
            </button>
          </form>
        ))}
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
    </div>
  );
}
