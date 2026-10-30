"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PanelShell from "../../PanelShell";
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
import styles from "../support.module.css";

type FaqCategory = {
  id: string;
  title: string;
  description: string;
  icon: string;
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

export default function MeusChamadosPage() {
  const [shop, setShop] = useState<ShopContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

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
      if (faqData.categories.length > 0) {
        setNewCategoryId(faqData.categories[0].id);
      }
      setTickets(ticketsData.tickets);
    } catch (err) {
      console.error("Erro ao carregar chamados:", err);
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

      const res = await listBarbershopSupportTickets(supabase, shop.id);
      setTickets(res.tickets);
      setIsCreateOpen(false);
      setNewSubject("");
      setNewDescription("");
      setNewPriority("normal");
      setAttachmentFile(null);
      setAttachmentPreview(null);
      setAttachmentCompressedInfo(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir chamado.";
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function openTicketDetails(ticket: SupportTicket) {
    setActiveTicket(ticket);
    setReplyText("");
    setReplyAttachmentFile(null);
    setReplyAttachmentPreview(null);
    setReplyCompressedInfo(null);
    try {
      const msgsRes = await loadPlatformTicketMessages(supabase, ticket.id);
      setMessages(msgsRes.messages);
    } catch (err) {
      console.error("Erro ao carregar mensagens do chamado:", err);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTicket || !shop) return;
    const trimmed = replyText.trim();
    if (!trimmed && !replyAttachmentFile) return;

    setReplySubmitting(true);
    try {
      let uploadedAttachmentUrl: string | null = null;
      if (replyAttachmentFile) {
        uploadedAttachmentUrl = await uploadAttachment(shop.id, replyAttachmentFile);
      }

      await replyPlatformSupportTicket(supabase, {
        ticketId: activeTicket.id,
        message: trimmed || "(anexo enviado)",
        attachmentUrl: uploadedAttachmentUrl,
      });

      setReplyText("");
      setReplyAttachmentFile(null);
      setReplyAttachmentPreview(null);
      setReplyCompressedInfo(null);

      const [msgsRes, updatedList] = await Promise.all([
        loadPlatformTicketMessages(supabase, activeTicket.id),
        listBarbershopSupportTickets(supabase, shop.id),
      ]);
      setMessages(msgsRes.messages);
      setTickets(updatedList.tickets);
      const found = updatedList.tickets.find((t: SupportTicket) => t.id === activeTicket.id);
      if (found) {
        setActiveTicket(found);
      }
    } catch (err) {
      console.error("Erro ao enviar resposta:", err);
    } finally {
      setReplySubmitting(false);
    }
  }

  async function handleCloseTicket() {
    if (!activeTicket || !shop) return;
    if (!confirm("Deseja realmente marcar este chamado como concluído?")) return;

    setStatusUpdating(true);
    try {
      await updatePlatformSupportTicketStatus(supabase, {
        ticketId: activeTicket.id,
        status: "resolved",
      });

      const updatedList = await listBarbershopSupportTickets(supabase, shop.id);
      setTickets(updatedList.tickets);
      const found = updatedList.tickets.find((t: SupportTicket) => t.id === activeTicket.id);
      if (found) {
        setActiveTicket(found);
      }
    } catch (err) {
      console.error("Erro ao encerrar chamado:", err);
    } finally {
      setStatusUpdating(false);
    }
  }

  const openTicketsCount = useMemo(() => {
    return tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_client").length;
  }, [tickets]);

  if (loading) {
    return (
      <main className="product-shell">
        <div className="product-content">
          <p className="product-message">Carregando chamados…</p>
        </div>
      </main>
    );
  }

  return (
    <PanelShell
      role={shop?.role ?? "owner"}
      active="more"
      shopName={shop?.name}
      barbershopId={shop?.id}
      mobileBackHref="/painel/mais"
      mobileBackLabel="Mais"
      mobileTitle="Meus Chamados"
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
            className={styles.tabButton}
          >
            <div className={styles.tabTitleGroup}>
              <span className={styles.tabBullet} aria-hidden="true" />
              <span className={styles.tabText}>Perguntas Frequentes (FAQ)</span>
            </div>
          </Link>
          <Link
            prefetch={false}
            href="/painel/suporte/chamados"
            className={`${styles.tabButton} ${styles.tabButtonActive}`}
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

        {/* Modal: Abertura de Chamado */}
        {isCreateOpen && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="modal-create-title">
              <div className={styles.modalHeader}>
                <h3 id="modal-create-title">Novo Chamado de Suporte</h3>
                <button
                  type="button"
                  className={styles.closeIconButton}
                  onClick={() => setIsCreateOpen(false)}
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className={styles.slaBanner}>
                <span className={styles.slaIcon}>⚡</span>
                <div>
                  <strong>SLA Garantido: Primeira resposta em até 1 dia útil.</strong>
                  <p>Nossa equipe técnica atende de segunda a sexta-feira, das 09h às 18h.</p>
                </div>
              </div>

              <div className={styles.whatsappAux}>
                <div>
                  <strong>Prefere adiantar prints pelo WhatsApp?</strong>
                  <p>Abra o chamado aqui para registrar o protocolo e use o link abaixo para enviar imagens direto no zap do suporte.</p>
                </div>
                <a
                  href={createWhatsAppLink}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.whatsappLinkBtn}
                >
                  <span>💬</span> Enviar Evidências no WhatsApp
                </a>
              </div>

              {createError && <div className={styles.errorMessage}>{createError}</div>}

              <form onSubmit={(e) => void handleCreateTicket(e)}>
                <div className={styles.formGroup}>
                  <label htmlFor="ticket-category">Categoria do Problema</label>
                  <select
                    id="ticket-category"
                    name="ticket_category"
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
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    <option value="low">Baixa — Dúvida ou sugestão não bloqueante</option>
                    <option value="normal">Normal — Funcionamento parcial ou lentidão</option>
                    <option value="urgent">Urgente — Operação de agendamentos interrompida</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ticket-subject">Assunto Resumido</label>
                  <input
                    id="ticket-subject"
                    name="ticket_subject"
                    type="text"
                    required
                    minLength={5}
                    maxLength={120}
                    placeholder="Ex: Não consigo alterar o horário do profissional"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ticket-desc">Descrição Detalhada do Problema</label>
                  <textarea
                    id="ticket-desc"
                    name="ticket_description"
                    required
                    minLength={10}
                    rows={4}
                    placeholder="Descreva o que aconteceu, qual mensagem apareceu e os passos para reproduzir…"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ticket-contact">Canal de Contato Preferencial (Opcional)</label>
                  <input
                    id="ticket-contact"
                    name="ticket_contact_channel"
                    type="text"
                    placeholder="E-mail ou WhatsApp para contato direto"
                    value={newContactChannel}
                    onChange={(e) => setNewContactChannel(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ticket-attachment">Anexar Print ou Evidência (Opcional)</label>
                  <p className={styles.attachmentHint}>
                    Imagens são automaticamente otimizadas em WebP para economizar espaço e carregar instantaneamente.
                  </p>
                  <input
                    id="ticket-attachment"
                    name="ticket_attachment"
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleFileSelect(e.target.files?.[0] || null, false)}
                  />
                  {attachmentPreview && (
                    <div className={styles.previewContainer}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachmentPreview}
                        alt="Pré-visualização do anexo"
                        className={styles.previewThumbnail}
                        onClick={() => setLightboxImage(attachmentPreview)}
                      />
                      <div className={styles.previewInfo}>
                        <span>Preview da evidência (toque para ampliar)</span>
                        {attachmentCompressedInfo && (
                          <small>
                            Otimizado: {attachmentCompressedInfo.origKb} KB → {attachmentCompressedInfo.compKb} KB (economia de {Math.max(0, Math.round((1 - attachmentCompressedInfo.compKb / attachmentCompressedInfo.origKb) * 100))}%)
                          </small>
                        )}
                        <button
                          type="button"
                          className={styles.removeAttachmentBtn}
                          onClick={() => void handleFileSelect(null, false)}
                        >
                          Remover anexo
                        </button>
                      </div>
                    </div>
                  )}
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
                    {createSubmitting ? "Registrando Chamado…" : "Abrir Chamado"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Detalhes e Conversa do Chamado */}
        {activeTicket && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="modal-ticket-title">
              <div className={styles.modalHeader}>
                <div>
                  <div className={styles.modalHeaderInfo}>
                    <span className={styles.protocolBadge}>#{activeTicket.id.slice(0, 8).toUpperCase()}</span>
                    <span className={styles.categoryBadge}>{activeTicket.category_title ?? activeTicket.category_id}</span>
                  </div>
                  <h3 id="modal-ticket-title">{activeTicket.subject}</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeIconButton}
                  onClick={() => setActiveTicket(null)}
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className={styles.statusBar}>
                <span>Status atual: <strong>{formatTicketStatus(activeTicket.status)}</strong></span>
                <span>Prioridade: <strong>{formatTicketPriority(activeTicket.priority)}</strong></span>
              </div>

              {activeTicketWhatsAppLink && (
                <div className={styles.whatsappAuxCompact}>
                  <span>Tem mais prints ou evidências?</span>
                  <a
                    href={activeTicketWhatsAppLink}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.whatsappLinkBtnSmall}
                  >
                    <span>💬</span> Enviar no WhatsApp deste chamado
                  </a>
                </div>
              )}

              <div className={styles.initialDescriptionBox}>
                <strong>Descrição da Solicitação:</strong>
                <p className={styles.descriptionText}>{activeTicket.description}</p>
                {activeTicket.contact_channel && (
                  <p className={styles.contactChannelNote}>
                    Canal de contato preferencial informado: {activeTicket.contact_channel}
                  </p>
                )}
                {activeTicket.attachment_url && (
                  <div className={styles.initialAttachment}>
                    <span>📎 Evidência anexada na abertura:</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeTicket.attachment_url}
                      alt="Anexo da solicitação"
                      className={styles.messageThumbnail}
                      onClick={() => setLightboxImage(activeTicket.attachment_url)}
                    />
                  </div>
                )}
              </div>

              <div className={styles.conversationWrap}>
                <h4>Histórico de Mensagens ({messages.length})</h4>

                <div className={styles.messagesList}>
                  {messages.length === 0 ? (
                    <p className={styles.noMessagesText}>
                      Ainda não há respostas para este chamado. Nossa equipe técnica responderá dentro do SLA de 1 dia útil.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isTenant = m.sender_type === "tenant";
                      return (
                        <div
                          key={m.id}
                          className={`${styles.messageBubble} ${isTenant ? styles.messageTenant : styles.messagePlatform}`}
                        >
                          <div className={styles.messageHeader}>
                            <strong>{isTenant ? "Você (Barbearia)" : "Equipe de Suporte BarbeariaSP"}</strong>
                            <small>
                              {new Intl.DateTimeFormat("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                                timeZone: "America/Sao_Paulo",
                              }).format(new Date(m.created_at))}
                            </small>
                          </div>
                          <p className={styles.descriptionText}>{m.message}</p>
                          {m.attachment_url && (
                            <div className={styles.messageAttachment}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={m.attachment_url}
                                alt="Anexo da mensagem"
                                className={styles.messageThumbnail}
                                onClick={() => setLightboxImage(m.attachment_url)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {activeTicket.status !== "resolved" && activeTicket.status !== "closed" ? (
                  <form onSubmit={(e) => void handleSendReply(e)} className={styles.replyForm}>
                    <label htmlFor="reply-message" className={styles.replyLabel}>Nova resposta para o suporte:</label>
                    <textarea
                      id="reply-message"
                      name="reply_message"
                      rows={3}
                      placeholder="Escreva sua mensagem ou complemente as informações solicitadas…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />

                    <div className={styles.replyAttachmentRow}>
                      <label htmlFor="reply-file-input" className={styles.replyAttachButton}>
                        📎 Anexar print de tela
                      </label>
                      <input
                        id="reply-file-input"
                        name="reply_file_input"
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => void handleFileSelect(e.target.files?.[0] || null, true)}
                      />
                      {replyAttachmentPreview && (
                        <div className={styles.replyPreviewPill}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={replyAttachmentPreview}
                            alt="Prévia"
                            onClick={() => setLightboxImage(replyAttachmentPreview)}
                          />
                          <span>Imagem pronta</span>
                          {replyCompressedInfo && (
                            <small>({replyCompressedInfo.compKb} KB)</small>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleFileSelect(null, true)}
                            aria-label="Remover print"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={styles.ticketModalActions}>
                      <button
                        type="button"
                        className={styles.resolveButton}
                        onClick={() => void handleCloseTicket()}
                        disabled={statusUpdating}
                      >
                        ✓ Marcar como Concluído
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
                ) : (
                  <div className={styles.resolutionNotice}>
                    <strong>✓ Chamado Finalizado</strong>
                    <p>{activeTicket.resolution_summary || "Este chamado foi marcado como concluído."}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lightbox para visualização de imagem em tamanho real */}
        {lightboxImage && (
          <div className={styles.lightboxOverlay} onClick={() => setLightboxImage(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxImage} alt="Evidência ampliada" className={styles.lightboxImage} />
          </div>
        )}
      </div>
    </PanelShell>
  );
}
