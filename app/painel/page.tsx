"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "./PanelShell";

type Shop = {
  id: string;
  name: string;
  slug: string;
  initial_registration_completed?: boolean;
  role: "owner" | "manager" | "barber";
};

const ownerManagerLinks = [
  {
    href: "/painel/agenda",
    icon: "◫",
    title: "Agenda",
    description:
      "Acompanhe os horários, confirme atendimentos e fale com clientes.",
  },
  {
    href: "/painel/clientes",
    icon: "◎",
    title: "Clientes",
    description: "Consulte histórico, WhatsApp e relacionamento da sua base.",
  },
  {
    href: "/painel/profissionais",
    icon: "✂",
    title: "Equipe",
    description: "Organize profissionais e o funcionamento da operação.",
  },
  {
    href: "/painel/relatorios",
    icon: "▥",
    title: "Relatórios",
    description: "Veja faturamento, ocupação, serviços, clientes e comissões.",
  },
  {
    href: "/painel/configurar",
    icon: "⚙",
    title: "Configurações",
    description: "Atualize dados, serviços, horários, comissões e acessos.",
  },
];

export default function Painel() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("Verificando seu acesso...");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPanel() {
      try {
        if (new URLSearchParams(window.location.hash.slice(1)).has("error")) {
          window.location.replace("/entrar");
          return;
        }
        const context = await getPanelContext(supabase);
        if (!active) return;
        if (!context.userId) {
          window.location.replace("/entrar");
          return;
        }
        if (!context.role || !context.barbershopId) {
          window.location.replace("/painel/inicio");
          return;
        }
        if (context.role === "owner" && !context.initialRegistrationCompleted) {
          window.location.replace("/cadastro-inicial");
          return;
        }

        const { data: shopData, error } = await supabase
          .from("barbershops")
          .select("id,name,slug,initial_registration_completed")
          .eq("id", context.barbershopId)
          .maybeSingle<Omit<Shop, "role">>();
        if (!active) return;
        if (error || !shopData) {
          setMessage("Não foi possível carregar sua barbearia.");
          return;
        }
        setShop({ ...shopData, role: context.role });
        setMessage("");
      } catch {
        if (active) window.location.replace("/entrar");
      }
    }
    void loadPanel();
    return () => {
      active = false;
    };
  }, []);

  async function copyPublicLink() {
    if (!shop?.slug) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${shop.slug}`,
      );
      setCopyMessage("Link copiado com sucesso.");
    } catch {
      setCopyMessage("Não foi possível copiar o link.");
    }
  }

  if (!shop)
    return (
      <main
        className="product-shell"
        style={{ display: "grid", placeItems: "center" }}
      >
        <p className="product-message">{message}</p>
      </main>
    );

  const links =
    shop.role === "barber"
      ? [
          {
            href: "/painel/agenda",
            icon: "◫",
            title: "Minha agenda",
            description:
              "Consulte seus atendimentos, pausas e disponibilidade.",
          },
        ]
      : ownerManagerLinks;

  return (
    <PanelShell role={shop.role} active="home" shopName={shop.name} barbershopId={shop.id}>
      <div className="product-content">
        <div className="product-page-head">
          <div>
            <p className="product-eyebrow">Painel da barbearia</p>
            <h1 className="product-title">Olá, {shop.name}.</h1>
            <p className="product-subtitle">
              {shop.role === "barber"
                ? "Sua rotina de atendimento em um só lugar."
                : "Escolha uma área para administrar sua operação."}
            </p>
          </div>
        </div>

        {shop.role !== "barber" && (
          <section className="product-card pad management-public-card">
            <div>
              <p className="product-eyebrow">Página pública</p>
              <h2 style={{ margin: 0, fontSize: 22 }}>
                {shop.slug
                  ? `${window.location.host}/${shop.slug}`
                  : "Seu link ainda não está pronto"}
              </h2>
              <p className="product-subtitle" style={{ marginTop: 8 }}>
                {shop.slug
                  ? "Compartilhe este endereço para seus clientes verem serviços e agendarem."
                  : "Conclua o cadastro para gerar o endereço público."}
              </p>
              {copyMessage && (
                <p className="product-message success" role="status">
                  {copyMessage}
                </p>
              )}
            </div>
            <div className="product-row-actions">
              {shop.slug && (
                <a
                  className="product-button"
                  href={`/${shop.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir página
                </a>
              )}
              {shop.slug && (
                <button
                  className="product-button secondary"
                  type="button"
                  onClick={() => void copyPublicLink()}
                >
                  Copiar link
                </button>
              )}
              {!shop.slug && (
                <Link className="product-button" href="/painel/configurar">
                  Configurar
                </Link>
              )}
            </div>
          </section>
        )}

        <section className="management-actions-section" aria-label="Áreas de gestão">
          <div className="product-section-head">
            <div>
              <p className="product-eyebrow">Sua operação</p>
              <h2>{shop.role === "barber" ? "Acesse sua rotina" : "O que você quer administrar?"}</h2>
              <p>
                {shop.role === "barber"
                  ? "Consulte sua agenda e organize sua disponibilidade."
                  : "Os indicadores e dashboards permanecem em Relatórios."}
              </p>
            </div>
          </div>
        <div className="product-grid cols-3 management-action-grid">
          {links.map((link) => (
            <Link
              className="product-card pad management-action-card"
              key={link.href}
              href={link.href}
            >
              <span className="management-action-icon" aria-hidden="true">
                {link.icon}
              </span>
              <div className="management-action-copy">
                <h2>{link.title}</h2>
                <p>{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
        </section>
      </div>
    </PanelShell>
  );
}
