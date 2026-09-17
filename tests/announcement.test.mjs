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
const timing = readFileSync(
  "src/features/announcement/timing.ts",
  "utf8",
);
const route = readFileSync("src/app/pengumuman/hasil/route.ts", "utf8");
const statusRoute = readFileSync(
  "src/app/pengumuman/status/route.ts",
  "utf8",
);
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
  assert.match(stage, /Pengumuman akan segera dimulai/);
  assert.match(stage, /Hasil pemilihan belum diumumkan/);
});

test("countdown tidak restart saat refresh", () => {
  assert.match(stage, /resultsRevealedAt/);
  assert.match(stage, /getSyncedNow\([\s\S]*announcementState\.serverNow[\s\S]*serverSyncedAtRef\.current/);
  assert.doesNotMatch(stage, /setRemainingSeconds\(10\)/);
});

test("countdown sinkron memakai waktu server", () => {
  assert.match(migration, /server_now timestamptz/);
  assert.match(timing, /new Date\(serverNow\)\.getTime\(\)/);
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

test("halaman tunggu mendeteksi pengumuman dimulai tanpa reload", () => {
  assert.match(page, /AnnouncementStage state={state}/);
  assert.match(stage, /fetch\("\/pengumuman\/status"/);
  assert.match(stage, /window\.setInterval/);
  assert.match(stage, /1500/);
  assert.doesNotMatch(stage, /window\.location\.reload/);
});

test("endpoint status aman dan tidak menyertakan hasil", () => {
  assert.match(statusRoute, /getPublicAnnouncementStateStrict/);
  assert.match(statusRoute, /Cache-Control": "no-store,[^"]+"/);
  assert.doesNotMatch(statusRoute, /getPublicFinalResults|votes|candidate/);
});

test("polling berhenti setelah hasil berhasil ditampilkan", () => {
  assert.match(stage, /if \(!revealAt \|\| remainingSeconds > 0 \|\| results\)/);
  assert.match(stage, /window\.clearInterval\(intervalId\)/);
  assert.match(stage, /setResults\(response\.results\)/);
});

test("polling memakai lifecycle mount dan menolak respons yang tumpang tindih", () => {
  assert.match(stage, /statusRequestInFlightRef/);
  assert.match(stage, /statusRequestSequenceRef/);
  assert.match(stage, /pollingCompleteRef/);
  assert.match(stage, /\}, \[\]\);/);
  assert.match(stage, /announcementStartedAt && nextState\.resultsRevealedAt/);
});

test("diagnosis countdown hanya aktif saat development", () => {
  assert.match(stage, /process\.env\.NODE_ENV === "development"/);
  assert.match(stage, /polling started/);
  assert.match(stage, /polling stopped/);
  assert.match(stage, /status response/);
  assert.match(stage, /countdown calculated/);
});

test("status pengumuman menolak semua cache", () => {
  assert.match(statusRoute, /dynamic = "force-dynamic"/);
  assert.match(statusRoute, /revalidate = 0/);
  assert.match(statusRoute, /no-store, no-cache, max-age=0, must-revalidate/);
  assert.match(stage, /cache: "no-store"/);
});

test("hasil memiliki hero pemenang, seri setara, dan empty state nol suara", () => {
  assert.match(stage, /Ketua OSIS Terpilih/i);
  assert.match(stage, /text-4xl font-black[\s\S]*sm:text-6xl lg:text-7xl/);
  assert.match(stage, /object-cover object-top/);
  assert.match(stage, /candidate\.isTiedTop/);
  assert.match(stage, /Belum ada suara sah yang tercatat/);
  assert.match(stage, /motion-safe:/);
});
