import "server-only";

import { createHmac } from "node:crypto";

import { normalizeVoterToken } from "../../../utils/voter-token";
export { generateVoterToken } from "./token-generator";

const TOKEN_PEPPER_MIN_LENGTH = 32;

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
