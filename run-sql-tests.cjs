/* eslint-disable */
const { execSync, spawn } = require('child_process');
const fs = require('fs');

async function run() {
  const containerName = 'barbeariasp-pg-test-sec';
  let hasFailed = false;

  console.log(`[1] Cleaning up old test container ${containerName}...`);
  try {
    execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
  } catch (e) {}

  try {
    console.log(`[2] Starting PostgreSQL 15 container (${containerName})...`);
    execSync(`docker run --name ${containerName} -e POSTGRES_PASSWORD=postgres -d -p 5439:5432 postgres:15`, { stdio: 'inherit', timeout: 30000 });

    console.log('[3] Waiting for PostgreSQL engine to fully initialize...');
    let readyCount = 0;
    for (let i = 0; i < 40; i++) {
      try {
        execSync(`docker exec ${containerName} psql -U postgres -d postgres -c "SELECT 1"`, { stdio: 'ignore', timeout: 5000 });
        readyCount++;
        if (readyCount >= 3) break;
      } catch (e) {
        readyCount = 0;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
    if (readyCount < 3) throw new Error('Timeout waiting for PostgreSQL');

    const execPsql = (sqlFile) => {
      try {
        execSync(`docker exec -i ${containerName} psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ${sqlFile}`, { stdio: 'inherit' });
      } catch (e) {
        throw new Error(`Failed to execute ${sqlFile}`);
      }
    };

    console.log('[4] Applying minimal baseline schema & Supabase roles...');
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

-- RLS para reproduzir o comportamento real
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.professionals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.professionals TO authenticated;

GRANT SELECT ON public.barbershops TO authenticated, anon;
GRANT SELECT ON public.team_members TO authenticated;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Simulated Auth helpers
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE plpgsql AS $f$
BEGIN
  RETURN nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
END;
$f$;

CREATE OR REPLACE FUNCTION private.current_barbershop_role(b_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $f$
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
$f$;

-- Real policy existing in migration 20260801001539_baseline_remote_schema.sql (Owner can update professionals)
CREATE POLICY "Owner can update professionals" ON "public"."professionals" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "professionals"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "professionals"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));

CREATE POLICY "Owner can read audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (("private"."current_barbershop_role"("barbershop_id") = 'owner'::"text"));
`;
    fs.writeFileSync('test-init.sql', initSql);
    execPsql('test-init.sql');

    console.log('[5] Applying migrations...');
    execPsql('supabase/migrations/20260804050000_add_professional_commission_rate.sql');

    console.log('Inserting seed data across multiple tenants (Barbershop 1 & Barbershop 2)...');
    const seedSql = `
      -- Users
      INSERT INTO auth.users (id, email) VALUES
        ('10000000-0000-0000-0000-000000000001', 'owner1@barbearia.com'),
        ('10000000-0000-0000-0000-000000000002', 'manager1@barbearia.com'),
        ('10000000-0000-0000-0000-000000000003', 'barber1@barbearia.com'),
        ('10000000-0000-0000-0000-000000000004', 'client1@gmail.com'),
        ('10000000-0000-0000-0000-000000000005', 'unlinked@gmail.com'),
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
    execPsql('test-seed.sql');

    execPsql('supabase/migrations/20260804060000_isolate_professional_commission.sql');
    execPsql('supabase/migrations/20260804070000_harden_professional_commission_security.sql');

    console.log('\n--- Running SQL & RLS Verification Suite ---\n');
    const suiteSql = `
    -- Explicitly stop on error
    \\set ON_ERROR_STOP 1

    -- 1. Structure Verification
    DO $$
    DECLARE
      v_col_exists boolean;
    BEGIN
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'professionals' AND column_name = 'commission_rate_percent') INTO v_col_exists;
      IF v_col_exists THEN RAISE EXCEPTION 'FAIL: commission_rate_percent ainda existe na tabela public.professionals!'; END IF;

      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'professional_commission_settings' AND column_name = 'barbershop_id') INTO v_col_exists;
      IF v_col_exists THEN RAISE EXCEPTION 'FAIL: barbershop_id ainda existe na tabela financeira!'; END IF;

      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_professional_commission_rate' AND pg_get_function_identity_arguments(oid) = 'uuid, numeric') THEN
        RAISE EXCEPTION 'FAIL: assinatura antiga uuid, numeric ainda existe!';
      END IF;

      IF has_table_privilege('anon', 'public.professional_commission_settings', 'SELECT') THEN RAISE EXCEPTION 'FAIL: anon has SELECT'; END IF;
      IF has_table_privilege('anon', 'public.professional_commission_settings', 'INSERT') THEN RAISE EXCEPTION 'FAIL: anon has INSERT'; END IF;
      IF has_table_privilege('anon', 'public.professional_commission_settings', 'UPDATE') THEN RAISE EXCEPTION 'FAIL: anon has UPDATE'; END IF;
      IF has_table_privilege('anon', 'public.professional_commission_settings', 'DELETE') THEN RAISE EXCEPTION 'FAIL: anon has DELETE'; END IF;

      IF has_table_privilege('authenticated', 'public.professional_commission_settings', 'SELECT') THEN RAISE EXCEPTION 'FAIL: authenticated has SELECT'; END IF;
      IF has_table_privilege('authenticated', 'public.professional_commission_settings', 'INSERT') THEN RAISE EXCEPTION 'FAIL: authenticated has INSERT'; END IF;
      IF has_table_privilege('authenticated', 'public.professional_commission_settings', 'UPDATE') THEN RAISE EXCEPTION 'FAIL: authenticated has UPDATE'; END IF;
      IF has_table_privilege('authenticated', 'public.professional_commission_settings', 'DELETE') THEN RAISE EXCEPTION 'FAIL: authenticated has DELETE'; END IF;

      IF NOT has_function_privilege('authenticated', 'public.set_professional_commission_rate(uuid, text)', 'EXECUTE') THEN RAISE EXCEPTION 'FAIL: authenticated cannot EXECUTE write RPC'; END IF;
      IF NOT has_function_privilege('authenticated', 'public.get_professional_commission_rates(uuid)', 'EXECUTE') THEN RAISE EXCEPTION 'FAIL: authenticated cannot EXECUTE read RPC'; END IF;
      IF has_function_privilege('anon', 'public.set_professional_commission_rate(uuid, text)', 'EXECUTE') THEN RAISE EXCEPTION 'FAIL: anon can EXECUTE write RPC'; END IF;

      RAISE NOTICE 'SUCCESS: Estrutura, funções e acessos verificados.';
    END; $$;

    -- 2. Owner Access & Isolation
    DO $$
    DECLARE
      v_blocked boolean;
      v_rates_count int;
      v_name text;
    BEGIN
      SET ROLE authenticated;
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false); -- Owner T1

      SELECT count(*) INTO v_rates_count FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
      IF v_rates_count <> 2 THEN RAISE EXCEPTION 'FAIL: Owner T1 deveria visualizar 2 profissionais em T1, obteve %', v_rates_count; END IF;

      -- Read another tenant
      v_blocked := false;
      BEGIN PERFORM public.get_professional_commission_rates('bbbbbbbb-2222-2222-2222-222222222222'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Owner T1 conseguiu ver profissionais de T2!'; END IF;

      -- Update own tenant
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '30.00');

      -- Update another tenant
      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-2222-1111-1111-111111111111', '50.00'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Owner T1 conseguiu atualizar comissão em T2!'; END IF;

      -- Direct SELECT
      v_blocked := false;
      BEGIN PERFORM 1 FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Owner T1 fez SELECT direto na tabela!'; END IF;

      -- Direct UPDATE
      v_blocked := false;
      BEGIN UPDATE public.professional_commission_settings SET commission_rate_percent = 99.00; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Owner T1 fez UPDATE direto na tabela!'; END IF;

      -- Test update professional name
      UPDATE public.professionals SET name = 'Owner Changed' WHERE id = '33333333-1111-1111-1111-111111111111';
      SELECT name INTO v_name FROM public.professionals WHERE id = '33333333-1111-1111-1111-111111111111';
      IF v_name <> 'Owner Changed' THEN RAISE EXCEPTION 'FAIL: Owner não conseguiu atualizar nome.'; END IF;
      UPDATE public.professionals SET name = 'Carlos Barbeiro T1' WHERE id = '33333333-1111-1111-1111-111111111111';

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Testes de Owner aprovados.';
    END; $$;

    -- 3. Manager Access
    DO $$
    DECLARE
      v_blocked boolean;
      v_name text;
      v_active boolean;
      v_barb uuid;
      v_uid uuid;
      v_rowcount int;
    BEGIN
      SET ROLE authenticated;
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', false); -- Manager T1

      PERFORM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '35.00');

      -- Outro tenant
      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-2222-1111-1111-111111111111', '50.00'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Manager acessou T2!'; END IF;

      -- Direct SELECT on commission settings
      v_blocked := false;
      BEGIN PERFORM 1 FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Manager fez SELECT direto!'; END IF;

      -- Direct INSERT on commission settings
      v_blocked := false;
      BEGIN INSERT INTO public.professional_commission_settings (professional_id, commission_rate_percent) VALUES ('33333333-1111-1111-1111-111111111111', 10.0); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Manager fez INSERT direto!'; END IF;

      -- Direct DELETE on commission settings
      v_blocked := false;
      BEGIN DELETE FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Manager fez DELETE direto!'; END IF;

      -- Direct UPDATE professionals name
      UPDATE public.professionals SET name = 'Hack' WHERE id = '33333333-1111-1111-1111-111111111111';
      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount > 0 THEN RAISE EXCEPTION 'FAIL: Manager fez UPDATE em professionals.name!'; END IF;
      SELECT name INTO v_name FROM public.professionals WHERE id = '33333333-1111-1111-1111-111111111111';
      IF v_name = 'Hack' THEN RAISE EXCEPTION 'FAIL: Manager alterou o nome!'; END IF;

      -- update active
      UPDATE public.professionals SET active = false WHERE id = '33333333-1111-1111-1111-111111111111';
      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount > 0 THEN RAISE EXCEPTION 'FAIL: Manager fez UPDATE em active!'; END IF;
      SELECT active INTO v_active FROM public.professionals WHERE id = '33333333-1111-1111-1111-111111111111';
      IF NOT v_active THEN RAISE EXCEPTION 'FAIL: Manager inativou!'; END IF;

      -- update barbershop_id
      UPDATE public.professionals SET barbershop_id = 'bbbbbbbb-2222-2222-2222-222222222222' WHERE id = '33333333-1111-1111-1111-111111111111';
      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount > 0 THEN RAISE EXCEPTION 'FAIL: Manager fez UPDATE em barbershop!'; END IF;
      SELECT barbershop_id INTO v_barb FROM public.professionals WHERE id = '33333333-1111-1111-1111-111111111111';
      IF v_barb = 'bbbbbbbb-2222-2222-2222-222222222222' THEN RAISE EXCEPTION 'FAIL: Manager alterou barbershop!'; END IF;

      -- update user_id
      UPDATE public.professionals SET user_id = '10000000-0000-0000-0000-000000000002' WHERE id = '33333333-1111-1111-1111-111111111111';
      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount > 0 THEN RAISE EXCEPTION 'FAIL: Manager fez UPDATE em user_id!'; END IF;
      SELECT user_id INTO v_uid FROM public.professionals WHERE id = '33333333-1111-1111-1111-111111111111';
      IF v_uid = '10000000-0000-0000-0000-000000000002' THEN RAISE EXCEPTION 'FAIL: Manager alterou user_id!'; END IF;

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Testes de Manager aprovados.';
    END; $$;

    -- 4. Barber Access
    DO $$
    DECLARE
      v_blocked boolean;
    BEGIN
      SET ROLE authenticated;
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', false); -- Barber

      v_blocked := false;
      BEGIN PERFORM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Barber fez leitura!'; END IF;

      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '10.00'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Barber fez update!'; END IF;

      v_blocked := false;
      BEGIN PERFORM 1 FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Barber fez SELECT direto!'; END IF;

      v_blocked := false;
      BEGIN INSERT INTO public.professional_commission_settings (professional_id, commission_rate_percent) VALUES ('33333333-1111-1111-1111-111111111111', 10.0); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Barber fez INSERT direto!'; END IF;

      v_blocked := false;
      BEGIN UPDATE public.professional_commission_settings SET commission_rate_percent = 10.0; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Barber fez UPDATE direto!'; END IF;

      v_blocked := false;
      BEGIN DELETE FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Barber fez DELETE direto!'; END IF;

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Testes de Barber aprovados.';
    END; $$;

    -- 5. Client & Unlinked Access
    DO $$
    DECLARE
      v_blocked boolean;
    BEGIN
      SET ROLE authenticated;
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', false); -- Client
      v_blocked := false;
      BEGIN PERFORM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Cliente leu taxas!'; END IF;
      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '10.0'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Cliente alterou taxas!'; END IF;
      v_blocked := false;
      BEGIN PERFORM 1 FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Cliente fez select direto!'; END IF;

      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', false); -- Unlinked
      v_blocked := false;
      BEGIN PERFORM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Unlinked leu taxas!'; END IF;
      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '10.0'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Unlinked alterou taxas!'; END IF;
      v_blocked := false;
      BEGIN PERFORM 1 FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Unlinked fez select direto!'; END IF;

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Testes de Cliente/Unlinked aprovados.';
    END; $$;

    -- 6. Anon Access
    DO $$
    DECLARE
      v_blocked boolean;
    BEGIN
      SET ROLE anon;
      PERFORM set_config('request.jwt.claim.sub', '', false);

      v_blocked := false;
      BEGIN PERFORM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Anon leu taxas!'; END IF;

      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '10.0'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Anon atualizou taxas!'; END IF;

      v_blocked := false;
      BEGIN PERFORM 1 FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Anon fez SELECT direto!'; END IF;

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Testes de Anon aprovados.';
    END; $$;

    -- 7. Decimal validation in DB
    DO $$
    DECLARE
      v_blocked boolean;
      v_previous numeric;
      v_after numeric;
      v_log_count int;
      v_before_log_count int;
      v_vals text[] := ARRAY[NULL, '', '   ', '-1', '+25', '100.01', '12.500', '12.501', 'abc', '1e2', '12.5.0', '12,5.0', '25,50', '25 50', '25.,', '25,.50'];
      v_val text;
    BEGIN
      SET ROLE authenticated;
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false); -- Owner T1

      -- Accepted
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '0');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '25');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '25.5');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '25.50');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '100');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '100.00');

      -- Rejected
      FOREACH v_val IN ARRAY v_vals LOOP
        SELECT COALESCE(commission_rate_percent, 0.00) INTO v_previous FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111') WHERE professional_id = '33333333-1111-1111-1111-111111111111';
        SELECT count(*) INTO v_before_log_count FROM public.audit_logs;

        v_blocked := false;
        BEGIN
          PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', v_val);
        EXCEPTION WHEN OTHERS THEN
          v_blocked := true;
        END;

        IF NOT v_blocked THEN
          RAISE EXCEPTION 'FAIL: Aceitou valor indevido: %', v_val;
        END IF;

        SELECT COALESCE(commission_rate_percent, 0.00) INTO v_after FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111') WHERE professional_id = '33333333-1111-1111-1111-111111111111';
        IF v_after <> v_previous THEN RAISE EXCEPTION 'FAIL: Valor alterado após falha: %', v_val; END IF;

        SELECT count(*) INTO v_log_count FROM public.audit_logs;
        IF v_log_count <> v_before_log_count THEN RAISE EXCEPTION 'FAIL: Log criado para erro em: %', v_val; END IF;
      END LOOP;

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Validações decimais aprovadas.';
    END; $$;
    `;
    fs.writeFileSync('test-suite.sql', suiteSql);
    execPsql('test-suite.sql');

    console.log('\n--- Running Concurrency Test ---');

    // Clear logs
    const initConc = `
      \\set ON_ERROR_STOP 1
      DELETE FROM public.audit_logs;
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
      SELECT public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '10.00');
    `;
    fs.writeFileSync('test-seed-concurrency-init.sql', initConc);
    execPsql('test-seed-concurrency-init.sql');

    const p1Sql = `
      \\set ON_ERROR_STOP 1
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
      BEGIN;
      SELECT public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '20.00');
      \\! touch /tmp/p1_ready
      SELECT pg_sleep(3);
      COMMIT;
    `;
    const p2Sql = `
      \\set ON_ERROR_STOP 1
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
      SELECT public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '30.00');
    `;
    fs.writeFileSync('p1.sql', p1Sql);
    fs.writeFileSync('p2.sql', p2Sql);

    const runProc = (file) => {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const proc = spawn('docker', ['exec', '-i', containerName, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']);

        let out = '';
        proc.stdout.on('data', d => out += d);
        proc.stderr.on('data', d => out += d);

        const fileContent = fs.readFileSync(file);
        proc.stdin.write(fileContent);
        proc.stdin.end();

        // Safety timeout
        const t = setTimeout(() => {
          proc.kill();
          reject(new Error(`Timeout inside runProc for ${file}. Output: ${out}`));
        }, 15000);

        proc.on('close', (code) => {
          clearTimeout(t);
          if (code === 0) resolve({ time: Date.now() - start, out });
          else reject(new Error(`Process ${file} failed with code ${code}. Output: ${out}`));
        });
      });
    };

    const p1Promise = runProc('p1.sql');

    // Wait until /tmp/p1_ready exists inside container
    let p1Ready = false;
    for(let i=0; i<30; i++) {
      try {
        execSync(`docker exec ${containerName} ls /tmp/p1_ready`, { stdio: 'ignore' });
        p1Ready = true;
        break;
      } catch (e) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
      }
    }
    if (!p1Ready) throw new Error("P1 failed to acquire lock or signal readiness.");

    const p2Promise = runProc('p2.sql');

    const [res1, res2] = await Promise.all([p1Promise, p2Promise]);
    console.log(`P1 completed in ${res1.time}ms. P2 completed in ${res2.time}ms.`);

    if (res2.time < 2000) {
      throw new Error('FAIL: Concurrency lock did not block P2 for the expected duration!');
    }

    // Verify audit logs exactly
    const auditCheck = `
      \\set ON_ERROR_STOP 1
      DO $$
      DECLARE
        v_final_val numeric;
        v_log1 jsonb;
        v_log2 jsonb;
      BEGIN
        SELECT commission_rate_percent INTO v_final_val
        FROM public.professional_commission_settings
        WHERE professional_id = '33333333-1111-1111-1111-111111111111';

        IF v_final_val <> 30.00 THEN
          RAISE EXCEPTION 'FAIL: valor final não é 30.00: %', v_final_val;
        END IF;

        IF (SELECT count(*) FROM public.audit_logs WHERE entity_id = '33333333-1111-1111-1111-111111111111') <> 3 THEN
          RAISE EXCEPTION 'FAIL: quantidade de logs não é exatamente 3!';
        END IF;

        -- get logs ordered by created_at (skip the first init log)
        SELECT metadata INTO v_log1 FROM public.audit_logs
        WHERE entity_id = '33333333-1111-1111-1111-111111111111'
        ORDER BY created_at ASC OFFSET 1 LIMIT 1;

        SELECT metadata INTO v_log2 FROM public.audit_logs
        WHERE entity_id = '33333333-1111-1111-1111-111111111111'
        ORDER BY created_at ASC OFFSET 2 LIMIT 1;

        IF (v_log1->>'previous_rate')::numeric <> 10.00 OR (v_log1->>'new_rate')::numeric <> 20.00 THEN
          RAISE EXCEPTION 'FAIL: log 1 não corresponde a 10.00 -> 20.00, log1=%', v_log1;
        END IF;

        IF (v_log2->>'previous_rate')::numeric <> 20.00 OR (v_log2->>'new_rate')::numeric <> 30.00 THEN
          RAISE EXCEPTION 'FAIL: log 2 não corresponde a 20.00 -> 30.00, log2=%', v_log2;
        END IF;

        RAISE NOTICE 'SUCCESS: Teste concorrente aprovado. Logs verificados e em ordem.';
      END; $$;
    `;
    fs.writeFileSync('audit-check.sql', auditCheck);
    execPsql('audit-check.sql');

    console.log('\nALL SQL TESTS PASSED!\n');

  } catch (err) {
    hasFailed = true;
    console.error('\n❌ SQL Test Suite Failed:', err.message);
  } finally {
    console.log('\n--- Cleanup ---\n');
    const filesToClean = [
      'test-init.sql',
      'test-seed.sql',
      'test-suite.sql',
      'p1.sql',
      'p2.sql',
      'test-seed-concurrency-init.sql',
      'audit-check.sql'
    ];
    for (const f of filesToClean) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch(e) { console.error(`Failed to clean ${f}: ${e.message}`); }
      }
    }
    try {
      execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
    } catch(e) {
      console.error(`Failed to remove docker container: ${e.message}`);
    }

    if (hasFailed) process.exit(1);
    else process.exit(0);
  }
}

run();
