"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";

function isFutureJwtError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const failure = error as { code?: string; message?: string; details?: string; status?: number };
  if (failure.code === "PGRST303") return true;
  if (typeof failure.message === "string" && failure.message.toLowerCase().includes("jwt issued at future")) return true;
  if (typeof failure.details === "string" && failure.details.toLowerCase().includes("jwt issued at future")) return true;
  if (failure.status === 401 && !failure.code) return true;
  return false;
}

async function withClockDriftRetry<T extends { error?: unknown }>(operation: () => PromiseLike<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const result = await operation();
    if (!result.error || attempt >= 2 || !isFutureJwtError(result.error)) return result;
    await new Promise((resolve) => setTimeout(resolve, 1100 * (attempt + 1)));
  }
}

export default function Inicio() {
  const [message, setMessage] = useState("Verificando seu acesso...");

  useEffect(() => {
    let active = true;
    async function check() {
      const context = await getPanelContext(supabase);
      if (!active) return;
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
      const { data: customer, error } = await withClockDriftRetry(() =>
        supabase
          .from("customers")
          .select("id")
          .eq("auth_user_id", context.userId)
          .maybeSingle<{ id: string }>(),
      );
      if (!active) return;
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
    return () => { active = false; };
  }, []);

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", fontFamily: "Arial,sans-serif", padding: 24 }}><section style={{ maxWidth: 560, margin: "55px auto", background: "white", padding: 32, borderRadius: 12 }}><Link href="/painel" style={{ color: "#1b1714", fontWeight: 800, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></Link><h1 style={{ font: "bold 42px/.95 Georgia,serif" }}>Cadastro inicial</h1><p style={{ color: "#6d6257" }}>{message}</p></section></main>;
}
