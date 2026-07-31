"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export default function Painel() {
  const [message, setMessage] = useState("Verificando seu acesso...");

  useEffect(() => {
    let active = true;
    async function openCorrectPanel() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { window.location.replace("/entrar"); return; }
      const { data, error } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).maybeSingle();
      if (!active) return;
      if (error) { setMessage("Nao foi possivel verificar sua barbearia agora. Tente novamente."); return; }
      window.location.replace(data ? "/painel/configurar" : "/painel/inicio");
    }
    void openCorrectPanel();
    return () => { active = false; };
  }, []);

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f6f2ed", fontFamily: "Arial, sans-serif", color: "#1b1714" }}><p>{message}</p></main>;
}
