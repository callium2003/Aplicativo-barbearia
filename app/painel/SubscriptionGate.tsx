"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import { isSubscriptionPath } from "@/utils/subscription-view";

type AgendaAccess = {
  can_operate: boolean;
  can_accept_public_bookings: boolean;
};

export default function SubscriptionGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasActiveAccessRef = useRef<boolean | null>(null);

  useEffect(() => {
    const path = pathname;
    const exempt = path === "/painel" || path === "/painel/inicio" || path === "/painel/notificacoes" || isSubscriptionPath(path);

    async function checkAccess() {
      if (exempt) {
        setReady(true);
        return;
      }

      if (hasActiveAccessRef.current === true) {
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

        hasActiveAccessRef.current = agendaAccess.can_accept_public_bookings;

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

    if (!exempt && hasActiveAccessRef.current !== true) {
      setReady(false);
    }
    void checkAccess();
  }, [pathname]);

  if (!ready) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f2ed", fontFamily: "Arial,sans-serif" }}>
    {failed ? <section style={{ padding: 24, maxWidth: 460, textAlign: "center" }}>
      <p role="alert">Não foi possível verificar seu acesso agora. Sua sessão foi mantida. Aguarde alguns instantes e tente novamente.</p>
      <button type="button" className="product-button" onClick={() => window.location.reload()}>Tentar novamente</button>
      <p><Link href="/entrar">Voltar ao login</Link></p>
    </section> : "Verificando seu acesso..."}
  </main>;
  return <>{children}</>;
}
