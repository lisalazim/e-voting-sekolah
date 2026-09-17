"use client";

import { useEffect, useRef, useState } from "react";

import type { PublicAnnouncementState, PublicFinalResults } from "./types";
import { getRemainingSeconds, getSyncedNow } from "./timing";

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

type StateResponse = {
  state: PublicAnnouncementState;
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

function isAnnouncementState(value: unknown): value is PublicAnnouncementState {
  return (
    isRecord(value) &&
    typeof value.status === "string" &&
    typeof value.serverNow === "string" &&
    ["not_ready", "waiting", "counting_down", "revealed"].includes(value.status)
  );
}

function isStateResponse(value: unknown): value is StateResponse {
  return isRecord(value) && isAnnouncementState(value.state);
}

function formatPercentage(value: number): string {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

function logAnnouncementDevelopment(
  event: string,
  details: Record<string, unknown> = {},
): void {
  if (process.env.NODE_ENV === "development") {
    console.info(`[announcement] ${event}`, details);
  }
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

async function fetchAnnouncementState(): Promise<PublicAnnouncementState> {
  const response = await fetch("/pengumuman/status", {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
    },
  });
  logAnnouncementDevelopment("status response", { httpStatus: response.status });
  const payload: unknown = await response.json();

  if (!response.ok || !isStateResponse(payload)) {
    throw new Error("Announcement state is unavailable");
  }

  return payload.state;
}

export function AnnouncementStage({ state }: AnnouncementStageProps) {
  const [announcementState, setAnnouncementState] = useState(state);
  const revealAt = announcementState.resultsRevealedAt
    ? new Date(announcementState.resultsRevealedAt).getTime()
    : null;
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(state),
  );
  const [results, setResults] = useState<PublicFinalResults | null>(null);
  const [message, setMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const lastBeepRef = useRef<number | null>(null);
  const requestInFlightRef = useRef(false);
  const statusRequestInFlightRef = useRef(false);
  const statusRequestSequenceRef = useRef(0);
  const pollingCompleteRef = useRef(Boolean(state.announcementStartedAt));
  const serverSyncedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (pollingCompleteRef.current) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;
    logAnnouncementDevelopment("polling started", { intervalMs: 1500 });

    const checkAnnouncementState = async () => {
      if (statusRequestInFlightRef.current || pollingCompleteRef.current) {
        return;
      }

      statusRequestInFlightRef.current = true;
      const requestSequence = statusRequestSequenceRef.current + 1;
      statusRequestSequenceRef.current = requestSequence;

      try {
        const nextState = await fetchAnnouncementState();

        if (cancelled || requestSequence !== statusRequestSequenceRef.current) {
          return;
        }

        const receivedAt = Date.now();
        const nextRemainingSeconds = getRemainingSeconds(nextState);
        serverSyncedAtRef.current = receivedAt;
        setRemainingSeconds(nextRemainingSeconds);
        setAnnouncementState(nextState);
        setMessage("");
        logAnnouncementDevelopment("state received", {
          announcementStartedAt: nextState.announcementStartedAt,
          remainingSeconds: nextRemainingSeconds,
          resultsRevealedAt: nextState.resultsRevealedAt,
          serverNow: nextState.serverNow,
          status: nextState.status,
        });

        if (nextState.announcementStartedAt && nextState.resultsRevealedAt) {
          pollingCompleteRef.current = true;
          if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
          logAnnouncementDevelopment("polling completed", {
            reason: "announcement_started",
          });
        }
      } catch {
        if (!cancelled) {
          setMessage("Koneksi sementara terganggu. Pemeriksaan akan diulang.");
        }
      } finally {
        statusRequestInFlightRef.current = false;
      }
    };

    void checkAnnouncementState();
    intervalId = window.setInterval(() => {
      void checkAnnouncementState();
    }, 1500);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      logAnnouncementDevelopment("polling stopped", {
        reason: pollingCompleteRef.current ? "completed" : "unmounted",
      });
    };
  }, []);

  useEffect(() => {
    if (!revealAt) {
      return;
    }

    if (serverSyncedAtRef.current === null) {
      serverSyncedAtRef.current = Date.now();
    }

    const updateRemainingSeconds = () => {
      const syncedNow = getSyncedNow(
        announcementState.serverNow,
        serverSyncedAtRef.current ?? Date.now(),
      );
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((revealAt - syncedNow) / 1000),
      );
      setRemainingSeconds(nextRemainingSeconds);
      logAnnouncementDevelopment("countdown calculated", {
        remainingSeconds: nextRemainingSeconds,
        resultsRevealedAt: announcementState.resultsRevealedAt,
        serverNow: new Date(syncedNow).toISOString(),
      });
    };

    updateRemainingSeconds();
    const intervalId = window.setInterval(() => {
      updateRemainingSeconds();
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [
    announcementState.resultsRevealedAt,
    announcementState.serverNow,
    revealAt,
  ]);

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
    if (!revealAt || remainingSeconds > 0 || results) {
      return;
    }

    let cancelled = false;
    const loadResults = async () => {
      if (requestInFlightRef.current) {
        return;
      }

      requestInFlightRef.current = true;
      setIsFetching(true);

      try {
        const response = await fetchFinalResults();

        if (cancelled) {
          return;
        }

        if (response.status === "success") {
          setResults(response.results);
          setMessage("");
          return;
        }

        setMessage(response.message);
      } catch {
        if (!cancelled) {
          setMessage("Koneksi sementara terganggu. Pengambilan hasil akan diulang.");
        }
      } finally {
        requestInFlightRef.current = false;
        setIsFetching(false);
      }
    };

    void loadResults();
    const intervalId = window.setInterval(() => {
      void loadResults();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [remainingSeconds, results, revealAt]);

  if (
    announcementState.status === "not_ready" ||
    announcementState.status === "waiting"
  ) {
    return (
      <WaitingScreen
        message={
          announcementState.status === "waiting"
            ? "Pengumuman akan segera dimulai."
            : "Hasil pemilihan belum diumumkan."
        }
        state={announcementState}
        statusMessage={message}
      />
    );
  }

  const singleWinner =
    results?.candidates.filter(
      (candidate) => candidate.isTop && !candidate.isTiedTop,
    )[0] ?? null;
  const hasTie =
    results?.candidates.some((candidate) => candidate.isTiedTop) ?? false;
  const hasNoVotes = results?.totalValidVotes === 0;

  return (
    <section className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {announcementState.schoolLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="size-14 rounded-md bg-white object-contain p-1"
                src={announcementState.schoolLogoUrl}
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-md border border-white/20 bg-white/10 text-lg font-bold">
                EV
              </div>
            )}
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
                {announcementState.schoolName ?? "E-Voting Sekolah"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {announcementState.electionTitle ?? "Pengumuman Hasil"}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Periode {announcementState.electionTermLabel ?? "-"}
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
              {hasNoVotes ? (
                <div className="rounded-lg border border-white/15 bg-white/10 px-6 py-16 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Hasil pemilihan
                  </p>
                  <h2 className="mt-4 text-3xl font-bold sm:text-5xl">
                    Belum ada suara sah yang tercatat
                  </h2>
                  <p className="mt-4 text-lg text-slate-300">
                    Tidak ada kandidat terpilih pada pemilihan ini.
                  </p>
                </div>
              ) : singleWinner ? (
                <div className="relative overflow-hidden rounded-lg border border-emerald-300/40 bg-emerald-400/10 px-5 py-8 text-center shadow-2xl motion-safe:animate-[fade-in_700ms_ease-out] sm:px-10">
                  <Confetti />
                  <p className="relative text-sm font-bold uppercase tracking-[0.18em] text-emerald-200 sm:text-lg">
                    Ketua OSIS Terpilih
                  </p>
                  {singleWinner.candidatePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Foto ${singleWinner.candidateName}`}
                      className="relative mx-auto mt-6 aspect-[4/5] w-full max-w-xs rounded-lg border-4 border-white/80 object-cover object-top shadow-2xl sm:max-w-sm"
                      src={singleWinner.candidatePhotoUrl}
                    />
                  ) : (
                    <div className="relative mx-auto mt-6 flex aspect-[4/5] w-full max-w-xs items-center justify-center rounded-lg border-4 border-white/80 bg-white/10 text-7xl font-black sm:max-w-sm">
                      {singleWinner.ballotNumber}
                    </div>
                  )}
                  <p className="relative mt-6 text-lg font-semibold text-emerald-200">
                    Nomor Urut {singleWinner.ballotNumber}
                  </p>
                  <h2 className="relative mt-2 break-words text-4xl font-black leading-tight sm:text-6xl lg:text-7xl">
                    {singleWinner.candidateName}
                  </h2>
                  {singleWinner.candidateClassName ? (
                    <p className="relative mt-3 text-xl text-slate-200 sm:text-2xl">
                      Kelas {singleWinner.candidateClassName}
                    </p>
                  ) : null}
                  <p className="relative mt-5 text-2xl font-bold sm:text-3xl">
                    {singleWinner.voteCount} suara
                    <span className="mx-2 text-emerald-300" aria-hidden="true">
                      ·
                    </span>
                    {formatPercentage(singleWinner.percentage)}
                  </p>
                  <p className="relative mt-6 text-base text-slate-200 sm:text-xl">
                    {results.schoolName} · Periode {results.electionTermLabel ?? "-"}
                  </p>
                  <p className="relative mt-3 text-base font-medium text-emerald-100 sm:text-lg">
                    Selamat kepada {singleWinner.candidateName}
                  </p>
                </div>
              ) : hasTie ? (
                <div className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-6 py-8 text-center">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-200">
                    Hasil Seri
                  </p>
                  <p className="mt-3 text-xl font-semibold text-amber-100 sm:text-3xl">
                    Perolehan suara tertinggi seri. Keputusan selanjutnya
                    mengikuti ketentuan panitia.
                  </p>
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    {results.candidates
                      .filter((candidate) => candidate.isTiedTop)
                      .map((candidate) => (
                        <div
                          className="rounded-lg border border-amber-200/40 bg-slate-950/40 p-5"
                          key={candidate.candidateId}
                        >
                          {candidate.candidatePhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt={`Foto ${candidate.candidateName}`}
                              className="mx-auto aspect-[4/5] w-full max-w-xs rounded-md object-cover object-top"
                              src={candidate.candidatePhotoUrl}
                            />
                          ) : null}
                          <p className="mt-4 text-sm font-semibold text-amber-200">
                            Nomor {candidate.ballotNumber}
                          </p>
                          <h2 className="mt-1 text-3xl font-bold">
                            {candidate.candidateName}
                          </h2>
                          {candidate.candidateClassName ? (
                            <p className="mt-2 text-base text-slate-200">
                              Kelas {candidate.candidateClassName}
                            </p>
                          ) : null}
                          <p className="mt-3 text-xl font-semibold">
                            {candidate.voteCount} suara · {formatPercentage(candidate.percentage)}
                          </p>
                        </div>
                      ))}
                  </div>
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
                          className="size-24 rounded-md object-cover object-top"
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
                        {candidate.candidateClassName ? (
                          <p className="mt-1 text-sm text-slate-300">
                            Kelas {candidate.candidateClassName}
                          </p>
                        ) : null}
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

function WaitingScreen({
  message,
  state,
  statusMessage,
}: {
  message: string;
  state: PublicAnnouncementState;
  statusMessage: string;
}) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-8 text-white">
      <div className="w-full max-w-3xl text-center">
        {state.schoolLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="mx-auto size-20 rounded-lg bg-white object-contain p-2"
            src={state.schoolLogoUrl}
          />
        ) : null}
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
          {state.schoolName ?? "E-Voting Sekolah"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
          {state.electionTitle ?? "Pengumuman Hasil"}
        </h1>
        <p className="mt-3 text-base text-slate-300">
          Periode {state.electionTermLabel ?? "-"}
        </p>
        <p className="mt-10 text-2xl font-semibold sm:text-4xl">{message}</p>
        {statusMessage ? (
          <p className="mt-5 text-sm text-amber-200">{statusMessage}</p>
        ) : null}
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
