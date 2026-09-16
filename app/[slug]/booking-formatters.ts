import type { BusinessHour } from "./types";

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

export function formatHour(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function formatBusinessHour(hour: BusinessHour) {
  if (hour.is_closed || !hour.opens_at || !hour.closes_at) return "Fechado";
  return `${hour.opens_at.slice(0, 5)} às ${hour.closes_at.slice(0, 5)}`;
}

export const weekdayLabels = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function serviceImage(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("sobrancelha")) return "/services/sobrancelha.png";
  if (lower.includes("barba") && lower.includes("corte")) return "/services/corte-barba.png";
  if (lower.includes("barba")) return "/services/barba.png";
  return "/services/corte.png";
}
