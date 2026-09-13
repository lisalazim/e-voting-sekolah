import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsQueries = readFileSync(
  "src/features/admin/results/queries.ts",
  "utf8",
);
const resultsActions = readFileSync(
  "src/features/admin/results/actions.ts",
  "utf8",
);
const resultsPage = readFileSync(
  "src/app/admin/(dashboard)/hasil/page.tsx",
  "utf8",
);
const dashboardQueries = readFileSync(
  "src/features/admin/dashboard/queries.ts",
  "utf8",
);
const migration = readFileSync(
  "supabase/migrations/20260913140000_add_results_finalization_metadata.sql",
  "utf8",
);

test("hasil kandidat tersembunyi saat OPEN dan PAUSED", () => {
  assert.match(resultsQueries, /canShowCandidateResults = dashboardData\.election\.status === "closed"/);
  assert.doesNotMatch(resultsQueries, /status === "open".*candidateResults/s);
  assert.doesNotMatch(resultsQueries, /status === "paused".*candidateResults/s);
});

test("hasil kandidat tampil saat CLOSED", () => {
  assert.match(resultsQueries, /dashboardData\.election\.status === "closed"/);
  assert.match(resultsPage, /Perolehan suara kandidat/);
});

test("total suara memakai jumlah rows votes", () => {
  assert.match(resultsQueries, /const totalValidVotes = votes\.length/);
});

test("persentase dihitung dari part dan total", () => {
  assert.match(resultsQueries, /Math\.round\(\(part \/ total\) \* 10000\) \/ 100/);
});

test("hasil seri tidak menghasilkan pemenang tunggal", () => {
  assert.match(resultsQueries, /type: "tie"/);
  assert.match(resultsPage, /Tidak ada pemenang tunggal\s+otomatis/);
});

test("query hasil dibatasi ke sekolah admin", () => {
  assert.match(dashboardQueries, /\.eq\("id", admin\.profile\.school_id\)/);
  assert.match(resultsQueries, /getAdminDashboardData\(supabase\)/);
});

test("finalisasi hanya dapat dilakukan sekali", () => {
  assert.match(resultsActions, /\.is\("finalized_at", null\)/);
  assert.match(resultsActions, /Hasil sudah difinalisasi/);
});

test("migration menambah finalized_by dan audit actions", () => {
  assert.match(migration, /add column finalized_by uuid references public\.profiles/);
  assert.match(migration, /results\.finalized/);
  assert.match(migration, /results\.unpublished/);
});
