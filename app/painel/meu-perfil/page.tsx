"use client";

import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import { supabase } from "@/utils/supabase";
import PanelShell from "../PanelShell";
import ProfessionalProfile from "../ProfessionalProfile";

type Context = { shopId: string; shopName: string; professionalId: string };

export default function MeuPerfilProfissionalPage() {
  const [context, setContext] = useState<Context | null>(null);
  const [message, setMessage] = useState("Carregando seu perfil...");

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

  return <PanelShell role="barber" active="profile" shopName={context.shopName} barbershopId={context.shopId} hideMobileBack>
    <div className="product-content professional-self-service-page">
      <div className="product-page-head"><div><p className="product-eyebrow">Perfil público</p><h1 className="product-title">Meu perfil</h1><p className="product-subtitle">Atualize somente as informações profissionais que podem aparecer para os clientes.</p></div></div>
      <ProfessionalProfile professionalId={context.professionalId} />
    </div>
  </PanelShell>;
}
