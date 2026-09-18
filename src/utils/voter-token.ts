const NEW_TOKEN_PATTERN = /^\d{6}$/;
const LEGACY_TOKEN_PATTERN = /^[A-HJ-NP-Z2-9]{10}$/;

export type VoterTokenFormat = "legacy" | "six-digit";

export function normalizeVoterToken(token: string): string {
  return token.replace(/[\s-]/g, "").toUpperCase();
}

export function getVoterTokenFormat(token: string): VoterTokenFormat | null {
  const normalizedToken = normalizeVoterToken(token);

  if (NEW_TOKEN_PATTERN.test(normalizedToken)) {
    return "six-digit";
  }

  if (LEGACY_TOKEN_PATTERN.test(normalizedToken)) {
    return "legacy";
  }

  return null;
}

export function formatSixDigitToken(token: string): string {
  const digits = token.replace(/\D/g, "").slice(0, 6);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

export function formatVoterTokenInput(value: string): string {
  const compactValue = value.replace(/[\s-]/g, "").toUpperCase();

  if (/^[\d]*$/.test(compactValue)) {
    return formatSixDigitToken(compactValue);
  }

  const legacyValue = compactValue.replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 10);

  if (legacyValue.length <= 4) {
    return legacyValue;
  }

  if (legacyValue.length <= 8) {
    return `${legacyValue.slice(0, 4)}-${legacyValue.slice(4)}`;
  }

  return `${legacyValue.slice(0, 4)}-${legacyValue.slice(4, 8)}-${legacyValue.slice(8)}`;
}
