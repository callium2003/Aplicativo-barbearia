"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";

export default function Inicio() {
  const [message, setMessage] = useState("Verificando seu acesso...");

  useEffect(() => {
    async function check() {
      const context = await getPanelContext(supabase);
      if (!context.userId) {
        setMessage("Entre pelo link de acesso antes de cadastrar sua barbearia.");
        return;
      }
      if (context.role === "barber" || context.role === "manager") {
        window.location.replace("/painel/agenda");
        return;
      }
      if (context.role === "owner") {
        if (context.initialRegistrationCompleted) window.location.replace("/painel");
        else window.location.replace("/cadastro-inicial");
        return;
      }

      // A customer session uses the same Supabase Auth domain as the panel.
      // Do not send an existing customer into owner onboarding just because
      // they intentionally have no barbershop role.
      const { data: customer, error } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", context.userId)
        .maybeSingle<{ id: string }>();
      if (error) {
        setMessage("Não foi possível confirmar seu tipo de acesso. Tente novamente.");
        return;
      }
      if (customer) {
        window.location.replace("/meus-agendamentos");
        return;
      }

      window.location.replace("/cadastro-inicial");
    }
    void check();
  }, []);

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", fontFamily: "Arial,sans-serif", padding: 24 }}><section style={{ maxWidth: 560, margin: "55px auto", background: "white", padding: 32, borderRadius: 12 }}><Link href="/painel" style={{ color: "#1b1714", fontWeight: 800, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></Link><h1 style={{ font: "bold 42px/.95 Georgia,serif" }}>Cadastro inicial</h1><p style={{ color: "#6d6257" }}>{message}</p></section></main>;
}
