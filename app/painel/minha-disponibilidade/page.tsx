"use client";

import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import { supabase } from "@/utils/supabase";
import PanelShell from "../PanelShell";
import ProfessionalAvailability from "../ProfessionalAvailability";

type Context = { shopId: string; shopName: string; professionalId: string };

export default function MinhaDisponibilidadePage() {
  const [context, setContext] = useState<Context | null>(null);
  const [message, setMessage] = useState("Carregando sua disponibilidade...");

  useEffect(() => {
    let active = true;
    async function load() {
      const panel = await getPanelContext(supabase);
      if (!panel.userId) return window.location.replace("/entrar");
      if (panel.role !== "barber" || !panel.barbershopId || !panel.professionalId) return window.location.replace("/painel/agenda");
      const { data: shop, error } = await supabase.from("barbershops").select("name").eq("id", panel.barbershopId).maybeSingle<{ name: string }>();
      if (!active) return;
      if (error || !shop) return setMessage("Não foi possível carregar a barbearia vinculada.");
      setContext({ shopId: panel.barbershopId, shopName: shop.name, professionalId: panel.professionalId });
    }
    void load();
    return () => { active = false; };
  }, []);

  if (!context) return <main className="product-shell"><div className="product-content"><p className="product-message">{message}</p></div></main>;

  return <PanelShell role="barber" active="availability" shopName={context.shopName} barbershopId={context.shopId} hideMobileBack>
    <div className="product-content professional-self-service-page">
      <div className="product-page-head"><div><p className="product-eyebrow">Sua rotina</p><h1 className="product-title">Minha disponibilidade</h1><p className="product-subtitle">Organize seus horários, pausas e ausências sem alterar a agenda dos outros profissionais.</p></div></div>
      <ProfessionalAvailability professionalId={context.professionalId} barbershopId={context.shopId} />
    </div>
  </PanelShell>;
}
