# Lote 0 — diagnóstico de falha

A validação automatizada da reconciliação de migrations falhou.

## lote0-install.log
```text

added 511 packages, and audited 512 packages in 16s

165 packages are looking for funding
  run `npm fund` for details

15 vulnerabilities (2 low, 2 moderate, 11 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues, run:
  npm audit fix --force

Run `npm audit` for details.
npm warn allow-scripts 4 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   sharp@0.34.5 (install: node install/check.js || npm run build)
npm warn allow-scripts   unrs-resolver@1.11.1 (postinstall: napi-postinstall unrs-resolver 1.11.1 check)
npm warn allow-scripts   workerd@1.20260515.1 (postinstall: node install.js)
npm warn allow-scripts   esbuild@0.27.3 (postinstall: node install.js)
npm warn allow-scripts
npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.
```

## lote0-typecheck.log
```text

> site-creator-vinext-starter@0.1.0 typecheck
> tsc --noEmit

```

## lote0-tests.log
```text

> site-creator-vinext-starter@0.1.0 test
> npm run build && node --experimental-strip-types --test tests/decimal-validation.test.ts tests/rendered-html.test.mjs tests/contact-links.test.mjs tests/barbershop-image-storage.test.mjs tests/public-booking-errors.test.mjs tests/panel-context-and-access-guards.test.mjs tests/supabase-migration-lineage.test.mjs


> site-creator-vinext-starter@0.1.0 build
> vinext build


  vinext build  (Vite 8.0.13)

[34m[1/5] analyze client references...[39m
[2Ktransforming...✓ 150 modules transformed.
rendering chunks...
[32m✓ built in 851ms[39m
[34m[2/5] analyze server references...[39m
[2Ktransforming...✓ 117 modules transformed.
rendering chunks...
[32m✓ built in 140ms[39m
[34m[3/5] build rsc environment...[39m
[2Ktransforming...✓ 156 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 393ms[39m
[34m[4/5] build client environment...[39m
[2Ktransforming...✓ 124 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 258ms[39m
[34m[5/5] build ssr environment...[39m
[2Ktransforming...✓ 123 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 398ms[39m
[0m
  Route (app)
  ┌ ? /                    
  ├ ƒ /:slug               
  ├ ? /barbearia-do-joao   
  ├ ? /cadastro-inicial    
  ├ ? /convite/equipe      
  ├ ? /entrar              
  ├ ? /meus-agendamentos   
  ├ ? /painel              
  ├ ? /painel/agenda       
  ├ ? /painel/assinatura   
  ├ ? /painel/clientes     
  ├ ? /painel/configurar   
  ├ ? /painel/inicio       
  ├ ? /painel/profissionais
  └ ? /painel/relatorios   

  ƒ Dynamic  ? Unknown

  ? Some routes could not be classified. vinext currently uses static analysis
    and cannot detect dynamic API usage (headers(), cookies(), etc.) at build time.
    Automatic classification will be improved in a future release.

  Build complete. Run `vinext start` to start the production server.

✔ keeps the barbershop image upload flow constrained to supported images (3.823607ms)
✔ creates tenant-isolated storage policies for barbershop images (1.292281ms)
✔ uses the uploaded storage path when authorizing barbershop image uploads (1.684749ms)
✔ normalizes Brazilian WhatsApp numbers and encodes the optional message (0.711357ms)
✔ rejects absent or invalid WhatsApp numbers (0.108281ms)
✔ builds safe Google Maps directions from a real address or a trusted custom URL (0.355563ms)
✔ normalizeCommissionRate normalizes and validates commission correctly (1.836711ms)
✔ getPanelContext resolves owner, manager, barber, and unlinked user contexts correctly (1.252805ms)
✔ getPanelContext fails closed when ownership or membership lookup errors (1.086905ms)
✔ strictly guards all administrative panel routes against barber role access (13.127022ms)
✔ barber self-service availability remains limited to the linked professional (1.617213ms)
✔ reports a missing booking RPC as environment configuration, not a slot conflict (0.643312ms)
✔ reports a real overlap as an unavailable slot (0.158411ms)
✔ does not present permission and schema failures as slot conflicts (0.148913ms)
✔ server-renders the BarbeariaSP landing page (91.744688ms)
✔ keeps the administrative navigation centered on every menu page (2.962041ms)
✔ keeps the public booking flow connected to its required data operations (1.733061ms)
✔ resolves administrative agenda access for owner, manager, and barber roles (0.996653ms)
✔ limits Meus agendamentos to the authenticated customer (0.75366ms)
✔ renders the saved public barbershop photo and keeps a safe fallback (0.884918ms)
✔ keeps customer details pending before public booking authentication (0.664386ms)
✔ keeps the initial registration private, validated, and separate from the public catalogue (1.205691ms)
✖ enforces 10-minute interval steps for public booking availability and validation (0.761406ms)
✖ defines team invitations schema, RLS policies, and RPC security controls (1.292041ms)
✔ implements the secure team invitation acceptance flow and panel team management UI (1.580922ms)
✔ masks team invitation emails before authentication and handles edge cases safely (1.104556ms)
✖ defines professional commission rate schema, RPC security controls, and management UI (0.486272ms)
✔ resolves team member role in panel routing and queries barbershop_id, role, and professional_id (1.327915ms)
✔ executable Supabase migrations match the reconciled remote lineage (2.501026ms)
ℹ tests 29
ℹ suites 0
ℹ pass 26
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 501.066071

✖ failing tests:

test at tests/rendered-html.test.mjs:195:1
✖ enforces 10-minute interval steps for public booking availability and validation (0.761406ms)
  Error: ENOENT: no such file or directory, open '/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/supabase/migrations/20260804013607_optimize_booking_intervals_10min.sql'
      at async open (node:internal/fs/promises:640:25)
      at async readFile (node:internal/fs/promises:1290:14)
      at async TestContext.<anonymous> (file:///home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/tests/rendered-html.test.mjs:196:21)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    errno: -2,
    code: 'ENOENT',
    syscall: 'open',
    path: '/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/supabase/migrations/20260804013607_optimize_booking_intervals_10min.sql'
  }

test at tests/rendered-html.test.mjs:206:1
✖ defines team invitations schema, RLS policies, and RPC security controls (1.292041ms)
  Error: ENOENT: no such file or directory, open '/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/supabase/migrations/20260804020000_add_team_invitations.sql'
      at async open (node:internal/fs/promises:640:25)
      at async readFile (node:internal/fs/promises:1290:14)
      at async TestContext.<anonymous> (file:///home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/tests/rendered-html.test.mjs:207:21)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    errno: -2,
    code: 'ENOENT',
    syscall: 'open',
    path: '/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/supabase/migrations/20260804020000_add_team_invitations.sql'
  }

test at tests/rendered-html.test.mjs:294:1
✖ defines professional commission rate schema, RPC security controls, and management UI (0.486272ms)
  Error: ENOENT: no such file or directory, open '/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/supabase/migrations/20260804060000_isolate_professional_commission.sql'
      at async open (node:internal/fs/promises:640:25)
      at async readFile (node:internal/fs/promises:1290:14)
      at async Promise.all (index 0)
      at async TestContext.<anonymous> (file:///home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/tests/rendered-html.test.mjs:295:35)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    errno: -2,
    code: 'ENOENT',
    syscall: 'open',
    path: '/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/supabase/migrations/20260804060000_isolate_professional_commission.sql'
  }
```

