# Lote 12 — diagnóstico de falha

## lote12-install.log
```text

added 511 packages, and audited 512 packages in 14s

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

## lote12-typecheck.log
```text

> site-creator-vinext-starter@0.1.0 typecheck
> tsc --noEmit

```

## lote12-tests.log
```text

> site-creator-vinext-starter@0.1.0 test
> npm run build && node --experimental-strip-types --test tests/decimal-validation.test.ts tests/rendered-html.test.mjs tests/contact-links.test.mjs tests/barbershop-image-storage.test.mjs tests/public-booking-errors.test.mjs tests/panel-context-and-access-guards.test.mjs tests/supabase-migration-lineage.test.mjs tests/financial-reporting.test.mjs


> site-creator-vinext-starter@0.1.0 build
> vinext build


  vinext build  (Vite 8.0.13)

[34m[1/5] analyze client references...[39m
[2Ktransforming...✓ 150 modules transformed.
rendering chunks...
[32m✓ built in 748ms[39m
[34m[2/5] analyze server references...[39m
[2Ktransforming...✓ 117 modules transformed.
rendering chunks...
[32m✓ built in 170ms[39m
[34m[3/5] build rsc environment...[39m
[2Ktransforming...✓ 156 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 461ms[39m
[34m[4/5] build client environment...[39m
[2Ktransforming...✓ 124 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 494ms[39m
[34m[5/5] build ssr environment...[39m
[2Ktransforming...✓ 123 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 463ms[39m
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

✔ keeps the barbershop image upload flow constrained to supported images (5.245401ms)
✔ creates tenant-isolated storage policies for barbershop images (1.823616ms)
✔ uses the uploaded storage path when authorizing barbershop image uploads (1.524356ms)
✔ normalizes Brazilian WhatsApp numbers and encodes the optional message (0.7767ms)
✔ rejects absent or invalid WhatsApp numbers (0.114969ms)
✔ builds safe Google Maps directions from a real address or a trusted custom URL (0.393387ms)
✔ normalizeCommissionRate normalizes and validates commission correctly (1.879387ms)
✔ commission ledger snapshots completed appointment finances and protects direct access (3.808932ms)
✔ financial report RPCs authorize management and keep anon blocked (1.613152ms)
✔ reports page uses real Supabase financial data instead of demo values (1.75538ms)
✔ getPanelContext resolves owner, manager, barber, and unlinked user contexts correctly (1.531937ms)
✔ getPanelContext fails closed when ownership or membership lookup errors (1.273778ms)
✔ strictly guards all administrative panel routes against barber role access (6.657507ms)
✔ barber self-service availability remains limited to the linked professional (5.192036ms)
✔ reports a missing booking RPC as environment configuration, not a slot conflict (0.776569ms)
✔ reports a real overlap as an unavailable slot (0.176729ms)
✔ does not present permission and schema failures as slot conflicts (0.165593ms)
✔ server-renders the BarbeariaSP landing page (100.245214ms)
✔ keeps the administrative navigation centered on every menu page (5.38917ms)
✔ keeps the public booking flow connected to its required data operations (2.035196ms)
✔ resolves administrative agenda access for owner, manager, and barber roles (1.157708ms)
✔ limits Meus agendamentos to the authenticated customer (1.667086ms)
✔ renders the saved public barbershop photo and keeps a safe fallback (0.766595ms)
✔ keeps customer details pending before public booking authentication (0.91392ms)
✔ keeps the initial registration private, validated, and separate from the public catalogue (1.692063ms)
✔ enforces 10-minute interval steps for public booking availability and validation (0.956513ms)
✔ defines team invitations schema, RLS policies, and RPC security controls (2.046673ms)
✔ implements the secure team invitation acceptance flow and panel team management UI (1.495114ms)
✔ masks team invitation emails before authentication and handles edge cases safely (0.839913ms)
✔ defines professional commission rate schema, RPC security controls, and management UI (1.212679ms)
✔ resolves team member role in panel routing and queries barbershop_id, role, and professional_id (1.003522ms)
✔ executable Supabase migrations match the reconciled remote lineage (2.807685ms)
ℹ tests 32
ℹ suites 0
ℹ pass 32
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 611.443653
```

## lote12-lint.log
```text

> site-creator-vinext-starter@0.1.0 lint
> eslint . --ignore-pattern dist --ignore-pattern .next


/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/app/[slug]/page.tsx
  226:146  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/app/painel/configurar/page.tsx
  1037:21  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

✖ 2 problems (0 errors, 2 warnings)

```

## lote12-build.log
```text

> site-creator-vinext-starter@0.1.0 build
> vinext build


  vinext build  (Vite 8.0.13)

[34m[1/5] analyze client references...[39m
[2Ktransforming...✓ 150 modules transformed.
rendering chunks...
[32m✓ built in 389ms[39m
[34m[2/5] analyze server references...[39m
[2Ktransforming...✓ 117 modules transformed.
rendering chunks...
[32m✓ built in 153ms[39m
[34m[3/5] build rsc environment...[39m
[2Ktransforming...✓ 156 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 426ms[39m
[34m[4/5] build client environment...[39m
[2Ktransforming...✓ 124 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 279ms[39m
[34m[5/5] build ssr environment...[39m
[2Ktransforming...✓ 123 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 405ms[39m
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

```

