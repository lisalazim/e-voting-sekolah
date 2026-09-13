"use client";

import { useEffect, useRef, useState } from "react";

import type { PublicAnnouncementState, PublicFinalResults } from "./types";

type AnnouncementStageProps = {
  state: PublicAnnouncementState;
};

type ResultResponse =
  | {
      status: "success";
      results: PublicFinalResults;
    }
  | {
      status: "not_ready" | "not_revealed";
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResultResponse(value: unknown): value is ResultResponse {
  if (!isRecord(value) || typeof value.status !== "string") {
    return false;
  }

  if (value.status === "success") {
    return isRecord(value.results);
  }

  return value.status === "not_ready" || value.status === "not_revealed";
}

function formatPercentage(value: number): string {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

function getSyncedNow(serverNow: string, mountedAt: number): number {
  const serverNowMs = new Date(serverNow).getTime();
  const elapsedMs = Date.now() - mountedAt;
  return serverNowMs + elapsedMs;
}

async function fetchFinalResults(): Promise<ResultResponse> {
  const response = await fetch("/pengumuman/hasil", {
    cache: "no-store",
  });
  const payload: unknown = await response.json();

  if (isResultResponse(payload)) {
    return payload;
  }

  return {
    message: "Respons hasil tidak valid.",
    status: "not_ready",
  };
}

export function AnnouncementStage({ state }: AnnouncementStageProps) {
  const revealAt = state.resultsRevealedAt
    ? new Date(state.resultsRevealedAt).getTime()
    : null;
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [results, setResults] = useState<PublicFinalResults | null>(null);
  const [message, setMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const didFetchRef = useRef(false);
  const lastBeepRef = useRef<number | null>(null);
  const mountedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!revealAt) {
      return;
    }

    if (mountedAtRef.current === null) {
      mountedAtRef.current = Date.now();
    }

    const updateRemainingSeconds = () => {
      const mountedAt = mountedAtRef.current ?? Date.now();
      const syncedNow = getSyncedNow(state.serverNow, mountedAt);
      setRemainingSeconds(Math.max(0, Math.ceil((revealAt - syncedNow) / 1000)));
    };

    updateRemainingSeconds();
    const intervalId = window.setInterval(() => {
      updateRemainingSeconds();
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [revealAt, state.serverNow]);

  useEffect(() => {
    if (!isSoundEnabled || remainingSeconds <= 0) {
      return;
    }

    if (lastBeepRef.current === remainingSeconds) {
      return;
    }

    lastBeepRef.current = remainingSeconds;
    try {
      const audioContext = new window.AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = 520;
      gain.gain.value = 0.04;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.08);
    } catch {}
  }, [isSoundEnabled, remainingSeconds]);

  useEffect(() => {
    if (!revealAt || remainingSeconds > 0 || didFetchRef.current) {
      return;
    }

    didFetchRef.current = true;
    setIsFetching(true);
    fetchFinalResults()
      .then((response) => {
        if (response.status === "success") {
          setResults(response.results);
          setMessage("");
          return;
        }

        setMessage(response.message);
      })
      .catch(() => {
        setMessage("Koneksi gagal. Muat ulang halaman untuk mencoba lagi.");
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [remainingSeconds, revealAt]);

  const singleWinner =
    results?.candidates.filter(
      (candidate) => candidate.isTop && !candidate.isTiedTop,
    )[0] ?? null;
  const hasTie =
    results?.candidates.some((candidate) => candidate.isTiedTop) ?? false;

  return (
    <section className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {state.schoolLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="size-14 rounded-md bg-white object-contain p-1"
                src={state.schoolLogoUrl}
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-md border border-white/20 bg-white/10 text-lg font-bold">
                EV
              </div>
            )}
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
                {state.schoolName ?? "E-Voting Sekolah"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {state.electionTitle ?? "Pengumuman Hasil"}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Periode {state.electionTermLabel ?? "-"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="min-h-10 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={() => setIsSoundEnabled((current) => !current)}
              type="button"
            >
              Suara {isSoundEnabled ? "aktif" : "mati"}
            </button>
            <button
              className="min-h-10 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={() => {
                void document.documentElement.requestFullscreen?.();
              }}
              type="button"
            >
              Fullscreen
            </button>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-8">
          {results ? (
            <div className="w-full space-y-8">
              {singleWinner ? (
                <div className="relative overflow-hidden rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-5 text-center shadow-2xl">
                  <Confetti />
                  <p className="text-lg font-medium text-emerald-200">
                    Selamat kepada {singleWinner.candidateName}, Ketua OSIS
                    Terpilih Periode {results.electionTermLabel ?? "-"}
                  </p>
                </div>
              ) : hasTie ? (
                <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-5 text-center">
                  <p className="text-lg font-medium text-amber-100">
                    Perolehan suara tertinggi seri. Keputusan selanjutnya
                    mengikuti ketentuan panitia.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {results.candidates.map((candidate) => (
                  <article
                    className={`rounded-lg border p-4 shadow-2xl ${
                      candidate.isTop
                        ? "border-emerald-300 bg-emerald-400/10"
                        : "border-white/15 bg-white/10"
                    }`}
                    key={candidate.candidateId}
                  >
                    <div className="flex gap-4">
                      {candidate.candidatePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt=""
                          className="size-24 rounded-md object-cover"
                          src={candidate.candidatePhotoUrl}
                        />
                      ) : (
                        <div className="flex size-24 items-center justify-center rounded-md bg-white/10 text-2xl font-bold">
                          {candidate.ballotNumber}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-emerald-200">
                          Nomor {candidate.ballotNumber}
                        </p>
                        <h2 className="mt-1 text-xl font-semibold">
                          {candidate.candidateName}
                        </h2>
                        <p className="mt-3 text-3xl font-bold">
                          {candidate.voteCount}
                          <span className="ml-2 text-base font-medium text-slate-300">
                            suara
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-4 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-emerald-300 transition-[width] duration-1000 motion-reduce:transition-none"
                          style={{ width: `${candidate.percentage}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-slate-200">
                        {formatPercentage(candidate.percentage)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <p className="text-center text-sm text-slate-300">
                Total suara sah: {results.totalValidVotes}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
                Pengumuman hasil
              </p>
              <p className="mt-6 text-[8rem] font-black leading-none tracking-normal sm:text-[12rem] lg:text-[16rem]">
                {remainingSeconds}
              </p>
              <p className="mt-6 text-lg text-slate-200">
                {isFetching
                  ? "Mengambil hasil final..."
                  : "Hasil akan tampil serentak setelah hitung mundur selesai."}
              </p>
              {message ? (
                <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  {message}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, index) => index);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {pieces.map((piece) => (
        <span
          className="absolute top-3 size-2 rounded-sm bg-emerald-200 opacity-80 motion-safe:animate-bounce"
          key={piece}
          style={{
            left: `${(piece * 17) % 100}%`,
            animationDelay: `${piece * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}
