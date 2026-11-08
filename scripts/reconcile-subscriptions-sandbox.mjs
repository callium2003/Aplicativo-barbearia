// Execute one bounded batch from a trusted host; schedule only after operational approval.
// Load secrets externally, e.g. node --use-system-ca --env-file=<private file> <script>.
import { createClient } from '@supabase/supabase-js';
import { createAsaasClient } from '../utils/asaas-client.mjs';
import { requireSandboxDatabaseTarget } from '../utils/billing-sandbox-target.mjs';
import { reconcileSandboxOrder } from '../utils/subscription-reconciliation-worker.mjs';

async function main() {
 if (process.env.BILLING_SANDBOX_ENABLED !== 'true' || process.env.NODE_ENV === 'production') throw new Error('Sandbox disabled');
 const url = requireSandboxDatabaseTarget(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.BILLING_SANDBOX_SHARED_TEST_ENABLED === 'true');
 const account = process.env.ASAAS_SANDBOX_ACCOUNT_ID;
 const apiKey = process.env.ASAAS_SANDBOX_API_KEY;
 const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!account || !/^[A-Za-z0-9_-]{1,128}$/.test(account) || !apiKey || !serviceKey) throw new Error('Missing sandbox configuration');
 const admin = createClient(url, serviceKey, { auth: { persistSession:false, autoRefreshToken:false } });
 const client = createAsaasClient({ environment:'sandbox', apiKey });
 const finish = async ({ orderId, lease, account, outcome, payments }) => {
  const result = await admin.rpc('finish_subscription_reconciliation', { p_order_id:orderId,p_token:lease,p_account:account,p_outcome:outcome,p_payments:payments });
  if (result.error || !['CONFIRMED','RETRY','REVIEW_REQUIRED'].includes(result.data)) throw new Error('Reconciliation transaction failed');
  return result.data;
 };
 for (let count=0; count<10; count++) {
  const claimed = await admin.rpc('claim_subscription_reconciliation', { p_account:account });
  if (claimed.error) throw new Error('Reconciliation claim failed');
  if (claimed.data === null) break;
  const outcome = await reconcileSandboxOrder(claimed.data, { client, account, finish });
  console.log(`Sandbox reconciliation: ${outcome}`);
 }
}
main().catch(() => { console.error('Sandbox reconciliation failed; inspect configuration or retry after the lease expires.'); process.exitCode=1; });
