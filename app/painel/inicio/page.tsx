"use client";

import { createClient } from "@supabase/supabase-js";
import { FormEvent, useEffect, useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export default function Inicio() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("Verificando seu acesso...");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMessage(data.user ? "Crie sua pagina para comecar." : "Entre pelo link de acesso antes de configurar sua barbearia.")); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Faca login antes de salvar."); return; }
    const { error } = await supabase.from("barbershops").insert({ owner_id: user.id, name, slug });
    if (error) { setMessage("Nao foi possivel salvar. Verifique se o link publico ja esta em uso."); return; }
    setMessage("Cadastro salvo. Abrindo as configuracoes...");
    window.location.replace("/painel/configurar");
  }

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", fontFamily: "Arial,sans-serif", padding: 24 }}><section style={{ maxWidth: 560, margin: "55px auto", background: "white", padding: 32, borderRadius: 12 }}><a href="/painel" style={{ color: "#1b1714", fontWeight: 800, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></a><h1 style={{ font: "bold 42px/.95 Georgia,serif" }}>Crie sua pagina.</h1><p style={{ color: "#6d6257" }}>Este e o primeiro cadastro real da sua barbearia.</p><form onSubmit={save}><label>Nome da barbearia<input required value={name} onChange={event => setName(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", margin: "7px 0 16px", padding: 13 }} /></label><label>Link publico<input required value={slug} onChange={event => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="barbearia-do-joao" style={{ display: "block", width: "100%", boxSizing: "border-box", margin: "7px 0 16px", padding: 13 }} /></label><small>barbeariasp.cullentech.com.br/{slug || "sua-barbearia"}</small><button style={{ display: "block", width: "100%", marginTop: 20, padding: 15, border: 0, background: "#e4773a", color: "white", fontWeight: 800 }}>Salvar e continuar</button></form><p>{message}</p></section></main>;
}
