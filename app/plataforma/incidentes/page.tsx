"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import {
  acknowledgePlatformOperationalIncident,
  addPlatformOperationalIncidentNote,
  createPlatformOperationalIncident,
  formatIncidentSeverity,
  formatIncidentStatus,
  formatSentinelStatus,
  formatServiceName,
  getPlatformOperationalIncidentDetail,
  getPlatformSentinelOverview,
  listPlatformOperationalIncidents,
  resolvePlatformOperationalIncident,
} from "@/utils/platform-administration.mjs";
import platformStyles from "../platform.module.css";
import incidentStyles from "./incidents.module.css";

type IncidentRow = {
  id: string;
  service_name: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  barbershop_id: string | null;
  barbershop_name: string | null;
  barbershop_slug: string | null;
  metadata: Record<string, unknown>;
  assigned_to: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  notes_count: number;
};

type IncidentNote = {
  id: string;
  author_user_id: string | null;
  note: string;
  created_at: string;
};

type IncidentDetail = IncidentRow & {
  notes: IncidentNote[];
};

type SentinelServiceState = {
  service_name: string;
  last_status: string;
  consecutive_failures: number;
  consecutive_successes: number;
  current_incident_id: string | null;
  incident_title: string | null;
  last_checked_at: string;
  last_error: string | null;
  last_latency_ms: number | null;
  metadata: Record<string, unknown>;
};

