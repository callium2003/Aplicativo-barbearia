const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function formatTime(value: string) {
  const [hours = "0", minutes = "0"] = value.slice(0, 5).split(":");
  const normalizedHours = String(Number(hours));
  return minutes === "00" ? `${normalizedHours}h` : `${normalizedHours}h${minutes}`;
}

export function formatRecurringBreakLabel(weekday: number, startsAt: string, endsAt: string) {
  const day = weekdayLabels[weekday] ?? "Dia";
  return `${day}: ${formatTime(startsAt)} às ${formatTime(endsAt)}`;
}

export { weekdayLabels };
