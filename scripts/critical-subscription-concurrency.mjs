import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

/** Runs on the freshly-created runner database only; no remote connection or env. */
export async function checkSubscriptionConcurrency(container) {
 if (!/^supabase_db_barbeariasp-critical-[a-f0-9]{12}$/.test(container)) throw new Error('Isolated container required');
 const query = source => new Promise((resolve, reject) => {
  const child = spawn('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});
  let output=''; let errors='';
  child.stdout.on('data', chunk => { output+=chunk; });
  child.stderr.on('data', chunk => { errors+=chunk; });
  child.on('error',reject);
  child.on('exit',code=>code===0?resolve(output):reject(new Error(errors.includes('Reconciliation lease unavailable')?'lease_unavailable':'isolated_query_failed')));
  child.stdin.end(source);
 });
 const user=randomUUID(),shop=randomUUID(),order=randomUUID();
 await query(`begin;
 insert into auth.users(id,aud,role,email,created_at,updated_at) values('${user}','authenticated','authenticated','concurrency-${user}@example.test',now(),now());
 insert into public.barbershops(id,owner_id,name,slug,active) values('${shop}','${user}','Concurrency fixture','concurrency-${shop}',true);
 insert into public.subscription_orders(id,barbershop_id,requester_id,idempotency_key,plan_code,plan_name,months,price_cents,max_installments,user_limit,terms_version)
 values('${order}','${shop}','${user}',gen_random_uuid(),'simple-anual','Simple',12,49900,3,3,'fixture');
 select public.bind_subscription_sandbox_account('${order}','${user}','concurrent_account');
 select public.claim_subscription_checkout('${order}','${user}');
 select public.finish_subscription_checkout('${order}','READY','checkout_${order}','https://sandbox.asaas.com/000/checkoutSession/show/checkout_${order}');
 commit;`);
 const claims=await Promise.all([query("select public.claim_subscription_reconciliation('concurrent_account');"),query("select public.claim_subscription_reconciliation('concurrent_account');")]);
 const jobs=claims.map(s=>s.trim()).filter(Boolean).map(s=>JSON.parse(s));
 if(jobs.length!==1)throw new Error('Concurrent claims were not exclusive');
 const job=jobs[0];
 const evidence=JSON.stringify([{id:`pay_${order}`,checkoutId:`checkout_${order}`,status:'CONFIRMED',billingType:'CREDIT_CARD',valueCents:49900,installment:null,installmentNumber:null}]);
 const finish=`select public.finish_subscription_reconciliation('${order}','${job.lease}','concurrent_account','CONFIRMED','${evidence}'::jsonb);`;
 const results=await Promise.allSettled([query(finish),query(finish)]);
 if(results.filter(r=>r.status==='fulfilled'&&r.value.trim()==='CONFIRMED').length!==1
  || results.filter(r=>r.status==='rejected'&&r.reason.message==='lease_unavailable').length!==1) throw new Error('Concurrent finish was not fenced');
 const verified=await query(`select count(*)=1 and min(ends_at)=max(ends_at) from public.subscription_paid_periods where order_id='${order}';`);
 if(verified.trim()!=='t')throw new Error('Concurrent processing duplicated period');
}
