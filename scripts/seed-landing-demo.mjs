// DEMONSTRAÇÃO EXCLUSIVAMENTE LOCAL. Nunca aplicar no Supabase remoto.
// Executar somente após iniciar o stack isolado .tmp/landing-demo.
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { requireLocalDemoUrl } from './landing-demo-guard.mjs';

const workdir = '.tmp/landing-demo';
const container = 'supabase_db_barbeariasp-landing-demo';
const status = JSON.parse(execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '--workdir', workdir, '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
requireLocalDemoUrl(status.API_URL);
const database = execFileSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-c', 'select count(*) from public.barbershops;'], { encoding: 'utf8' }).trim();
if (!['0', '1'].includes(database)) throw new Error('DEMO: banco contém tenants alheios; execução bloqueada.');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
const priorShop = checked(await admin.from('barbershops').select('id,name,slug,owner_id').maybeSingle(), 'verificar cenário existente');
if (priorShop && (priorShop.slug !== 'barbearia-vila-mariana' || priorShop.name !== 'Barbearia Vila Mariana')) throw new Error('DEMO: banco contém tenant alheio; execução bloqueada.');
const sessions = {};
function checked(result, operation) {
  if (result.error) throw new Error(`DEMO ${operation}: ${result.error.message}`);
  return result.data;
}
async function user(kind, name, phone) {
  const email = `${kind}@landing-demo.example.test`;
  const password = randomBytes(24).toString('hex');
  const existing = checked(await admin.auth.admin.listUsers(), 'consultar identidades demo').users.find(item => item.email === email);
  const identity = existing ?? checked(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, demo: true } }), 'criar identidade fictícia').user;
  const client = createClient(status.API_URL, status.ANON_KEY, options);
  const link = checked(await admin.auth.admin.generateLink({ type: 'magiclink', email }), 'criar acesso local sem envio de email');
  const login = checked(await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }), 'autenticar identidade local');
  sessions[kind] = login.session;
  if (phone) checked(await client.rpc('save_my_customer_profile', { p_name: name, p_phone: phone }), 'cadastrar Cliente pela RPC');
  return { client, id: identity.id, name, phone };
}
const owner = await user('gestao', 'Rafael Almeida');
const clients = [
  await user('bruno', 'Bruno Ferreira', '11900001001'),
  await user('lucas', 'Lucas Oliveira', '11900001002'),
  await user('marcos', 'Marcos Santos', '11900001003'),
];
if (priorShop && priorShop.owner_id !== owner.id) throw new Error('DEMO: titular diferente do cenário; execução bloqueada.');
const shop = priorShop ?? checked(await owner.client.from('barbershops').insert({ owner_id: owner.id, name: 'Barbearia Vila Mariana', slug: 'barbearia-vila-mariana', description: 'Cuidado com seu estilo, no seu tempo.', address: 'Vila Mariana, São Paulo — endereço demonstrativo', whatsapp: '11900001000' }).select('id,name,slug').single(), 'cadastrar barbearia');
const priorServices = checked(await owner.client.from('services').select('*').eq('barbershop_id', shop.id).order('created_at').order('name'), 'consultar catálogo demo');
const services = priorServices.length ? priorServices : checked(await owner.client.from('services').insert([
  ['Corte masculino', 55, 40], ['Barba', 40, 30], ['Corte e barba', 85, 60], ['Acabamento', 20, 10], ['Hidratação capilar', 35, 20],
].map(([name, price, duration_minutes]) => ({ barbershop_id: shop.id, name, price, duration_minutes }))).select(), 'cadastrar cinco serviços');
const priorProfessionals = checked(await owner.client.from('professionals').select('id,name').eq('barbershop_id', shop.id).order('name'), 'consultar profissionais demo');
const professionals = priorProfessionals.length ? priorProfessionals : checked(await owner.client.from('professionals').insert([
  { barbershop_id: shop.id, name: 'Rafael Almeida', phone: '11900001000' },
  { barbershop_id: shop.id, name: 'Diego Costa', phone: '11900001004' },
]).select('id,name'), 'cadastrar profissionais');
const hours = Array.from({ length: 7 }, (_, weekday) => ({ weekday, opens_at: '08:00', closes_at: '20:00', is_closed: false }));
checked(await owner.client.from('business_hours').upsert(hours.map(h => ({ ...h, barbershop_id: shop.id })), { onConflict: 'barbershop_id,weekday' }), 'horários da barbearia');
checked(await owner.client.from('professional_hours').upsert(professionals.flatMap(p => hours.map(h => ({ ...h, professional_id: p.id }))), { onConflict: 'professional_id,weekday' }), 'horários profissionais');
for (const professional of professionals) checked(await owner.client.rpc('set_professional_commission_rate', { p_professional_id: professional.id, p_commission_rate_percent_text: '40' }), 'percentual de comissão pela RPC');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
function day(offset) { const date = new Date(`${today}T12:00:00-03:00`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); }
const appointments = [];
const priorAppointments = checked(await owner.client.from('appointments').select('id,status').eq('barbershop_id', shop.id).order('created_at'), 'retomar reservas demo');
for (let i = 0; i < 9; i++) {
  const customer = clients[i % 3];
  const hour = String(9 + (i % 3) * 2).padStart(2, '0');
  const historical = i < 6;
  const date = day(historical ? 10 + Math.floor(i / 3) : 1 + i % 3);
  const id = priorAppointments[i]?.id ?? checked(await customer.client.rpc('book_customer_appointment', {
    p_barbershop_id: shop.id, p_service_ids: [services[i % 5].id], p_professional_id: professionals[i % 2].id,
    p_starts_at: `${date}T${hour}:00:00-03:00`, p_customer_name: customer.name, p_customer_phone: customer.phone,
  }), 'agendar pela RPC real');
  if (historical && priorAppointments[i]?.status !== 'completed') {
    // Importação de histórico fictício: a reserva normal rejeita datas passadas.
    // Apenas neste container demo, deslocar a reserva já validada; não desabilitar triggers.
    const past = `${day(-1 - Math.floor(i / 3))}T${hour}:00:00-03:00`;
    const sql = `begin; select set_config('request.jwt.claim.sub','${owner.id}',true); update public.appointments set ends_at='${past}'::timestamptz+(ends_at-starts_at), starts_at='${past}'::timestamptz where id='${id}' and barbershop_id='${shop.id}'; commit;`;
    execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, stdio: ['pipe', 'pipe', 'pipe'] });
    checked(await owner.client.rpc('set_appointment_status', { p_appointment_id: id, p_status: 'completed' }), 'concluir atendimento pela RPC real');
  }
  appointments.push(id);
}
const financial = checked(await owner.client.rpc('get_barbershop_financial_report', { p_barbershop_id: shop.id, p_start_date: day(-30), p_end_date: day(30) }), 'ler comissões pela RPC real de Relatórios');
const ledger = financial.commissions;
const notifications = checked(await owner.client.from('user_notifications').select('appointment_id,event_type').eq('barbershop_id', shop.id), 'ler notificações geradas');
if (ledger.length !== 6 || ledger.some(row => !appointments.includes(row.appointment_id) || Number(row.commission_amount) !== Number(row.gross_amount) * 0.4)) throw new Error('DEMO: comissão não corresponde aos atendimentos concluídos.');
if (notifications.filter(row => row.event_type === 'new_appointment' && appointments.includes(row.appointment_id)).length !== 9) throw new Error('DEMO: notificações não correspondem às nove reservas do seed.');
await mkdir(workdir, { recursive: true });
await writeFile(`${workdir}/sessions.json`, JSON.stringify({ url: status.API_URL, anonKey: status.ANON_KEY, sessions, shop, today }), { mode: 0o600 });
console.log(JSON.stringify({ demoOnly: true, barbershops: 1, customers: 3, services: 5, appointments: 9, completed: 6, future: 3, commissions: ledger.length, managementNotifications: notifications.length, flow: 'cadastro → agendamento → comissão → notificação', externalEmailsSent: 0 }));
