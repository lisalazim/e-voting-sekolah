import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260918100000_secure_voter_login_rate_limit.sql",
  "utf8",
);
const adminClient = readFileSync("src/lib/supabase/admin.ts", "utf8");
const adminConfig = readFileSync("src/config/supabase-admin.ts", "utf8");
const rateLimit = readFileSync("src/features/voting/rate-limit.ts", "utf8");
const actions = readFileSync("src/features/voting/actions.ts", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const tokenFormat = readFileSync("src/utils/voter-token.ts", "utf8");

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? listSourceFiles(path)
      : /\.(?:ts|tsx)$/.test(entry.name)
        ? [path]
        : [];
  });
}

test("RPC login lama dihapus dan signature baru hanya untuk service_role", () => {
  assert.match(
    migration,
    /drop function if exists public\.create_voter_session\(text, text, timestamptz\)/,
  );
  assert.match(
    migration,
    /revoke all on function public\.create_voter_session\([\s\S]*?from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.create_voter_session\([\s\S]*?to service_role/,
  );
});

test("tabel rate limit durable tidak menyimpan identifier mentah", () => {
  const tableDefinition = migration.match(
    /create table public\.voter_login_rate_limits \(([\s\S]*?)\n\);/,
  );
  assert.ok(tableDefinition);
  assert.match(tableDefinition[1], /bucket_hash text not null/);
  assert.match(tableDefinition[1], /failure_count integer/);
  assert.doesNotMatch(
    tableDefinition[1],
    /ip_address|raw_ip|token_hash|token_raw|session_hash|voter_id|full_name|class_name|cookie/,
  );
  assert.match(migration, /enable row level security/);
  assert.match(
    migration,
    /revoke all on table public\.voter_login_rate_limits from public, anon, authenticated/,
  );
  assert.doesNotMatch(migration, /create policy[\s\S]*voter_login_rate_limits/i);
});

test("client dan token dibatasi lima sementara IP sekolah dibatasi seratus", () => {
  assert.match(migration, /v_client_failures >= 5/);
  assert.match(migration, /v_token_failures >= 5/);
  assert.match(migration, /v_ip_failures >= 100/);
  assert.match(migration, /interval '24 hours'/);
  assert.match(migration, /cleanup_voter_login_rate_limits/);
});

test("bucket dikunci sebelum lookup token sehingga request paralel tidak lolos", () => {
  const lockPosition = migration.indexOf("for update;");
  const voterLookupPosition = migration.indexOf("from public.voters v");
  assert.ok(lockPosition > 0);
  assert.ok(voterLookupPosition > lockPosition);
  assert.match(migration, /order by bucket_type, bucket_hash\s+for update/);
});

test("login gagal dicatat atomik dan login valid membuat session", () => {
  assert.match(migration, /failure_count = failure_count \+ 1/);
  assert.match(migration, /insert into public\.voter_sessions/);
  assert.match(migration, /v_has_voted/);
  assert.match(migration, /v_election_status = 'paused'/);
  assert.match(migration, /v_election_status = 'closed'/);
  assert.match(migration, /v_election_status <> 'open'/);
  assert.match(migration, /v_archived_at is not null/);
  assert.match(migration, /v_finalized_at is not null/);
  assert.match(migration, /v_token_revoked_at is not null/);
});

test("sukses mereset client dan token tetapi tidak bucket IP", () => {
  const successReset = migration.match(
    /update public\.voter_login_rate_limits\s+set\s+failure_count = 0[\s\S]*?return query select 'success'/,
  );
  assert.ok(successReset);
  assert.match(successReset[0], /bucket_type = 'client'/);
  assert.match(successReset[0], /bucket_type = 'token'/);
  assert.doesNotMatch(successReset[0], /bucket_type = 'ip'/);
});

test("privileged Supabase client benar-benar server-only tanpa session auth", () => {
  assert.match(adminClient, /^import "server-only";/);
  assert.match(adminConfig, /^import "server-only";/);
  assert.match(adminClient, /persistSession: false/);
  assert.match(adminClient, /autoRefreshToken: false/);
  assert.match(adminClient, /detectSessionInUrl: false/);
  assert.match(adminConfig, /process\.env\.SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(adminConfig, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
});

test("client component tidak mengimpor privileged client atau secret env", () => {
  const clientSources = listSourceFiles("src")
    .map((path) => ({ path, source: readFileSync(path, "utf8") }))
    .filter(({ source }) => source.startsWith('"use client"'));

  for (const { path, source } of clientSources) {
    assert.doesNotMatch(source, /lib\/supabase\/admin|SUPABASE_SECRET_KEY/, path);
  }
});

test("Server Action membentuk bucket sendiri dan memakai privileged RPC", () => {
  assert.match(actions, /getVoterLoginBuckets\(parsed\.data\.token\)/);
  assert.match(actions, /createSupabaseAdminClient\(\)/);
  assert.match(actions, /p_client_bucket_hash: buckets\.clientBucketHash/);
  assert.match(actions, /p_token_bucket_hash: buckets\.tokenBucketHash/);
  assert.match(actions, /p_ip_bucket_hash: buckets\.ipBucketHash/);
  assert.doesNotMatch(actions, /formData\.get\("(?:client|token|ip)BucketHash"\)/);
});

test("device cookie dan IP hanya dibuat pada boundary server tepercaya", () => {
  assert.match(rateLimit, /^import "server-only";/);
  assert.match(rateLimit, /randomBytes\(32\)/);
  assert.match(rateLimit, /httpOnly: true/);
  assert.match(rateLimit, /sameSite: "strict"/);
  assert.match(rateLimit, /process\.env\.VERCEL === "1"/);
  assert.match(rateLimit, /x-vercel-forwarded-for/);
  assert.match(rateLimit, /local-development/);
  assert.match(rateLimit, /createHmac\("sha256"/);
  assert.doesNotMatch(rateLimit, /console\./);
});

test("environment example memisahkan key publik dan secret server", () => {
  assert.match(envExample, /^SUPABASE_URL=/m);
  assert.match(envExample, /^SUPABASE_SECRET_KEY=$/m);
  assert.match(envExample, /^VOTER_RATE_LIMIT_PEPPER=/m);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
});

test("format enam digit dan legacy tetap diterima", () => {
  assert.match(tokenFormat, /NEW_TOKEN_PATTERN/);
  assert.match(tokenFormat, /LEGACY_TOKEN_PATTERN/);
});
