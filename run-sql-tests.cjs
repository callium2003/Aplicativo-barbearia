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
    execSync(`docker run --name ${containerName} -e POSTGRES_PASSWORD=postgres -d -p 5439:5432 postgres:15`, { stdio: 'inherit' });

    console.log('[3] Waiting for PostgreSQL engine to fully initialize...');
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        execSync(`docker exec ${containerName} psql -U postgres -d postgres -c "SELECT 1"`, { stdio: 'ignore' });
        ready = true;
        break;
      } catch (e) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
      }
    }
    if (!ready) throw new Error('Timeout waiting for PostgreSQL');

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

    console.log('[5] Applying migrations...');
    execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < supabase/migrations/20260804050000_add_professional_commission_rate.sql`, { stdio: 'inherit' });
    
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
    execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < test-seed.sql`, { stdio: 'inherit' });

    execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < supabase/migrations/20260804060000_isolate_professional_commission.sql`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < supabase/migrations/20260804070000_harden_professional_commission_security.sql`, { stdio: 'inherit' });

    console.log('\n--- Running SQL & RLS Verification Suite ---\n');
    const suiteSql = `
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

      RAISE NOTICE 'SUCCESS: Estrutura verificada.';
    END; $$;

    -- 2. Owner Access & Isolation
    DO $$
    DECLARE
      v_blocked boolean;
      v_rates_count int;
    BEGIN
      SET ROLE authenticated;
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false); -- Owner T1
      
      SELECT count(*) INTO v_rates_count FROM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
      IF v_rates_count <> 2 THEN RAISE EXCEPTION 'FAIL: Owner T1 deveria visualizar 2 profissionais em T1, obteve %', v_rates_count; END IF;

      -- Read another tenant
      v_blocked := false;
      BEGIN
        PERFORM public.get_professional_commission_rates('bbbbbbbb-2222-2222-2222-222222222222');
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Owner T1 conseguiu ver profissionais de T2!'; END IF;

      -- Update own tenant
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '30.00');

      -- Update another tenant
      v_blocked := false;
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-2222-1111-1111-111111111111', '50.00');
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Owner T1 conseguiu atualizar comissão em T2!'; END IF;

      -- Direct SELECT
      v_blocked := false;
      BEGIN
        PERFORM 1 FROM public.professional_commission_settings;
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Owner T1 fez SELECT direto na tabela!'; END IF;

      -- Direct UPDATE
      v_blocked := false;
      BEGIN
        UPDATE public.professional_commission_settings SET commission_rate_percent = 99.00;
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Owner T1 fez UPDATE direto na tabela!'; END IF;

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Testes de Owner aprovados.';
    END; $$;

    -- 3. Manager Access
    DO $$
    DECLARE
      v_blocked boolean;
    BEGIN
      SET ROLE authenticated;
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', false); -- Manager T1
      
      PERFORM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '35.00');

      -- Outro tenant
      v_blocked := false;
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-2222-1111-1111-111111111111', '50.00');
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Manager acessou T2!'; END IF;

      -- Direct SELECT
      v_blocked := false;
      BEGIN
        PERFORM 1 FROM public.professional_commission_settings;
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Manager fez SELECT direto!'; END IF;

      -- Direct UPDATE professionals name
      v_blocked := false;
      BEGIN
        UPDATE public.professionals SET name = 'Hack' WHERE id = '33333333-1111-1111-1111-111111111111';
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Manager fez UPDATE em professionals.name!'; END IF;

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
      BEGIN
        PERFORM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111');
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Barber fez leitura!'; END IF;

      v_blocked := false;
      BEGIN
        PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '10.00');
      EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Barber fez update!'; END IF;

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

      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', false); -- Unlinked
      v_blocked := false;
      BEGIN PERFORM public.get_professional_commission_rates('bbbbbbbb-1111-1111-1111-111111111111'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Unlinked leu taxas!'; END IF;

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
      BEGIN PERFORM 1 FROM public.professional_commission_settings; EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Anon fez SELECT direto!'; END IF;

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Testes de Anon aprovados.';
    END; $$;

    -- 7. Decimal validation
    DO $$
    DECLARE
      v_blocked boolean;
    BEGIN
      SET ROLE authenticated;
      PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false); -- Owner T1

      -- Accepted
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '0');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '25.5');
      PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '100.00');

      -- Rejected
      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', ''); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Aceitou vazio'; END IF;

      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '-1'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Aceitou negativo'; END IF;

      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '100.01'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Aceitou > 100'; END IF;

      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '12.500'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Aceitou 12.500'; END IF;

      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', 'abc'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Aceitou abc'; END IF;

      v_blocked := false;
      BEGIN PERFORM public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '25,50'); EXCEPTION WHEN OTHERS THEN v_blocked := true; END;
      IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: Aceitou vírgula (25,50)'; END IF;

      RESET ROLE;
      RAISE NOTICE 'SUCCESS: Validações decimais aprovadas.';
    END; $$;
    `;
    fs.writeFileSync('test-suite.sql', suiteSql);
    execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < test-suite.sql`, { stdio: 'inherit' });

    console.log('\n--- Running Concurrency Test ---');
    // We will spawn two separate psql processes.
    // P1 will hold a transaction with a pg_sleep to simulate delay.
    // P2 will try to update at the same time.
    const p1Sql = `
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
      BEGIN;
      SELECT public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '10.00');
      SELECT pg_sleep(3);
      COMMIT;
    `;
    const p2Sql = `
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
      SELECT pg_sleep(0.5); -- Wait slightly so P1 grabs lock
      SELECT public.set_professional_commission_rate('33333333-1111-1111-1111-111111111111', '20.00');
    `;
    fs.writeFileSync('p1.sql', p1Sql);
    fs.writeFileSync('p2.sql', p2Sql);

    const runProc = (file) => {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const proc = spawn('docker', ['exec', '-i', containerName, 'psql', '-U', 'postgres', '-d', 'postgres']);
        const fileContent = fs.readFileSync(file);
        proc.stdin.write(fileContent);
        proc.stdin.end();
        proc.on('close', (code) => {
          if (code === 0) resolve(Date.now() - start);
          else reject(new Error('Process failed with code ' + code));
        });
      });
    };

    const [t1, t2] = await Promise.all([runProc('p1.sql'), runProc('p2.sql')]);
    console.log(`P1 completed in ${t1}ms. P2 completed in ${t2}ms.`);
    if (t2 < 3000) {
      throw new Error('FAIL: Concurrency lock did not hold P2 back!');
    }

    // Verify audit logs
    const auditCheck = `
      DO $$
      DECLARE
        v_count int;
      BEGIN
        SELECT count(*) INTO v_count FROM public.audit_logs WHERE action = 'set_professional_commission_rate' AND entity_id = '33333333-1111-1111-1111-111111111111';
        IF v_count < 2 THEN RAISE EXCEPTION 'FAIL: Faltam logs de auditoria concorrente'; END IF;
        RAISE NOTICE 'SUCCESS: Teste concorrente aprovado. Logs verificados.';
      END; $$;
    `;
    fs.writeFileSync('audit-check.sql', auditCheck);
    execSync(`docker exec -i ${containerName} psql -U postgres -d postgres < audit-check.sql`, { stdio: 'inherit' });

    console.log('ALL SQL TESTS PASSED!');

  } catch (err) {
    hasFailed = true;
    console.error('\n❌ SQL Test Suite Failed:', err.message);
  } finally {
    console.log('\n--- Cleanup ---\n');
    try {
      execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
      fs.unlinkSync('test-init.sql');
      fs.unlinkSync('test-seed.sql');
      fs.unlinkSync('test-suite.sql');
      fs.unlinkSync('p1.sql');
      fs.unlinkSync('p2.sql');
      fs.unlinkSync('audit-check.sql');
    } catch(e) {}
    
    if (hasFailed) process.exit(1);
  }
}

run();
