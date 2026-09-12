"use client";

import { supabase } from "@/utils/supabase";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";
import orderStyles from "./settings-order.module.css";
import styles from "./settings-modern.module.css";

type Role = "owner" | "manager";
type Props = { children: ReactNode };

export default function ConfigurarLayout({ children }: Props) {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const context = await getPanelContext(supabase);
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

      const { data: shop } = await supabase
        .from("barbershops")
        .select("name")
        .eq("id", context.barbershopId)
        .maybeSingle<{ name: string }>();

      if (!active) return;
      setRole(context.role as Role);
      setShopId(context.barbershopId);
      setShopName(shop?.name || "Barbearia");
      setReady(true);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.location.hash) return;
    const targetId = window.location.hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (!ready || !role || !shopId) {
    return (
      <div className="product-shell">
        <div className="product-content">
          <p className="product-message">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const headings: Record<string, [string, string, string]> = {
    "/painel/dados-da-barbearia": ["Perfil público", "Dados da barbearia", "Cadastre as informações que seus clientes consultam sobre a barbearia."],
    "/painel/servicos": ["Catálogo", "Serviços", "Defina preço, duração e o que aparece para os clientes."],
    "/painel/horarios": ["Disponibilidade", "Horários da barbearia", "Defina os dias e horários gerais em que a barbearia aceita reservas."],
    "/painel/minha-conta": ["Minha conta", "Dados da conta", "Consulte os dados do responsável e a sessão desta barbearia."],
    "/painel/configurar": ["Configurações da barbearia", "Organize sua operação", "Configure os principais aspectos da sua barbearia e facilite o dia a dia da sua equipe."],
  };
  const [eyebrow, title, subtitle] = headings[pathname] || headings["/painel/configurar"];
  const hasMoreReturn = [
    "/painel/dados-da-barbearia",
    "/painel/servicos",
    "/painel/horarios",
  ].includes(pathname);

  return (
    <PanelShell
      role={role}
      active={pathname === "/painel/configurar" ? "settings" : "more"}
      shopName={shopName}
      barbershopId={shopId}
      mobileBackHref={hasMoreReturn ? "/painel/mais" : "/painel"}
      mobileBackLabel={hasMoreReturn ? "Voltar para Mais" : "Voltar para a gestão"}
      mobileTitle={hasMoreReturn ? title : undefined}
    >
      <div className="product-content">
        <div className="product-page-head management-settings-hero">
          <div>
            <p className="product-eyebrow">{eyebrow}</p>
            <h1 className="product-title">{title}</h1>
            <p className="product-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className={`${styles.legacyContent} ${orderStyles.orderedContent}`}>{children}</div>
      </div>
    </PanelShell>
  );
}
