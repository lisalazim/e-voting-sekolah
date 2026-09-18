import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const sourceFiles = listFiles("src").filter((path) => /\.(?:ts|tsx)$/.test(path));
const source = sourceFiles.map((path) => readFileSync(path, "utf8")).join("\n");
const envExample = readFileSync(".env.example", "utf8");
const healthRoute = readFileSync("src/app/api/health/route.ts", "utf8");
const adminLayout = readFileSync(
  "src/app/admin/(dashboard)/layout.tsx",
  "utf8",
);
const adminLogin = readFileSync("src/app/admin/login/page.tsx", "utf8");
const votingLayout = readFileSync("src/app/pilih/layout.tsx", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");
const candidateStorage = readFileSync(
  "src/features/admin/candidates/storage.ts",
  "utf8",
);
const voteHardening = readFileSync(
  "supabase/migrations/20260918110000_harden_raw_vote_access.sql",
  "utf8",
);

test("environment aplikasi lengkap dan secret tidak memakai NEXT_PUBLIC", () => {
  const names = [...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(
    [...new Set(names)].sort(),
    [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NODE_ENV",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_URL",
      "VERCEL",
      "VOTER_RATE_LIMIT_PEPPER",
      "VOTER_TOKEN_PEPPER",
    ],
  );
  assert.match(envExample, /^SUPABASE_SECRET_KEY=$/m);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_(?:.*SECRET|.*PEPPER)/);
});

test("admin dan alur pilih tidak diindeks", () => {
  for (const metadataSource of [adminLayout, adminLogin, votingLayout]) {
    assert.match(metadataSource, /robots:/);
    assert.match(metadataSource, /index: false/);
    assert.match(metadataSource, /follow: false/);
  }
});

test("health check aman dan tidak mengembalikan nilai konfigurasi", () => {
  assert.match(healthRoute, /runtime = "nodejs"/);
  assert.match(healthRoute, /Cache-Control": "no-store, max-age=0"/);
  assert.match(healthRoute, /"available" : "unavailable"/);
  assert.doesNotMatch(healthRoute, /secretKey|publishableKey|\.url\b/);
});

test("upload kandidat memberi ruang multipart tetapi file tetap maksimal 2 MB", () => {
  assert.match(nextConfig, /bodySizeLimit: "3mb"/);
  assert.match(candidateStorage, /MAX_CANDIDATE_PHOTO_SIZE = 2 \* 1024 \* 1024/);
});

test("anon tidak dapat membaca raw votes setelah hasil dipublikasi", () => {
  assert.match(voteHardening, /drop policy if exists "Results viewers can read votes"/);
  assert.match(voteHardening, /revoke all on table public\.votes from anon/);
  assert.match(voteHardening, /to authenticated/);
  assert.match(voteHardening, /p\.id = auth\.uid\(\)/);
  assert.doesNotMatch(voteHardening, /results_visibility = 'public'/);
});
