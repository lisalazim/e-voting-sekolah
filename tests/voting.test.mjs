import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const votingMigration = readFileSync(
  "supabase/migrations/20260917110000_make_ballot_box_manual.sql",
  "utf8",
);
const castVoteFixMigration = readFileSync(
  "supabase/migrations/20260917120000_qualify_cast_vote_random_bytes.sql",
  "utf8",
);
const votingActions = readFileSync("src/features/voting/actions.ts", "utf8");
const tokenUtils = readFileSync(
  "src/features/admin/voters/token-utils.ts",
  "utf8",
);
const tokenFormat = readFileSync("src/utils/voter-token.ts", "utf8");
const tokenGenerator = readFileSync(
  "src/features/admin/voters/token-generator.ts",
  "utf8",
);
const tokenLoginForm = readFileSync(
  "src/features/voting/token-login-form.tsx",
  "utf8",
);
const tokenActions = readFileSync(
  "src/features/admin/voters/token-actions.ts",
  "utf8",
);

test("normalisasi token baru dan legacy memakai canonical tanpa pemisah", () => {
  assert.match(tokenFormat, /replace\(\/\[\\s-\]\/g, ""\)/);
  assert.match(tokenFormat, /NEW_TOKEN_PATTERN = \/\^\\d\{6\}\$\//);
  assert.match(tokenFormat, /LEGACY_TOKEN_PATTERN/);
});

test("generator memakai randomInt dan mempertahankan nol di depan", () => {
  assert.match(tokenGenerator, /randomInt/);
  assert.match(tokenGenerator, /padStart\(6, "0"\)/);
  assert.match(tokenGenerator, /1_000_000/);
  assert.doesNotMatch(tokenGenerator, /Math\.random/);
});

test("collision token digenerate ulang tanpa menimpa hash lama", () => {
  assert.match(tokenGenerator, /usedHashes\.has\(tokenHash\)/);
  assert.match(tokenGenerator, /usedHashes\.add\(tokenHash\)/);
  assert.match(tokenGenerator, /attempt < MAX_TOKEN_GENERATION_ATTEMPTS/);
  assert.match(tokenActions, /generateUniqueVoterToken\(usedHashes, hashVoterToken\)/);
});

test("input token memformat angka dan mengirim canonical string", () => {
  assert.match(tokenLoginForm, /inputMode="numeric"/);
  assert.match(tokenLoginForm, /autoComplete="one-time-code"/);
  assert.match(tokenLoginForm, /enterKeyHint="done"/);
  assert.match(tokenLoginForm, /type="hidden" value=\{normalizeVoterToken\(token\)\}/);
  assert.match(tokenLoginForm, /formatVoterTokenInput/);
  assert.match(tokenFormat, /digits\.length > 3/);
});

test("token invalid memakai pesan generik", () => {
  assert.match(votingActions, /Token tidak ditemukan/);
  assert.doesNotMatch(votingActions, /token_hash.*message/);
});

test("hash token tetap HMAC SHA-256 dan token mentah tidak diaudit", () => {
  assert.match(tokenUtils, /createHmac\("sha256", pepper\)/);
  assert.doesNotMatch(tokenActions, /metadata:\s*\{[^}]*token/s);
});

test("error cast_vote dicatat aman dan tidak dikirim ke browser", () => {
  assert.match(votingActions, /\[voting\.cast_vote\] Supabase RPC error/);
  assert.match(votingActions, /code: sanitizeRpcErrorField\(error\.code\)/);
  assert.match(votingActions, /message: sanitizeRpcErrorField\(error\.message\)/);
  assert.match(votingActions, /details: sanitizeRpcErrorField\(error\.details\)/);
  assert.match(votingActions, /hint: sanitizeRpcErrorField\(error\.hint\)/);
  assert.match(votingActions, /\[REDACTED\]/);
  assert.match(votingActions, /Suara belum bisa dicatat karena terjadi kesalahan pada server/);
  assert.doesNotMatch(votingActions, /message:\s*error\.(?:message|details|hint)/);
});

test("error koneksi dibedakan dari error RPC database", () => {
  assert.match(votingActions, /function isConnectionError/);
  assert.match(votingActions, /failed to fetch/);
  assert.match(votingActions, /Koneksi gagal\. Coba lagi beberapa saat\./);
});

test("signature dan parameter cast_vote konsisten", () => {
  assert.match(votingMigration, /cast_vote\(\s*p_session_hash text,\s*p_candidate_id uuid\s*\)/);
  assert.match(votingActions, /p_candidate_id: parsed\.data\.candidateId/);
  assert.match(votingActions, /p_session_hash: sessionHash/);
});

test("cast_vote memakai gen_random_bytes dari schema extensions", () => {
  assert.match(
    castVoteFixMigration,
    /cast_vote\(\s*p_session_hash text,\s*p_candidate_id uuid\s*\)/,
  );
  assert.match(
    castVoteFixMigration,
    /extensions\.gen_random_bytes\(32\)/,
  );
  assert.doesNotMatch(
    castVoteFixMigration,
    /(?<!extensions\.)gen_random_bytes\s*\(/,
  );
  assert.match(castVoteFixMigration, /security definer/);
  assert.match(castVoteFixMigration, /set search_path = public/);
  assert.doesNotMatch(castVoteFixMigration, /search_path\s*=\s*[^\n]*extensions/);
});

test("RPC hanya menerima election berstatus open yang aktif", () => {
  assert.match(votingMigration, /v_election_status <> 'open'/);
  assert.match(votingMigration, /v_election_status = 'paused'/);
  assert.match(votingMigration, /v_archived_at is not null/);
  assert.match(votingMigration, /v_finalized_at is not null/);
  assert.doesNotMatch(votingMigration, /e\.starts_at|e\.ends_at|v_starts_at|v_ends_at/);
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
