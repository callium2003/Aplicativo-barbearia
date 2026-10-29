"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PanelShell from "../PanelShell";
import { supabase } from "@/utils/supabase";
import { getPanelContext } from "@/utils/panel-context";
import {
  calculateTicketSlaStatus,
  createPlatformSupportTicket,
  formatTicketPriority,
  formatTicketStatus,
  listBarbershopSupportTickets,
  loadPlatformFaq,
  loadPlatformTicketMessages,
  replyPlatformSupportTicket,
  updatePlatformSupportTicketStatus,
} from "@/utils/platform-administration.mjs";
import styles from "./support.module.css";

type FaqCategory = {
  id: string;
  title: string;
  description: string;
  icon: string;
  sort_order: number;
};

type FaqArticle = {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  commercial_offer_note: string | null;
  sort_order: number;
};

type SupportTicket = {
  id: string;
  barbershop_id: string;
  category_id: string;
  category_title: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
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
  created_at: string;
};

type ShopContext = {
  id: string;
  name: string;
  role: "owner" | "manager";
};

export default function SuportePage() {
  const [shop, setShop] = useState<ShopContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<"faq" | "tickets">("faq");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Modal Abrir Chamado
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal Detalhes/Histórico do Chamado
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const initData = useCallback(async () => {
    try {
      setLoading(true);
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

      const { data: shopData } = await supabase
        .from("barbershops")
        .select("id, name")
        .eq("id", context.barbershopId)
        .maybeSingle<{ id: string; name: string }>();

      setShop({
        id: context.barbershopId,
        name: shopData?.name ?? "Minha Barbearia",
        role: context.role as "owner" | "manager",
      });

      const [faqData, ticketsData] = await Promise.all([
        loadPlatformFaq(supabase),
        listBarbershopSupportTickets(supabase, context.barbershopId),
      ]);

      setCategories(faqData.categories);
      setArticles(faqData.articles);
      if (faqData.categories.length > 0) {
        setNewCategoryId(faqData.categories[0].id);
      }
      setTickets(ticketsData.tickets);
    } catch (err) {
      console.error("Erro ao carregar suporte:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void initData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initData]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return articles.filter((art) => {
      const matchesCat = selectedCategory === "all" || art.category_id === selectedCategory;
      const matchesQuery =
        !q ||
        art.question.toLowerCase().includes(q) ||
        art.answer.toLowerCase().includes(q) ||
        (art.commercial_offer_note && art.commercial_offer_note.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [articles, selectedCategory, searchQuery]);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      await createPlatformSupportTicket(supabase, {
        barbershopId: shop.id,
        categoryId: newCategoryId,
        subject: newSubject,
        description: newDescription,
        priority: newPriority,
      });

      // Recarrega chamados e limpa formulário
      const res = await listBarbershopSupportTickets(supabase, shop.id);
      setTickets(res.tickets);
      setIsCreateOpen(false);
      setNewSubject("");
      setNewDescription("");
      setNewPriority("normal");
      setActiveTab("tickets");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir chamado de suporte.";
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function openTicketDetails(ticket: SupportTicket) {
    setActiveTicket(ticket);
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
    setReplySubmitting(true);
    try {
      await replyPlatformSupportTicket(supabase, {
        ticketId: activeTicket.id,
        message: replyText.trim(),
      });
      setReplyText("");
      const [messagesRes, ticketsRes] = await Promise.all([
        loadPlatformTicketMessages(supabase, activeTicket.id),
        shop ? listBarbershopSupportTickets(supabase, shop.id) : null,
      ]);
      setMessages(messagesRes.messages);
      if (ticketsRes) {
        setTickets(ticketsRes.tickets);
        const updated = ticketsRes.tickets.find((t: SupportTicket) => t.id === activeTicket.id);
        if (updated) setActiveTicket(updated);
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setReplySubmitting(false);
    }
  }

  async function handleResolveTicket() {
    if (!activeTicket || !shop) return;
    setStatusUpdating(true);
    try {
      await updatePlatformSupportTicketStatus(supabase, {
        ticketId: activeTicket.id,
        status: "resolved",
      });
      const ticketsRes = await listBarbershopSupportTickets(supabase, shop.id);
      setTickets(ticketsRes.tickets);
      const updated = ticketsRes.tickets.find((t: SupportTicket) => t.id === activeTicket.id);
      if (updated) setActiveTicket(updated);
    } catch (err) {
      console.error("Erro ao resolver chamado:", err);
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading || !shop) {
    return (
      <PanelShell role="owner" active="more" mobileBackHref="/painel/mais" mobileBackLabel="Mais" mobileTitle="Suporte">
        <div className={styles.container}>
          <p>Carregando central de ajuda e suporte…</p>
        </div>
      </PanelShell>
    );
  }

  const openTicketsCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_client").length;

  return (
    <PanelShell
      role={shop.role}
      active="more"
      shopName={shop.name}
      barbershopId={shop.id}
      mobileBackHref="/painel/mais"
      mobileBackLabel="Mais"
      mobileTitle="Suporte e Ajuda"
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Suporte e Ajuda</h1>
          <p>Tire dúvidas sobre a plataforma ou solicite apoio técnico e comercial com SLA garantido de 1 dia útil.</p>
        </header>

        <nav className={styles.tabs} aria-label="Navegação do Suporte">
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "faq" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("faq")}
          >
            Perguntas Frequentes (FAQ)
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "tickets" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("tickets")}
          >
            Meus Chamados
            {openTicketsCount > 0 && <span className={styles.tabBadge}>{openTicketsCount}</span>}
          </button>
        </nav>

        {activeTab === "faq" && (
          <section aria-label="Perguntas Frequentes">
            <div className={styles.searchWrap}>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Buscar resposta por palavra-chave…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.categoryPills}>
              <button
                type="button"
                className={`${styles.categoryPill} ${selectedCategory === "all" ? styles.categoryPillActive : ""}`}
                onClick={() => setSelectedCategory("all")}
              >
                Todas as categorias
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryPill} ${selectedCategory === cat.id ? styles.categoryPillActive : ""}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.icon} {cat.title}
                </button>
              ))}
            </div>

            <div className={styles.faqList}>
              {filteredArticles.map((art) => {
                const isOpen = expandedArticleId === art.id;
                return (
                  <div key={art.id} className={styles.faqItem}>
                    <button
                      type="button"
                      className={styles.faqQuestion}
                      onClick={() => setExpandedArticleId(isOpen ? null : art.id)}
                      aria-expanded={isOpen}
                    >
                      <span>{art.question}</span>
                      <span>{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div className={styles.faqAnswer}>
                        <p>{art.answer}</p>
                        {art.commercial_offer_note && (
                          <div className={styles.commercialOfferBox}>
                            <strong>💡 Proposta de Suporte Contínuo CullenTech:</strong> {art.commercial_offer_note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredArticles.length === 0 && (
                <p className={styles.emptyState}>Nenhuma pergunta encontrada com o termo pesquisado.</p>
              )}
            </div>

            <div className={styles.needHelpCard}>
              <div>
                <h3>Ainda precisa de ajuda?</h3>
                <p>Nossa equipe técnica e comercial atende com confirmação imediata e resposta em até 1 dia útil.</p>
              </div>
              <button type="button" className={styles.primaryButton} onClick={() => setIsCreateOpen(true)}>
                Abrir Chamado de Suporte
              </button>
            </div>
          </section>
        )}

        {activeTab === "tickets" && (
          <section aria-label="Chamados de Suporte">
            <div className={styles.ticketsHead}>
              <h3>Histórico de Chamados</h3>
              <button type="button" className={styles.primaryButton} onClick={() => setIsCreateOpen(true)}>
                + Novo Chamado
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Você ainda não abriu nenhum chamado de suporte.</p>
                <button type="button" className={styles.secondaryButton} onClick={() => setIsCreateOpen(true)}>
                  Abrir Primeiro Chamado
                </button>
              </div>
            ) : (
              tickets.map((t) => {
                const sla = calculateTicketSlaStatus(t.first_response_due_at, t.first_responded_at, t.status);
                let slaBadgeClass = styles.badgeInfo;
                if (sla.color === "danger") slaBadgeClass = styles.badgeDanger;
                if (sla.color === "warning") slaBadgeClass = styles.badgeWarning;
                if (sla.color === "success") slaBadgeClass = styles.badgeResolved;

                let statusBadgeClass = styles.badgeOpen;
                if (t.status === "in_progress") statusBadgeClass = styles.badgeInProgress;
                if (t.status === "waiting_client") statusBadgeClass = styles.badgeWaitingClient;
                if (t.status === "resolved") statusBadgeClass = styles.badgeResolved;
                if (t.status === "closed") statusBadgeClass = styles.badgeClosed;

                return (
                  <div key={t.id} className={styles.ticketCard}>
                    <div className={styles.ticketInfo}>
                      <h4>{t.subject}</h4>
                      <div className={styles.ticketMeta}>
                        <span className={`${styles.badge} ${statusBadgeClass}`}>
                          {formatTicketStatus(t.status)}
                        </span>
                        <span className={`${styles.badge} ${slaBadgeClass}`}>{sla.label}</span>
                        <span>Prioridade: {formatTicketPriority(t.priority)}</span>
                        <span>Categoria: {t.category_title ?? t.category_id}</span>
                        <span>{t.message_count} {t.message_count === 1 ? "mensagem" : "mensagens"}</span>
                      </div>
                    </div>
                    <button type="button" className={styles.secondaryButton} onClick={() => void openTicketDetails(t)}>
                      Ver Conversa
                    </button>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* Modal: Abertura de Chamado */}
        {isCreateOpen && (
          <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="create-ticket-title">
            <div className={styles.modalCard}>
              <h3 id="create-ticket-title">Novo Chamado de Suporte</h3>
              <p style={{ margin: "0 0 16px", color: "var(--sp-muted)", fontSize: "14px" }}>
                Preencha os detalhes da sua solicitação técnica ou comercial.
              </p>

              <div className={styles.slaNotice}>
                <strong>⏱️ SLA de 1 dia útil:</strong> Você receberá confirmação imediata e acompanhamento direto da equipe CullenTech.
              </div>

              {createError && (
                <div style={{ color: "var(--sp-danger)", fontSize: "14px", marginBottom: "16px" }}>
                  {createError}
                </div>
              )}

              <form onSubmit={(e) => void handleCreateTicket(e)}>
                <div className={styles.formGroup}>
                  <label htmlFor="ticket-category">Categoria</label>
                  <select
                    id="ticket-category"
                    className={styles.formSelect}
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ticket-priority">Prioridade</label>
                  <select
                    id="ticket-priority"
                    className={styles.formSelect}
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ticket-subject">Assunto (mínimo 5 caracteres)</label>
                  <input
                    id="ticket-subject"
                    type="text"
                    className={styles.formInput}
                    placeholder="Ex: Dúvida sobre conciliação bancária"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    minLength={5}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ticket-desc">Descrição detalhada (mínimo 10 caracteres)</label>
                  <textarea
                    id="ticket-desc"
                    rows={4}
                    className={styles.formTextarea}
                    placeholder="Descreva detalhadamente o ocorrido ou sua dúvida…"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    minLength={10}
                    required
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setIsCreateOpen(false)}
                    disabled={createSubmitting}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className={styles.primaryButton} disabled={createSubmitting}>
                    {createSubmitting ? "Enviando…" : "Abrir Chamado"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Detalhes e Conversa do Chamado */}
        {activeTicket && (
          <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="view-ticket-title">
            <div className={styles.modalCard} style={{ maxWidth: "640px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 id="view-ticket-title" style={{ margin: "0 0 4px" }}>{activeTicket.subject}</h3>
                  <div style={{ fontSize: "13px", color: "var(--sp-muted)" }}>
                    Categoria: {activeTicket.category_title ?? activeTicket.category_id} · Status: {formatTicketStatus(activeTicket.status)}
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

              <div className={styles.messagesList}>
                {messages.map((m) => {
                  const isTenant = m.sender_type === "tenant";
                  return (
                    <div
                      key={m.id}
                      className={`${styles.messageBubble} ${isTenant ? styles.messageTenant : styles.messagePlatform}`}
                    >
                      <div className={styles.messageSender}>
                        {isTenant ? "Você (Barbearia)" : "Suporte CullenTech"}
                      </div>
                      <div>{m.message}</div>
                      <div className={styles.messageTime}>
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

              {activeTicket.status !== "resolved" && activeTicket.status !== "closed" && (
                <form onSubmit={(e) => void handleSendReply(e)} style={{ marginTop: "16px" }}>
                  <div className={styles.formGroup}>
                    <label htmlFor="reply-message">Nova mensagem</label>
                    <textarea
                      id="reply-message"
                      rows={3}
                      className={styles.formTextarea}
                      placeholder="Escreva sua resposta…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => void handleResolveTicket()}
                      disabled={statusUpdating}
                    >
                      {statusUpdating ? "Atualizando…" : "✓ Marcar como Resolvido"}
                    </button>
                    <button type="submit" className={styles.primaryButton} disabled={replySubmitting || !replyText.trim()}>
                      {replySubmitting ? "Enviando…" : "Enviar Resposta"}
                    </button>
                  </div>
                </form>
              )}

              {(activeTicket.status === "resolved" || activeTicket.status === "closed") && (
                <div style={{ textAlign: "center", padding: "12px", color: "var(--sp-success)", fontSize: "14px" }}>
                  Este chamado foi marcado como concluído.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
