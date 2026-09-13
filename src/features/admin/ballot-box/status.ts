import type { AdminElection } from "../dashboard/queries";
import type {
  BallotBoxChecklistItem,
  BallotBoxSummary,
  EffectiveElectionStatus,
  ElectionStatus,
} from "./types";

export function getEffectiveElectionStatus(
  election: AdminElection,
  now: Date = new Date(),
): EffectiveElectionStatus {
  if (election.status === "archived") {
    return "archived";
  }

  if (election.status === "closed") {
    return "closed";
  }

  if (new Date(election.ends_at).getTime() <= now.getTime()) {
    return "closed";
  }

  return election.status;
}

export function getElectionStatusLabel(status: EffectiveElectionStatus): string {
  const labels: Record<EffectiveElectionStatus, string> = {
    archived: "Diarsipkan",
    closed: "Ditutup",
    draft: "Draf",
    open: "Dibuka",
    paused: "Dijeda",
    scheduled: "Terjadwal",
  };

  return labels[status];
}

export function getDatabaseStatusLabel(status: ElectionStatus): string {
  const labels: Record<ElectionStatus, string> = {
    archived: "Diarsipkan",
    closed: "Ditutup",
    draft: "Draf",
    open: "Dibuka",
    paused: "Dijeda",
    scheduled: "Terjadwal",
  };

  return labels[status];
}

export function getReadinessChecklist(
  election: AdminElection,
  summary: BallotBoxSummary,
  now: Date = new Date(),
): BallotBoxChecklistItem[] {
  const startsAt = new Date(election.starts_at).getTime();
  const endsAt = new Date(election.ends_at).getTime();
  const isValidPeriod =
    Number.isFinite(startsAt) && Number.isFinite(endsAt) && endsAt > startsAt;
  const isEndStillAvailable = Number.isFinite(endsAt) && endsAt > now.getTime();

  return [
    {
      isReady: isValidPeriod,
      label: "Jadwal mulai dan selesai valid",
    },
    {
      isReady: isEndStillAvailable,
      label: "Waktu selesai belum terlewati",
    },
    {
      isReady: summary.activeCandidateCount >= 2,
      label: "Minimal dua kandidat aktif",
    },
    {
      isReady: summary.totalVoterCount > 0,
      label: "Terdapat pemilih",
    },
    {
      isReady:
        summary.totalVoterCount > 0 &&
        summary.withTokenCount + summary.votedCount === summary.totalVoterCount,
      label: "Seluruh pemilih memiliki token",
    },
  ];
}

export function isReadyToOpen(checklist: BallotBoxChecklistItem[]): boolean {
  return checklist.every((item) => item.isReady);
}
