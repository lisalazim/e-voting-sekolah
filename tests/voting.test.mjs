import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const votingMigration = readFileSync(
  "supabase/migrations/20260913130000_create_voter_sessions_and_voting_rpc.sql",
  "utf8",
);
const votingActions = readFileSync("src/features/voting/actions.ts", "utf8");
const tokenUtils = readFileSync(
  "src/features/admin/voters/token-utils.ts",
  "utf8",
);

function normalizeToken(token) {
  return token.replace(/[\s-]/g, "").toUpperCase();
}

test("normalisasi token menghapus spasi dan tanda hubung", () => {
  assert.equal(normalizeToken(" abcd-efgh-jk "), "ABCDEFGHJK");
  assert.match(tokenUtils, /replace\(\s*\/\[\\s-\]\//);
});

test("token invalid memakai pesan generik", () => {
  assert.match(votingActions, /Token tidak valid atau tidak dapat digunakan/);
  assert.doesNotMatch(votingActions, /token_hash.*message/);
});

test("RPC menolak election yang tidak efektif open", () => {
  assert.match(votingMigration, /v_election_status <> 'open'/);
  assert.match(votingMigration, /v_election_status = 'paused'/);
  assert.match(votingMigration, /now\(\) >= v_ends_at/);
});

test("RPC menolak sesi kedaluwarsa", () => {
  assert.match(votingMigration, /v_expires_at <= now\(\)/);
  assert.match(votingMigration, /session_expired/);
});

test("RPC memvalidasi kandidat dari election yang sama", () => {
  assert.match(votingMigration, /c\.id = p_candidate_id/);
  assert.match(votingMigration, /c\.election_id = v_election_id/);
  assert.match(votingMigration, /c\.is_active = true/);
});

test("RPC memakai row-level locking untuk mencegah submit ganda", () => {
  assert.match(votingMigration, /where s\.session_hash = p_session_hash\s+for update/i);
  assert.match(votingMigration, /where v\.id = v_voter_id[\s\S]*for update/i);
});

test("submit ulang setelah sukses ditolak", () => {
  assert.match(votingMigration, /v_used_at is not null/);
  assert.match(votingMigration, /v_has_voted/);
  assert.match(votingMigration, /set used_at = now\(\)/);
});

test("votes tidak menyimpan identitas pemilih", () => {
  const insertVoteMatch = votingMigration.match(
    /insert into public\.votes \(([\s\S]*?)\)\s+values/i,
  );

  assert.ok(insertVoteMatch);
  assert.match(insertVoteMatch[1], /election_id/);
  assert.match(insertVoteMatch[1], /candidate_id/);
  assert.match(insertVoteMatch[1], /ballot_fingerprint/);
  assert.doesNotMatch(insertVoteMatch[1], /voter_id|session|token|full_name|class_name|external_id/);
});
