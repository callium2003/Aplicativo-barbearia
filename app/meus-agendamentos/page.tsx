"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

type Appointment = {
  id: string;
  starts_at: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  service_ids: string[];
  service_name_snapshot: string | null;
  professional_name_snapshot: string | null;
  barbershops: { name: string; slug: string; whatsapp: string | null }[];
};

type CustomerProfile = { id: string; name: string; email: string | null; phone: string; phone_normalized: string };

type ViewKey = "upcoming" | "history";

const statusLabel: Record<Appointment["status"], string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

function fmt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function whatsapp(phone?: string | null, shop?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const message = encodeURIComponent(`Olá! Sou cliente${shop ? ` da ${shop}` : ""} e gostaria de falar sobre meu agendamento.`);
  return `https://wa.me/${number}?text=${message}`;
}

function initials(name?: string | null) {
  return (name || "Cliente").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function MeusAgendamentos() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [view, setView] = useState<ViewKey>("upcoming");
  const [message, setMessage] = useState("Carregando sua área...");
  const [busy, setBusy] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async (isMounted?: () => boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/cliente/entrar?returnTo=%2Fmeus-agendamentos"); return; }

    const [profileResult, appointmentResult] = await Promise.all([
      supabase.from("customers").select("id,name,email,phone,phone_normalized").eq("auth_user_id", user.id).maybeSingle<CustomerProfile>(),
      supabase.from("appointments").select("id,starts_at,status,service_ids,service_name_snapshot,professional_name_snapshot,barbershops(name,slug,whatsapp)").eq("customer_id", user.id).order("starts_at", { ascending: false }),
    ]);
    if (isMounted && !isMounted()) return;

    if (!profileResult.data) {
      window.location.replace("/cliente/entrar?returnTo=%2Fmeus-agendamentos");
      return;
    }

    setProfile(profileResult.data);
    setName(profileResult.data.name);
    setPhone(profileResult.data.phone);
    setItems((appointmentResult.data || []) as Appointment[]);
    setMessage(appointmentResult.error ? "Não foi possível carregar seus agendamentos." : "");
  }, []);

  useEffect(() => {
    let active = true;
    const loadTimer = window.setTimeout(() => { void load(() => active); }, 0);
    return () => { active = false; window.clearTimeout(loadTimer); };
  }, [load]);

  const upcoming = useMemo(() => items.filter((item) => ["scheduled", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() > Date.now()).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)), [items]);
  const history = useMemo(() => items.filter((item) => !upcoming.some((future) => future.id === item.id)), [items, upcoming]);
  const visible = view === "upcoming" ? upcoming : history;
  const next = upcoming[0] || null;

  async function change(item: Appointment, rebook = false) {
    if (!window.confirm(rebook ? "A reserva atual será cancelada e você escolherá um novo horário. Continuar?" : "Cancelar este agendamento?")) return;
    setBusy(item.id); setMessage("");
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", item.id);
    if (error) { setBusy(""); setMessage("Não foi possível atualizar este agendamento."); return; }
    const shop = item.barbershops[0];
    if (rebook && shop) { window.location.assign(`/${shop.slug}?services=${item.service_ids.join(",")}`); return; }
    setBusy(""); setMessage("Agendamento cancelado."); await load();
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) { setMessage("Informe seu nome completo."); return; }
    if (digits.length < 10 || digits.length > 13) { setMessage("Informe um celular/WhatsApp válido com DDD."); return; }
    setSavingProfile(true); setMessage("");
    const { data, error } = await supabase.rpc("save_my_customer_profile", { p_name: name.trim(), p_phone: phone.trim() });
    setSavingProfile(false);
    if (error) { setMessage(error.message || "Não foi possível atualizar seus dados."); return; }
    const saved = Array.isArray(data) ? data[0] : data;
    if (saved) setProfile(saved as CustomerProfile);
    setEditingProfile(false); setMessage("Seus dados foram atualizados.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  if (!profile) {
    return <main className="customer-shell" style={{ display: "grid", placeItems: "center" }}><p className="customer-message">{message}</p></main>;
  }

  return <main className="customer-shell">
    <header className="customer-topbar">
      <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>
      <div className="customer-header-actions">
        <button className="customer-button secondary" type="button" onClick={() => void signOut()}>Sair</button>
        <div className="customer-avatar" aria-label={profile.name}>{initials(profile.name)}</div>
      </div>
    </header>

    <div className="customer-content">
      <div className="customer-page-head">
        <div>
          <p className="customer-eyebrow">Área do cliente</p>
          <h1 className="customer-title">Olá, {profile.name.split(" ")[0]}.</h1>
          <p className="customer-subtitle">Acompanhe seus horários, fale com a barbearia e mantenha seu WhatsApp atualizado.</p>
        </div>
      </div>

      {message && <p className={`customer-message ${message.includes("atualizados") || message.includes("cancelado") ? "success" : message.includes("Não foi") ? "error" : ""}`} role="status">{message}</p>}

      {next && <section className="customer-card pad" style={{ background: "#111", color: "white", borderColor: "#111", marginBottom: 22 }}>
        <p className="customer-eyebrow" style={{ color: "#cfb06e" }}>Próximo agendamento</p>
        <div className="customer-appointment" style={{ padding: 0 }}>
          <div>
            <h3 style={{ fontSize: 24 }}>{next.barbershops[0]?.name || "Barbearia"}</h3>
            <p style={{ color: "#c7c7c2" }}>{next.service_name_snapshot || "Serviço"} · {next.professional_name_snapshot || "Profissional"}</p>
            <time>{fmt(next.starts_at)}</time>
          </div>
          <div className="customer-appointment-actions">
            {whatsapp(next.barbershops[0]?.whatsapp, next.barbershops[0]?.name) && <a className="customer-button whatsapp" href={whatsapp(next.barbershops[0]?.whatsapp, next.barbershops[0]?.name) || "#"} target="_blank" rel="noreferrer">WhatsApp</a>}
            <button className="customer-button secondary" type="button" disabled={busy === next.id} onClick={() => void change(next, true)}>Reagendar</button>
          </div>
        </div>
      </section>}

      <div className="customer-profile-grid">
        <section>
          <div className="product-chip-row" style={{ marginBottom: 14 }}>
            <button className="product-chip" data-active={view === "upcoming" ? "true" : "false"} type="button" onClick={() => setView("upcoming")}>Próximos ({upcoming.length})</button>
            <button className="product-chip" data-active={view === "history" ? "true" : "false"} type="button" onClick={() => setView("history")}>Histórico ({history.length})</button>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {visible.map((item) => {
              const shop = item.barbershops[0];
              const wa = whatsapp(shop?.whatsapp, shop?.name);
              const canChange = ["scheduled", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() > Date.now();
              return <article className="customer-card customer-appointment" key={item.id}>
                <div>
                  <h3>{shop?.name || "Barbearia"}</h3>
                  <p>{item.service_name_snapshot || "Serviço"} · {item.professional_name_snapshot || "Profissional"}</p>
                  <time>{fmt(item.starts_at)}</time>
                  <span className={`product-status ${item.status}`} style={{ marginTop: 12 }}>{statusLabel[item.status]}</span>
                </div>
                <div className="customer-appointment-actions">
                  {wa && <a className="customer-button whatsapp" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
                  {canChange && <button className="customer-button secondary" disabled={busy === item.id} onClick={() => void change(item, true)}>Reagendar</button>}
                  {canChange && <button className="customer-button secondary" disabled={busy === item.id} onClick={() => void change(item)}>Cancelar</button>}
                  {shop?.slug && <Link className="customer-button secondary" href={`/${shop.slug}`}>Ver barbearia</Link>}
                </div>
              </article>;
            })}
            {!visible.length && <div className="customer-card customer-empty">{view === "upcoming" ? "Você não tem agendamentos futuros." : "Seu histórico aparecerá aqui depois dos atendimentos."}</div>}
          </div>
        </section>

        <aside className="customer-card pad" style={{ alignSelf: "start" }}>
          <div className="product-section-head"><div><h2>Minha conta</h2><p>Dados usados nos seus agendamentos.</p></div>{!editingProfile && <button className="customer-button secondary" type="button" onClick={() => setEditingProfile(true)}>Editar</button>}</div>
          {!editingProfile ? <div style={{ display: "grid", gap: 15, marginTop: 20 }}>
            <div><small style={{ color: "#777" }}>NOME</small><br /><b>{profile.name}</b></div>
            <div><small style={{ color: "#777" }}>E-MAIL</small><br /><b>{profile.email || "—"}</b></div>
            <div><small style={{ color: "#777" }}>WHATSAPP</small><br /><b>{profile.phone}</b></div>
            <p style={{ margin: "4px 0 0", color: "#777", fontSize: 12, lineHeight: 1.5 }}>Seu WhatsApp é obrigatório para contato relacionado ao atendimento. Marketing depende de autorização separada.</p>
          </div> : <form onSubmit={saveProfile} style={{ display: "grid", gap: 14, marginTop: 18 }}>
            <div className="customer-field"><label>Nome completo</label><input className="customer-input" value={name} onChange={(event) => setName(event.target.value)} required /></div>
            <div className="customer-field"><label>E-mail</label><input className="customer-input" value={profile.email || ""} disabled /></div>
            <div className="customer-field"><label>Celular / WhatsApp</label><input className="customer-input" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" required /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="customer-button" disabled={savingProfile}>{savingProfile ? "Salvando..." : "Salvar"}</button><button className="customer-button secondary" type="button" onClick={() => { setEditingProfile(false); setName(profile.name); setPhone(profile.phone); }}>Cancelar</button></div>
          </form>}
        </aside>
      </div>
    </div>
  </main>;
}
