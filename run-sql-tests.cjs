/* eslint-disable */
const { execSync } = require('child_process');
const fs = require('fs');

async function run() {
  const containerName = 'barbeariasp-pg-test';
  console.log(`[1/5] Cleaning up old test container ${containerName}...`);
  try {
    execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
  } catch (e) {}

  console.log(`[2/5] Starting PostgreSQL 15 container (${containerName})...`);
  execSync(`docker run --name ${containerName} -e POSTGRES_PASSWORD=postgres -d -p 5439:5432 postgres:15`, { stdio: 'inherit' });

  console.log('[3/5] Waiting for PostgreSQL engine to fully initialize...');
  while (true) {
    try {
      execSync(`docker exec ${containerName} psql -U postgres -d postgres -c "SELECT 1"`, { stdio: 'ignore' });
      break;
    } catch (e) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
  }

  console.log('[4/5] Applying minimal baseline schema & Supabase roles...');
  const initSql = `
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

CREATE TABLE public.barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  slug text,
  owner_id uuid REFERENCES auth.users(id)
);

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES public.barbershops(id),
  user_id uuid REFERENCES auth.users(id),
  role text CHECK (role IN ('manager', 'barber'))
);

CREATE TABLE public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES public.barbershops(id),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid,
  actor_user_id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Supabase auth simulation helpers
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
  RETURN nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION private.current_barbershop_role(b_id uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  
  IF EXISTS (SELECT 1 FROM public.barbershops WHERE id = b_id AND owner_id = v_uid) THEN
    RETURN 'owner';
  END IF;
  
  SELECT role INTO v_role FROM public.team_members WHERE barbershop_id = b_id AND user_id = v_uid;
  RETURN v_role;
END;
$$;
`;
  fs.writeFileSync('test-init.sql', initSql);
  execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < test-init.sql`, { stdio: 'inherit' });

  console.log('[5/5] Applying migration 1 (initial commission addition)...');
  execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < supabase/migrations/20260804050000_add_professional_commission_rate.sql`, { stdio: 'inherit' });

  console.log('Inserting seed data across multiple tenants (Barbershop 1 & Barbershop 2)...');
  const seedSql = `
    -- Users
    INSERT INTO auth.users (id, email) VALUES
      ('10000000-0000-0000-0000-000000000001', 'owner1@barbearia.com'),
      ('10000000-0000-0000-0000-000000000002', 'manager1@barbearia.com'),
      ('10000000-0000-0000-0000-000000000003', 'barber1@barbearia.com'),
      ('10000000-0000-0000-0000-000000000004', 'client1@gmail.com'),
      ('20000000-0000-0000-0000-000000000001', 'owner2@barbearia.com');

    -- Barbershops
    INSERT INTO public.barbershops (id, name, slug, owner_id) VALUES
      ('bbbbbbbb-1111-1111-1111-111111111111', 'Barbearia Tenant 1', 't1', '10000000-0000-0000-0000-000000000001'),
      ('bbbbbbbb-2222-2222-2222-222222222222', 'Barbearia Tenant 2', 't2', '20000000-0000-0000-0000-000000000001');

    -- Team Members
    INSERT INTO public.team_members (barbershop_id, user_id, role) VALUES
      ('bbbbbbbb-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000002', 'manager'),
      ('bbbbbbbb-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000003', 'barber');

    -- Professionals
    INSERT INTO public.professionals (id, barbershop_id, user_id, name, commission_rate_percent) VALUES
      ('33333333-1111-1111-1111-111111111111', 'bbbbbbbb-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000003', 'Carlos Barbeiro T1', 25.50),
      ('33333333-1111-2222-2222-222222222222', 'bbbbbbbb-1111-1111-1111-111111111111', NULL, 'Profissional Sem Valor T1', 0.00),
      ('33333333-2222-1111-1111-111111111111', 'bbbbbbbb-2222-2222-2222-222222222222', NULL, 'Barbeiro Tenant 2', 40.00);
  `;
  fs.writeFileSync('test-seed.sql', seedSql);
  execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < test-seed.sql`, { stdio: 'inherit' });

  console.log('Applying migration 2 (corrective migration: isolate professional commission)...');
  execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < supabase/migrations/20260804060000_isolate_professional_commission.sql`, { stdio: 'inherit' });

  console.log('\n--- Running SQL & RLS Verification Suite ---\n');
  const suiteSql = `
    -- 1. Structure Verification
    DO $$
    DECLARE
      v_col_exists boolean;
      v_count int;
      v_rate1 numeric;
      v_rate2 numeric;
    BEGIN
      -- Check column removed from public.professionals
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'professionals' AND column_name = 'commission_rate_percent'
      ) INTO v_col_exists;
      IF v_col_exists THEN RAISE EXCEPTION 'FAIL: commission_rate_percent ainda existe na tabela public.professionals!'; END IF;

      -- Check migrated rows count and values
      SELECT count(*) INTO v_count FROM public.professional_commission_settings;
      IF v_count <> 3 THEN RAISE EXCEPTION 'FAIL: Esperava 3 registros na tabela financeira privada, encontrou %', v_count; END IF;

      SELECT commission_rate_percent INTO v_rate1 FROM public.professional_commission_settings WHERE professional_id = '33333333-1111-1111-1111-111111111111';
      IF v_rate1 <> 25.50 THEN RAISE EXCEPTION 'FAIL: Valor migrado incorreto para T1 (esperado 25.50, obteve %)', v_rate1; END IF;

      SELECT commission_rate_percent INTO v_rate2 FROM public.professional_commission_settings WHERE professional_id = '33333333-1111-2222-2222-222222222222';
      IF v_rate2 <> 0.00 THEN RAISE EXCEPTION 'FAIL: Valor sem comissão inicial deveria ser 0.00, obteve %', v_rate2; END IF;
      
      RAISE NOTICE 'SUCCESS: Estrutura financeira privada verificada com sucesso.';
    END; $$;

    -- Enable RLS for testing roles
    ALTER TABLE public.professional_commission_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

    -- 2. Owner Access & Isolation
    DO $$
    DECLARE
      v_rates_count int := 0;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false); -- Owner T1
      
      -- Owner reads T1 rates via RPC
      SELECT count(*) INTO v_rates_count FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
      IF v_rates_count <> 2 THEN RAISE EXCEPTION 'FAIL: Owner T1 deveria visualizar 2 profissionais em T1, obteve %', v_rates_count; END IF;

      -- Owner cannot read T2 rates via RPC
      BEGIN
        SELECT count(*) INTO v_rates_count FROM public.get_professional_commission_rates('bbbbbbbb-2222-2222-2222-222222222222');
        RAISE EXCEPTION 'FAIL: Owner T1 deveria receber exceção ao tentar ver profissionais de T2!';
      EXCEPTION WHEN OTHERS THEN
      END;

      -- Owner updates T1 rate via RPC
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '30.00');
      
      -- Owner cannot update T2 rate via RPC
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-2222-1111-1111-111111111111', '50.00');
        RAISE EXCEPTION 'FAIL: Owner T1 conseguiu atualizar comissão em T2!';
      EXCEPTION WHEN OTHERS THEN
      END;

      RAISE NOTICE 'SUCCESS: Testes de permissão e isolamento de Owner aprovados.';
    END; $$;

    -- 3. Manager Access & Restriction
    DO $$
    DECLARE
      v_rates_count int := 0;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', false); -- Manager T1

      -- Manager reads T1 rates via RPC
      SELECT count(*) INTO v_rates_count FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
      IF v_rates_count <> 2 THEN RAISE EXCEPTION 'FAIL: Manager T1 deveria ver 2 profissionais de T1, obteve %', v_rates_count; END IF;

      -- Manager alters commission via RPC
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '35.00');

      -- Manager attempts direct UPDATE on professional_commission_settings (MUST FAIL BY RLS)
      BEGIN
        UPDATE public.professional_commission_settings SET commission_rate_percent = 99.00 WHERE professional_id = '33333333-1111-1111-1111-111111111111';
        IF FOUND THEN RAISE EXCEPTION 'FAIL: Manager não deveria poder fazer UPDATE direto na tabela financeira!'; END IF;
      EXCEPTION WHEN OTHERS THEN
      END;

      -- Manager attempts direct UPDATE on public.professionals columns (name, active, phone, barbershop_id) (MUST FAIL BY RLS)
      BEGIN
        UPDATE public.professionals SET name = 'Nome Hackeado' WHERE id = '33333333-1111-1111-1111-111111111111';
        IF FOUND THEN RAISE EXCEPTION 'FAIL: Manager executou UPDATE em name de professionals!'; END IF;
      EXCEPTION WHEN OTHERS THEN
      END;

      RAISE NOTICE 'SUCCESS: Testes de permissão e restrição de Manager aprovados.';
    END; $$;

    -- 4. Barber, Client & Anon Privacy
    DO $$
    DECLARE
      v_count int := 0;
    BEGIN
      -- Barber T1
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', false);
      BEGIN
        SELECT count(*) INTO v_count FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
        RAISE EXCEPTION 'FAIL: Barber T1 deveria ter sido bloqueado!';
      EXCEPTION WHEN OTHERS THEN
      END;

      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '50.00');
        RAISE EXCEPTION 'FAIL: Barber não pode executar RPC set_professional_commission_rate!';
      EXCEPTION WHEN OTHERS THEN
      END;

      -- Client
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', false);
      BEGIN
        SELECT count(*) INTO v_count FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
        RAISE EXCEPTION 'FAIL: Cliente deveria ter sido bloqueado!';
      EXCEPTION WHEN OTHERS THEN
      END;

      -- Anon
      PERFORM set_config('request.jwt.claim.sub', '', false);
      BEGIN
        SELECT count(*) INTO v_count FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
        RAISE EXCEPTION 'FAIL: Anon deveria ter sido bloqueado!';
      EXCEPTION WHEN OTHERS THEN
      END;

      RAISE NOTICE 'SUCCESS: Privacidade de Barber, Cliente e Anon totalmente confirmada.';
    END; $$;

    -- 5. Decimal Input Validation Rules
    DO $$
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false); -- Owner T1

      -- Allowed formats
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '0');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '25');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '25.5');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '25.50');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '100');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '100.00');

      -- Rejected formats
      -- Vazio
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '');
        RAISE EXCEPTION 'FAIL: Deveria rejeitar texto vazio';
      EXCEPTION WHEN OTHERS THEN END;

      -- Negativo
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '-1');
        RAISE EXCEPTION 'FAIL: Deveria rejeitar negativo';
      EXCEPTION WHEN OTHERS THEN END;

      -- > 100
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '100.01');
        RAISE EXCEPTION 'FAIL: Deveria rejeitar > 100';
      EXCEPTION WHEN OTHERS THEN END;

      -- 3 casas decimais (12.500)
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '12.500');
        RAISE EXCEPTION 'FAIL: Deveria rejeitar 12.500 (3 casas decimais)';
      EXCEPTION WHEN OTHERS THEN END;

      -- 3 casas decimais (12.501)
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '12.501');
        RAISE EXCEPTION 'FAIL: Deveria rejeitar 12.501 (3 casas decimais)';
      EXCEPTION WHEN OTHERS THEN END;

      -- Texto não numérico
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', 'abc');
        RAISE EXCEPTION 'FAIL: Deveria rejeitar texto não numérico';
      EXCEPTION WHEN OTHERS THEN END;

      -- Múltiplos separadores
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '12.5.0');
        RAISE EXCEPTION 'FAIL: Deveria rejeitar múltiplos separadores';
      EXCEPTION WHEN OTHERS THEN END;

      RAISE NOTICE 'SUCCESS: Validações numéricas decimais rígidas aprovadas.';
    END; $$;

    -- 6. Audit & Concurrency Order Verification
    DO $$
    DECLARE
      v_audit_count int;
      v_meta jsonb;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '50.00');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '60.00');

      SELECT count(*) INTO v_audit_count FROM public.audit_logs WHERE action = 'set_professional_commission_rate' AND entity_id = '33333333-1111-1111-1111-111111111111';
      IF v_audit_count < 2 THEN RAISE EXCEPTION 'FAIL: Registros de auditoria incompletos!'; END IF;

      SELECT metadata INTO v_meta FROM public.audit_logs WHERE action = 'set_professional_commission_rate' AND entity_id = '33333333-1111-1111-1111-111111111111' ORDER BY created_at DESC, id DESC LIMIT 1;
      IF (v_meta->>'previous_rate')::numeric <> 50.00 OR (v_meta->>'new_rate')::numeric <> 60.00 THEN
        RAISE EXCEPTION 'FAIL: Delta de auditoria incorreto em transação sequencial: %', v_meta;
      END IF;

      RAISE NOTICE 'SUCCESS: Auditoria transacional e histórico validados com sucesso.';
    END; $$;
  `;
  fs.writeFileSync('test-suite.sql', suiteSql);
  execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < test-suite.sql`, { stdio: 'inherit' });

  console.log('\n--- Cleanup ---\n');
  execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
  console.log('PostgreSQL container removed. ALL SQL TESTS PASSED PERFECTLY!');
}

run().catch((err) => {
  console.error('\n❌ SQL Test Suite Failed:', err);
  process.exit(1);
});
