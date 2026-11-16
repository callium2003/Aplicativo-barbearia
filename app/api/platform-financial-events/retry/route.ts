import { createAsaasClient } from '../../../../utils/asaas-client.mjs';
import { reconcileAsaasFinancialEvent } from '../../../../utils/asaas-financial-adjustments.mjs';
import { resolveAsaasBillingConfig, sandboxBillingEnabled, verifiedSandboxClients } from '../../../../utils/billing-sandbox-server.ts';

export const dynamic = 'force-dynamic';
const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
export async function POST(request: Request) {
  if (!sandboxBillingEnabled()) return reply({ error: 'Indisponível' }, 404);
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get('authorization') || '')?.[1];
  if (!token) return reply({ error: 'Entre novamente.' }, 401);
  try {
    const clients = await verifiedSandboxClients(token);
    if (!clients) return reply({ error: 'Entre novamente.' }, 401);
    const permission = await clients.userClient.rpc('list_platform_financial_events', { p_limit: 1, p_offset: 0 });
    if (permission.error?.code === '42501') return reply({ error: 'Acesso interno não autorizado.' }, 403);
    if (permission.error) throw new Error('Permission lookup failed');
    const config = resolveAsaasBillingConfig();
    if (!config.account || !config.apiKey) throw new Error('Unavailable');
    const pending = await clients.adminClient.rpc('list_pending_asaas_financial_events', { p_environment: config.environment, p_account: config.account });
    if (pending.error || !Array.isArray(pending.data)) throw new Error('Pending lookup failed');
    const client = createAsaasClient({ environment: config.environment, apiKey: config.apiKey, timeoutMs: 4000 });
    let processed = 0;
    let failed = 0;
    for (const event of pending.data.slice(0, 5)) {
      try {
        await reconcileAsaasFinancialEvent({ p_event_id: event.event_id, p_event_type: event.event_type,
          p_payment_id: event.payment_id, p_external_reference: event.external_reference, p_recovery_only: false },
        { environment: config.environment, account: config.account, admin: clients.adminClient, client });
        processed++;
      } catch { failed++; }
    }
    return reply({ processed, failed });
  } catch { return reply({ error: 'Não foi possível reprocessar as ocorrências agora.' }, 503); }
}
