import type { PublicAnnouncementState } from "./types";

export function getSyncedNow(serverNow: string, syncedAt: number): number {
  const serverNowMs = new Date(serverNow).getTime();
  return serverNowMs + (Date.now() - syncedAt);
}

export function getRemainingSeconds(state: PublicAnnouncementState): number {
  if (!state.resultsRevealedAt) {
    return 0;
  }

  const revealAt = new Date(state.resultsRevealedAt).getTime();
  const serverNow = new Date(state.serverNow).getTime();
  return Math.max(0, Math.ceil((revealAt - serverNow) / 1000));
}
