import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/subscription-plan-change/route.ts';
import { activeRecurringOrders, oneTimePurchaseKind } from '../utils/subscription-purchase-kind.ts';

test('quarterly cannot become an automatically scheduled recurring plan', async () => {
 const before=process.env.NODE_ENV, flag=process.env.BILLING_SANDBOX_ENABLED;
 const originalFetch=globalThis.fetch; let requested=false;
 try {
  process.env.NODE_ENV='development';process.env.BILLING_SANDBOX_ENABLED='true';
  globalThis.fetch=async()=>{requested=true;throw new Error('provider must not be called');};
  const response=await POST(new Request('http://localhost/api/subscription-plan-change',{method:'POST',headers:{authorization:'Bearer test-token','content-type':'application/json'},body:JSON.stringify({planCode:'simple-trimestral'})}));
  assert.equal(response.status,409);assert.match((await response.json()).error,/nova compra/i);assert.equal(requested,false);
 } finally {
  globalThis.fetch=originalFetch;
  if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;
  if(flag===undefined)delete process.env.BILLING_SANDBOX_ENABLED;else process.env.BILLING_SANDBOX_ENABLED=flag;
 }
});

test('one-off quarterly is distinguishable from historical recurring contracts',()=>{
 assert.equal(oneTimePurchaseKind({months:3,billing_mode:'ONE_TIME'}),'quarterly_purchase');
 assert.equal(oneTimePurchaseKind({months:3,billing_mode:'CARD_RECURRING'}),null);
 assert.equal(oneTimePurchaseKind({months:3,billing_mode:'ONE_TIME',provider_subscription_id:'sub_old'}),null);
 assert.equal(oneTimePurchaseKind({months:1,billing_mode:'CARD_RECURRING'}),null);
 assert.equal(oneTimePurchaseKind({months:12,billing_mode:'ONE_TIME'}),'annual_purchase');
});

test('cancelled monthly history does not mask a newer quarterly purchase',()=>{
 const orders=[{status:'CONFIRMED',months:3,billing_mode:'ONE_TIME'}, {status:'CONFIRMED',months:1,billing_mode:'CARD_RECURRING',recurring_state:'CANCELED',provider_subscription_id:'sub_old'}];
 assert.deepEqual(activeRecurringOrders(orders),[]);
 assert.equal(oneTimePurchaseKind(orders[0]),'quarterly_purchase');
 assert.equal(activeRecurringOrders([{...orders[1],recurring_state:'ACTIVE'}]).length,1);
});
