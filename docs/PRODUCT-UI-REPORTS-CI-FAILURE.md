# Sistema visual e relatórios — diagnóstico final

## install.log
```text

added 511 packages, and audited 512 packages in 14s

165 packages are looking for funding
  run `npm fund` for details

15 vulnerabilities (2 low, 2 moderate, 11 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues, run:
  npm audit fix --force

Run `npm audit` for details.
npm warn allow-scripts 4 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   sharp@0.34.5 (install: node install/check.js || npm run build)
npm warn allow-scripts   unrs-resolver@1.11.1 (postinstall: napi-postinstall unrs-resolver 1.11.1 check)
npm warn allow-scripts   workerd@1.20260515.1 (postinstall: node install.js)
npm warn allow-scripts   esbuild@0.27.3 (postinstall: node install.js)
npm warn allow-scripts
npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.
```

## typecheck.log
```text

> site-creator-vinext-starter@0.1.0 typecheck
> tsc --noEmit

```

## tests.log
```text
    '  service_minutes: number;\n' +
    '  revenue_share_percent: number;\n' +
    '};\n' +
    '\n' +
    'type CustomerReport = {\n' +
    '  customer_id: string;\n' +
    '  customer_name: string;\n' +
    '  customer_email: string | null;\n' +
    '  customer_phone: string;\n' +
    '  completed_visits: number;\n' +
    '  period_revenue: number;\n' +
    '  first_appointment: string | null;\n' +
    '  last_completed: string | null;\n' +
    '  next_appointment: string | null;\n' +
    '  lifetime_completed_visits: number;\n' +
    '  lifetime_revenue: number;\n' +
    '  customer_type: "new" | "returning";\n' +
    '};\n' +
    '\n' +
    'type AppointmentReport = {\n' +
    '  appointment_id: string;\n' +
    '  starts_at: string;\n' +
    '  ends_at: string;\n' +
    '  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";\n' +
    '  customer_id: string | null;\n' +
    '  customer_name: string;\n' +
    '  customer_email: string | null;\n' +
    '  customer_phone: string;\n' +
    '  professional_id: string | null;\n' +
    '  professional_name: string | null;\n' +
    '  service_name: string | null;\n' +
    '  gross_amount: number;\n' +
    '  duration_minutes: number;\n' +
    '  cancel_reason: string | null;\n' +
    '};\n' +
    '\n' +
    'type DailyReport = {\n' +
    '  date: string;\n' +
    '  appointments: number;\n' +
    '  completed: number;\n' +
    '  cancelled: number;\n' +
    '  no_show: number;\n' +
    '  revenue: number;\n' +
    '};\n' +
    '\n' +
    'type CancelReason = { reason: string; total: number };\n' +
    '\n' +
    'type ManagementReport = {\n' +
    '  period: { start_date: string; end_date: string; professional_id: string | null };\n' +
    '  summary: Summary;\n' +
    '  professionals: ProfessionalReport[];\n' +
    '  services: ServiceReport[];\n' +
    '  daily: DailyReport[];\n' +
    '  cancel_reasons: CancelReason[];\n' +
    '  customers: CustomerReport[];\n' +
    '  appointments: AppointmentReport[];\n' +
    '};\n' +
    '\n' +
    'type CommissionRow = {\n' +
    '  appointment_id: string;\n' +
    '  starts_at: string;\n' +
    '  professional_id: string | null;\n' +
    '  professional_name: string;\n' +
    '  services: string;\n' +
    '  gross_amount: number;\n' +
    '  commission_rate_percent: number;\n' +
    '  commission_amount: number;\n' +
    '  payment_status: "pending" | "paid";\n' +
    '  paid_at: string | null;\n' +
    '};\n' +
    '\n' +
    'type FinancialReport = { commissions: CommissionRow[] };\n' +
    '\n' +
    'type ProfessionalOption = { id: string; name: string };\n' +
    '\n' +
    'type ShopState = { id: string; name: string; role: Role };\n' +
    '\n' +
    'const zeroSummary: Summary = {\n' +
    '  total_appointments: 0,\n' +
    '  scheduled: 0,\n' +
    '  confirmed: 0,\n' +
    '  completed: 0,\n' +
    '  cancelled: 0,\n' +
    '  no_show: 0,\n' +
    '  gross_revenue: 0,\n' +
    '  average_ticket: 0,\n' +
    '  cancelled_value: 0,\n' +
    '  no_show_value: 0,\n' +
    '  booked_minutes: 0,\n' +
    '  commission_total: 0,\n' +
    '  commission_pending: 0,\n' +
    '  commission_paid: 0,\n' +
    '  net_after_commission: 0,\n' +
    '  total_clients: 0,\n' +
    '  new_clients: 0,\n' +
    '  returning_clients: 0,\n' +
    '  rebooked_clients: 0,\n' +
    '  rebooking_rate_percent: 0,\n' +
    '  cancellation_rate_percent: 0,\n' +
    '  no_show_rate_percent: 0,\n' +
    '};\n' +
    '\n' +
    'const emptyReport: ManagementReport = {\n' +
    '  period: { start_date: "", end_date: "", professional_id: null },\n' +
    '  summary: zeroSummary,\n' +
    '  professionals: [],\n' +
    '  services: [],\n' +
    '  daily: [],\n' +
    '  cancel_reasons: [],\n' +
    '  customers: [],\n' +
    '  appointments: [],\n' +
    '};\n' +
    '\n' +
    'const statusLabel: Record<AppointmentReport["status"], string> = {\n' +
    '  scheduled: "Agendado",\n' +
    '  confirmed: "Confirmado",\n' +
    '  completed: "Concluído",\n' +
    '  cancelled: "Cancelado",\n' +
    '  no_show: "Não compareceu",\n' +
    '};\n' +
    '\n' +
    'function dateInSaoPaulo() {\n' +
    '  const parts = new Intl.DateTimeFormat("en-US", {\n' +
    '    timeZone: "America/Sao_Paulo",\n' +
    '    year: "numeric",\n' +
    '    month: "2-digit",\n' +
    '    day: "2-digit",\n' +
    '  }).formatToParts(new Date());\n' +
    '  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));\n' +
    '  return `${value.year}-${value.month}-${value.day}`;\n' +
    '}\n' +
    '\n' +
    'function shiftDate(value: string, days: number) {\n' +
    '  const [year, month, day] = value.split("-").map(Number);\n' +
    '  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);\n' +
    '}\n' +
    '\n' +
    'function weekStart(today: string) {\n' +
    '  const [year, month, day] = today.split("-").map(Number);\n' +
    '  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();\n' +
    '  return shiftDate(today, -((weekday + 6) % 7));\n' +
    '}\n' +
    '\n' +
    'function money(value: number | string | null | undefined) {\n' +
    '  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });\n' +
    '}\n' +
    '\n' +
    'function percent(value: number | string | null | undefined) {\n' +
    '  return `${Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;\n' +
    '}\n' +
    '\n' +
    'function dateTime(value?: string | null) {\n' +
    '  if (!value) return "—";\n' +
    '  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(value));\n' +
    '}\n' +
    '\n' +
    'function shortDate(value?: string | null) {\n' +
    '  if (!value) return "—";\n' +
    '  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" }).format(new Date(`${value.slice(0, 10)}T12:00:00-03:00`));\n' +
    '}\n' +
    '\n' +
    'function hours(minutes: number) {\n' +
    '  const h = Math.floor(Number(minutes || 0) / 60);\n' +
    '  const m = Number(minutes || 0) % 60;\n' +
    '  return m ? `${h}h ${m}min` : `${h}h`;\n' +
    '}\n' +
    '\n' +
    'function csvCell(value: unknown) {\n' +
    `  const text = String(value ?? "").replace(/"/g, '""');\n` +
    '  return `"${text}"`;\n' +
    '}\n' +
    '\n' +
    'function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {\n' +
    '  const content = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\\r\\n");\n' +
    '  const blob = new Blob(["\\ufeff", content], { type: "text/csv;charset=utf-8" });\n' +
    '  const url = URL.createObjectURL(blob);\n' +
    '  const anchor = document.createElement("a");\n' +
    '  anchor.href = url;\n' +
    '  anchor.download = filename;\n' +
    '  anchor.click();\n' +
    '  URL.revokeObjectURL(url);\n' +
    '}\n' +
    '\n' +
    'function whatsappLink(phone?: string | null, name?: string | null) {\n' +
    '  const digits = (phone || "").replace(/\\D/g, "");\n' +
    '  if (digits.length < 10) return null;\n' +
    '  const international = digits.startsWith("55") ? digits : `55${digits}`;\n' +
    '  const message = encodeURIComponent(`Olá${name ? `, ${name}` : ""}! Aqui é da barbearia. Estamos entrando em contato sobre seu atendimento.`);\n' +
    '  return `https://wa.me/${international}?text=${message}`;\n' +
    '}\n' +
    '\n' +
    'export default function Relatorios() {\n' +
    '  const today = useMemo(() => dateInSaoPaulo(), []);\n' +
    '  const [shop, setShop] = useState<ShopState | null>(null);\n' +
    '  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);\n' +
    '  const [endDate, setEndDate] = useState(today);\n' +
    '  const [professionalId, setProfessionalId] = useState("");\n' +
    '  const [professionalOptions, setProfessionalOptions] = useState<ProfessionalOption[]>([]);\n' +
    '  const [tab, setTab] = useState<TabKey>("overview");\n' +
    '  const [report, setReport] = useState<ManagementReport>(emptyReport);\n' +
    '  const [commissions, setCommissions] = useState<CommissionRow[]>([]);\n' +
    '  const [loading, setLoading] = useState(true);\n' +
    '  const [savingId, setSavingId] = useState<string | null>(null);\n' +
    '  const [message, setMessage] = useState("");\n' +
    '  const [refreshKey, setRefreshKey] = useState(0);\n' +
    '\n' +
    '  useEffect(() => {\n' +
    '    let active = true;\n' +
    '    async function load() {\n' +
    '      setLoading(true);\n' +
    '      setMessage("");\n' +
    '      const context = await getPanelContext(supabase);\n' +
    '      if (!context.userId) { window.location.replace("/entrar"); return; }\n' +
    '      if (context.role === "barber") { window.location.replace("/painel/agenda"); return; }\n' +
    '      if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }\n' +
    '\n' +
    '      const [{ data: shopData }, { data: options }, managementResult, financialResult] = await Promise.all([\n' +
    '        supabase.from("barbershops").select("id,name").eq("id", context.barbershopId).maybeSingle<{ id: string; name: string }>(),\n' +
    '        supabase.from("professionals").select("id,name").eq("barbershop_id", context.barbershopId).order("name"),\n' +
    '        supabase.rpc("get_barbershop_management_report", {\n' +
    '          p_barbershop_id: context.barbershopId,\n' +
    '          p_start_date: startDate,\n' +
    '          p_end_date: endDate,\n' +
    '          p_professional_id: professionalId || null,\n' +
    '        }),\n' +
    '        supabase.rpc("get_barbershop_financial_report", {\n' +
    '          p_barbershop_id: context.barbershopId,\n' +
    '          p_start_date: startDate,\n' +
    '          p_end_date: endDate,\n' +
    '        }),\n' +
    '      ]);\n' +
    '\n' +
    '      if (!active) return;\n' +
    '      if (!shopData) { setMessage("Não foi possível identificar a barbearia."); setLoading(false); return; }\n' +
    '      setShop({ ...shopData, role: context.role as Role });\n' +
    '      setProfessionalOptions((options || []) as ProfessionalOption[]);\n' +
    '\n' +
    '      if (managementResult.error) {\n' +
    '        setMessage(managementResult.error.message || "Não foi possível carregar os relatórios.");\n' +
    '        setReport(emptyReport);\n' +
    '      } else {\n' +
    '        setReport((managementResult.data || emptyReport) as ManagementReport);\n' +
    '      }\n' +
    '\n' +
    '      if (financialResult.error) {\n' +
    '        setCommissions([]);\n' +
    '      } else {\n' +
    '        const financial = (financialResult.data || { commissions: [] }) as FinancialReport;\n' +
    '   '... 20783 more characters
  
      at TestContext.<anonymous> (file:///home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/tests/financial-reporting.test.mjs:44:10)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '"use client";\n\nimport { createClient } from "@supabase/supabase-js";\nimport { useEffect, useMemo, useState } from "react";\n\nimport { getPanelContext } from "@/utils/panel-context";\nimport PanelShell from "../PanelShell";\n\nconst supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);\n\ntype TabKey = "overview" | "appointments" | "team" | "services" | "clients" | "commissions";\ntype Role = "owner" | "manager";\n\ntype Summary = {\n  total_appointments: number;\n  scheduled: number;\n  confirmed: number;\n  completed: number;\n  cancelled: number;\n  no_show: number;\n  gross_revenue: number;\n  average_ticket: number;\n  cancelled_value: number;\n  no_show_value: number;\n  booked_minutes: number;\n  commission_total: number;\n  commission_pending: number;\n  commission_paid: number;\n  net_after_commission: number;\n  total_clients: number;\n  new_clients: number;\n  returning_clients: number;\n  rebooked_clients: number;\n  rebooking_rate_percent: number;\n  cancellation_rate_percent: number;\n  no_show_rate_percent: number;\n};\n\ntype ProfessionalReport = {\n  professional_id: string;\n  professional_name: string;\n  active: boolean;\n  appointments: number;\n  completed: number;\n  cancelled: number;\n  no_show: number;\n  revenue: number;\n  average_ticket: number;\n  booked_minutes: number;\n  available_minutes: number;\n  occupancy_percent: number;\n  commission_total: number;\n  commission_pending: number;\n  commission_paid: number;\n};\n\ntype ServiceReport = {\n  service_id: string | null;\n  service_name: string;\n  completed_services: number;\n  revenue: number;\n  average_price: number;\n  service_minutes: number;\n  revenue_share_percent: number;\n};\n\ntype CustomerReport = {\n  customer_id: string;\n  customer_name: string;\n  customer_email: string | null;\n  customer_phone: string;\n  completed_visits: number;\n  period_revenue: number;\n  first_appointment: string | null;\n  last_completed: string | null;\n  next_appointment: string | null;\n  lifetime_completed_visits: number;\n  lifetime_revenue: number;\n  customer_type: "new" | "returning";\n};\n\ntype AppointmentReport = {\n  appointment_id: string;\n  starts_at: string;\n  ends_at: string;\n  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";\n  customer_id: string | null;\n  customer_name: string;\n  customer_email: string | null;\n  customer_phone: string;\n  professional_id: string | null;\n  professional_name: string | null;\n  service_name: string | null;\n  gross_amount: number;\n  duration_minutes: number;\n  cancel_reason: string | null;\n};\n\ntype DailyReport = {\n  date: string;\n  appointments: number;\n  completed: number;\n  cancelled: number;\n  no_show: number;\n  revenue: number;\n};\n\ntype CancelReason = { reason: string; total: number };\n\ntype ManagementReport = {\n  period: { start_date: string; end_date: string; professional_id: string | null };\n  summary: Summary;\n  professionals: ProfessionalReport[];\n  services: ServiceReport[];\n  daily: DailyReport[];\n  cancel_reasons: CancelReason[];\n  customers: CustomerReport[];\n  appointments: AppointmentReport[];\n};\n\ntype CommissionRow = {\n  appointment_id: string;\n  starts_at: string;\n  professional_id: string | null;\n  professional_name: string;\n  services: string;\n  gross_amount: number;\n  commission_rate_percent: number;\n  commission_amount: number;\n  payment_status: "pending" | "paid";\n  paid_at: string | null;\n};\n\ntype FinancialReport = { commissions: CommissionRow[] };\n\ntype ProfessionalOption = { id: string; name: string };\n\ntype ShopState = { id: string; name: string; role: Role };\n\nconst zeroSummary: Summary = {\n  total_appointments: 0,\n  scheduled: 0,\n  confirmed: 0,\n  completed: 0,\n  cancelled: 0,\n  no_show: 0,\n  gross_revenue: 0,\n  average_ticket: 0,\n  cancelled_value: 0,\n  no_show_value: 0,\n  booked_minutes: 0,\n  commission_total: 0,\n  commission_pending: 0,\n  commission_paid: 0,\n  net_after_commission: 0,\n  total_clients: 0,\n  new_clients: 0,\n  returning_clients: 0,\n  rebooked_clients: 0,\n  rebooking_rate_percent: 0,\n  cancellation_rate_percent: 0,\n  no_show_rate_percent: 0,\n};\n\nconst emptyReport: ManagementReport = {\n  period: { start_date: "", end_date: "", professional_id: null },\n  summary: zeroSummary,\n  professionals: [],\n  services: [],\n  daily: [],\n  cancel_reasons: [],\n  customers: [],\n  appointments: [],\n};\n\nconst statusLabel: Record<AppointmentReport["status"], string> = {\n  scheduled: "Agendado",\n  confirmed: "Confirmado",\n  completed: "Concluído",\n  cancelled: "Cancelado",\n  no_show: "Não compareceu",\n};\n\nfunction dateInSaoPaulo() {\n  const parts = new Intl.DateTimeFormat("en-US", {\n    timeZone: "America/Sao_Paulo",\n    year: "numeric",\n    month: "2-digit",\n    day: "2-digit",\n  }).formatToParts(new Date());\n  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));\n  return `${value.year}-${value.month}-${value.day}`;\n}\n\nfunction shiftDate(value: string, days: number) {\n  const [year, month, day] = value.split("-").map(Number);\n  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);\n}\n\nfunction weekStart(today: string) {\n  const [year, month, day] = today.split("-").map(Number);\n  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();\n  return shiftDate(today, -((weekday + 6) % 7));\n}\n\nfunction money(value: number | string | null | undefined) {\n  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });\n}\n\nfunction percent(value: number | string | null | undefined) {\n  return `${Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;\n}\n\nfunction dateTime(value?: string | null) {\n  if (!value) return "—";\n  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(value));\n}\n\nfunction shortDate(value?: string | null) {\n  if (!value) return "—";\n  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" }).format(new Date(`${value.slice(0, 10)}T12:00:00-03:00`));\n}\n\nfunction hours(minutes: number) {\n  const h = Math.floor(Number(minutes || 0) / 60);\n  const m = Number(minutes || 0) % 60;\n  return m ? `${h}h ${m}min` : `${h}h`;\n}\n\nfunction csvCell(value: unknown) {\n  const text = String(value ?? "").replace(/"/g, \'""\');\n  return `"${text}"`;\n}\n\nfunction downloadCsv(filename: string, headers: string[], rows: unknown[][]) {\n  const content = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\\r\\n");\n  const blob = new Blob(["\\ufeff", content], { type: "text/csv;charset=utf-8" });\n  const url = URL.createObjectURL(blob);\n  const anchor = document.createElement("a");\n  anchor.href = url;\n  anchor.download = filename;\n  anchor.click();\n  URL.revokeObjectURL(url);\n}\n\nfunction whatsappLink(phone?: string | null, name?: string | null) {\n  const digits = (phone || "").replace(/\\D/g, "");\n  if (digits.length < 10) return null;\n  const international = digits.startsWith("55") ? digits : `55${digits}`;\n  const message = encodeURIComponent(`Olá${name ? `, ${name}` : ""}! Aqui é da barbearia. Estamos entrando em contato sobre seu atendimento.`);\n  return `https://wa.me/${international}?text=${message}`;\n}\n\nexport default function Relatorios() {\n  const today = useMemo(() => dateInSaoPaulo(), []);\n  const [shop, setShop] = useState<ShopState | null>(null);\n  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);\n  const [endDate, setEndDate] = useState(today);\n  const [professionalId, setProfessionalId] = useState("");\n  const [professionalOptions, setProfessionalOptions] = useState<ProfessionalOption[]>([]);\n  const [tab, setTab] = useState<TabKey>("overview");\n  const [report, setReport] = useState<ManagementReport>(emptyReport);\n  const [commissions, setCommissions] = useState<CommissionRow[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [savingId, setSavingId] = useState<string | null>(null);\n  const [message, setMessage] = useState("");\n  const [refreshKey, setRefreshKey] = useState(0);\n\n  useEffect(() => {\n    let active = true;\n    async function load() {\n      setLoading(true);\n      setMessage("");\n      const context = await getPanelContext(supabase);\n      if (!context.userId) { window.location.replace("/entrar"); return; }\n      if (context.role === "barber") { window.location.replace("/painel/agenda"); return; }\n      if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }\n\n      const [{ data: shopData }, { data: options }, managementResult, financialResult] = await Promise.all([\n        supabase.from("barbershops").select("id,name").eq("id", context.barbershopId).maybeSingle<{ id: string; name: string }>(),\n        supabase.from("professionals").select("id,name").eq("barbershop_id", context.barbershopId).order("name"),\n        supabase.rpc("get_barbershop_management_report", {\n          p_barbershop_id: context.barbershopId,\n          p_start_date: startDate,\n          p_end_date: endDate,\n          p_professional_id: professionalId || null,\n        }),\n        supabase.rpc("get_barbershop_financial_report", {\n          p_barbershop_id: context.barbershopId,\n          p_start_date: startDate,\n          p_end_date: endDate,\n        }),\n      ]);\n\n      if (!active) return;\n      if (!shopData) { setMessage("Não foi possível identificar a barbearia."); setLoading(false); return; }\n      setShop({ ...shopData, role: context.role as Role });\n      setProfessionalOptions((options || []) as ProfessionalOption[]);\n\n      if (managementResult.error) {\n        setMessage(managementResult.error.message || "Não foi possível carregar os relatórios.");\n        setReport(emptyReport);\n      } else {\n        setReport((managementResult.data || emptyReport) as ManagementReport);\n      }\n\n      if (financialResult.error) {\n        setCommissions([]);\n      } else {\n        const financial = (financialResult.data || { commissions: [] }) as FinancialReport;\n   '... 20783 more characters,
    expected: /RECEITA BRUTA/,
    operator: 'match',
    diff: 'simple'
  }
```
