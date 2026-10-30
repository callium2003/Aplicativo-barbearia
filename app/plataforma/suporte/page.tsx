"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import {
  calculateTicketSlaStatus,
  closePlatformSupportTicket,
  formatTicketPriority,
  formatTicketStatus,
  listAllPlatformSupportTickets,
  loadPlatformTicketMessages,
  replyPlatformSupportTicket,
  updatePlatformSupportTicketStatus,
} from "@/utils/platform-administration.mjs";
import styles from "../platform.module.css";

type PlatformTicket = {
  id: string;
  barbershop_id: string;
  barbershop_name: string;
  barbershop_slug: string;
  category_id: string;
  category_title: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_by_role: string;
  contact_channel: string | null;
  attachment_url: string | null;
  resolution_summary: string | null;
  first_response_due_at: string | null;
  first_responded_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_type: "tenant" | "platform";
  message: string;
  attachment_url: string | null;
  created_at: string;
};

export default function PlatformSuportePage() {
  const [tickets, setTickets] = useState<PlatformTicket[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "failed">("loading");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Modal Atendimento
  const [activeTicket, setActiveTicket] = useState<PlatformTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<string>("in_progress");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Encerramento com Histórico Final
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closeResolutionSummary, setCloseResolutionSummary] = useState("");
  const [submittingClose, setSubmittingClose] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.replace("/plataforma/entrar");
        return;
      }

      const res = await listAllPlatformSupportTickets(supabase);
      setTickets(res.tickets as PlatformTicket[]);
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
      void fetchTickets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return tickets.filter((t) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open_active"
          ? t.status === "open" || t.status === "in_progress" || t.status === "waiting_client"
          : t.status === statusFilter);

      const matchesQuery =
        !q ||
        t.subject.toLowerCase().includes(q) ||
        t.barbershop_name.toLowerCase().includes(q) ||
        t.barbershop_slug.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [tickets, statusFilter, searchFilter]);

  async function openTicketModal(ticket: PlatformTicket) {
    setActiveTicket(ticket);
    setNewStatus(ticket.status);
    setReplyStatus("in_progress");
    setIsClosingModalOpen(false);
    setCloseResolutionSummary("");
    setCloseError(null);
    try {
      const res = await loadPlatformTicketMessages(supabase, ticket.id);
      setMessages(res.messages);
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await replyPlatformSupportTicket(supabase, {
        ticketId: activeTicket.id,
        message: replyText.trim(),
        status: replyStatus,
      });
      setReplyText("");
      const [msgRes, ticketsRes] = await Promise.all([
        loadPlatformTicketMessages(supabase, activeTicket.id),
        listAllPlatformSupportTickets(supabase),
      ]);
      setMessages(msgRes.messages);
      setTickets(ticketsRes.tickets as PlatformTicket[]);
      const updated = (ticketsRes.tickets as PlatformTicket[]).find((t) => t.id === activeTicket.id);
      if (updated) {
        setActiveTicket(updated);
        setNewStatus(updated.status);
      }
    } catch (err) {
      console.error("Erro ao responder chamado:", err);
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleCloseTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTicket || !closeResolutionSummary.trim()) return;
    setSubmittingClose(true);
    setCloseError(null);
    try {
      await closePlatformSupportTicket(supabase, {
        ticketId: activeTicket.id,
        resolutionSummary: closeResolutionSummary.trim(),
        status: "closed",
      });
      setIsClosingModalOpen(false);
      setCloseResolutionSummary("");
      const [msgRes, ticketsRes] = await Promise.all([
        loadPlatformTicketMessages(supabase, activeTicket.id),
        listAllPlatformSupportTickets(supabase),
      ]);
      setMessages(msgRes.messages);
      setTickets(ticketsRes.tickets as PlatformTicket[]);
      const updated = (ticketsRes.tickets as PlatformTicket[]).find((t) => t.id === activeTicket.id);
      if (updated) {
        setActiveTicket(updated);
        setNewStatus(updated.status);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao encerrar chamado.";
      setCloseError(msg);
    } finally {
      setSubmittingClose(false);
    }
  }

  async function handleUpdateStatus() {
    if (!activeTicket || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await updatePlatformSupportTicketStatus(supabase, {
        ticketId: activeTicket.id,
        status: newStatus,
      });
      const ticketsRes = await listAllPlatformSupportTickets(supabase);
      setTickets(ticketsRes.tickets as PlatformTicket[]);
      const updated = (ticketsRes.tickets as PlatformTicket[]).find((t) => t.id === activeTicket.id);
      if (updated) setActiveTicket(updated);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/plataforma/entrar");
  }

  if (state === "loading") {
    return (
      <main className={styles.centered}>
        <p>Verificando acesso interno aos chamados…</p>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className={styles.centered}>
        <section className={styles.denied}>
          <p className={styles.eyebrow}>CullenTech</p>
          <h1>Acesso interno não autorizado</h1>
          <p>Esta identidade não possui permissão para gerenciar suporte da plataforma.</p>
          <button type="button" onClick={() => void signOut()}>
            Sair
          </button>
        </section>
      </main>
    );
  }

  if (state === "failed") {
    return (
      <main className={styles.centered}>
        <p>Não foi possível carregar os chamados de suporte agora.</p>
      </main>
    );
  }

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
  const criticalSlaTickets = tickets.filter((t) => {
    if (t.status === "resolved" || t.status === "closed") return false;
    const sla = calculateTicketSlaStatus(t.first_response_due_at, t.first_responded_at, t.status);
    return sla.state === "breached" || sla.state === "due_soon";
  });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CullenTech</p>
          <h1>Central de Chamados & Suporte</h1>
          <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "14px" }}>
            <Link href="/plataforma" style={{ color: "var(--sp-muted)", textDecoration: "none" }}>
              ← Barbearias
            </Link>
            <span style={{ fontWeight: 700, color: "var(--sp-ink)" }}>Chamados & Suporte</span>
            <Link href="/plataforma/incidentes" style={{ color: "var(--sp-muted)", textDecoration: "none" }}>
              Alertas & Incidentes
            </Link>
          </div>
        </div>
        <button type="button" className={styles.signOut} onClick={() => void signOut()}>
          Sair
        </button>
      </header>

      <section className={styles.summary} aria-label="Resumo dos Chamados">
        <div>
          <strong>{tickets.length}</strong>
          <span>total de chamados</span>
        </div>
        <div>
          <strong style={{ color: openTickets.length > 0 ? "var(--sp-primary, #b34728)" : "inherit" }}>
            {openTickets.length}
          </strong>
          <span>abertos / em atendimento</span>
        </div>
        <div>
          <strong style={{ color: criticalSlaTickets.length > 0 ? "var(--sp-danger, #9c3333)" : "inherit" }}>
            {criticalSlaTickets.length}
          </strong>
          <span>SLA crítico ou vencido</span>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Chamados de Suporte</h2>
            <p>Atendimento contínuo garantido com SLA de 1 dia útil.</p>
          </div>
          <button type="button" onClick={() => void fetchTickets()}>
            Atualizar
          </button>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input
            type="search"
            placeholder="Filtrar por assunto ou barbearia…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--sp-line)",
              fontSize: "14px",
              minWidth: "260px",
              outline: "none",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--sp-line)",
              fontSize: "14px",
              outline: "none",
            }}
          >
            <option value="all">Todos os status</option>
            <option value="open_active">Em aberto / Ativos</option>
            <option value="open">Abertos (sem resposta)</option>
            <option value="in_progress">Em atendimento</option>
            <option value="waiting_client">Aguardando cliente</option>
            <option value="resolved">Resolvidos</option>
            <option value="closed">Encerrados</option>
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Barbearia</th>
                <th>Assunto</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>SLA (1 dia útil)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => {
                const sla = calculateTicketSlaStatus(t.first_response_due_at, t.first_responded_at, t.status);
                let slaColor = "var(--sp-ink)";
                if (sla.color === "danger") slaColor = "var(--sp-danger, #9c3333)";
                if (sla.color === "warning") slaColor = "var(--sp-warning, #7c5d14)";
                if (sla.color === "success") slaColor = "var(--sp-success, #24613b)";

                return (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/plataforma/barbearias/${t.barbershop_id}`}>
                        <strong>{t.barbershop_name}</strong>
                      </Link>
                      <small>/{t.barbershop_slug}</small>
                    </td>
                    <td>
                      <strong>{t.subject}</strong>
                      <small>{t.message_count} {t.message_count === 1 ? "mensagem" : "mensagens"}</small>
                    </td>
                    <td>{t.category_title ?? t.category_id}</td>
                    <td>{formatTicketPriority(t.priority)}</td>
                    <td>{formatTicketStatus(t.status)}</td>
                    <td>
                      <span style={{ color: slaColor, fontWeight: 600 }}>{sla.label}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void openTicketModal(t)}
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
                        Atender
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={7}>Nenhum chamado encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Atendimento */}
      {activeTicket && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="manage-ticket-title">
          <div className={styles.modalCard} style={{ maxWidth: "680px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <p className={styles.eyebrow} style={{ margin: 0 }}>
                  Barbearia: {activeTicket.barbershop_name}
                </p>
                <h3 id="manage-ticket-title" style={{ margin: "4px 0 6px" }}>
                  {activeTicket.subject}
                </h3>
                <div style={{ fontSize: "13px", color: "var(--sp-muted)" }}>
                  Categoria: {activeTicket.category_title ?? activeTicket.category_id} · Prioridade:{" "}
                  {formatTicketPriority(activeTicket.priority)} · Aberto por: {activeTicket.created_by_role}
                </div>
              </div>
              <button
                type="button"
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--sp-muted)" }}
                onClick={() => setActiveTicket(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <label htmlFor="ticket-status-select" style={{ fontSize: "13px", fontWeight: 600 }}>
                Alterar status:
              </label>
              <select
                id="ticket-status-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--sp-line)", fontSize: "13px" }}
              >
                <option value="open">Aberto</option>
                <option value="in_progress">Em atendimento</option>
                <option value="waiting_client">Aguardando cliente</option>
                <option value="resolved">Resolvido</option>
                <option value="closed">Encerrado</option>
              </select>
              <button
                type="button"
                onClick={() => void handleUpdateStatus()}
                disabled={updatingStatus || newStatus === activeTicket.status}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--sp-line)",
                  background: "var(--sp-surface)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {updatingStatus ? "Salvando…" : "Salvar Status"}
              </button>
            </div>

            {/* Informações Iniciais do Chamado */}
            <div style={{ background: "var(--sp-surface)", border: "1px solid var(--sp-line)", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "14px", lineHeight: "1.5" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px", color: "var(--sp-ink)" }}>Descrição da Solicitação:</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{activeTicket.description}</div>
              {activeTicket.contact_channel && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--sp-muted)" }}>
                  <strong>Canal de contato preferencial informado:</strong> {activeTicket.contact_channel}
                </div>
              )}
              {activeTicket.attachment_url && (
                <div style={{ marginTop: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                    📎 Evidência anexada na abertura:
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeTicket.attachment_url}
                    alt="Evidência anexada na abertura"
                    style={{ maxWidth: "220px", maxHeight: "160px", borderRadius: "6px", border: "1px solid var(--sp-line)", cursor: "pointer", display: "block" }}
                    onClick={() => setLightboxImage(activeTicket.attachment_url)}
                  />
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "320px",
                overflowY: "auto",
                padding: "12px",
                background: "var(--sp-surface-soft, #f0f0ed)",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            >
              {messages.map((m) => {
                const isPlatform = m.sender_type === "platform";
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isPlatform ? "flex-end" : "flex-start",
                      background: isPlatform ? "var(--sp-primary, #b34728)" : "#fff",
                      color: isPlatform ? "#fff" : "var(--sp-ink)",
                      border: isPlatform ? "none" : "1px solid var(--sp-line)",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      maxWidth: "85%",
                      fontSize: "14px",
                      lineHeight: "1.5",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "4px", opacity: 0.8 }}>
                      {isPlatform ? "Equipe de Suporte BarbeariaSP (Você)" : `Barbearia (${activeTicket.barbershop_name})`}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
                    {m.attachment_url && (
                      <div style={{ marginTop: "8px" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.attachment_url}
                          alt="Evidência anexada na mensagem"
                          style={{ maxWidth: "200px", maxHeight: "150px", borderRadius: "6px", border: "1px solid rgba(0, 0, 0, 0.15)", cursor: "pointer", display: "block" }}
                          onClick={() => setLightboxImage(m.attachment_url)}
                        />
                      </div>
                    )}
                    <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px", textAlign: "right" }}>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(m.created_at))}
                    </div>
                  </div>
                );
              })}
            </div>

            {activeTicket.status === "closed" && (
              <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#1b5e20", fontSize: "13px" }}>
                <strong>✓ Chamado Encerrado</strong>
                {activeTicket.resolution_summary ? (
                  <div style={{ marginTop: "4px" }}>
                    <strong>Resumo da Resolução:</strong> {activeTicket.resolution_summary}
                  </div>
                ) : (
                  <div style={{ marginTop: "4px" }}>Este chamado foi formalmente encerrado pela equipe técnica.</div>
                )}
              </div>
            )}

            {activeTicket.status !== "closed" && (
              <form onSubmit={(e) => void handleSendReply(e)}>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                    <label htmlFor="platform-reply" style={{ fontSize: "13px", fontWeight: 600 }}>
                      Nova resposta para a barbearia:
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                      <label htmlFor="reply-status-choice" style={{ color: "var(--sp-muted)" }}>Status após envio:</label>
                      <select
                        id="reply-status-choice"
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--sp-line)", fontSize: "12px" }}
                      >
                        <option value="in_progress">Em atendimento (Padrão)</option>
                        <option value="waiting_client">Aguardando cliente</option>
                        <option value="resolved">Resolvido</option>
                      </select>
                    </div>
                  </div>
                  <textarea
                    id="platform-reply"
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Digite a orientação técnica ou esclarecimento…"
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--sp-line)",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "14px" }}>
                  <button
                    type="button"
                    onClick={() => setIsClosingModalOpen(true)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      border: "1px solid var(--sp-danger, #b3261e)",
                      background: "#fff",
                      color: "var(--sp-danger, #b3261e)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    🔒 Encerrar Chamado com Histórico
                  </button>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className={styles.signOut}
                      onClick={() => setActiveTicket(null)}
                    >
                      Fechar
                    </button>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={submittingReply || !replyText.trim()}
                    >
                      {submittingReply ? "Enviando…" : "Enviar Resposta"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Encerrar Chamado com Histórico Obrigatório */}
      {isClosingModalOpen && activeTicket && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="close-modal-title">
          <div className={styles.modalCard} style={{ maxWidth: "520px" }}>
            <h3 id="close-modal-title" style={{ margin: "0 0 8px" }}>Encerrar Chamado de Suporte</h3>
            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "var(--sp-muted)" }}>
              Para encerrar formalmente o chamado, informe o resumo da solução ou histórico final. Uma notificação será enviada ao locatário no sininho.
            </p>

            {closeError && (
              <div style={{ color: "var(--sp-danger)", fontSize: "13px", marginBottom: "12px" }}>
                {closeError}
              </div>
            )}

            <form onSubmit={(e) => void handleCloseTicket(e)}>
              <div style={{ marginBottom: "14px" }}>
                <label htmlFor="close-summary" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Resumo da Resolução / Histórico Final (mínimo 5 caracteres):
                </label>
                <textarea
                  id="close-summary"
                  rows={4}
                  value={closeResolutionSummary}
                  onChange={(e) => setCloseResolutionSummary(e.target.value)}
                  placeholder="Ex: Orientado sobre sincronização de agenda e corrigido bug de conciliação. Chamado resolvido e testado."
                  minLength={5}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--sp-line)",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className={styles.signOut}
                  onClick={() => setIsClosingModalOpen(false)}
                  disabled={submittingClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={submittingClose || closeResolutionSummary.trim().length < 5}
                >
                  {submittingClose ? "Encerrando…" : "Confirmar Encerramento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox para visualização de anexo */}
      {lightboxImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
            padding: "20px",
            cursor: "pointer",
          }}
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visualização em tamanho real do anexo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Evidência em tamanho real"
            style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px", background: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

