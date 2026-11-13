export function clientInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "CL";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("pt-BR");

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("pt-BR");
}

export function clientEmptyMessage(searchTerm, hasPeriodFilter = false) {
  if (String(searchTerm ?? "").trim()) {
    return "Nenhum cliente corresponde à busca atual.";
  }
  if (hasPeriodFilter) {
    return "Nenhum cliente com atendimento no período selecionado.";
  }
  return "Ainda não há clientes com agendamentos nesta barbearia.";
}

export function saoPauloTodayDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function toSaoPauloDate(isoValue) {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  return saoPauloTodayDate(date);
}

function shiftDateString(dateStr, deltaDays) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + deltaDays)).toISOString().slice(0, 10);
}

export function resolveClientPeriodRange(preset, today = saoPauloTodayDate()) {
  const [year, month, day] = today.split("-").map(Number);
  if (preset === "week") {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const mondayOffset = -((weekday + 6) % 7);
    const startDate = shiftDateString(today, mondayOffset);
    const endDate = shiftDateString(startDate, 6);
    return { startDate, endDate };
  }
  if (preset === "30days") {
    return { startDate: shiftDateString(today, -29), endDate: today };
  }
  if (preset === "month") {
    const startDate = `${today.slice(0, 7)}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const endDate = `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
    return { startDate, endDate };
  }
  return { startDate: "", endDate: "" };
}

export function filterAndSummarizeClients(
  history,
  { search = "", periodPreset = "all", startDate = "", endDate = "" } = {},
) {
  const isPeriodFiltered = periodPreset !== "all" && Boolean(startDate || endDate);
  const grouped = new Map();

  for (const item of history || []) {
    const itemDate = toSaoPauloDate(item.starts_at);
    if (isPeriodFiltered) {
      if (!itemDate) continue;
      if (startDate && itemDate < startDate) continue;
      if (endDate && itemDate > endDate) continue;
    }

    const hasPerAppointmentStatus = typeof item.status === "string";
    if (!hasPerAppointmentStatus) {
      if (!grouped.has(item.customer_id)) {
        grouped.set(item.customer_id, {
          ...item,
          appointments_count: Number(item.appointments_count || 0),
          completed_appointments_count: Number(item.completed_appointments_count || 0),
          completed_revenue_total: Number(item.completed_revenue_total || 0),
        });
      }
      continue;
    }

    const isCompleted = item.status === "completed";
    const price = isCompleted ? Number(item.service_price_snapshot || 0) : 0;
    const existing = grouped.get(item.customer_id);

    if (!existing) {
      grouped.set(item.customer_id, {
        ...item,
        appointments_count: 1,
        completed_appointments_count: isCompleted ? 1 : 0,
        completed_revenue_total: price,
        last_completed_appointment_at: isCompleted
          ? item.starts_at
          : isPeriodFiltered
            ? null
            : item.last_completed_appointment_at,
      });
    } else {
      existing.appointments_count += 1;
      if (isCompleted) {
        existing.completed_appointments_count += 1;
        existing.completed_revenue_total += price;
        if (
          !existing.last_completed_appointment_at ||
          new Date(item.starts_at) > new Date(existing.last_completed_appointment_at)
        ) {
          existing.last_completed_appointment_at = item.starts_at;
        }
      }
      if (new Date(item.starts_at) > new Date(existing.last_appointment_at || existing.starts_at)) {
        existing.last_appointment_at = item.starts_at;
      }
    }
  }

  const term = String(search ?? "").trim().toLowerCase();
  const rows = [...grouped.values()].filter(
    (item) =>
      !term ||
      `${item.customer_name} ${item.customer_phone} ${item.customer_email || ""}`
        .toLowerCase()
        .includes(term),
  );

  const summary = rows.reduce(
    (acc, item) => ({
      appointments: acc.appointments + Number(item.appointments_count || 0),
      completed: acc.completed + Number(item.completed_appointments_count || 0),
      revenue: acc.revenue + Number(item.completed_revenue_total || 0),
    }),
    { appointments: 0, completed: 0, revenue: 0 },
  );

  return { rows, summary };
}
