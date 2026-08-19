"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  event_type: string;
  read_at: string | null;
  created_at: string;
};

type Props = { settingsHref?: string };

function relativeTime(value: string, nowMs: number) {
  const diffMinutes = Math.max(0, Math.round((nowMs - new Date(value).getTime()) / 60000));
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default function NotificationBell({ settingsHref }: Props) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("user_notifications")
      .select("id,title,body,event_type,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setItems((data || []) as NotificationRow[]);
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_notifications", filter: `recipient_user_id=eq.${userId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, userId]);

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  useEffect(() => {
    if (!open) return;
    const closeWhenClickingOutside = (event: MouseEvent | TouchEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeWhenClickingOutside);
    document.addEventListener("touchstart", closeWhenClickingOutside, { passive: true });
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenClickingOutside);
      document.removeEventListener("touchstart", closeWhenClickingOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function markRead(id: string) {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
    await supabase.from("user_notifications").update({ read_at: now }).eq("id", id);
  }

  async function markAllRead() {
    const unreadIds = items.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
    await supabase.from("user_notifications").update({ read_at: now }).in("id", unreadIds);
  }

  return <div className="notification-bell-wrap" ref={popoverRef}>
    <button className="notification-bell" type="button" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`} onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">🔔</span>
      {unread > 0 && <span className="notification-badge">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className="notification-popover" role="dialog" aria-label="Central de notificações">
      <div className="notification-popover-head">
        <div><strong>Notificações</strong><small>{unread ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Tudo em dia"}</small></div>
        {unread > 0 && <button type="button" onClick={() => void markAllRead()}>Marcar todas</button>}
      </div>
      <div className="notification-list">
        {items.map((item) => <button className="notification-item" data-unread={!item.read_at ? "true" : "false"} type="button" key={item.id} onClick={() => void markRead(item.id)}>
          <span className="notification-dot" aria-hidden="true" />
          <span><strong>{item.title}</strong><span>{item.body}</span><small>{relativeTime(item.created_at, nowMs)}</small></span>
        </button>)}
        {!items.length && <div className="notification-empty">Nenhuma notificação ainda.</div>}
      </div>
      {settingsHref && <Link className="notification-settings-link" href={settingsHref}>Configurar notificações</Link>}
    </div>}
  </div>;
}
