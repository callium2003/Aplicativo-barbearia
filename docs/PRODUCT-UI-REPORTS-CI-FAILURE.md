# Product UI e relatórios — diagnóstico de falha

## install.log
```text

added 511 packages, and audited 512 packages in 16s

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
    '      </section>}\n' +
    '\n' +
    '      <div className="product-grid cols-3">\n' +
    '        {links.map((link) => <Link className="product-card pad" key={link.href} href={link.href} style={{ color: "inherit", textDecoration: "none", minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "transform .18s ease, box-shadow .18s ease" }}>\n' +
    '          <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: "#f0f0ed", fontSize: 18 }}>{link.icon}</span>\n' +
    '          <div style={{ marginTop: 30 }}><h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{link.title}</h2><p style={{ margin: 0, color: "#6f6f6a", lineHeight: 1.55, fontSize: 13 }}>{link.description}</p></div>\n' +
    '        </Link>)}\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </PanelShell>;\n' +
    '}\n'
  
      at TestContext.<anonymous> (file:///home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/tests/rendered-html.test.mjs:91:10)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '"use client";\n\nimport { createClient } from "@supabase/supabase-js";\nimport Link from "next/link";\nimport { useEffect, useState } from "react";\n\nimport { getPanelContext } from "@/utils/panel-context";\nimport PanelShell from "./PanelShell";\n\nconst supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);\n\ntype Shop = { id: string; name: string; slug: string; initial_registration_completed?: boolean; role: "owner" | "manager" | "barber" };\n\nconst ownerManagerLinks = [\n  { href: "/painel/agenda", icon: "◫", title: "Agenda", description: "Acompanhe os horários, confirme atendimentos e fale com clientes." },\n  { href: "/painel/clientes", icon: "◎", title: "Clientes", description: "Consulte histórico, WhatsApp e relacionamento da sua base." },\n  { href: "/painel/profissionais", icon: "✂", title: "Equipe", description: "Organize profissionais e o funcionamento da operação." },\n  { href: "/painel/relatorios", icon: "▥", title: "Relatórios", description: "Veja faturamento, ocupação, serviços, clientes e comissões." },\n  { href: "/painel/configurar", icon: "⚙", title: "Configurações", description: "Atualize dados, serviços, horários, comissões e acessos." },\n];\n\nexport default function Painel() {\n  const [shop, setShop] = useState<Shop | null>(null);\n  const [message, setMessage] = useState("Verificando seu acesso...");\n  const [copyMessage, setCopyMessage] = useState("");\n\n  useEffect(() => {\n    let active = true;\n    async function loadPanel() {\n      try {\n        if (new URLSearchParams(window.location.hash.slice(1)).has("error")) { window.location.replace("/entrar"); return; }\n        const context = await getPanelContext(supabase);\n        if (!active) return;\n        if (!context.userId) { window.location.replace("/entrar"); return; }\n        if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }\n        if (context.role === "owner" && !context.initialRegistrationCompleted) { window.location.replace("/cadastro-inicial"); return; }\n\n        const { data: shopData, error } = await supabase.from("barbershops").select("id,name,slug,initial_registration_completed").eq("id", context.barbershopId).maybeSingle<Omit<Shop, "role">>();\n        if (!active) return;\n        if (error || !shopData) { setMessage("Não foi possível carregar sua barbearia."); return; }\n        setShop({ ...shopData, role: context.role }); setMessage("");\n      } catch {\n        if (active) window.location.replace("/entrar");\n      }\n    }\n    void loadPanel();\n    return () => { active = false; };\n  }, []);\n\n  async function copyPublicLink() {\n    if (!shop?.slug) return;\n    try {\n      await navigator.clipboard.writeText(`${window.location.origin}/${shop.slug}`);\n      setCopyMessage("Link copiado com sucesso.");\n    } catch {\n      setCopyMessage("Não foi possível copiar o link.");\n    }\n  }\n\n  if (!shop) return <main className="product-shell" style={{ display: "grid", placeItems: "center" }}><p className="product-message">{message}</p></main>;\n\n  const links = shop.role === "barber"\n    ? [{ href: "/painel/agenda", icon: "◫", title: "Minha agenda", description: "Consulte seus atendimentos, pausas e disponibilidade." }]\n    : ownerManagerLinks;\n\n  return <PanelShell role={shop.role} active="home" shopName={shop.name}>\n    <div className="product-content">\n      <div className="product-page-head">\n        <div>\n          <p className="product-eyebrow">Painel da barbearia</p>\n          <h1 className="product-title">Olá, {shop.name}.</h1>\n          <p className="product-subtitle">{shop.role === "barber" ? "Sua rotina de atendimento em um só lugar." : "Escolha uma área para administrar sua operação."}</p>\n        </div>\n      </div>\n\n      {shop.role !== "barber" && <section className="product-card pad" style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 20, alignItems: "center" }}>\n        <div>\n          <p className="product-eyebrow">Página pública</p>\n          <h2 style={{ margin: 0, fontSize: 22 }}>{shop.slug ? `${window.location.host}/${shop.slug}` : "Seu link ainda não está pronto"}</h2>\n          <p className="product-subtitle" style={{ marginTop: 8 }}>{shop.slug ? "Compartilhe este endereço para seus clientes verem serviços e agendarem." : "Conclua o cadastro para gerar o endereço público."}</p>\n          {copyMessage && <p className="product-message success" role="status">{copyMessage}</p>}\n        </div>\n        <div className="product-row-actions">\n          {shop.slug && <a className="product-button" href={`/${shop.slug}`} target="_blank" rel="noreferrer">Abrir página</a>}\n          {shop.slug && <button className="product-button secondary" type="button" onClick={() => void copyPublicLink()}>Copiar link</button>}\n          {!shop.slug && <Link className="product-button" href="/painel/configurar">Configurar</Link>}\n        </div>\n      </section>}\n\n      <div className="product-grid cols-3">\n        {links.map((link) => <Link className="product-card pad" key={link.href} href={link.href} style={{ color: "inherit", textDecoration: "none", minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "transform .18s ease, box-shadow .18s ease" }}>\n          <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: "#f0f0ed", fontSize: 18 }}>{link.icon}</span>\n          <div style={{ marginTop: 30 }}><h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{link.title}</h2><p style={{ margin: 0, color: "#6f6f6a", lineHeight: 1.55, fontSize: 13 }}>{link.description}</p></div>\n        </Link>)}\n      </div>\n    </div>\n  </PanelShell>;\n}\n',
    expected: /Dados cadastrais/,
    operator: 'match',
    diff: 'simple'
  }

test at tests/rendered-html.test.mjs:135:1
✖ limits Meus agendamentos to the authenticated customer (1.806861ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /window\.location\.replace\("\/entrar"\)/. Input:
  
  '"use client";\n' +
    '\n' +
    'import { createClient } from "@supabase/supabase-js";\n' +
    'import Link from "next/link";\n' +
    'import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";\n' +
    '\n' +
    'const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);\n' +
    '\n' +
    'type Appointment = {\n' +
    '  id: string;\n' +
    '  starts_at: string;\n' +
    '  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";\n' +
    '  service_ids: string[];\n' +
    '  service_name_snapshot: string | null;\n' +
    '  professional_name_snapshot: string | null;\n' +
    '  barbershops: { name: string; slug: string; whatsapp: string | null }[];\n' +
    '};\n' +
    '\n' +
    'type CustomerProfile = { id: string; name: string; email: string | null; phone: string; phone_normalized: string };\n' +
    '\n' +
    'type ViewKey = "upcoming" | "history";\n' +
    '\n' +
    'const statusLabel: Record<Appointment["status"], string> = {\n' +
    '  scheduled: "Agendado",\n' +
    '  confirmed: "Confirmado",\n' +
    '  completed: "Concluído",\n' +
    '  cancelled: "Cancelado",\n' +
    '  no_show: "Não compareceu",\n' +
    '};\n' +
    '\n' +
    'function fmt(value: string) {\n' +
    '  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));\n' +
    '}\n' +
    '\n' +
    'function whatsapp(phone?: string | null, shop?: string) {\n' +
    '  const digits = (phone || "").replace(/\\D/g, "");\n' +
    '  if (digits.length < 10) return null;\n' +
    '  const number = digits.startsWith("55") ? digits : `55${digits}`;\n' +
    '  const message = encodeURIComponent(`Olá! Sou cliente${shop ? ` da ${shop}` : ""} e gostaria de falar sobre meu agendamento.`);\n' +
    '  return `https://wa.me/${number}?text=${message}`;\n' +
    '}\n' +
    '\n' +
    'function initials(name?: string | null) {\n' +
    '  return (name || "Cliente").trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();\n' +
    '}\n' +
    '\n' +
    'export default function MeusAgendamentos() {\n' +
    '  const [items, setItems] = useState<Appointment[]>([]);\n' +
    '  const [profile, setProfile] = useState<CustomerProfile | null>(null);\n' +
    '  const [view, setView] = useState<ViewKey>("upcoming");\n' +
    '  const [message, setMessage] = useState("Carregando sua área...");\n' +
    '  const [busy, setBusy] = useState("");\n' +
    '  const [savingProfile, setSavingProfile] = useState(false);\n' +
    '  const [editingProfile, setEditingProfile] = useState(false);\n' +
    '  const [name, setName] = useState("");\n' +
    '  const [phone, setPhone] = useState("");\n' +
    '\n' +
    '  const load = useCallback(async (isMounted?: () => boolean) => {\n' +
    '    const { data: { user } } = await supabase.auth.getUser();\n' +
    '    if (!user) { window.location.replace("/cliente/entrar?returnTo=%2Fmeus-agendamentos"); return; }\n' +
    '\n' +
    '    const [profileResult, appointmentResult] = await Promise.all([\n' +
    '      supabase.from("customers").select("id,name,email,phone,phone_normalized").eq("auth_user_id", user.id).maybeSingle<CustomerProfile>(),\n' +
    '      supabase.from("appointments").select("id,starts_at,status,service_ids,service_name_snapshot,professional_name_snapshot,barbershops(name,slug,whatsapp)").eq("customer_id", user.id).order("starts_at", { ascending: false }),\n' +
    '    ]);\n' +
    '    if (isMounted && !isMounted()) return;\n' +
    '\n' +
    '    if (!profileResult.data) {\n' +
    '      window.location.replace("/cliente/entrar?returnTo=%2Fmeus-agendamentos");\n' +
    '      return;\n' +
    '    }\n' +
    '\n' +
    '    setProfile(profileResult.data);\n' +
    '    setName(profileResult.data.name);\n' +
    '    setPhone(profileResult.data.phone);\n' +
    '    setItems((appointmentResult.data || []) as Appointment[]);\n' +
    '    setMessage(appointmentResult.error ? "Não foi possível carregar seus agendamentos." : "");\n' +
    '  }, []);\n' +
    '\n' +
    '  useEffect(() => {\n' +
    '    let active = true;\n' +
    '    const loadTimer = window.setTimeout(() => { void load(() => active); }, 0);\n' +
    '    return () => { active = false; window.clearTimeout(loadTimer); };\n' +
    '  }, [load]);\n' +
    '\n' +
    '  const upcoming = useMemo(() => items.filter((item) => ["scheduled", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() > Date.now()).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)), [items]);\n' +
    '  const history = useMemo(() => items.filter((item) => !upcoming.some((future) => future.id === item.id)), [items, upcoming]);\n' +
    '  const visible = view === "upcoming" ? upcoming : history;\n' +
    '  const next = upcoming[0] || null;\n' +
    '\n' +
    '  async function change(item: Appointment, rebook = false) {\n' +
    '    if (!window.confirm(rebook ? "A reserva atual será cancelada e você escolherá um novo horário. Continuar?" : "Cancelar este agendamento?")) return;\n' +
    '    setBusy(item.id); setMessage("");\n' +
    '    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", item.id);\n' +
    '    if (error) { setBusy(""); setMessage("Não foi possível atualizar este agendamento."); return; }\n' +
    '    const shop = item.barbershops[0];\n' +
    '    if (rebook && shop) { window.location.assign(`/${shop.slug}?services=${item.service_ids.join(",")}`); return; }\n' +
    '    setBusy(""); setMessage("Agendamento cancelado."); await load();\n' +
    '  }\n' +
    '\n' +
    '  async function saveProfile(event: FormEvent) {\n' +
    '    event.preventDefault();\n' +
    '    const digits = phone.replace(/\\D/g, "");\n' +
    '    if (name.trim().length < 2) { setMessage("Informe seu nome completo."); return; }\n' +
    '    if (digits.length < 10 || digits.length > 13) { setMessage("Informe um celular/WhatsApp válido com DDD."); return; }\n' +
    '    setSavingProfile(true); setMessage("");\n' +
    '    const { data, error } = await supabase.rpc("save_my_customer_profile", { p_name: name.trim(), p_phone: phone.trim() });\n' +
    '    setSavingProfile(false);\n' +
    '    if (error) { setMessage(error.message || "Não foi possível atualizar seus dados."); return; }\n' +
    '    const saved = Array.isArray(data) ? data[0] : data;\n' +
    '    if (saved) setProfile(saved as CustomerProfile);\n' +
    '    setEditingProfile(false); setMessage("Seus dados foram atualizados.");\n' +
    '  }\n' +
    '\n' +
    '  async function signOut() {\n' +
    '    await supabase.auth.signOut();\n' +
    '    window.location.replace("/");\n' +
    '  }\n' +
    '\n' +
    '  if (!profile) {\n' +
    '    return <main className="customer-shell" style={{ display: "grid", placeItems: "center" }}><p className="customer-message">{message}</p></main>;\n' +
    '  }\n' +
    '\n' +
    '  return <main className="customer-shell">\n' +
    '    <header className="customer-topbar">\n' +
    '      <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>\n' +
    '      <div className="customer-header-actions">\n' +
    '        <button className="customer-button secondary" type="button" onClick={() => void signOut()}>Sair</button>\n' +
    '        <div className="customer-avatar" aria-label={profile.name}>{initials(profile.name)}</div>\n' +
    '      </div>\n' +
    '    </header>\n' +
    '\n' +
    '    <div className="customer-content">\n' +
    '      <div className="customer-page-head">\n' +
    '        <div>\n' +
    '          <p className="customer-eyebrow">Área do cliente</p>\n' +
    '          <h1 className="customer-title">Olá, {profile.name.split(" ")[0]}.</h1>\n' +
    '          <p className="customer-subtitle">Acompanhe seus horários, fale com a barbearia e mantenha seu WhatsApp atualizado.</p>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '\n' +
    '      {message && <p className={`customer-message ${message.includes("atualizados") || message.includes("cancelado") ? "success" : message.includes("Não foi") ? "error" : ""}`} role="status">{message}</p>}\n' +
    '\n' +
    '      {next && <section className="customer-card pad" style={{ background: "#111", color: "white", borderColor: "#111", marginBottom: 22 }}>\n' +
    '        <p className="customer-eyebrow" style={{ color: "#cfb06e" }}>Próximo agendamento</p>\n' +
    '        <div className="customer-appointment" style={{ padding: 0 }}>\n' +
    '          <div>\n' +
    '            <h3 style={{ fontSize: 24 }}>{next.barbershops[0]?.name || "Barbearia"}</h3>\n' +
    '            <p style={{ color: "#c7c7c2" }}>{next.service_name_snapshot || "Serviço"} · {next.professional_name_snapshot || "Profissional"}</p>\n' +
    '            <time>{fmt(next.starts_at)}</time>\n' +
    '          </div>\n' +
    '          <div className="customer-appointment-actions">\n' +
    '            {whatsapp(next.barbershops[0]?.whatsapp, next.barbershops[0]?.name) && <a className="customer-button whatsapp" href={whatsapp(next.barbershops[0]?.whatsapp, next.barbershops[0]?.name) || "#"} target="_blank" rel="noreferrer">WhatsApp</a>}\n' +
    '            <button className="customer-button secondary" type="button" disabled={busy === next.id} onClick={() => void change(next, true)}>Reagendar</button>\n' +
    '          </div>\n' +
    '        </div>\n' +
    '      </section>}\n' +
    '\n' +
    '      <div className="customer-profile-grid">\n' +
    '        <section>\n' +
    '          <div className="product-chip-row" style={{ marginBottom: 14 }}>\n' +
    '            <button className="product-chip" data-active={view === "upcoming" ? "true" : "false"} type="button" onClick={() => setView("upcoming")}>Próximos ({upcoming.length})</button>\n' +
    '            <button className="product-chip" data-active={view === "history" ? "true" : "false"} type="button" onClick={() => setView("history")}>Histórico ({history.length})</button>\n' +
    '          </div>\n' +
    '          <div style={{ display: "grid", gap: 12 }}>\n' +
    '            {visible.map((item) => {\n' +
    '              const shop = item.barbershops[0];\n' +
    '              const wa = whatsapp(shop?.whatsapp, shop?.name);\n' +
    '              const canChange = ["scheduled", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() > Date.now();\n' +
    '              return <article className="customer-card customer-appointment" key={item.id}>\n' +
    '                <div>\n' +
    '                  <h3>{shop?.name || "Barbearia"}</h3>\n' +
    '                  <p>{item.service_name_snapshot || "Serviço"} · {item.professional_name_snapshot || "Profissional"}</p>\n' +
    '                  <time>{fmt(item.starts_at)}</time>\n' +
    '                  <span className={`product-status ${item.status}`} style={{ marginTop: 12 }}>{statusLabel[item.status]}</span>\n' +
    '                </div>\n' +
    '                <div className="customer-appointment-actions">\n' +
    '                  {wa && <a className="customer-button whatsapp" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}\n' +
    '                  {canChange && <button className="customer-button secondary" disabled={busy === item.id} onClick={() => void change(item, true)}>Reagendar</button>}\n' +
    '                  {canChange && <button className="customer-button secondary" disabled={busy === item.id} onClick={() => void change(item)}>Cancelar</button>}\n' +
    '                  {shop?.slug && <Link className="customer-button secondary" href={`/${shop.slug}`}>Ver barbearia</Link>}\n' +
    '            '... 2308 more characters
  
      at TestContext.<anonymous> (file:///home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/tests/rendered-html.test.mjs:139:10)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '"use client";\n\nimport { createClient } from "@supabase/supabase-js";\nimport Link from "next/link";\nimport { FormEvent, useCallback, useEffect, useMemo, useState } from "react";\n\nconst supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);\n\ntype Appointment = {\n  id: string;\n  starts_at: string;\n  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";\n  service_ids: string[];\n  service_name_snapshot: string | null;\n  professional_name_snapshot: string | null;\n  barbershops: { name: string; slug: string; whatsapp: string | null }[];\n};\n\ntype CustomerProfile = { id: string; name: string; email: string | null; phone: string; phone_normalized: string };\n\ntype ViewKey = "upcoming" | "history";\n\nconst statusLabel: Record<Appointment["status"], string> = {\n  scheduled: "Agendado",\n  confirmed: "Confirmado",\n  completed: "Concluído",\n  cancelled: "Cancelado",\n  no_show: "Não compareceu",\n};\n\nfunction fmt(value: string) {\n  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));\n}\n\nfunction whatsapp(phone?: string | null, shop?: string) {\n  const digits = (phone || "").replace(/\\D/g, "");\n  if (digits.length < 10) return null;\n  const number = digits.startsWith("55") ? digits : `55${digits}`;\n  const message = encodeURIComponent(`Olá! Sou cliente${shop ? ` da ${shop}` : ""} e gostaria de falar sobre meu agendamento.`);\n  return `https://wa.me/${number}?text=${message}`;\n}\n\nfunction initials(name?: string | null) {\n  return (name || "Cliente").trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();\n}\n\nexport default function MeusAgendamentos() {\n  const [items, setItems] = useState<Appointment[]>([]);\n  const [profile, setProfile] = useState<CustomerProfile | null>(null);\n  const [view, setView] = useState<ViewKey>("upcoming");\n  const [message, setMessage] = useState("Carregando sua área...");\n  const [busy, setBusy] = useState("");\n  const [savingProfile, setSavingProfile] = useState(false);\n  const [editingProfile, setEditingProfile] = useState(false);\n  const [name, setName] = useState("");\n  const [phone, setPhone] = useState("");\n\n  const load = useCallback(async (isMounted?: () => boolean) => {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) { window.location.replace("/cliente/entrar?returnTo=%2Fmeus-agendamentos"); return; }\n\n    const [profileResult, appointmentResult] = await Promise.all([\n      supabase.from("customers").select("id,name,email,phone,phone_normalized").eq("auth_user_id", user.id).maybeSingle<CustomerProfile>(),\n      supabase.from("appointments").select("id,starts_at,status,service_ids,service_name_snapshot,professional_name_snapshot,barbershops(name,slug,whatsapp)").eq("customer_id", user.id).order("starts_at", { ascending: false }),\n    ]);\n    if (isMounted && !isMounted()) return;\n\n    if (!profileResult.data) {\n      window.location.replace("/cliente/entrar?returnTo=%2Fmeus-agendamentos");\n      return;\n    }\n\n    setProfile(profileResult.data);\n    setName(profileResult.data.name);\n    setPhone(profileResult.data.phone);\n    setItems((appointmentResult.data || []) as Appointment[]);\n    setMessage(appointmentResult.error ? "Não foi possível carregar seus agendamentos." : "");\n  }, []);\n\n  useEffect(() => {\n    let active = true;\n    const loadTimer = window.setTimeout(() => { void load(() => active); }, 0);\n    return () => { active = false; window.clearTimeout(loadTimer); };\n  }, [load]);\n\n  const upcoming = useMemo(() => items.filter((item) => ["scheduled", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() > Date.now()).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)), [items]);\n  const history = useMemo(() => items.filter((item) => !upcoming.some((future) => future.id === item.id)), [items, upcoming]);\n  const visible = view === "upcoming" ? upcoming : history;\n  const next = upcoming[0] || null;\n\n  async function change(item: Appointment, rebook = false) {\n    if (!window.confirm(rebook ? "A reserva atual será cancelada e você escolherá um novo horário. Continuar?" : "Cancelar este agendamento?")) return;\n    setBusy(item.id); setMessage("");\n    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", item.id);\n    if (error) { setBusy(""); setMessage("Não foi possível atualizar este agendamento."); return; }\n    const shop = item.barbershops[0];\n    if (rebook && shop) { window.location.assign(`/${shop.slug}?services=${item.service_ids.join(",")}`); return; }\n    setBusy(""); setMessage("Agendamento cancelado."); await load();\n  }\n\n  async function saveProfile(event: FormEvent) {\n    event.preventDefault();\n    const digits = phone.replace(/\\D/g, "");\n    if (name.trim().length < 2) { setMessage("Informe seu nome completo."); return; }\n    if (digits.length < 10 || digits.length > 13) { setMessage("Informe um celular/WhatsApp válido com DDD."); return; }\n    setSavingProfile(true); setMessage("");\n    const { data, error } = await supabase.rpc("save_my_customer_profile", { p_name: name.trim(), p_phone: phone.trim() });\n    setSavingProfile(false);\n    if (error) { setMessage(error.message || "Não foi possível atualizar seus dados."); return; }\n    const saved = Array.isArray(data) ? data[0] : data;\n    if (saved) setProfile(saved as CustomerProfile);\n    setEditingProfile(false); setMessage("Seus dados foram atualizados.");\n  }\n\n  async function signOut() {\n    await supabase.auth.signOut();\n    window.location.replace("/");\n  }\n\n  if (!profile) {\n    return <main className="customer-shell" style={{ display: "grid", placeItems: "center" }}><p className="customer-message">{message}</p></main>;\n  }\n\n  return <main className="customer-shell">\n    <header className="customer-topbar">\n      <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>\n      <div className="customer-header-actions">\n        <button className="customer-button secondary" type="button" onClick={() => void signOut()}>Sair</button>\n        <div className="customer-avatar" aria-label={profile.name}>{initials(profile.name)}</div>\n      </div>\n    </header>\n\n    <div className="customer-content">\n      <div className="customer-page-head">\n        <div>\n          <p className="customer-eyebrow">Área do cliente</p>\n          <h1 className="customer-title">Olá, {profile.name.split(" ")[0]}.</h1>\n          <p className="customer-subtitle">Acompanhe seus horários, fale com a barbearia e mantenha seu WhatsApp atualizado.</p>\n        </div>\n      </div>\n\n      {message && <p className={`customer-message ${message.includes("atualizados") || message.includes("cancelado") ? "success" : message.includes("Não foi") ? "error" : ""}`} role="status">{message}</p>}\n\n      {next && <section className="customer-card pad" style={{ background: "#111", color: "white", borderColor: "#111", marginBottom: 22 }}>\n        <p className="customer-eyebrow" style={{ color: "#cfb06e" }}>Próximo agendamento</p>\n        <div className="customer-appointment" style={{ padding: 0 }}>\n          <div>\n            <h3 style={{ fontSize: 24 }}>{next.barbershops[0]?.name || "Barbearia"}</h3>\n            <p style={{ color: "#c7c7c2" }}>{next.service_name_snapshot || "Serviço"} · {next.professional_name_snapshot || "Profissional"}</p>\n            <time>{fmt(next.starts_at)}</time>\n          </div>\n          <div className="customer-appointment-actions">\n            {whatsapp(next.barbershops[0]?.whatsapp, next.barbershops[0]?.name) && <a className="customer-button whatsapp" href={whatsapp(next.barbershops[0]?.whatsapp, next.barbershops[0]?.name) || "#"} target="_blank" rel="noreferrer">WhatsApp</a>}\n            <button className="customer-button secondary" type="button" disabled={busy === next.id} onClick={() => void change(next, true)}>Reagendar</button>\n          </div>\n        </div>\n      </section>}\n\n      <div className="customer-profile-grid">\n        <section>\n          <div className="product-chip-row" style={{ marginBottom: 14 }}>\n            <button className="product-chip" data-active={view === "upcoming" ? "true" : "false"} type="button" onClick={() => setView("upcoming")}>Próximos ({upcoming.length})</button>\n            <button className="product-chip" data-active={view === "history" ? "true" : "false"} type="button" onClick={() => setView("history")}>Histórico ({history.length})</button>\n          </div>\n          <div style={{ display: "grid", gap: 12 }}>\n            {visible.map((item) => {\n              const shop = item.barbershops[0];\n              const wa = whatsapp(shop?.whatsapp, shop?.name);\n              const canChange = ["scheduled", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() > Date.now();\n              return <article className="customer-card customer-appointment" key={item.id}>\n                <div>\n                  <h3>{shop?.name || "Barbearia"}</h3>\n                  <p>{item.service_name_snapshot || "Serviço"} · {item.professional_name_snapshot || "Profissional"}</p>\n                  <time>{fmt(item.starts_at)}</time>\n                  <span className={`product-status ${item.status}`} style={{ marginTop: 12 }}>{statusLabel[item.status]}</span>\n                </div>\n                <div className="customer-appointment-actions">\n                  {wa && <a className="customer-button whatsapp" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}\n                  {canChange && <button className="customer-button secondary" disabled={busy === item.id} onClick={() => void change(item, true)}>Reagendar</button>}\n                  {canChange && <button className="customer-button secondary" disabled={busy === item.id} onClick={() => void change(item)}>Cancelar</button>}\n                  {shop?.slug && <Link className="customer-button secondary" href={`/${shop.slug}`}>Ver barbearia</Link>}\n            '... 2308 more characters,
    expected: /window\.location\.replace\("\/entrar"\)/,
    operator: 'match',
    diff: 'simple'
  }
```
