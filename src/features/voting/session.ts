import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const VOTER_SESSION_COOKIE = "evoting_voter_session";
export const VOTER_SESSION_MAX_AGE_SECONDS = 15 * 60;

export function generateVoterSessionSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashVoterSessionSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function setVoterSessionCookie(secret: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(VOTER_SESSION_COOKIE, secret, {
    httpOnly: true,
    maxAge: VOTER_SESSION_MAX_AGE_SECONDS,
    path: "/pilih",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getVoterSessionHash(): Promise<string | null> {
  const cookieStore = await cookies();
  const secret = cookieStore.get(VOTER_SESSION_COOKIE)?.value;

  return secret ? hashVoterSessionSecret(secret) : null;
}

export async function clearVoterSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(VOTER_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/pilih",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}
