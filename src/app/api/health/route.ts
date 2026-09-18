import { NextResponse } from "next/server";

import { getSupabaseAdminConfig } from "../../../config/supabase-admin";
import { getSupabasePublicConfig } from "../../../config/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function isPublicConfigurationAvailable(): boolean {
  try {
    getSupabasePublicConfig();
    return true;
  } catch {
    return false;
  }
}

function isServerConfigurationAvailable(): boolean {
  try {
    getSupabaseAdminConfig();

    return Boolean(
      process.env.VOTER_TOKEN_PEPPER &&
        process.env.VOTER_TOKEN_PEPPER.length >= 32 &&
        process.env.VOTER_RATE_LIMIT_PEPPER &&
        process.env.VOTER_RATE_LIMIT_PEPPER.length >= 32,
    );
  } catch {
    return false;
  }
}

export function GET() {
  const publicConfiguration = isPublicConfigurationAvailable();
  const serverConfiguration = isServerConfigurationAvailable();
  const status = publicConfiguration && serverConfiguration ? "ok" : "degraded";

  return NextResponse.json(
    {
      configuration: {
        public: publicConfiguration ? "available" : "unavailable",
        server: serverConfiguration ? "available" : "unavailable",
      },
      status,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
      status: status === "ok" ? 200 : 503,
    },
  );
}
