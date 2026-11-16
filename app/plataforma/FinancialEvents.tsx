'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import styles from './financial.module.css';

type Snapshot = { refundedCents: number; pendingRefundCents: number; chargebackStatus: string | null };
type Occurrence = {
  id: number; environment: string; event_type: string; payment_id: string; state: string; review_code: string | null;
  created_at: string; barbershop_name: string | null; snapshot: Snapshot | null;
  amount_cents: number | null; refunded_cents: number | null; pending_refund_cents: number | null; chargeback_status: string | null;
};
const eventLabels: Record<string, string> = {
  PAYMENT_REFUNDED: 'Estorno concluído', PAYMENT_PARTIALLY_REFUNDED: 'Estorno parcial',
  PAYMENT_REFUND_IN_PROGRESS: 'Estorno em processamento', PAYMENT_REFUND_DENIED: 'Estorno negado',
  PAYMENT_CHARGEBACK_REQUESTED: 'Contestação recebida', PAYMENT_CHARGEBACK_DISPUTE: 'Contestação em disputa',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'Aguardando reversão da contestação',
  PAYMENT_CONFIRMED: 'Pagamento confirmado após ocorrência', PAYMENT_RECEIVED: 'Pagamento recebido após ocorrência',
};
const disputeLabels: Record<string, string> = { REQUESTED: 'Solicitada', IN_DISPUTE: 'Em disputa', DISPUTE_LOST: 'Disputa perdida',
  REVERSED: 'Revertida', DONE: 'Concluída' };
const money = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));

export default function FinancialEvents() {
  const [events, setEvents] = useState<Occurrence[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await supabase.rpc('list_platform_financial_events', { p_limit: 20, p_offset: offset });
      if (result.error || !Array.isArray(result.data?.events)) throw new Error('Unavailable');
      setEvents(result.data.events); setTotal(result.data.total); setPending(result.data.pendingCount);
    } catch { setMessage('Não foi possível carregar as ocorrências financeiras. Tente atualizar.'); }
    finally { setBusy(false); }
  }, [offset]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function retry() {
    setBusy(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Unavailable');
      const response = await fetch('/api/platform-financial-events/retry', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Unavailable');
      const result = await response.json();
      await load();
      setMessage(`${result.processed} ocorrência(s) reprocessada(s) no ambiente ativo. ${result.failed} ainda pendente(s).`);
    } catch { setMessage('Não foi possível reprocessar as ocorrências. Os registros foram preservados.'); }
    finally { setBusy(false); }
  }
  return <section className={styles.section} aria-label="Estornos e contestações">
    <div className={styles.header}><div><h2>Estornos e contestações</h2>
      <p>Acompanhamento financeiro por pagamento. {pending > 0 ? `${pending} ocorrência(s) aguardam consulta.` : 'Histórico de ocorrências recebidas.'}</p></div>
      <div className={styles.actions}><button disabled={busy} onClick={() => void load()}>Atualizar ocorrências</button>
        {pending > 0 && <button disabled={busy} onClick={() => void retry()}>Reprocessar pendências</button>}</div></div>
    {message && <p role="status">{message}</p>}
    {busy && <p role="status">Carregando ocorrências…</p>}
    {!busy && events.length === 0 && !message && <p>Nenhum estorno ou contestação registrado.</p>}
    {events.length > 0 && <div className={styles.scroll}><table><thead><tr>
      <th>Recebimento / ambiente</th><th>Barbearia / pagamento</th><th>Ocorrência</th><th>Situação financeira atual</th></tr></thead>
      <tbody>{events.map(event => <tr key={event.id}><td>{date(event.created_at)}<small>{event.environment === 'production' ? 'Produção' : 'Sandbox'}</small></td>
        <td><strong>{event.barbershop_name || 'Vínculo em análise'}</strong><small>{event.payment_id}</small></td>
        <td>{eventLabels[event.event_type] || 'Atualização financeira'}<small>{event.state === 'PENDING' ? 'Aguardando consulta' : event.state === 'REVIEW_REQUIRED' ? 'Requer análise' : 'Registro conciliado'}</small>
          {event.snapshot && <details><summary>Registro desta ocorrência</summary><p>Devolvido: {money(event.snapshot.refundedCents)}<br />Em processamento: {money(event.snapshot.pendingRefundCents)}<br />Contestação: {event.snapshot.chargebackStatus ? disputeLabels[event.snapshot.chargebackStatus] || 'Estado em análise' : 'Sem contestação'}</p></details>}</td>
        <td>Original: {money(event.amount_cents)}<br />Devolvido: {money(event.refunded_cents)}<br />Em processamento: {money(event.pending_refund_cents)}
          <small>Contestação: {event.chargeback_status ? disputeLabels[event.chargeback_status] || 'Estado em análise' : 'Sem contestação'}</small></td></tr>)}</tbody></table></div>}
    {total > 20 && <div className={styles.actions}><button disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Anteriores</button>
      <span>{offset + 1}–{Math.min(offset + 20, total)} de {total}</span><button disabled={busy || offset + 20 >= total} onClick={() => setOffset(offset + 20)}>Próximas</button></div>}
  </section>;
}
