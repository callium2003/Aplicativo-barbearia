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
