export const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

/** Converts a datetime-local wall-clock value into an ISO instant in São Paulo. */
export function saoPauloDateTimeToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error("Data e horário inválidos.");
  const [, year, month, day, hour, minute, second = "00"] = match;
  const wallClockMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BRAZIL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(wallClockMs));
  const observed = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const observedWallClockMs = Date.UTC(Number(observed.year), Number(observed.month) - 1, Number(observed.day), Number(observed.hour), Number(observed.minute), Number(observed.second));
  return new Date(wallClockMs - (observedWallClockMs - wallClockMs)).toISOString();
}

/** Returns the current date in São Paulo as YYYY-MM-DD. */
export function saoPauloDay(): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: BRAZIL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** Converts a YYYY-MM-DD day string into a Date representing the beginning of that day in São Paulo (UTC-03:00). */
export function startOfSaoPauloDay(day: string): Date {
  return new Date(`${day}T00:00:00-03:00`);
}

/** Formats a date/time string or Date into HH:mm in São Paulo time zone. */
export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: BRAZIL_TIME_ZONE }).format(new Date(value));
}
