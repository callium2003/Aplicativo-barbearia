// Execute one bounded batch from a trusted host; schedule only after operational approval.
// Load secrets externally, e.g. node --use-system-ca --env-file=<private file> <script>.
import { createClient } from '@supabase/supabase-js';
import { createAsaasClient } from '../utils/asaas-client.mjs';
import { requireSandboxDatabaseTarget } from '../utils/billing-sandbox-target.mjs';
import { reconcileSandboxOrder } from '../utils/subscription-reconciliation-worker.mjs';
import { reconcilePixAutomaticPayment } from '../utils/subscription-pix-automatic-reconciliation.mjs';

async function main() {
 if (process.env.BILLING_SANDBOX_ENABLED !== 'true' || process.env.NODE_ENV === 'production') throw new Error('Sandbox disabled');
 const url = requireSandboxDatabaseTarget(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.BILLING_SANDBOX_SHARED_TEST_ENABLED === 'true');
 const account = process.env.ASAAS_SANDBOX_ACCOUNT_ID;
 const apiKey = process.env.ASAAS_SANDBOX_API_KEY;
 const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!account || !/^[A-Za-z0-9_-]{1,128}$/.test(account) || !apiKey || !serviceKey) throw new Error('Missing sandbox configuration');
 const admin = createClient(url, serviceKey, { auth: { persistSession:false, autoRefreshToken:false } });
 const client = createAsaasClient({ environment:'sandbox', apiKey });
 const finish = async ({ orderId, lease, account, outcome, payments, subscriptionId }) => {
  const result = await admin.rpc('finish_subscription_reconciliation', { p_order_id:orderId,p_token:lease,p_account:account,p_outcome:outcome,p_payments:payments });
  if (result.error || !['CONFIRMED','RETRY','REVIEW_REQUIRED'].includes(result.data)) throw new Error('Reconciliation transaction failed');
  if (outcome === 'CONFIRMED' && subscriptionId) {
    try {
      await admin.rpc('persist_asaas_recurring_subscription_event', {
        p_account: account,
        p_event_id: `evt_sub_${subscriptionId}_${payments[0]?.id || 'init'}`,
        p_event_type: 'SUBSCRIPTION_CREATED',
        p_subscription_id: subscriptionId,
        p_pix_authorization_id: null,
        p_payment_id: payments[0]?.id || null,
        p_external_reference: orderId,
        p_resource_status: 'ACTIVE',
      });
    } catch {
      // Event persistence is secondary to the confirmed financial transaction.
    }
  }
  return result.data;
 };
 for (let count=0; count<10; count++) {
  const claimed = await admin.rpc('claim_subscription_reconciliation', { p_account:account });
  if (claimed.error) throw new Error('Reconciliation claim failed');
  if (claimed.data === null) break;
  if (claimed.data.months === undefined) {
    const { data: orderRow } = await admin.from('subscription_orders').select('months,billing_mode').eq('id', claimed.data.id).single();
    if (orderRow) {
      claimed.data.months = orderRow.months;
      claimed.data.billingMode = orderRow.billing_mode;
    }
  }
  const outcome = await reconcileSandboxOrder(claimed.data, { client, account, finish });
  console.log(`Sandbox reconciliation: ${outcome}`);
 }
 for (let count=0; count<10; count++) {
  const claimed = await admin.rpc('claim_pix_automatic_reconciliation', { p_account:account });
  if (claimed.error) throw new Error('Pix Automatic reconciliation claim failed');
  if (claimed.data === null) break;
  const outcome = await reconcilePixAutomaticPayment(claimed.data, { client, finish: async ({ outcome, payment }) => {
   const result = await admin.rpc('finish_pix_automatic_reconciliation', { p_order_id:claimed.data.orderId,p_account:account,p_payment:{ ...payment, eventId: claimed.data.eventId, lease: claimed.data.lease },p_outcome:outcome });
   if (result.error || !['CONFIRMED','RETRY','REVIEW_REQUIRED'].includes(result.data)) throw new Error('Pix Automatic reconciliation transaction failed');
   return result.data;
  } });
  console.log(`Sandbox Pix Automatic reconciliation: ${outcome}`);
 }
}
main().catch(() => { console.error('Sandbox reconciliation failed; inspect configuration or retry after the lease expires.'); process.exitCode=1; });
