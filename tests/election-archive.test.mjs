import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260914100000_add_election_archiving.sql",
  "utf8",
);
const dashboardQueries = readFileSync(
  "src/features/admin/dashboard/queries.ts",
  "utf8",
);
const archiveActions = readFileSync(
  "src/features/admin/election-archive/actions.ts",
  "utf8",
);
const archiveQueries = readFileSync(
  "src/features/admin/election-archive/queries.ts",
  "utf8",
);
const electionActions = readFileSync(
  "src/features/admin/elections/actions.ts",
  "utf8",
);
const ballotBoxActions = readFileSync(
  "src/features/admin/ballot-box/actions.ts",
  "utf8",
);

test("CLOSED tetap tidak dapat dibuka kembali", () => {
  assert.match(ballotBoxActions, /status === "closed"/);
  assert.match(ballotBoxActions, /Status selesai tidak dapat dibuka kembali/);
});

test("election belum closed tidak dapat diarsipkan", () => {
  assert.match(archiveActions, /data\.election\.status !== "closed"/);
  assert.match(archiveActions, /hanya dapat diarsipkan setelah kotak suara ditutup/);
});

test("election closed tetapi belum finalized tidak dapat diarsipkan", () => {
  assert.match(archiveActions, /!data\.election\.finalized_at/);
  assert.match(archiveActions, /\.not\("finalized_at", "is", null\)/);
});

test("arsip tidak menghapus data historis", () => {
  assert.doesNotMatch(archiveActions, /\.delete\(/);
  assert.match(archiveActions, /archived_at/);
  assert.match(archiveActions, /election\.archived/);
});

test("satu sekolah hanya memiliki satu current election", () => {
  assert.match(migration, /create unique index elections_one_current_per_school_idx/);
  assert.match(migration, /where archived_at is null/);
});

test("election baru berstatus draft dan tidak menyalin data lama", () => {
  assert.match(electionActions, /status: "draft"/);
  assert.doesNotMatch(electionActions, /\.from\("candidates"\)\.insert/);
  assert.doesNotMatch(electionActions, /\.from\("voters"\)\.insert/);
  assert.doesNotMatch(electionActions, /\.from\("votes"\)\.insert/);
});

test("query aplikasi memakai election current yang belum diarsipkan", () => {
  assert.match(dashboardQueries, /\.is\("archived_at", null\)/);
  assert.match(dashboardQueries, /archived_at, is_test/);
});

test("admin sekolah lain tidak dapat melihat arsip", () => {
  assert.match(archiveQueries, /\.eq\("school_id", admin\.profile\.school_id\)/);
  assert.match(archiveQueries, /getCurrentAdmin\(supabase\)/);
});

test("halaman publik tidak memilih election yang diarsipkan", () => {
  assert.match(migration, /e\.archived_at is null/);
  assert.match(migration, /get_public_final_results/);
});
