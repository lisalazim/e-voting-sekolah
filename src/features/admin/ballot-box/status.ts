import type { AdminElection } from "../dashboard/queries";
import type {
  BallotBoxChecklistItem,
  BallotBoxSummary,
  ElectionStatus,
} from "./types";

export function getElectionStatusLabel(status: ElectionStatus): string {
  const labels: Record<ElectionStatus, string> = {
    archived: "Diarsipkan",
    closed: "Ditutup permanen",
    draft: "Belum dibuka",
    open: "Sedang dibuka",
    paused: "Dijeda sementara",
    scheduled: "Belum dibuka",
  };

  return labels[status];
}

export function getDatabaseStatusLabel(status: ElectionStatus): string {
  return getElectionStatusLabel(status);
}

export function getReadinessChecklist(
  _election: AdminElection,
  summary: BallotBoxSummary,
): BallotBoxChecklistItem[] {
  return [
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
        summary.withTokenCount === summary.totalVoterCount,
      label: "Seluruh pemilih memiliki token",
    },
  ];
}

export function isReadyToOpen(checklist: BallotBoxChecklistItem[]): boolean {
  return checklist.every((item) => item.isReady);
}
