import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260913150000_add_public_announcement_flow.sql",
  "utf8",
);
const page = readFileSync("src/app/pengumuman/page.tsx", "utf8");
const stage = readFileSync(
  "src/features/announcement/announcement-stage.tsx",
  "utf8",
);
const route = readFileSync("src/app/pengumuman/hasil/route.ts", "utf8");
const adminActions = readFileSync(
  "src/features/admin/announcement/actions.ts",
  "utf8",
);

test("hasil tidak bocor sebelum waktu reveal", () => {
  assert.match(migration, /now\(\) < v_results_revealed_at/);
  assert.match(migration, /'not_revealed'::text/);
  assert.doesNotMatch(page, /getPublicFinalResults/);
  assert.match(route, /status: 425/);
});

test("halaman tunggu tersedia sebelum admin memulai", () => {
  assert.match(page, /Pengumuman akan segera dimulai/);
  assert.match(page, /Hasil pemilihan belum diumumkan/);
});

test("countdown tidak restart saat refresh", () => {
  assert.match(stage, /resultsRevealedAt/);
  assert.match(stage, /getSyncedNow\(state\.serverNow, mountedAt\)/);
  assert.doesNotMatch(stage, /setRemainingSeconds\(10\)/);
});

test("countdown sinkron memakai waktu server", () => {
  assert.match(migration, /server_now timestamptz/);
  assert.match(stage, /new Date\(serverNow\)\.getTime\(\)/);
  assert.match(stage, /revealAt - syncedNow/);
});

test("endpoint mengembalikan hasil setelah reveal", () => {
  assert.match(migration, /returns table \([\s\S]*total_valid_votes bigint/);
  assert.match(migration, /left join public\.votes/);
  assert.match(route, /response\.status === "success"/);
});

test("hasil seri dan satu pemenang dibedakan", () => {
  assert.match(migration, /is_tied_top boolean/);
  assert.match(stage, /!candidate\.isTiedTop/);
  assert.match(stage, /Perolehan suara tertinggi seri/);
});

test("persentase dan total dihitung server-side", () => {
  assert.match(migration, /count\(\*\)[\s\S]*from public\.votes/);
  assert.match(migration, /round\(\(candidate_vote_counts\.vote_count::numeric \/ v_total_valid_votes::numeric\) \* 100, 2\)/);
});

test("pengumuman hanya dapat dimulai sekali", () => {
  assert.match(adminActions, /\.is\("announcement_started_at", null\)/);
  assert.match(adminActions, /Pengumuman sudah pernah dimulai/);
  assert.match(migration, /results\.announcement_started/);
});
