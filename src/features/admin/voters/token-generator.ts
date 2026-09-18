import { randomInt } from "node:crypto";

const TOKEN_COMBINATION_COUNT = 1_000_000;
const MAX_TOKEN_GENERATION_ATTEMPTS = 20;

export type SecureRandomInteger = (max: number) => number;

export function generateVoterToken(
  secureRandomInteger: SecureRandomInteger = randomInt,
): string {
  return secureRandomInteger(TOKEN_COMBINATION_COUNT).toString().padStart(6, "0");
}

export function generateUniqueVoterToken(
  usedHashes: Set<string>,
  hashToken: (token: string) => string,
  generateToken: () => string = generateVoterToken,
): string {
  for (let attempt = 0; attempt < MAX_TOKEN_GENERATION_ATTEMPTS; attempt += 1) {
    const token = generateToken();
    const tokenHash = hashToken(token);

    if (!usedHashes.has(tokenHash)) {
      usedHashes.add(tokenHash);
      return token;
    }
  }

  throw new Error("Token unik belum bisa dibuat. Coba ulangi proses.");
}
