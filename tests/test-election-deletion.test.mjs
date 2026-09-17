import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260917100000_delete_archived_test_election.sql",
  "utf8",
);
const actions = readFileSync(
  "src/features/admin/election-archive/actions.ts",
  "utf8",
);
const archivePage = readFileSync(
  "src/app/admin/(dashboard)/arsip-pemilihan/page.tsx",
  "utf8",
);

test("archived test election dapat dihapus melalui RPC atomik", () => {
  assert.match(migration, /delete_archived_test_election/);
  assert.match(migration, /for update/);
  assert.match(migration, /and e\.school_id = v_school_id/);
  assert.match(migration, /if not v_is_test/);
  assert.match(migration, /if v_archived_at is null/);
  assert.match(actions, /\.rpc\("delete_archived_test_election"/);
});

test("semua child data election dihapus sebelum election", () => {
  const sessions = migration.indexOf("delete from public.voter_sessions");
  const votes = migration.indexOf("delete from public.votes");
  const voters = migration.indexOf("delete from public.voters");
  const candidates = migration.indexOf("delete from public.candidates");
  const election = migration.indexOf("delete from public.elections");

  assert.ok(sessions < votes);
  assert.ok(votes < voters);
  assert.ok(voters < candidates);
  assert.ok(candidates < election);
});

test("current election dan election belum diarsipkan ditolak", () => {
  assert.match(migration, /if v_archived_at is null/);
  assert.match(migration, /'not_archived'/);
  assert.match(migration, /and archived_at is not null/);
});

test("election sungguhan ditolak dan tombol hanya tampil untuk test", () => {
  assert.match(migration, /if not v_is_test/);
  assert.match(migration, /'not_test'/);
  assert.match(archivePage, /election\.is_test \?/);
  assert.match(archivePage, /DeleteElectionDialog/);
});

test("sekolah dan profil admin tidak menjadi target delete", () => {
  assert.doesNotMatch(migration, /delete from public\.schools/);
  assert.doesNotMatch(migration, /delete from public\.profiles/);
});

test("election lain tidak terdampak", () => {
  assert.match(migration, /where election_id = p_election_id/g);
  assert.match(migration, /where id = p_election_id/);
  assert.match(migration, /and school_id = v_school_id/);
});

test("audit deletion tetap tersimpan di tingkat sekolah", () => {
  assert.match(migration, /insert into public\.audit_logs/);
  assert.match(migration, /'election\.test_deleted'/);
  assert.match(migration, /'election_title', v_election_title/);
  assert.match(migration, /'term_label', v_term_label/);
  assert.match(migration, /'deleted_at', v_deleted_at/);
  assert.match(migration, /'admin_id', v_admin_id/);
});

test("RPC tidak tersedia untuk anon atau public", () => {
  assert.match(migration, /revoke all .* from public/);
  assert.match(migration, /revoke all .* from anon/);
  assert.match(migration, /grant execute .* to authenticated/);
});

test("UUID invalid ditolak sebelum RPC", () => {
  assert.match(actions, /z\.string\(\)\.uuid\(\)/);
  assert.match(actions, /Pemilihan tidak valid/);
});

test("konfirmasi HAPUS divalidasi kembali di server", () => {
  assert.match(actions, /formData\.get\("confirmation"\) !== "HAPUS"/);
  assert.match(actions, /Ketik HAPUS untuk mengonfirmasi/);
});

test("cleanup storage hanya memakai path foto hasil RPC", () => {
  assert.match(migration, /v_candidate_photo_paths/);
  assert.match(migration, /candidate_photo_paths/);
  assert.match(actions, /result\.candidate_photo_paths/);
  assert.match(actions, /\.from\(CANDIDATE_PHOTO_BUCKET\)/);
  assert.match(actions, /\.remove\(photoPaths\)/);
});
