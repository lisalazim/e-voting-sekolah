import type { Metadata } from "next";

import { AnnouncementStage } from "../../features/announcement/announcement-stage";
import { getPublicAnnouncementState } from "../../features/announcement/queries";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pengumuman Hasil | E-Voting Sekolah",
  description: "Layar pengumuman hasil E-Voting Sekolah.",
};

export default async function PublicAnnouncementPage() {
  const supabase = await createSupabaseServerClient();
  const state = await getPublicAnnouncementState(supabase);

  return <AnnouncementStage state={state} />;
}
