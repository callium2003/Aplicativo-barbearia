// Verificação read-only do cenário fictício no stack demo exclusivo.
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { requireLocalDemoUrl } from './landing-demo-guard.mjs';
const fixture = JSON.parse(await readFile('.tmp/landing-demo/sessions.json', 'utf8'));
requireLocalDemoUrl(fixture.url);
const owner = createClient(fixture.url, fixture.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
await owner.auth.setSession(fixture.sessions.gestao);
const services = await owner.from('services').select('id,name').eq('barbershop_id', fixture.shop.id);
if (services.error) throw new Error(services.error.message);
const date = new Date(`${fixture.today}T12:00:00-03:00`); date.setUTCDate(date.getUTCDate() + 1);
const response = await fetch(`${fixture.url}/functions/v1/public-booking-gateway`, {
  method: 'POST', headers: { 'content-type': 'application/json', apikey: fixture.anonKey, Authorization: `Bearer ${fixture.anonKey}` },
  body: JSON.stringify({ action: 'availability', args: { p_slug: fixture.shop.slug, p_date: date.toISOString().slice(0, 10), p_service_ids: [services.data.find(s => s.name === 'Corte masculino').id] } }),
});
const result = await response.json();
if (!response.ok || !Array.isArray(result.data) || result.data.length === 0) throw new Error(`DEMO: disponibilidade local falhou (${response.status}, ${result.error ?? result.code ?? 'sem horários'}).`);
console.log(JSON.stringify({ demoOnly: true, availabilityHttpStatus: response.status, availableSlots: result.data.length }));
