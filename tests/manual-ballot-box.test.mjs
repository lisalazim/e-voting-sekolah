import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260917110000_make_ballot_box_manual.sql",
  "utf8",
);
const actions = readFileSync(
  "src/features/admin/ballot-box/actions.ts",
  "utf8",
);
const controls = readFileSync(
  "src/features/admin/ballot-box/ballot-box-controls.tsx",
  "utf8",
);
const statusHelpers = readFileSync(
  "src/features/admin/ballot-box/status.ts",
  "utf8",
);
const electionForm = readFileSync(
  "src/features/admin/elections/election-settings-form.tsx",
  "utf8",
);

test("draft dan scheduled dapat dibuka tanpa jadwal", () => {
  assert.match(actions, /allowedFrom: \["draft", "scheduled", "paused"\]/);
  assert.doesNotMatch(actions, /starts_at|ends_at|Date\.now/);
  assert.doesNotMatch(electionForm, /name="startsAt"|name="endsAt"/);
  assert.match(migration, /alter column starts_at drop not null/);
  assert.match(migration, /alter column ends_at drop not null/);
});

test("open dapat dijeda", () => {
  assert.match(actions, /pause:\s*{\s*allowedFrom: \["open"\]/);
  assert.match(actions, /target: "paused"/);
});

test("paused dapat dibuka kembali", () => {
  assert.match(actions, /allowedFrom: \["draft", "scheduled", "paused"\]/);
  assert.match(controls, /\["draft", "scheduled", "paused"\]/);
  assert.match(statusHelpers, /summary\.withTokenCount === summary\.totalVoterCount/);
  assert.doesNotMatch(statusHelpers, /withTokenCount \+ summary\.votedCount/);
});

test("open dan paused dapat ditutup permanen", () => {
  assert.match(actions, /close:\s*{\s*allowedFrom: \["open", "paused"\]/);
  assert.match(actions, /target: "closed"/);
  assert.match(controls, /Tutup Permanen/);
  assert.match(controls, /tidak dapat dibuka kembali/);
});

test("closed tetap terminal", () => {
  assert.match(actions, /status === "closed"/);
  assert.doesNotMatch(actions, /allowedFrom: \[[^\]]*"closed"/);
});

test("starts_at masa depan dan ends_at masa lalu tidak mengendalikan voting", () => {
  assert.doesNotMatch(migration, /e\.starts_at|e\.ends_at|v_starts_at|v_ends_at/);
  assert.doesNotMatch(actions, /starts_at|ends_at/);
});

test("cast_vote menolak semua status selain open", () => {
  assert.match(migration, /create or replace function public\.cast_vote/);
  assert.match(migration, /v_election_status = 'paused'/);
  assert.match(migration, /v_election_status = 'closed'/);
  assert.match(migration, /v_election_status <> 'open'/);
  assert.match(migration, /return query select 'not_open'/);
});

test("cast_vote hanya berhasil pada election open yang belum final atau arsip", () => {
  assert.match(migration, /v_election_status <> 'open'[\s\S]*v_archived_at is not null[\s\S]*v_finalized_at is not null/);
  assert.match(migration, /return query select 'success'/);
});

test("election arsip atau finalized tidak dapat diubah statusnya", () => {
  assert.match(actions, /data\.election\.finalized_at \|\| data\.election\.archived_at/);
  assert.match(actions, /\.is\("archived_at", null\)/);
  assert.match(actions, /\.is\("finalized_at", null\)/);
});

test("perubahan status memakai conditional update dan audit", () => {
  assert.match(actions, /\.in\("status", rule\.allowedFrom\)/);
  assert.match(actions, /election\.status_changed/);
  assert.match(actions, /from: data\.election\.status/);
  assert.match(actions, /to: rule\.target/);
});
