"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import { isSubscriptionPath } from "@/utils/subscription-view";

type AgendaAccess = {
  can_operate: boolean;
  can_accept_public_bookings: boolean;
};

export default function SubscriptionGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const exempt = path === "/painel" || path === "/painel/inicio" || isSubscriptionPath(path);

    async function checkAccess() {
      if (exempt) {
        setReady(true);
        return;
      }
      try {
        const context = await getPanelContext(supabase);
        if (!context.userId) { setReady(true); return; }

        if (!context.barbershopId) { window.location.replace("/painel/inicio"); return; }

        const { data: agendaAccess, error } = await supabase
          .rpc("get_my_barbershop_agenda_access", { p_barbershop_id: context.barbershopId })
          .maybeSingle<AgendaAccess>();
        if (error) throw error;
        if (!agendaAccess) throw new Error("Agenda access was not returned");

        // After the five-day window, Agenda stays reachable only to render the
        // server-redacted projection; RLS and the status RPC deny real data/actions.
        if (agendaAccess.can_accept_public_bookings || path === "/painel/agenda") {
          setReady(true);
          return;
        }

        if (context.role === "barber") { window.location.replace("/painel/agenda"); return; }
        window.location.replace("/painel/assinatura");
      } catch {
        setFailed(true);
      }
    }

    void checkAccess();
  }, []);

  if (!ready) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f2ed", fontFamily: "Arial,sans-serif" }}>
    {failed ? <section style={{ padding: 24, maxWidth: 460, textAlign: "center" }}>
      <p role="alert">Não foi possível verificar seu acesso agora. Sua sessão foi mantida. Aguarde alguns instantes e tente novamente.</p>
      <button type="button" className="product-button" onClick={() => window.location.reload()}>Tentar novamente</button>
      <p><Link href="/entrar">Voltar ao login</Link></p>
    </section> : "Verificando seu acesso..."}
  </main>;
  return <>{children}</>;
}
