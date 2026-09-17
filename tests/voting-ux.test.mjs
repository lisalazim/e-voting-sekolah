import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const candidateForm = readFileSync(
  "src/features/voting/vote-candidate-form.tsx",
  "utf8",
);
const adminCandidateForm = readFileSync(
  "src/features/admin/candidates/candidate-form.tsx",
  "utf8",
);
const candidateActions = readFileSync(
  "src/features/admin/candidates/actions.ts",
  "utf8",
);
const votingActions = readFileSync("src/features/voting/actions.ts", "utf8");
const finishedPage = readFileSync("src/app/pilih/selesai/page.tsx", "utf8");

test("kandidat memakai grid satu, dua, dan tiga kolom responsif", () => {
  assert.match(candidateForm, /grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3/);
  assert.doesNotMatch(candidateForm, /overflow-x-auto|whitespace-nowrap/);
});

test("foto kandidat seragam dan berfokus pada bagian atas", () => {
  assert.match(candidateForm, /aspect-\[4\/3\]/);
  assert.match(candidateForm, /object-cover object-top/);
});

test("aksi konfirmasi terpusat dan tetap responsif", () => {
  assert.match(candidateForm, /flex w-full justify-center pt-2/);
  assert.match(candidateForm, /w-full max-w-\[340px\]/);
  assert.match(candidateForm, /disabled=\{isPending \|\| !selectedCandidateId\}/);
});

test("visi dan misi kosong tidak menghasilkan blok atau placeholder", () => {
  assert.match(candidateForm, /candidate\.vision \|\| candidate\.mission \?/);
  assert.match(candidateForm, /candidate\.vision \?/);
  assert.match(candidateForm, /candidate\.mission \?/);
  assert.doesNotMatch(candidateForm, /candidate\.(?:vision|mission) \|\| "-"/);
});

test("visi dan misi admin opsional serta string kosong menjadi null", () => {
  assert.match(adminCandidateForm, /Visi[\s\S]*\(opsional\)/);
  assert.match(adminCandidateForm, /Misi[\s\S]*\(opsional\)/);
  assert.match(candidateActions, /mission: parsed\.data\.mission \|\| null/);
  assert.match(candidateActions, /vision: parsed\.data\.vision \|\| null/);
});

test("tombol kandidat mengubah satu state pilihan", () => {
  assert.match(candidateForm, /useState<string \| null>/);
  assert.match(candidateForm, /setSelectedCandidateId\(candidate\.id\)/);
  assert.match(candidateForm, /selectedCandidateId === candidate\.id/);
  assert.match(candidateForm, /Kandidat Dipilih/);
  assert.match(candidateForm, /Pilih Kandidat/);
  assert.match(candidateForm, /type="radio"/);
});

test("memilih kartu belum mengirim suara", () => {
  assert.match(candidateForm, /type="button"/);
  assert.match(candidateForm, /Konfirmasi dan Kirim Suara/);
  assert.match(candidateForm, /type="submit"/);
  assert.match(candidateForm, /window\.confirm/);
});

test("Pemilih Berikutnya membersihkan cookie melalui Server Action", () => {
  assert.match(finishedPage, /Pemilih Berikutnya/);
  assert.match(finishedPage, /action={prepareNextVoter}/);
  assert.doesNotMatch(finishedPage, /href="\/pilih"/);
  assert.match(votingActions, /prepareNextVoter/);
  assert.match(votingActions, /await clearVoterSessionCookie\(\)/);
  assert.match(votingActions, /redirect\("\/pilih"\)/);
});

test("submit sukses menghapus cookie sehingga back tidak memakai sesi lama", () => {
  assert.match(
    votingActions,
    /await clearVoterSessionCookie\(\);\s*redirect\("\/pilih\/selesai"\)/,
  );
});
