import { NextResponse } from "next/server";

import { getPublicFinalResults } from "../../../features/announcement/queries";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const response = await getPublicFinalResults(supabase);

  if (response.status === "not_ready") {
    return NextResponse.json(
      {
        message: "Hasil pemilihan belum diumumkan.",
        status: response.status,
      },
      { status: 404 },
    );
  }

  if (response.status === "not_revealed") {
    return NextResponse.json(
      {
        message: "Hasil pemilihan belum dapat ditampilkan.",
        status: response.status,
      },
      { status: 425 },
    );
  }

  if (response.status === "success") {
    return NextResponse.json(
      {
        results: response.results,
        status: response.status,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      message: "Hasil pemilihan belum tersedia.",
      status: "not_ready",
    },
    { status: 404 },
  );
}
