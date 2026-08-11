"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import { saoPauloDateTimeToIso } from "@/utils/brazil-time";
import PanelShell from "../PanelShell";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
type Professional = { id: string; name: string };
type Break = { id: string; weekday: number; starts_at: string; ends_at: string };
type Shop = { id: string; name: string; role: "owner" | "manager" };
const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "SÃ¡b"];

export default function Profissionais() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("Carregando...");

  async function load() {
    const context = await getPanelContext(supabase);
    if (!context.userId) return window.location.replace("/entrar");
    if (context.role === "barber") return window.location.replace("/painel/agenda");
    if (!context.role || !context.barbershopId) return window.location.replace("/painel/inicio");

    const [professionalResult, shopResult] = await Promise.all([
      supabase.from("professionals").select("id,name").eq("barbershop_id", context.barbershopId).eq("active", true).order("name"),
      supabase.from("barbershops").select("id,name").eq("id", context.barbershopId).maybeSingle<{ id: string; name: string }>(),
    ]);
    setProfessionals(professionalResult.data || []);
    if (shopResult.data) setShop({ ...shopResult.data, role: context.role as "owner" | "manager" });
    setMessage(professionalResult.error ? "NÃ£o foi possÃ­vel carregar os profissionais." : "");
  }

  async function choose(value: string) {
    setProfessionalId(value);
    if (!value) { setBreaks([]); return; }
    const { data } = await supabase.from("professional_breaks").select("id,weekday,starts_at,ends_at").eq("professional_id", value).order("weekday");
    setBreaks(data || []);
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!professionalId) return;
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("professional_breaks").upsert({ professional_id: professionalId, weekday: Number(form.get("weekday")), starts_at: String(form.get("start")), ends_at: String(form.get("end")) }, { onConflict: "professional_id,weekday" });
    setMessage(error ? "NÃ£o foi possÃ­vel salvar a pausa recorrente." : "Pausa recorrente salva.");
    if (!error) await choose(professionalId);
  }

  async function block(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!professionalId) return;
    const form = new FormData(event.currentTarget);
    const start = saoPauloDateTimeToIso(String(form.get("start")));
    const end = saoPauloDateTimeToIso(String(form.get("end")));
    if (new Date(start) >= new Date(end)) { setMessage("O fim do bloqueio deve ser posterior ao inÃ­cio."); return; }
    const { error } = await supabase.from("professional_time_blocks").insert({ professional_id: professionalId, starts_at: start, ends_at: end, reason: String(form.get("reason") || "") });
    setMessage(error ? "NÃ£o foi possÃ­vel bloquear o perÃ­odo." : "Bloqueio pontual salvo.");
    if (!error) event.currentTarget.reset();
  }

  if (!shop) return <main className="product-shell" style={{ display: "grid", placeItems: "center" }}><p className="product-message">{message}</p></main>;

  return <PanelShell role={shop.role} active="professionals" shopName={shop.name} barbershopId={shop.id} actions={<Link className="product-button" href="/painel/configurar">Gerenciar equipe</Link>}>
    <div className="product-content">
      <div className="product-page-head">
        <div>
          <p className="product-eyebrow">Equipe e disponibilidade</p>
          <h1 className="product-title">Profissionais</h1>
          <p className="product-subtitle">Configure pausas recorrentes e bloqueios pontuais sem alterar o horÃ¡rio geral da barbearia.</p>
        </div>
      </div>

      <section className="product-card product-filters">
        <div className="product-field" style={{ flex: "1 1 320px" }}><label>Profissional</label><select className="product-select" value={professionalId} onChange={(event) => void choose(event.target.value)}><option value="">Escolha um profissional</option>{professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select></div>
      </section>

      {message && <p className={`product-message ${message.includes("salvo") ? "success" : message.includes("NÃ£o foi") ? "error" : ""}`} role="status">{message}</p>}

      {!professionalId ? <div className="product-card product-empty" style={{ marginTop: 18 }}>Selecione um profissional para editar a disponibilidade.</div> : <div className="product-grid cols-2" style={{ marginTop: 18 }}>
        <form className="product-card pad" onSubmit={save}>
          <div className="product-section-head"><div><h2>Pausa recorrente por dia</h2><p>Ex.: almoÃ§o ou pausa fixa. Escolha o dia e o horÃ¡rio em que esse profissional nÃ£o aceita novos agendamentos.</p></div></div>
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <div className="product-field"><label>Dia</label><select className="product-select" name="weekday">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></div>
            <div className="product-grid cols-2"><div className="product-field"><label>InÃ­cio</label><input className="product-input" name="start" type="time" required /></div><div className="product-field"><label>Fim</label><input className="product-input" name="end" type="time" required /></div></div>
            <button className="product-button" type="submit">Salvar pausa recorrente</button>
          </div>
          <div className="product-chip-row" style={{ marginTop: 20 }}>{breaks.map((item) => <span className="product-chip" key={item.id}>{days[item.weekday]} Â· {item.starts_at.slice(0, 5)}â€“{item.ends_at.slice(0, 5)}</span>)}{!breaks.length && <small style={{ color: "#777" }}>Nenhuma pausa recorrente cadastrada.</small>}</div>
        </form>

        <form className="product-card pad" onSubmit={block}>
          <div className="product-section-head"><div><h2>Bloqueio pontual</h2><p>Folga, fÃ©rias, compromisso ou qualquer indisponibilidade excepcional.</p></div></div>
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <div className="product-field"><label>InÃ­cio</label><input className="product-input" name="start" type="datetime-local" required /></div>
            <div className="product-field"><label>Fim</label><input className="product-input" name="end" type="datetime-local" required /></div>
            <div className="product-field"><label>Motivo</label><input className="product-input" name="reason" placeholder="Ex.: folga, fÃ©rias ou compromisso" /></div>
            <button className="product-button" type="submit">Bloquear perÃ­odo</button>
          </div>
        </form>
      </div>}
    </div>
  </PanelShell>;
}
