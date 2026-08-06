"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
type Professional = { id: string; name: string };
type Break = { id: string; weekday: number; starts_at: string; ends_at: string };
const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Profissionais() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [message, setMessage] = useState("Carregando...");

  async function load() {
    const context = await getPanelContext(supabase);
    if (!context.userId) return window.location.replace("/entrar");
    if (context.role === "barber") return window.location.replace("/painel/agenda");
    if (!context.barbershopId) return window.location.replace("/painel/inicio");

    const { data } = await supabase.from("professionals").select("id,name").eq("barbershop_id", context.barbershopId).eq("active", true);
    setProfessionals(data || []);
    setMessage("");
  }
  async function choose(value: string) {
    setProfessionalId(value);
    const { data } = await supabase.from("professional_breaks").select("id,weekday,starts_at,ends_at").eq("professional_id", value);
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
    setMessage(error ? "Não foi possível salvar." : "Intervalo salvo.");
    if (!error) await choose(professionalId);
  }
  async function block(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!professionalId) return;
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("professional_time_blocks").insert({ professional_id: professionalId, starts_at: new Date(String(form.get("start"))).toISOString(), ends_at: new Date(String(form.get("end"))).toISOString(), reason: String(form.get("reason") || "") });
    setMessage(error ? "Não foi possível bloquear." : "Bloqueio pontual salvo.");
  }

  return <main style={{ padding: 24, fontFamily: "Arial", background: "#f6f2ed", minHeight: "100vh" }}><header style={{ marginBottom: 20 }}><Link href="/painel" style={{ color: "#1b1714", fontWeight: 900, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></Link></header><Link href="/painel/configurar">← Configurações</Link><h1>Intervalos e bloqueios</h1><p>Sem intervalo cadastrado, todo o expediente do profissional fica disponível.</p><select value={professionalId} onChange={(event) => void choose(event.target.value)} style={{ padding: 10, width: "100%" }}><option value="">Escolha o profissional</option>{professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select>{professionalId && <><form onSubmit={save} style={{ marginTop: 18, background: "white", padding: 16 }}><b>Intervalo semanal</b><div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}><select name="weekday">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input name="start" type="time" required /><input name="end" type="time" required /><button>Salvar intervalo</button></div>{breaks.map((item) => <small key={item.id} style={{ display: "block", marginTop: 8 }}>{days[item.weekday]}: {item.starts_at.slice(0, 5)}–{item.ends_at.slice(0, 5)}</small>)}</form><form onSubmit={block} style={{ marginTop: 18, background: "white", padding: 16 }}><b>Bloqueio pontual</b><div style={{ display: "grid", gap: 8, marginTop: 10 }}><input name="start" type="datetime-local" required /><input name="end" type="datetime-local" required /><input name="reason" placeholder="Ex.: almoço, folga ou férias" /><button>Bloquear período</button></div></form></>}{message && <p>{message}</p>}</main>;
}
