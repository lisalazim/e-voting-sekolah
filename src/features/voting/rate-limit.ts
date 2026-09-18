import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

const DEVICE_COOKIE_NAME = "evoting_voter_device";
const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const RATE_LIMIT_PEPPER_MIN_LENGTH = 32;

type VoterLoginBuckets = {
  clientBucketHash: string;
  ipBucketHash: string;
  tokenBucketHash: string;
};

function getRateLimitPepper(): string {
  const pepper = process.env.VOTER_RATE_LIMIT_PEPPER;

  if (!pepper || pepper.length < RATE_LIMIT_PEPPER_MIN_LENGTH) {
    throw new Error(
      "VOTER_RATE_LIMIT_PEPPER wajib berupa secret server minimal 32 karakter.",
    );
  }

  return pepper;
}

function hashBucket(kind: "client" | "ip" | "token", value: string): string {
  return createHmac("sha256", getRateLimitPepper())
    .update(`${kind}:${value}`)
    .digest("hex");
}

async function getOrCreateDeviceSecret(): Promise<string> {
  const cookieStore = await cookies();
  const existingSecret = cookieStore.get(DEVICE_COOKIE_NAME)?.value;

  if (existingSecret) {
    return existingSecret;
  }

  const deviceSecret = randomBytes(32).toString("base64url");
  cookieStore.set(DEVICE_COOKIE_NAME, deviceSecret, {
    httpOnly: true,
    maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
    path: "/pilih",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return deviceSecret;
}

async function getTrustedIpIdentifier(): Promise<string> {
  if (process.env.VERCEL === "1") {
    const requestHeaders = await headers();
    const forwardedIp = requestHeaders.get("x-vercel-forwarded-for");
    const clientIp = forwardedIp?.split(",")[0]?.trim();

    if (!clientIp) {
      throw new Error("Header IP tepercaya Vercel tidak tersedia.");
    }

    return clientIp;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Boundary IP production hanya dikonfigurasi untuk Vercel.");
  }

  return "local-development";
}

export async function getVoterLoginBuckets(
  canonicalToken: string,
): Promise<VoterLoginBuckets> {
  const [deviceSecret, ipIdentifier] = await Promise.all([
    getOrCreateDeviceSecret(),
    getTrustedIpIdentifier(),
  ]);

  return {
    clientBucketHash: hashBucket("client", deviceSecret),
    ipBucketHash: hashBucket("ip", ipIdentifier),
    tokenBucketHash: hashBucket("token", canonicalToken),
  };
}
