"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

type Details = {
  responsibleName: string;
  responsiblePhone: string;
  barbershopName: string;
  barbershopPhone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  totalPeople: string;
  attendingProfessionals: string;
  servicePositions: string;
  taxDocument: string;
};

const emptyDetails: Details = { responsibleName: "", responsiblePhone: "", barbershopName: "", barbershopPhone: "", postalCode: "", address: "", addressNumber: "", neighborhood: "", city: "", state: "", totalPeople: "", attendingProfessionals: "", servicePositions: "", taxDocument: "" };
const input = { width: "100%", boxSizing: "border-box" as const, marginTop: 6, padding: 12, border: "1px solid #d9d0c8", borderRadius: 7, fontSize: 16 };

function digits(value: string) { return value.replace(/\D/g, ""); }
function formatPhone(value: string) {
  const phone = digits(value).slice(0, 11);
  if (phone.length <= 2) return phone ? `(${phone}` : "";
  if (phone.length <= 6) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
  if (phone.length <= 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
}
function validBrazilianPhone(value: string) {
  const phone = digits(value);
  return /^(?:[1-9][0-9])(?:9[0-9]{8}|[2-5][0-9]{7})$/.test(phone);
}
function validDocument(value: string) {
  const document = digits(value);
  if (!document) return true;
  if (/^(\d)\1+$/.test(document)) return false;
  const calculate = (base: string, weights: number[]) => weights.reduce((sum, weight, index) => sum + Number(base[index]) * weight, 0) % 11;
  if (document.length === 11) {
    const first = calculate(document.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const firstDigit = first < 2 ? 0 : 11 - first;
    const second = calculate(document.slice(0, 9) + firstDigit, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return document.endsWith(`${firstDigit}${second < 2 ? 0 : 11 - second}`);
  }
  if (document.length === 14) {
    const first = calculate(document.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const firstDigit = first < 2 ? 0 : 11 - first;
    const second = calculate(document.slice(0, 12) + firstDigit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return document.endsWith(`${firstDigit}${second < 2 ? 0 : 11 - second}`);
  }
  return false;
}
import { getPanelContext } from "@/utils/panel-context";

function makeSlug(name: string) {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "barbearia";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function CadastroInicial() {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState<Details>(emptyDetails);
  const [email, setEmail] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Verificando seu acesso...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const context = await getPanelContext(supabase);
      if (!active) return;
      if (!context.userId) { window.location.replace("/entrar"); return; }
      if (context.role === "barber" || context.role === "manager") {
        window.location.replace("/painel/agenda");
        return;
      }
      if (context.role === "owner" && context.initialRegistrationCompleted) {
        window.location.replace("/painel");
        return;
      }
      setEmail(context.userEmail || "");
      setShopId(context.barbershopId);
      setMessage("");
    }
    void load();
    return () => { active = false; };
  }, []);

  function update(field: keyof Details, value: string) { setDetails((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); }
  function validateFirst() {
    const next: Record<string, string> = {};
    if (details.responsibleName.trim().length < 2) next.responsibleName = "Informe seu nome completo.";
    if (!validBrazilianPhone(details.responsiblePhone)) next.responsiblePhone = "Informe um telefone brasileiro válido com DDD.";
    setErrors(next);
    return !Object.keys(next).length;
  }
  function validateSecond() {
    const next: Record<string, string> = {};
    const total = Number(details.totalPeople), professionals = Number(details.attendingProfessionals), positions = Number(details.servicePositions);
    if (details.barbershopName.trim().length < 2) next.barbershopName = "Informe o nome da barbearia.";
    if (!validBrazilianPhone(details.barbershopPhone)) next.barbershopPhone = "Informe um telefone brasileiro válido com DDD.";
    if (!/^\d{8}$/.test(digits(details.postalCode))) next.postalCode = "Informe um CEP válido com 8 números.";
    (["address", "addressNumber", "neighborhood", "city"] as const).forEach((field) => { if (!details[field].trim()) next[field] = "Este campo é obrigatório."; });
    if (!/^[A-Za-z]{2}$/.test(details.state.trim())) next.state = "Informe a sigla do estado, por exemplo SP.";
    if (!Number.isInteger(total) || total <= 0) next.totalPeople = "Informe uma quantidade maior que zero.";
    if (!Number.isInteger(professionals) || professionals <= 0) next.attendingProfessionals = "Informe uma quantidade maior que zero.";
    else if (Number.isInteger(total) && professionals > total) next.attendingProfessionals = "A quantidade de profissionais não pode ser maior que o total de pessoas.";
    if (!Number.isInteger(positions) || positions <= 0) next.servicePositions = "Informe uma quantidade maior que zero.";
    if (!validDocument(details.taxDocument)) next.taxDocument = "Informe um CPF ou CNPJ válido, ou deixe o campo vazio.";
    setErrors(next);
    return !Object.keys(next).length;
  }
  function continueForm(event: FormEvent) { event.preventDefault(); if (validateFirst()) setStep(2); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving || !validateSecond()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/entrar"); return; }
    setSaving(true); setMessage("Salvando seu cadastro...");
    try {
      const phone = formatPhone(details.barbershopPhone);
      let currentShopId = shopId;
      if (currentShopId) {
        const { error } = await supabase.from("barbershops").update({ name: details.barbershopName.trim(), phone, whatsapp: phone, address: `${details.address.trim()}, ${details.addressNumber.trim()} - ${details.neighborhood.trim()}, ${details.city.trim()} - ${details.state.trim().toUpperCase()}`, initial_registration_completed: false }).eq("id", currentShopId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("barbershops").insert({ owner_id: user.id, name: details.barbershopName.trim(), slug: makeSlug(details.barbershopName), phone, whatsapp: phone, address: `${details.address.trim()}, ${details.addressNumber.trim()} - ${details.neighborhood.trim()}, ${details.city.trim()} - ${details.state.trim().toUpperCase()}`, initial_registration_completed: false }).select("id").single<{ id: string }>();
        if (error || !data) throw error || new Error("Não foi possível criar a barbearia.");
        currentShopId = data.id; setShopId(data.id);
      }
      const { error: detailsError } = await supabase.from("barbershop_registration_details").upsert({ barbershop_id: currentShopId, responsible_name: details.responsibleName.trim(), responsible_phone: formatPhone(details.responsiblePhone), tax_document: digits(details.taxDocument) || null, postal_code: digits(details.postalCode), address_number: details.addressNumber.trim(), neighborhood: details.neighborhood.trim(), city: details.city.trim(), state: details.state.trim().toUpperCase(), total_people: Number(details.totalPeople), attending_professionals: Number(details.attendingProfessionals), service_positions: Number(details.servicePositions) });
      if (detailsError) throw detailsError;
      const { error: completionError } = await supabase.from("barbershops").update({ initial_registration_completed: true }).eq("id", currentShopId);
      if (completionError) throw completionError;
      window.location.replace("/painel/configurar");
    } catch {
      setMessage("Não foi possível salvar agora. Revise os campos e tente novamente.");
      setSaving(false);
    }
  }
  const fieldError = (field: string) => errors[field] && <small role="alert" style={{ color: "#b3261e", display: "block", marginTop: 5 }}>{errors[field]}</small>;
  if (message === "Verificando seu acesso...") return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f2ed", fontFamily: "Arial,sans-serif" }}><p>{message}</p></main>;
  return <main style={{ minHeight: "100vh", background: "#f6f2ed", fontFamily: "Arial,sans-serif", color: "#1b1714", padding: "clamp(20px,5vw,48px) 18px" }}><section style={{ maxWidth: 720, margin: "0 auto", background: "white", padding: "clamp(22px,5vw,40px)", borderRadius: 14, boxShadow: "0 10px 30px #291b1020" }}>
    <Link href="/" style={{ color: "#1b1714", fontWeight: 900, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></Link>
    <p style={{ color: "#d7612c", fontWeight: 800, fontSize: 13, margin: "28px 0 6px" }}>ETAPA {step} DE 2</p><h1 style={{ font: "bold clamp(30px,6vw,46px)/1 Georgia,serif", margin: "0 0 12px" }}>{step === 1 ? "Seus dados" : "Sua barbearia"}</h1>
    <p style={{ color: "#6d6257", lineHeight: 1.55 }}>{step === 1 ? "Vamos começar pelos dados da pessoa responsável." : "Agora, informe os dados básicos do estabelecimento."}</p>
    {step === 1 ? <form onSubmit={continueForm}><label>Nome completo<input autoComplete="name" required style={input} value={details.responsibleName} onChange={(event) => update("responsibleName", event.target.value)} /></label>{fieldError("responsibleName")}<label style={{ display: "block", marginTop: 16 }}>E-mail<input readOnly aria-readonly="true" style={{ ...input, background: "#f3efeb", color: "#6d6257" }} value={email} /></label><small style={{ color: "#6d6257" }}>Seu e-mail de acesso não pode ser alterado aqui.</small><label style={{ display: "block", marginTop: 16 }}>Telefone/WhatsApp<input autoComplete="tel" required inputMode="tel" style={input} value={details.responsiblePhone} onChange={(event) => update("responsiblePhone", formatPhone(event.target.value))} placeholder="(11) 99999-9999" /></label>{fieldError("responsiblePhone")}<button style={{ width: "100%", marginTop: 26, padding: 14, border: 0, borderRadius: 7, background: "#d7612c", color: "white", fontWeight: 800 }}>Continuar</button></form> : <form onSubmit={save}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
      <label style={{ gridColumn: "1 / -1" }}>Nome da barbearia<input required style={input} value={details.barbershopName} onChange={(event) => update("barbershopName", event.target.value)} /></label>{fieldError("barbershopName")}
      <label>Telefone/WhatsApp<input required inputMode="tel" style={input} value={details.barbershopPhone} onChange={(event) => update("barbershopPhone", formatPhone(event.target.value))} placeholder="(11) 99999-9999" /></label><label>CEP<input required inputMode="numeric" style={input} value={details.postalCode} onChange={(event) => update("postalCode", digits(event.target.value).slice(0, 8))} placeholder="00000000" /></label>{fieldError("barbershopPhone")}{fieldError("postalCode")}
      <label style={{ gridColumn: "1 / -1" }}>Endereço<input required autoComplete="street-address" style={input} value={details.address} onChange={(event) => update("address", event.target.value)} /></label>{fieldError("address")}
      <label>Número<input required style={input} value={details.addressNumber} onChange={(event) => update("addressNumber", event.target.value)} /></label><label>Bairro<input required style={input} value={details.neighborhood} onChange={(event) => update("neighborhood", event.target.value)} /></label>{fieldError("addressNumber")}{fieldError("neighborhood")}
      <label>Cidade<input required style={input} value={details.city} onChange={(event) => update("city", event.target.value)} /></label><label>Estado<input required maxLength={2} style={input} value={details.state} onChange={(event) => update("state", event.target.value.toUpperCase())} placeholder="SP" /></label>{fieldError("city")}{fieldError("state")}
      <label>Quantidade total de pessoas<input required min="1" inputMode="numeric" type="number" style={input} value={details.totalPeople} onChange={(event) => update("totalPeople", event.target.value)} /></label><label>Profissionais que atendem clientes<input required min="1" inputMode="numeric" type="number" style={input} value={details.attendingProfessionals} onChange={(event) => update("attendingProfessionals", event.target.value)} /></label>{fieldError("totalPeople")}{fieldError("attendingProfessionals")}
      <label>Posições de atendimento<input required min="1" inputMode="numeric" type="number" style={input} value={details.servicePositions} onChange={(event) => update("servicePositions", event.target.value)} /></label><label>CPF ou CNPJ (opcional)<input inputMode="numeric" style={input} value={details.taxDocument} onChange={(event) => update("taxDocument", digits(event.target.value).slice(0, 14))} /></label>{fieldError("servicePositions")}{fieldError("taxDocument")}
    </div><p style={{ color: "#6d6257", fontSize: 14, lineHeight: 1.5 }}>Você poderá informar ou atualizar este dado posteriormente, antes de contratar um plano pago.</p><div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}><button type="button" onClick={() => setStep(1)} disabled={saving} style={{ padding: "14px 18px", border: "1px solid #a97b60", borderRadius: 7, background: "white", color: "#6b3018", fontWeight: 800 }}>Voltar</button><button disabled={saving} style={{ flex: 1, minWidth: 240, padding: 14, border: 0, borderRadius: 7, background: "#d7612c", color: "white", fontWeight: 800 }}>{saving ? "Salvando..." : "Salvar e configurar minha barbearia"}</button></div></form>}
    {message && <p role="status" style={{ color: "#b3261e", marginTop: 18 }}>{message}</p>}
  </section></main>;
}