export default function PlatformIncidentesPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [sentinelServices, setSentinelServices] = useState<SentinelServiceState[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "failed">("loading");

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Modal Gerenciamento
  const [activeIncident, setActiveIncident] = useState<IncidentDetail | null>(null);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  // Modal Novo Incidente
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newService, setNewService] = useState("api");
  const [newSeverity, setNewSeverity] = useState("medium");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.replace("/plataforma/entrar");
        return;
      }

      const [res, sentinelRes] = await Promise.all([
        listPlatformOperationalIncidents(supabase),
        getPlatformSentinelOverview(supabase).catch(() => ({ services: [] })),
      ]);
      setIncidents(res.incidents as IncidentRow[]);
      setSentinelServices((sentinelRes.services || []) as SentinelServiceState[]);
      setState("ready");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("não autorizado")) {
        setState("denied");
      } else {
        setState("failed");
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchIncidents();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchIncidents]);

  const filteredIncidents = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return incidents.filter((inc) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? inc.status === "open" || inc.status === "acknowledged" || inc.status === "investigating"
          : inc.status === statusFilter);

      const matchesService = serviceFilter === "all" || inc.service_name === serviceFilter;
      const matchesSeverity = severityFilter === "all" || inc.severity === severityFilter;

      const matchesSearch =
        !q ||
        inc.title.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q) ||
        (inc.barbershop_name && inc.barbershop_name.toLowerCase().includes(q));

      return matchesStatus && matchesService && matchesSeverity && matchesSearch;
    });
  }, [incidents, statusFilter, serviceFilter, severityFilter, searchFilter]);

  async function openIncidentModal(inc: IncidentRow) {
    try {
      const res = await getPlatformOperationalIncidentDetail(supabase, inc.id);
      setActiveIncident(res.incident as IncidentDetail);
    } catch (err) {
      console.error("Erro ao carregar detalhes do incidente:", err);
    }
  }

  async function handleAcknowledge() {
    if (!activeIncident) return;
    setAcknowledging(true);
    try {
      await acknowledgePlatformOperationalIncident(supabase, activeIncident.id);
      const [detailRes, listRes] = await Promise.all([
        getPlatformOperationalIncidentDetail(supabase, activeIncident.id),
        listPlatformOperationalIncidents(supabase),
      ]);
      setActiveIncident(detailRes.incident as IncidentDetail);
      setIncidents(listRes.incidents as IncidentRow[]);
    } catch (err) {
      console.error("Erro ao reconhecer incidente:", err);
    } finally {
      setAcknowledging(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!activeIncident || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await addPlatformOperationalIncidentNote(supabase, {
        incidentId: activeIncident.id,
        note: newNote.trim(),
      });
      setNewNote("");
      const [detailRes, listRes] = await Promise.all([
        getPlatformOperationalIncidentDetail(supabase, activeIncident.id),
        listPlatformOperationalIncidents(supabase),
      ]);
      setActiveIncident(detailRes.incident as IncidentDetail);
      setIncidents(listRes.incidents as IncidentRow[]);
    } catch (err) {
      console.error("Erro ao adicionar nota:", err);
    } finally {
      setSubmittingNote(false);
    }
  }

  async function handleResolve() {
    if (!activeIncident) return;
    setResolving(true);
    try {
      await resolvePlatformOperationalIncident(supabase, {
        incidentId: activeIncident.id,
        resolutionNote: newNote.trim() ? newNote.trim() : null,
      });
      setNewNote("");
      const [detailRes, listRes] = await Promise.all([
        getPlatformOperationalIncidentDetail(supabase, activeIncident.id),
        listPlatformOperationalIncidents(supabase),
      ]);
      setActiveIncident(detailRes.incident as IncidentDetail);
      setIncidents(listRes.incidents as IncidentRow[]);
    } catch (err) {
      console.error("Erro ao resolver incidente:", err);
    } finally {
      setResolving(false);
    }
  }

  async function handleCreateIncident(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createPlatformOperationalIncident(supabase, {
        serviceName: newService,
        severity: newSeverity,
        title: newTitle,
        description: newDescription,
      });
      setCreateModalOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewSeverity("medium");
      await fetchIncidents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar incidente.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/plataforma/entrar");
  }

  if (state === "loading") {
    return (
      <main className={platformStyles.centered}>
        <p>Verificando acesso aos incidentes operacionais…</p>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className={platformStyles.centered}>
        <section className={platformStyles.denied}>
          <p className={platformStyles.eyebrow}>CullenTech</p>
          <h1>Acesso interno não autorizado</h1>
          <p>Esta identidade não possui permissão para acessar a gestão de incidentes operacionais.</p>
          <button type="button" onClick={() => void signOut()}>
            Sair
          </button>
        </section>
      </main>
    );
  }

  if (state === "failed") {
    return (
      <main className={platformStyles.centered}>
        <p>Não foi possível carregar os incidentes no momento.</p>
      </main>
    );
  }

  const activeIncidentsCount = incidents.filter(
    (i) => i.status === "open" || i.status === "acknowledged" || i.status === "investigating"
  ).length;

  const criticalCount = incidents.filter(
    (i) => (i.severity === "critical" || i.severity === "high") && i.status !== "resolved" && i.status !== "closed"
  ).length;

  return (
    <main className={platformStyles.page}>
      <header className={platformStyles.header}>
        <div>
          <p className={platformStyles.eyebrow}>CullenTech</p>
          <h1>Alertas & Gestão Operacional</h1>
          <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "14px", flexWrap: "wrap" }}>
            <Link href="/plataforma" prefetch={false} style={{ color: "var(--sp-muted)", textDecoration: "none" }}>
              ← Barbearias
            </Link>
            <Link href="/plataforma/suporte" prefetch={false} style={{ color: "var(--sp-muted)", textDecoration: "none" }}>
              Chamados & Suporte
            </Link>
            <span style={{ fontWeight: 700, color: "var(--sp-ink)" }}>Alertas & Incidentes</span>
          </div>
        </div>
        <button type="button" className={platformStyles.signOut} onClick={() => void signOut()}>
          Sair
        </button>
      </header>

      <section className={platformStyles.summary} aria-label="Resumo de Incidentes">
        <div>
          <strong>{incidents.length}</strong>
          <span>incidentes registrados</span>
        </div>
        <div>
          <strong style={{ color: activeIncidentsCount > 0 ? "var(--sp-primary, #b34728)" : "inherit" }}>
            {activeIncidentsCount}
          </strong>
          <span>em aberto ou investigação</span>
        </div>
        <div>
          <strong style={{ color: criticalCount > 0 ? "var(--sp-danger, #9c3333)" : "inherit" }}>
            {criticalCount}
          </strong>
          <span>severidade alta ou crítica</span>
        </div>
      </section>

      {/* Panorama do Sentinela Operacional */}
      <section className={incidentStyles.sentinelSection} aria-label="Sentinela Operacional">
        <div className={incidentStyles.sentinelHeader}>
          <div>
            <span className={incidentStyles.sentinelTitle}>
              🤖 Sentinela Operacional
            </span>
            <span className={incidentStyles.sentinelSubtitle}>
              Monitoramento autônomo contínuo (auto-abertura em 3 falhas / auto-resolução em 3 sucessos)
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--sp-muted)" }}>
            {sentinelServices.length} serviços essenciais monitorados
          </span>
        </div>

        <div className={incidentStyles.sentinelGrid}>
          {sentinelServices.map((svc) => {
            const statusFmt = formatSentinelStatus(svc.last_status);
            let badgeCls = incidentStyles.sentinelBadgeSuccess;
            if (svc.last_status === "degraded") badgeCls = incidentStyles.sentinelBadgeWarning;
            if (svc.last_status === "down") badgeCls = incidentStyles.sentinelBadgeDanger;

            return (
              <div key={svc.service_name} className={incidentStyles.sentinelCard}>
                <span className={incidentStyles.sentinelServiceName} title={formatServiceName(svc.service_name)}>
                  {formatServiceName(svc.service_name)}
                </span>
                <span className={`${incidentStyles.sentinelBadge} ${badgeCls}`}>
                  {statusFmt.label}
                </span>
                <div style={{ fontSize: "10px", color: "var(--sp-muted)", marginTop: "2px" }}>
                  {svc.last_latency_ms !== null && svc.last_latency_ms !== undefined ? `${svc.last_latency_ms}ms` : "—"}
                  {svc.consecutive_failures > 0 ? ` • ${svc.consecutive_failures} falhas` : ""}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={platformStyles.tableCard}>
        <div className={platformStyles.sectionHead}>
          <div>
            <h2>Incidentes Operacionais</h2>
            <p>Monitoramento de serviços, reconhecimento, observações e auditoria.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={() => setCreateModalOpen(true)}>
              + Novo Incidente
            </button>
            <button type="button" onClick={() => void fetchIncidents()}>
              Atualizar
            </button>
          </div>
        </div>

        <div className={incidentStyles.filterBar}>
          <input
            id="incident-search-filter"
            name="incident_search"
            aria-label="Buscar por título ou detalhe"
            type="search"
            className={incidentStyles.filterInput}
            placeholder="Buscar por título ou detalhe…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ minWidth: "220px" }}
          />

          <select
            id="incident-status-filter"
            name="incident_status"
            aria-label="Filtrar por status do incidente"
            className={incidentStyles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos (Abertos/Investigando)</option>
            <option value="open">Aberto</option>
            <option value="acknowledged">Reconhecido</option>
            <option value="investigating">Em Investigação</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Encerrado</option>
          </select>

          <select
            id="incident-service-filter"
            name="incident_service"
            aria-label="Filtrar por serviço"
            className={incidentStyles.filterSelect}
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="all">Todos os serviços</option>
            <option value="api">API Principal</option>
            <option value="database">Banco Postgres</option>
            <option value="auth">Autenticação GoTrue</option>
            <option value="storage">Storage</option>
            <option value="notifications">Fila de Notificações</option>
            <option value="booking_gateway">Gateway de Agendamento</option>
            <option value="cron_jobs">Tarefas Agendadas</option>
          </select>

          <select
            id="incident-severity-filter"
            name="incident_severity"
            aria-label="Filtrar por severidade"
            className={incidentStyles.filterSelect}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">Todas as severidades</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
            <option value="info">Informativa</option>
          </select>
        </div>

        <div className={platformStyles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Incidente</th>
                <th>Severidade</th>
                <th>Status</th>
                <th>Notas</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => {
                const sev = formatIncidentSeverity(inc.severity);
                let sevClass = incidentStyles.badgeInfo;
                if (sev.color === "danger") sevClass = incidentStyles.badgeCritical;
                if (sev.color === "warning") sevClass = incidentStyles.badgeHigh;
                if (sev.color === "bronze") sevClass = incidentStyles.badgeMedium;
                if (sev.color === "info") sevClass = incidentStyles.badgeLow;

                return (
                  <tr key={inc.id}>
                    <td>
                      <strong>{formatServiceName(inc.service_name)}</strong>
                      <small>{inc.service_name}</small>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <strong>{inc.title}</strong>
                        {Boolean(inc.metadata?.auto_created) && (
                          <span className={incidentStyles.sentinelBadgeAutoCreated} title="Incidente aberto autonomamente pelo Sentinela">
                            🤖 Sentinela
                          </span>
                        )}
                      </div>
                      <small style={{ color: "var(--sp-muted)" }}>
                        {inc.barbershop_name ? `Barbearia: ${inc.barbershop_name}` : "Global da Plataforma"}
                      </small>
                    </td>
                    <td>
                      <span className={sevClass} style={{ padding: "3px 8px", borderRadius: "6px" }}>
                        {sev.label}
                      </span>
                    </td>
                    <td>{formatIncidentStatus(inc.status)}</td>
                    <td>{inc.notes_count} {inc.notes_count === 1 ? "nota" : "notas"}</td>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(inc.created_at))}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void openIncidentModal(inc)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid var(--sp-line)",
                          background: "var(--sp-surface)",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan={7}>Nenhum incidente encontrado com os filtros selecionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Detalhes e Gestão do Incidente */}
      {activeIncident && (
        <div className={platformStyles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="incident-title">
          <div className={platformStyles.modalCard} style={{ maxWidth: "700px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <p className={platformStyles.eyebrow} style={{ margin: 0 }}>
                  Serviço: {formatServiceName(activeIncident.service_name)}
                </p>
                <h3 id="incident-title" style={{ margin: "4px 0 6px" }}>
                  {activeIncident.title}
                </h3>
                <div style={{ fontSize: "13px", color: "var(--sp-muted)" }}>
                  Severidade: {formatIncidentSeverity(activeIncident.severity).label} · Status:{" "}
                  {formatIncidentStatus(activeIncident.status)} · Criado em:{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "America/Sao_Paulo",
                  }).format(new Date(activeIncident.created_at))}
                </div>
              </div>
              <button
                type="button"
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--sp-muted)" }}
                onClick={() => setActiveIncident(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: "1.6" }}>
              {activeIncident.description}
            </p>

            {activeIncident.metadata && Object.keys(activeIncident.metadata).length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--sp-muted)" }}>
                  Metadados do Alerta:
                </strong>
                <pre
                  style={{
                    margin: "6px 0 0",
                    padding: "10px",
                    background: "var(--sp-surface-soft, #f0f0ed)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    overflowX: "auto",
                  }}
                >
                  {JSON.stringify(activeIncident.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Ação de reconhecimento */}
            {activeIncident.status === "open" && (
              <div style={{ marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => void handleAcknowledge()}
                  disabled={acknowledging}
                  style={{
                    padding: "8px 14px",
                    background: "var(--sp-ink)",
                    color: "var(--sp-surface)",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {acknowledging ? "Reconhecendo…" : "✓ Reconhecer Incidente"}
                </button>
              </div>
            )}

            {/* Timeline de notas */}
            <div className={incidentStyles.notesTimeline}>
              <strong style={{ fontSize: "12px", color: "var(--sp-muted)", textTransform: "uppercase" }}>
                Histórico de Observações ({activeIncident.notes.length}):
              </strong>
              {activeIncident.notes.map((n) => (
                <div key={n.id} className={incidentStyles.noteItem}>
                  <div className={incidentStyles.noteHeader}>
                    <span>{n.author_user_id ? "Observação Operacional" : "🤖 Sentinela Operacional (Sistema)"}</span>
                    <span>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(n.created_at))}
                    </span>
                  </div>
                  <div>{n.note}</div>
                </div>
              ))}
              {activeIncident.notes.length === 0 && (
                <div style={{ color: "var(--sp-muted)", fontSize: "13px" }}>Nenhuma observação registrada.</div>
              )}
            </div>

            {/* Formulário para adicionar nota ou resolver */}
            {activeIncident.status !== "resolved" && activeIncident.status !== "closed" && (
              <form onSubmit={(e) => void handleAddNote(e)}>
                <div style={{ marginBottom: "12px" }}>
                  <label htmlFor="incident-note-input" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Adicionar observação técnica:
                  </label>
                  <textarea
                    id="incident-note-input"
                    name="incident_note"
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ex: Executando restart do pooler; verificando métricas de CPU…"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sp-line)",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      maxWidth: "100%",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => void handleResolve()}
                    disabled={resolving}
                    style={{
                      padding: "8px 14px",
                      background: "var(--sp-success-soft, #e9f3ec)",
                      color: "var(--sp-success, #24613b)",
                      borderRadius: "8px",
                      border: "1px solid var(--sp-success)",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    {resolving ? "Resolvendo…" : "✓ Marcar como Resolvido"}
                  </button>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="submit"
                      className={platformStyles.primaryButton}
                      disabled={submittingNote || !newNote.trim()}
                    >
                      {submittingNote ? "Salvando…" : "Salvar Observação"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {(activeIncident.status === "resolved" || activeIncident.status === "closed") && (
              <div
                style={{
                  textAlign: "center",
                  padding: "12px",
                  color: "var(--sp-success, #24613b)",
                  background: "var(--sp-success-soft, #e9f3ec)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Incidente resolvido com auditoria gravada.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para Criar Incidente */}
      {createModalOpen && (
        <div className={platformStyles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="create-inc-title">
          <div className={platformStyles.modalCard}>
            <h3 id="create-inc-title">Registrar Novo Incidente</h3>
            <p style={{ margin: "0 0 16px", color: "var(--sp-muted)", fontSize: "14px" }}>
              Registre um alerta manual ou evento operacional na infraestrutura.
            </p>

            {createError && (
              <div style={{ color: "var(--sp-danger)", fontSize: "14px", marginBottom: "14px" }}>
                {createError}
              </div>
            )}

            <form onSubmit={(e) => void handleCreateIncident(e)}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                <label htmlFor="service-select" style={{ fontSize: "14px", fontWeight: 600 }}>
                  Serviço Afetado
                </label>
                <select
                  id="service-select"
                  name="incident_new_service"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--sp-line)", fontSize: "14px", maxWidth: "100%", boxSizing: "border-box" }}
                >
                  <option value="api">API Principal</option>
                  <option value="database">Banco de Dados Postgres</option>
                  <option value="auth">Autenticação GoTrue</option>
                  <option value="storage">Armazenamento Storage</option>
                  <option value="notifications">Fila de Notificações</option>
                  <option value="booking_gateway">Gateway de Agendamento</option>
                  <option value="cron_jobs">Tarefas Agendadas (Cron)</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                <label htmlFor="severity-select" style={{ fontSize: "14px", fontWeight: 600 }}>
                  Severidade
                </label>
                <select
                  id="severity-select"
                  name="incident_new_severity"
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--sp-line)", fontSize: "14px", maxWidth: "100%", boxSizing: "border-box" }}
                >
                  <option value="info">Informativa</option>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                <label htmlFor="inc-title-input" style={{ fontSize: "14px", fontWeight: 600 }}>
                  Título (mínimo 5 caracteres)
                </label>
                <input
                  id="inc-title-input"
                  name="incident_new_title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Falha de conexão com provedor de e-mail"
                  required
                  minLength={5}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--sp-line)", fontSize: "14px", maxWidth: "100%", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "18px" }}>
                <label htmlFor="inc-desc-input" style={{ fontSize: "14px", fontWeight: 600 }}>
                  Descrição detalhada (mínimo 10 caracteres)
                </label>
                <textarea
                  id="inc-desc-input"
                  name="incident_new_description"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descreva as evidências observadas e o impacto operacional…"
                  required
                  minLength={10}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--sp-line)", fontSize: "14px", maxWidth: "100%", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className={platformStyles.signOut}
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={platformStyles.primaryButton}
                  disabled={creating}
                >
                  {creating ? "Registrando…" : "Registrar Incidente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
