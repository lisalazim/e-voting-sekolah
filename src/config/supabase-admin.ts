import "server-only";

export type SupabaseAdminConfig = {
  secretKey: string;
  url: string;
};

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL belum diatur pada environment server.");
  }

  if (!secretKey?.startsWith("sb_secret_")) {
    throw new Error(
      "SUPABASE_SECRET_KEY belum diatur atau bukan Supabase Secret Key.",
    );
  }

  return { secretKey, url };
}
