import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";
import { getAdminDashboardData } from "../dashboard/queries";
import type { AdminDashboardData } from "../dashboard/queries";
import type {
  AnnouncementChecklistItem,
  AnnouncementStatus,
} from "./types";

export type AdminAnnouncementData = AdminDashboardData & {
  checklist: AnnouncementChecklistItem[];
  announcementStatus: AnnouncementStatus;
};

function getAnnouncementStatus(
  election: AdminDashboardData["election"],
  now: Date,
): AnnouncementStatus {
  if (!election?.published_at || !election.finalized_at || election.status !== "closed") {
    return "not_ready";
  }

  if (!election.announcement_started_at || !election.results_revealed_at) {
    return "ready";
  }

  if (new Date(election.results_revealed_at).getTime() > now.getTime()) {
    return "counting_down";
  }

  return "revealed";
}

function getAnnouncementChecklist(
  election: AdminDashboardData["election"],
): AnnouncementChecklistItem[] {
  return [
    {
      isReady: election?.status === "closed",
      label: "Kotak suara sudah ditutup",
    },
    {
      isReady: Boolean(election?.finalized_at),
      label: "Hasil sudah difinalisasi",
    },
    {
      isReady: Boolean(election?.published_at),
      label: "Hasil sudah ditandai siap diumumkan",
    },
    {
      isReady: !election?.announcement_started_at,
      label: "Pengumuman belum pernah dimulai",
    },
  ];
}

export async function getAdminAnnouncementData(
  supabase: SupabaseClient<Database>,
): Promise<AdminAnnouncementData | null> {
  const dashboardData = await getAdminDashboardData(supabase);

  if (!dashboardData) {
    return null;
  }

  return {
    ...dashboardData,
    announcementStatus: getAnnouncementStatus(dashboardData.election, new Date()),
    checklist: getAnnouncementChecklist(dashboardData.election),
  };
}
