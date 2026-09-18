import assert from "node:assert/strict";
import test from "node:test";

import {
  generateUniqueVoterToken,
  generateVoterToken,
} from "../src/features/admin/voters/token-generator.ts";
import {
  formatSixDigitToken,
  formatVoterTokenInput,
  getVoterTokenFormat,
  normalizeVoterToken,
} from "../src/utils/voter-token.ts";

test("generator selalu menghasilkan enam digit string", () => {
  assert.equal(generateVoterToken(() => 123), "000123");
  assert.match(generateVoterToken(() => 815204), /^\d{6}$/);
});

test("normalisasi menerima tiga bentuk token enam digit", () => {
  assert.equal(normalizeVoterToken("123456"), "123456");
  assert.equal(normalizeVoterToken("123-456"), "123456");
  assert.equal(normalizeVoterToken("123 456"), "123456");
  assert.equal(getVoterTokenFormat("123-456"), "six-digit");
});

test("format baru menolak huruf dan simbol sedangkan legacy tetap didukung", () => {
  assert.equal(getVoterTokenFormat("12345A"), null);
  assert.equal(getVoterTokenFormat("123@456"), null);
  assert.equal(getVoterTokenFormat("ABCD-EFGH-JK"), "legacy");
});

test("input, paste, dan backspace mempertahankan format alami", () => {
  assert.equal(formatVoterTokenInput("1"), "1");
  assert.equal(formatVoterTokenInput("1234"), "123-4");
  assert.equal(formatVoterTokenInput("123456"), "123-456");
  assert.equal(formatVoterTokenInput("123 456"), "123-456");
  assert.equal(formatVoterTokenInput("123-45"), "123-45");
  assert.equal(formatVoterTokenInput("123-4"), "123-4");
  assert.equal(formatSixDigitToken("042731"), "042-731");
});

test("collision membuat generator mencoba ulang dan menjaga token unik", () => {
  const generated = ["123456", "654321"];
  const usedHashes = new Set(["hash:123456"]);
  const token = generateUniqueVoterToken(
    usedHashes,
    (value) => `hash:${value}`,
    () => generated.shift() ?? "999999",
  );

  assert.equal(token, "654321");
  assert.deepEqual(usedHashes, new Set(["hash:123456", "hash:654321"]));
});
