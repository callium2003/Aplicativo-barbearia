"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";
import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";
import { moreDestinationsForRole } from "../navigation.mjs";

type ManagementRole = "owner" | "manager";
type Shop = { id: string; name: string; role: ManagementRole };

export default function Mais() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("Carregando opções...");

  useEffect(() => {
    let active = true;

    async function load() {
      const context = await getPanelContext(supabase);
      if (!active) return;
      if (!context.userId) {
        window.location.replace("/entrar");
        return;
      }
      if (context.role === "barber") {
        window.location.replace("/painel/agenda");
        return;
      }
      if (!context.role || !context.barbershopId) {
        window.location.replace("/cadastro-inicial");
        return;
      }

      const { data, error } = await supabase
        .from("barbershops")
        .select("id,name")
        .eq("id", context.barbershopId)
        .maybeSingle<{ id: string; name: string }>();
      if (!active) return;
      if (error || !data) {
        setMessage("Não foi possível carregar as opções da barbearia.");
        return;
      }
      setShop({ ...data, role: context.role as ManagementRole });
      setMessage("");
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (!shop) {
    return (
      <main className="product-shell" style={{ display: "grid", placeItems: "center" }}>
        <p className="product-message">{message}</p>
      </main>
    );
  }

  const destinations = moreDestinationsForRole(shop.role);

  return (
    <PanelShell
      role={shop.role}
      active="more"
      shopName={shop.name}
      barbershopId={shop.id}
      mobileBackHref="/painel"
      mobileBackLabel="Voltar para Início"
      mobileTitle="Mais"
    >
      <div className="product-content management-more-page">
        <header className="product-page-head management-more-heading">
          <div>
            <p className="product-eyebrow">Gestão da barbearia</p>
            <h1 className="product-title">Mais</h1>
            <p className="product-subtitle">
              Encontre configurações, comunicação e dados da sua conta.
            </p>
          </div>
        </header>

        <nav className="ios-settings-group management-more-index" aria-label="Mais opções de gestão">
          {destinations.map(({ href, label, description, icon }) => (
            <Link className="ios-settings-item" href={href} key={href}>
              <span className="ios-settings-item-icon" aria-hidden="true">{icon}</span>
              <span className="ios-settings-item-left">
                <span className="ios-settings-item-title">{label}</span>
                <span className="ios-settings-item-sub">{description}</span>
              </span>
              <span className="ios-settings-chevron" aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
      </div>
    </PanelShell>
  );
}
