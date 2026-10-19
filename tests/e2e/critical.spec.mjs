import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { requireCriticalTarget } from '../../scripts/critical-test-environment.mjs';

const url = requireCriticalTarget(process.env.CRITICAL_API_URL);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.CRITICAL_SERVICE_KEY, options);
let fixture;
function checked(result, operation) {
  if (result.error) throw new Error(`Fixture local: ${operation}: ${result.error.message}`);
  return result.data;
}
async function identity(kind, phone) {
  const email = `${kind}@critical.example.test`;
  const password = randomBytes(24).toString('hex');
  const user = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: `Teste ${kind}` } }), 'criar identidade').user;
  const client = createClient(url, process.env.CRITICAL_ANON_KEY, options);
  // Sessão de preparação via API, sem consumir o link que o navegador solicitará.
  checked(await client.auth.signInWithPassword({ email, password }), 'iniciar sessão de fixture');
  if (phone) checked(await client.rpc('save_my_customer_profile', { p_name: `Teste ${kind}`, p_phone: phone }), 'cadastrar Cliente');
  return { email, id: user.id, client };
}
async function login(page, user, destination = '/entrar') {
  await page.goto(destination);
  await page.locator('input[type="email"]').fill(user.email);
  await page.getByRole('button', { name: 'Receber link de acesso', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Enviamos');
  let html = '';
  await expect.poll(async () => {
    const response = await fetch(`http://127.0.0.1:56324/view/latest.html?query=${encodeURIComponent(`to:${user.email}`)}`);
    if (!response.ok) return false;
    html = await response.text();
    return true;
  }).toBe(true);
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(match => match[1].replaceAll('&amp;', '&'));
  const href = links.find(value => value.startsWith(`${url}/auth/v1/verify?`));
  if (!href) throw new Error('Mensagem capturada não contém link do Auth local.');
  const link = new URL(href);
  if (link.origin !== url) throw new Error('Link de autenticação fora do stack isolado.');
  // O formulário cria o verifier PKCE da Gestão; o Cliente mantém seu fluxo próprio.
  // Mailpit captura SMTP no stack descartável: sem sessão injetada ou e-mail externo.
  try { await page.goto(link.href); }
  catch { throw new Error('Não foi possível abrir o callback do Auth local.'); }
  // Uma falha posterior de navegação não deve imprimir tokens locais no relatório.
  await expect.poll(() => {
    const current = new URL(page.url());
    return current.hash.includes('access_token=') || current.searchParams.has('code');
  }).toBe(false);
}

test.beforeAll(async () => {
  const owner = await identity('owner');
  const customer = await identity('customer', '11900002001');
  const invited = await identity('invited');
  const shop = checked(await owner.client.from('barbershops').insert({ owner_id: owner.id, name: 'Barbearia Critical', slug: 'critical-e2e', initial_registration_completed: true }).select('id,slug').single(), 'criar barbearia');
  const service = checked(await owner.client.from('services').insert({ barbershop_id: shop.id, name: 'Corte de teste', price: 30, duration_minutes: 30 }).select('id').single(), 'criar serviço');
  const professional = checked(await owner.client.from('professionals').insert({ barbershop_id: shop.id, name: 'Profissional de teste' }).select('id').single(), 'criar profissional');
  const hours = Array.from({ length: 7 }, (_, weekday) => ({ weekday, opens_at: '08:00', closes_at: '20:00', is_closed: false }));
  checked(await owner.client.from('business_hours').upsert(hours.map(day => ({ ...day, barbershop_id: shop.id })), { onConflict: 'barbershop_id,weekday' }), 'configurar horários');
  checked(await owner.client.from('professional_hours').upsert(hours.map(day => ({ ...day, professional_id: professional.id })), { onConflict: 'professional_id,weekday' }), 'configurar profissional');
  const token = checked(await owner.client.rpc('create_team_invitation', { p_barbershop_id: shop.id, p_email: invited.email, p_role: 'manager', p_professional_id: null }), 'criar convite');
  fixture = { owner, customer, invited, shop, service, professional, token };
  await expect.poll(async () => {
    try {
      const response = await fetch(`${url}/functions/v1/public-booking-gateway`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: process.env.CRITICAL_ANON_KEY }, body: JSON.stringify({ action: 'booking_status', args: { p_slug: shop.slug } }) });
      return response.status;
    } catch { return 0; }
  }, { timeout: 60_000 }).toBe(200);
});

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(target.hostname) ? route.continue() : route.abort();
  });
});

test('Gestão: visitante é redirecionado e magic link local abre o tenant correto', async ({ page }) => {
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole('heading', { name: 'Acesse sua gestão' })).toBeVisible();
  await login(page, fixture.owner);
  await expect(page).toHaveURL(/\/painel(?:\/inicio)?$/, { timeout: 60_000 });
  await expect(page.getByText('Barbearia Critical', { exact: true }).first()).toBeVisible();
});

test('Cliente: entrada direta retorna à reserva, confirma e mantém Gestão sem sessão', async ({ page }) => {
  await page.goto('/cliente/entrar');
  await expect(page.getByRole('heading', { name: 'Entrar ou criar conta' })).toBeVisible();
  await login(page, fixture.customer, '/cliente/entrar?returnTo=%2Fcritical-e2e');
  await expect(page).toHaveURL(/\/critical-e2e$/);
  await page.getByRole('button', { name: /Corte de teste/ }).click();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('grid', { name: 'Escolha a data do agendamento' }).locator('button:not([disabled])').first().click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar para horários' }).click();
  // Data e primeiro horário vêm da disponibilidade real do banco isolado.
  await page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first().click();
  await page.getByRole('button', { name: 'Revisar agendamento' }).click();
  await page.getByRole('button', { name: 'Confirmar agendamento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu horário está reservado.' })).toBeVisible();
  const bookings = checked(await fixture.customer.client.from('appointments').select('id,status,barbershop_id,professional_id,service_ids').eq('customer_id', fixture.customer.id), 'conferir reserva gravada');
  expect(bookings).toHaveLength(1);
  expect(bookings[0]).toMatchObject({ status: 'scheduled', barbershop_id: fixture.shop.id, professional_id: fixture.professional.id, service_ids: [fixture.service.id] });
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/entrar$/);
});

test('Convite: destinatário aceita uma vez e o vínculo persiste no tenant', async ({ page }) => {
  await login(page, fixture.invited);
  await expect(page).toHaveURL(/\/(?:cadastro-inicial|painel(?:\/inicio)?)$/, { timeout: 60_000 });
  await page.goto(`/convite/equipe?token=${fixture.token}`);
  await page.getByRole('button', { name: 'Aceitar convite', exact: true }).click();
  await expect(page.getByText(/Convite aceito/i).first()).toBeVisible();
  const membership = checked(await admin.from('team_members').select('barbershop_id,user_id,role,status').eq('user_id', fixture.invited.id).single(), 'conferir vínculo');
  expect(membership).toMatchObject({ barbershop_id: fixture.shop.id, user_id: fixture.invited.id, role: 'manager', status: 'active' });
  await page.goto(`/convite/equipe?token=${fixture.token}`);
  await expect(page.getByText('Este convite já foi aceito anteriormente.')).toBeVisible();
});
