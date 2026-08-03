"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export default function Inicio() {
  const [message, setMessage] = useState("Verificando seu acesso...");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) window.location.replace("/cadastro-inicial"); else setMessage("Entre pelo link de acesso antes de cadastrar sua barbearia."); }); }, []);

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", fontFamily: "Arial,sans-serif", padding: 24 }}><section style={{ maxWidth: 560, margin: "55px auto", background: "white", padding: 32, borderRadius: 12 }}><Link href="/painel" style={{ color: "#1b1714", fontWeight: 800, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></Link><h1 style={{ font: "bold 42px/.95 Georgia,serif" }}>Cadastro inicial</h1><p style={{ color: "#6d6257" }}>{message}</p></section></main>;
}
