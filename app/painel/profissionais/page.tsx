"use client";

import { supabase } from "@/utils/supabase";
import { getPanelContext } from "@/utils/panel-context";
import { isSafePublicStorageImageUrl } from "@/utils/storage-image-url";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PanelShell from "../PanelShell";
import {
  filterProfessionals,
  professionalAccessState,
  professionalInitials,
  teamEmptyMessage,
} from "./presentation.mjs";

type Professional = { id: string; name: string; phone: string | null; photo_url: string | null; active: boolean; schedule_mode?: "barbershop" | "custom" };
type TeamMember = { professional_id: string | null; status: string; role: "manager" | "barber" };
type TeamInvitation = { professional_id: string | null; status: string; expires_at: string; role: "manager" | "barber" };
type Shop = { id: string; name: string; role: "owner" | "manager" };
type StatusFilter = "all" | "active" | "inactive";
type AccessState = "none" | "pending" | "active" | "inactive";

const accessCopy: Record<AccessState, string> = {
  none: "Sem acesso",
  pending: "Convite pendente",
  active: "Acesso ativo",
  inactive: "Acesso inativo",
};

export default function Profissionais() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [customSchedules, setCustomSchedules] = useState<Set<string>>(new Set());
  const [shop, setShop] = useState<Shop | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const context = await getPanelContext(supabase);
      if (!context.userId) { window.location.replace("/entrar"); return; }
      if (context.role === "barber") return window.location.replace("/painel/agenda");
      if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }

      const [professionalResult, modeResult, shopResult, hoursResult, memberResult, invitationResult] = await Promise.all([
        supabase.from("professionals").select("id,name,phone,photo_url,active").eq("barbershop_id", context.barbershopId).order("name"),
        supabase.from("professionals").select("id,schedule_mode").eq("barbershop_id", context.barbershopId),
        supabase.from("barbershops").select("id,name").eq("id", context.barbershopId).maybeSingle<{ id: string; name: string }>(),
        supabase.from("professional_hours").select("professional_id").limit(1000),
        supabase.from("team_members").select("professional_id,status,role").eq("barbershop_id", context.barbershopId),
        supabase.from("team_invitations").select("professional_id,status,expires_at,role").eq("barbershop_id", context.barbershopId),
      ]);

      if (!active) return;
      const failed = [professionalResult, shopResult, hoursResult, memberResult, invitationResult].some((result) => Boolean(result.error));
      if (failed || !shopResult.data) {
        setMessage("Não foi possível carregar a equipe. Tente novamente.");
        setLoading(false);
        return;
      }

      const modes = new Map((modeResult.data || []).map((item) => [item.id, item.schedule_mode]));
      setProfessionals((professionalResult.data || []).map((item) => ({ ...item, schedule_mode: modes.get(item.id) })) as Professional[]);
      setMembers((memberResult.data || []) as TeamMember[]);
      setInvitations((invitationResult.data || []) as TeamInvitation[]);
      setCustomSchedules(new Set((hoursResult.data || []).map((item) => item.professional_id)));
      setShop({ ...shopResult.data, role: context.role as "owner" | "manager" });
      setMessage("");
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, []);

  const visibleProfessionals = useMemo(
    () => filterProfessionals(professionals, search, status) as Professional[],
    [professionals, search, status],
  );
  const hasFilters = Boolean(search.trim()) || status !== "all";

  if (!shop) {
    return <main className="product-shell management-team-loading"><p className={`product-message ${message ? "error" : ""}`} role="status">{message || "Carregando equipe..."}</p></main>;
  }

  return (
    <PanelShell role={shop.role} active="professionals" shopName={shop.name} barbershopId={shop.id}>
      <div className="product-content management-team-page">
        <header className="product-page-head management-team-page-head">
          <div>
            <h1 className="product-title">Equipe</h1>
            <p className="product-subtitle">Espaço dedicado para a gestão dos profissionais que atuam na sua barbearia.</p>
          </div>
          <Link className="product-button management-team-new" href="/painel/profissionais/novo">Novo profissional</Link>
        </header>

        <section className="management-team-toolbar" aria-label="Filtros da equipe">
          <label className="management-team-searchbox">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Buscar profissional</span>
            <input className="product-input" type="search" value={search} placeholder="Buscar por nome ou telefone" onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="management-team-tabs" role="tablist" aria-label="Situação operacional">
            {(["active", "inactive", "all"] as const).map((value) => (
              <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value)}>
                {value === "active" ? "Ativos" : value === "inactive" ? "Inativos" : "Todos"}
              </button>
            ))}
          </div>
        </section>

        {message && <p className="product-message error" role="status">{message}</p>}

        <section className="management-team-results" aria-busy={loading} aria-label="Profissionais da equipe">
          {loading ? (
            <div className="product-card product-empty">Carregando profissionais...</div>
          ) : visibleProfessionals.length ? (
            <div className="management-team-cards">
              {visibleProfessionals.map((professional) => {
                const access = professionalAccessState(professional.id, members, invitations) as AccessState;
                const customSchedule = professional.schedule_mode ? professional.schedule_mode === "custom" : customSchedules.has(professional.id);
                const safePhoto = professional.photo_url && isSafePublicStorageImageUrl(professional.photo_url, "professional-images", professional.id) ? professional.photo_url : null;

                return (
                  <Link className="management-team-card" href={`/painel/profissionais/${professional.id}`} key={professional.id}>
                    <span className="management-team-avatar" aria-hidden="true">
                      {safePhoto ? <Image src={safePhoto} alt="" fill sizes="64px" unoptimized /> : professionalInitials(professional.name)}
                    </span>
                    <span className="management-team-card-copy">
                      <span className="management-team-card-title">
                        <strong>{professional.name}</strong>
                        <span className={`management-team-operational ${professional.active ? "active" : "inactive"}`}>{professional.active ? "Ativo" : "Inativo"}</span>
                      </span>
                      {professional.phone && <small>{professional.phone}</small>}
                      <span className="management-team-card-meta">
                        <span>{customSchedule ? "Agenda personalizada" : "Agenda da barbearia"}</span>
                        <span className={`management-team-access-state ${access}`}>{accessCopy[access]}</span>
                      </span>
                    </span>
                    <span className="management-team-chevron" aria-hidden="true">›</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="product-card product-empty management-team-empty">
              <b>{teamEmptyMessage(hasFilters)}</b>
              <p>{hasFilters ? "Revise a busca ou exiba todos os profissionais." : "O cadastro não exige login nem senha."}</p>
              {hasFilters ? <button className="product-button secondary" type="button" onClick={() => { setSearch(""); setStatus("all"); }}>Limpar filtros</button> : <Link className="product-button" href="/painel/profissionais/novo">Cadastrar profissional</Link>}
            </div>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
