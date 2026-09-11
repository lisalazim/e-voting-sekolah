import "server-only";

import { createHmac, randomInt } from "node:crypto";

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_RANDOM_LENGTH = 10;
const TOKEN_PEPPER_MIN_LENGTH = 32;

export function normalizeVoterToken(token: string): string {
  return token.replace(/[\s-]/g, "").toUpperCase();
}

export function formatVoterToken(normalizedToken: string): string {
  return `${normalizedToken.slice(0, 4)}-${normalizedToken.slice(4, 8)}-${normalizedToken.slice(8)}`;
}

export function generateVoterToken(): string {
  let token = "";

  for (let index = 0; index < TOKEN_RANDOM_LENGTH; index += 1) {
    token += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)];
  }

  return formatVoterToken(token);
}

export function hashVoterToken(token: string): string {
  const pepper = process.env.VOTER_TOKEN_PEPPER;

  if (!pepper) {
    throw new Error("VOTER_TOKEN_PEPPER belum diatur di environment server.");
  }

  if (pepper.length < TOKEN_PEPPER_MIN_LENGTH) {
    throw new Error("VOTER_TOKEN_PEPPER minimal 32 karakter.");
  }

  return createHmac("sha256", pepper)
    .update(normalizeVoterToken(token))
    .digest("hex");
}
