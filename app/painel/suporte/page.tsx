"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type ShopContext = {
  id: string;
  name: string;
  role: "owner" | "manager";
  userEmail?: string;
};

async function compressImageToWebp(file: File, maxDimension = 1200, quality = 0.82): Promise<{ blob: Blob; fileName: string; originalSize: number; compressedSize: number }> {
  const originalSize = file.size;
  if (!file.type.startsWith("image/")) {
    return { blob: file, fileName: file.name, originalSize, compressedSize: file.size };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ blob: file, fileName: file.name, originalSize, compressedSize: file.size });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
              resolve({
                blob,
                fileName: `${baseName}.webp`,
                originalSize,
                compressedSize: blob.size,
              });
            } else {
              resolve({ blob: file, fileName: file.name, originalSize, compressedSize: file.size });
            }
          },
          "image/webp",
          quality
        );
      } catch {
        resolve({ blob: file, fileName: file.name, originalSize, compressedSize: file.size });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, fileName: file.name, originalSize, compressedSize: file.size });
    };
    img.src = objectUrl;
  });
}

export default function SuportePage() {
  const [shop, setShop] = useState<ShopContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<"faq" | "tickets">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("aba") || params.get("tab");
      if (tab === "chamados" || tab === "tickets") return "tickets";
    }
    return "faq";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Modal Abrir Chamado
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newContactChannel, setNewContactChannel] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentCompressedInfo, setAttachmentCompressedInfo] = useState<{ origKb: number; compKb: number } | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal Detalhes/Histórico do Chamado
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyAttachmentFile, setReplyAttachmentFile] = useState<File | null>(null);
  const [replyAttachmentPreview, setReplyAttachmentPreview] = useState<string | null>(null);
  const [replyCompressedInfo, setReplyCompressedInfo] = useState<{ origKb: number; compKb: number } | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Lightbox de Imagem
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Filtro de chamados
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "closed">("all");

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

      const { data: userData } = await supabase.auth.getUser();

      setShop({
        id: context.barbershopId,
        name: shopData?.name ?? "Minha Barbearia",
        role: context.role as "owner" | "manager",
        userEmail: userData?.user?.email ?? undefined,
      });

      if (userData?.user?.email) {
        setNewContactChannel(userData.user.email);
      }

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("aba") === "chamados" || params.get("tab") === "tickets") {
        window.location.replace("/painel/suporte/chamados");
      }
    }
  }, []);

  const handleTabChange = useCallback((tab: "faq" | "tickets") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("aba", tab === "tickets" ? "chamados" : "faq");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

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

  const filteredTicketsList = useMemo(() => {
    if (ticketFilter === "open") {
      return tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_client");
    }
    if (ticketFilter === "closed") {
      return tickets.filter((t) => t.status === "resolved" || t.status === "closed");
    }
    return tickets;
  }, [tickets, ticketFilter]);

  async function handleFileSelect(file: File | null, isReply = false) {
    if (!file) {
      if (isReply) {
        setReplyAttachmentFile(null);
        setReplyAttachmentPreview(null);
        setReplyCompressedInfo(null);
      } else {
        setAttachmentFile(null);
        setAttachmentPreview(null);
        setAttachmentCompressedInfo(null);
      }
      return;
    }

    const { blob, originalSize, compressedSize } = await compressImageToWebp(file);
    const origKb = Math.round(originalSize / 1024);
    const compKb = Math.round(compressedSize / 1024);
    const preview = URL.createObjectURL(blob);

    if (isReply) {
      setReplyAttachmentFile(file);
      setReplyAttachmentPreview(preview);
      setReplyCompressedInfo({ origKb, compKb });
    } else {
      setAttachmentFile(file);
      setAttachmentPreview(preview);
      setAttachmentCompressedInfo({ origKb, compKb });
    }
  }

  async function uploadAttachment(shopId: string, file: File): Promise<string> {
    const { blob, fileName } = await compressImageToWebp(file);
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${shopId}/${Date.now()}_${cleanName}`;
    const { data, error } = await supabase.storage
      .from("support-attachments")
      .upload(filePath, blob, {
        contentType: blob.type || "image/webp",
        upsert: false,
      });

    if (error) {
      throw new Error("Falha no upload do anexo.");
    }

    const { data: pubData } = supabase.storage
      .from("support-attachments")
      .getPublicUrl(data.path);

    return pubData.publicUrl;
  }

  const createWhatsAppLink = useMemo(() => {
    const subject = newSubject.trim() || "Novo Chamado";
    const text = `Olá! Estou abrindo um chamado de suporte sobre: "${subject}" para a barbearia ${shop?.name ?? ""}. Gostaria de enviar evidências e prints de tela.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [newSubject, shop?.name]);

  const activeTicketWhatsAppLink = useMemo(() => {
    if (!activeTicket) return null;
    const protocol = activeTicket.id.slice(0, 8).toUpperCase();
    const text = `Olá! Gostaria de enviar evidências/prints sobre o chamado #${protocol} ("${activeTicket.subject}") da barbearia ${shop?.name ?? ""}.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [activeTicket, shop?.name]);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      let uploadedAttachmentUrl: string | null = null;
      if (attachmentFile) {
        uploadedAttachmentUrl = await uploadAttachment(shop.id, attachmentFile);
      }

      await createPlatformSupportTicket(supabase, {
        barbershopId: shop.id,
        categoryId: newCategoryId,
        subject: newSubject,
        description: newDescription,
        priority: newPriority,
        contactChannel: newContactChannel.trim() || null,
        attachmentUrl: uploadedAttachmentUrl,
      });

      // Recarrega chamados e limpa formulário
      const res = await listBarbershopSupportTickets(supabase, shop.id);
      setTickets(res.tickets);
      setIsCreateOpen(false);
      setNewSubject("");
      setNewDescription("");
      setNewPriority("normal");
      setAttachmentFile(null);
      setAttachmentPreview(null);
      setAttachmentCompressedInfo(null);
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
    if (!activeTicket || (!replyText.trim() && !replyAttachmentFile)) return;
    if (!shop) return;
    setReplySubmitting(true);
    try {
      let uploadedAttachmentUrl: string | null = null;
      if (replyAttachmentFile) {
        uploadedAttachmentUrl = await uploadAttachment(shop.id, replyAttachmentFile);
      }

      await replyPlatformSupportTicket(supabase, {
        ticketId: activeTicket.id,
        message: replyText.trim() || "Anexo de evidência enviado.",
        attachmentUrl: uploadedAttachmentUrl,
      });

      setReplyText("");
      setReplyAttachmentFile(null);
      setReplyAttachmentPreview(null);
      setReplyCompressedInfo(null);

      const [messagesRes, ticketsRes] = await Promise.all([
        loadPlatformTicketMessages(supabase, activeTicket.id),
        listBarbershopSupportTickets(supabase, shop.id),
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
          <p>Tire dúvidas sobre a plataforma na nossa base de conhecimento ou abra um chamado com SLA garantido de 1 dia útil.</p>
        </header>

        <nav className={styles.tabs} aria-label="Navegação do Suporte">
          <Link
            prefetch={false}
            href="/painel/suporte"
            className={`${styles.tabButton} ${activeTab === "faq" ? styles.tabButtonActive : ""}`}
            onClick={() => handleTabChange("faq")}
          >
            <div className={styles.tabTitleGroup}>
              <span className={styles.tabBullet} aria-hidden="true" />
              <span className={styles.tabText}>Perguntas Frequentes (FAQ)</span>
            </div>
          </Link>
          <Link
            prefetch={false}
            href="/painel/suporte/chamados"
            className={`${styles.tabButton} ${activeTab === "tickets" ? styles.tabButtonActive : ""}`}
          >
            <div className={styles.tabTitleGroup}>
              <span className={styles.tabBullet} aria-hidden="true" />
              <span className={styles.tabText}>Meus Chamados</span>
            </div>
            {openTicketsCount > 0 ? (
              <span className={styles.tabBadgeActive}>{openTicketsCount} em aberto</span>
            ) : (
              <span className={styles.tabBadge}>{tickets.length}</span>
            )}
          </Link>
        </nav>

        {activeTab === "faq" && (
          <section aria-label="Perguntas Frequentes">
            <div className={styles.searchWrap}>
              <input
                id="faq-search-input"
                name="faq_search"
                aria-label="Buscar resposta por palavra-chave"
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
                            <strong>💡 Observação:</strong> {art.commercial_offer_note}
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
                <p>Nossa equipe de suporte atende com confirmação imediata e primeira resposta técnica em até 1 dia útil.</p>
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
              <div>
                <h3>Histórico de Chamados</h3>
                <p className={styles.ticketsSub}>Acompanhe suas solicitações e respostas da equipe técnica.</p>
              </div>
              <button type="button" className={styles.primaryButton} onClick={() => setIsCreateOpen(true)}>
                + Novo Chamado
              </button>
            </div>

            <div className={styles.ticketFilterChips}>
              <button
                type="button"
                className={`${styles.ticketFilterChip} ${ticketFilter === "all" ? styles.ticketFilterChipActive : ""}`}
                onClick={() => setTicketFilter("all")}
              >
                <span className={styles.filterChipLabel}>Todos</span>
                <span className={styles.filterChipCount}>({tickets.length})</span>
              </button>
              <button
                type="button"
                className={`${styles.ticketFilterChip} ${ticketFilter === "open" ? styles.ticketFilterChipActive : ""}`}
                onClick={() => setTicketFilter("open")}
              >
                <span className={styles.filterChipLabel}>Em Aberto</span>
                <span className={styles.filterChipCount}>({openTicketsCount})</span>
              </button>
              <button
                type="button"
                className={`${styles.ticketFilterChip} ${ticketFilter === "closed" ? styles.ticketFilterChipActive : ""}`}
                onClick={() => setTicketFilter("closed")}
              >
                <span className={styles.filterChipLabel}>Concluídos</span>
                <span className={styles.filterChipCount}>({tickets.length - openTicketsCount})</span>
              </button>
            </div>

            {filteredTicketsList.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhum chamado encontrado para o filtro selecionado.</p>
                {tickets.length === 0 && (
                  <button type="button" className={styles.secondaryButton} onClick={() => setIsCreateOpen(true)}>
                    Abrir Primeiro Chamado
                  </button>
                )}
              </div>
            ) : (
              filteredTicketsList.map((t) => {
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
                Preencha os detalhes da sua solicitação técnica ou operacional.
              </p>

              <div className={styles.slaNotice}>
                <strong>⏱️ SLA de 1 dia útil:</strong> Você receberá confirmação imediata e acompanhamento da nossa equipe técnica.
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
                    name="ticket_category"
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
                    name="ticket_priority"
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
                    name="ticket_subject"
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
                    name="ticket_description"
                    rows={4}
                    className={styles.formTextarea}
                    placeholder="Descreva detalhadamente o ocorrido ou sua dúvida…"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    minLength={10}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ticket-contact">Canal de contato preferencial (opcional)</label>
                  <input
                    id="ticket-contact"
                    name="ticket_contact_channel"
                    type="text"
                    className={styles.formInput}
                    placeholder="E-mail ou WhatsApp (ex: 11999999999)"
                    value={newContactChannel}
                    onChange={(e) => setNewContactChannel(e.target.value)}
                  />
                </div>

                <div className={styles.attachmentSection}>
                  <label htmlFor="ticket-attachment">📎 Anexar print ou evidência de erro (opcional)</label>
                  <p className={styles.attachmentHelp}>
                    Formatos aceitos: PNG, JPG ou WebP até 3 MB. A imagem é comprimida automaticamente no seu navegador para poupar dados e acelerar o envio.
                  </p>
                  <input
                    id="ticket-attachment"
                    name="ticket_attachment"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleFileSelect(file, false);
                    }}
                  />
                  {attachmentPreview && attachmentCompressedInfo && (
                    <div className={styles.attachmentPreview}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={attachmentPreview} alt="Prévia do anexo" className={styles.attachmentThumb} />
                      <div className={styles.attachmentInfo}>
                        <span>{attachmentFile?.name}</span>
                        <small>Tamanho original: {attachmentCompressedInfo.origKb} KB → Comprimido: {attachmentCompressedInfo.compKb} KB (WebP)</small>
                      </div>
                      <button
                        type="button"
                        className={styles.removeAttachmentBtn}
                        onClick={() => void handleFileSelect(null, false)}
                      >
                        Remover
                      </button>
                    </div>
                  )}

                  <div className={styles.whatsappAux}>
                    <span>Prefere enviar prints ou vídeos pelo WhatsApp?</span>
                    <a
                      href={createWhatsAppLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.whatsappLinkBtn}
                    >
                      📱 Enviar pelo WhatsApp
                    </a>
                  </div>
                </div>

                <div className={styles.createModalActions}>
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
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderInfo}>
                  <h3 id="view-ticket-title" style={{ margin: "0 0 4px" }}>{activeTicket.subject}</h3>
                  <div style={{ fontSize: "13px", color: "var(--sp-muted)", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    Categoria: {activeTicket.category_title ?? activeTicket.category_id} · Status: {formatTicketStatus(activeTicket.status)}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.closeIconButton}
                  aria-label="Fechar modal"
                  onClick={() => setActiveTicket(null)}
                >
                  ✕
                </button>
              </div>

              {/* Informações Iniciais do Chamado */}
              <div className={styles.initialDescriptionBox}>
                <div style={{ fontWeight: 600, marginBottom: "4px", color: "var(--sp-ink)" }}>Descrição da Solicitação:</div>
                <div className={styles.descriptionText}>{activeTicket.description}</div>
                {activeTicket.contact_channel && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--sp-muted)", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    <strong>Canal de contato preferencial:</strong> {activeTicket.contact_channel}
                  </div>
                )}
                {activeTicket.attachment_url && (
                  <div className={styles.messageAttachment} style={{ marginTop: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                      📎 Evidência anexada na abertura:
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeTicket.attachment_url}
                      alt="Evidência anexada na abertura"
                      onClick={() => setLightboxImage(activeTicket.attachment_url)}
                    />
                  </div>
                )}
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
                        {isTenant ? "Você (Barbearia)" : "Equipe de Suporte BarbeariaSP"}
                      </div>
                      <div className={styles.descriptionText}>{m.message}</div>
                      {m.attachment_url && (
                        <div className={styles.messageAttachment}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.attachment_url}
                            alt="Evidência anexada na mensagem"
                            onClick={() => setLightboxImage(m.attachment_url)}
                          />
                        </div>
                      )}
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
                      name="reply_message"
                      rows={3}
                      className={styles.formTextarea}
                      placeholder="Escreva sua resposta…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                  </div>

                  <div style={{ marginTop: "8px", marginBottom: "12px" }}>
                    <label htmlFor="reply-file-input" style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                      📎 Anexar print de evidência nesta resposta (opcional):
                    </label>
                    <input
                      id="reply-file-input"
                      name="reply_attachment"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        void handleFileSelect(file, true);
                      }}
                    />
                    {replyAttachmentPreview && replyCompressedInfo && (
                      <div className={styles.attachmentPreview}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={replyAttachmentPreview} alt="Prévia do anexo da resposta" className={styles.attachmentThumb} />
                        <div className={styles.attachmentInfo}>
                          <span>{replyAttachmentFile?.name}</span>
                          <small>Original: {replyCompressedInfo.origKb} KB → Comprimido: {replyCompressedInfo.compKb} KB (WebP)</small>
                        </div>
                        <button
                          type="button"
                          className={styles.removeAttachmentBtn}
                          onClick={() => void handleFileSelect(null, true)}
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>

                  {activeTicketWhatsAppLink && (
                    <div className={styles.whatsappAux} style={{ marginBottom: "14px" }}>
                      <span>Prefere enviar prints ou vídeos por WhatsApp?</span>
                      <a
                        href={activeTicketWhatsAppLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.whatsappLinkBtn}
                      >
                        📱 Enviar Evidências via WhatsApp
                      </a>
                    </div>
                  )}

                  <div className={styles.ticketModalActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => void handleResolveTicket()}
                      disabled={statusUpdating}
                    >
                      {statusUpdating ? "Atualizando…" : "✓ Marcar como Resolvido"}
                    </button>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={replySubmitting || (!replyText.trim() && !replyAttachmentFile)}
                    >
                      {replySubmitting ? "Enviando…" : "Enviar Resposta"}
                    </button>
                  </div>
                </form>
              )}

              {(activeTicket.status === "resolved" || activeTicket.status === "closed") && (
                <div className={styles.resolutionNotice}>
                  <strong>✓ Chamado {activeTicket.status === "closed" ? "Encerrado" : "Resolvido"}</strong>
                  {activeTicket.resolution_summary ? (
                    <p style={{ margin: "4px 0 0" }}>
                      <strong>Resumo da Resolução:</strong> {activeTicket.resolution_summary}
                    </p>
                  ) : (
                    <p style={{ margin: "4px 0 0" }}>Este atendimento foi concluído com sucesso pela equipe de suporte.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Zoom Lightbox para Imagens de Evidência */}
        {lightboxImage && (
          <div
            className={styles.lightboxOverlay}
            onClick={() => setLightboxImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Visualização em tamanho real do anexo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Evidência em tamanho real"
              className={styles.lightboxImage}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </PanelShell>
  );
}
