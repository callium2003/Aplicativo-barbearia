import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.97.0';
import { handleAsaasSandboxWebhook } from '../../../utils/asaas-webhook-handler.mjs';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
  const token = Deno.env.get('ASAAS_SANDBOX_WEBHOOK_TOKEN');
  const account = Deno.env.get('ASAAS_SANDBOX_ACCOUNT_ID');
  const bootstrap = !account && Deno.env.get('ASAAS_SANDBOX_BOOTSTRAP') === 'true'
    ? async (id: string) => { console.info('asaas_sandbox_account_id', id); }
    : undefined;
  return handleAsaasSandboxWebhook(request, {
    enabled: Deno.env.get('ASAAS_SANDBOX_WEBHOOK_ENABLED') === 'true', token, account, bootstrap,
    persist: async (fields: Record<string, string>) => {
      const url = Deno.env.get('SUPABASE_URL');
      const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) throw new Error('Unavailable');
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await client.rpc('persist_asaas_checkout_event', fields);
      if (result.error || typeof result.data !== 'boolean') throw new Error('Persistence failed');
      return result.data;
    },
    persistRecurring: async (fields: Record<string, string>) => {
      const url = Deno.env.get('SUPABASE_URL');
      const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) throw new Error('Unavailable');
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await client.rpc('persist_asaas_recurring_subscription_event', fields);
      if (result.error || typeof result.data !== 'boolean') throw new Error('Persistence failed');
      return result.data;
    },
  });
});
