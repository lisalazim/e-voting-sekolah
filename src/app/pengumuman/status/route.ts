import { NextResponse } from "next/server";

import { getPublicAnnouncementStateStrict } from "../../../features/announcement/queries";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const state = await getPublicAnnouncementStateStrict(supabase);

    return NextResponse.json(
      { state },
      {
        headers: noStoreHeaders,
      },
    );
  } catch {
    return NextResponse.json(
      {
        message: "Status pengumuman belum dapat diperiksa.",
        status: "connection_error",
      },
      {
        headers: noStoreHeaders,
        status: 503,
      },
    );
  }
}
