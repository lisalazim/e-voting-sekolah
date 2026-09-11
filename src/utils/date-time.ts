export function formatDateTimeForZone(
  value: string | null,
  timeZone: string,
): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function toDateTimeLocalValue(
  value: string | null,
  timeZone: string,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function localDateTimeToIso(value: string, timeZone: string): string {
  if (timeZone === "Asia/Jakarta") {
    return new Date(`${value}:00+07:00`).toISOString();
  }

  return new Date(value).toISOString();
}
