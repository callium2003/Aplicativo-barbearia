# Sistema visual e relatórios — diagnóstico final

## install.log
```text

added 511 packages, and audited 512 packages in 20s

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

## typecheck.log
```text

> site-creator-vinext-starter@0.1.0 typecheck
> tsc --noEmit

```

## tests.log
```text

> site-creator-vinext-starter@0.1.0 test
> npm run build && node --experimental-strip-types --test tests/decimal-validation.test.ts tests/rendered-html.test.mjs tests/contact-links.test.mjs tests/barbershop-image-storage.test.mjs tests/public-booking-errors.test.mjs tests/panel-context-and-access-guards.test.mjs tests/supabase-migration-lineage.test.mjs tests/financial-reporting.test.mjs tests/product-ui-and-management-reports.test.mjs


> site-creator-vinext-starter@0.1.0 build
> vinext build


  vinext build  (Vite 8.0.13)

[34m[1/5] analyze client references...[39m
[2Ktransforming...✓ 153 modules transformed.
rendering chunks...
[32m✓ built in 732ms[39m
[34m[2/5] analyze server references...[39m
[2Ktransforming...✓ 119 modules transformed.
rendering chunks...
[32m✓ built in 225ms[39m
[34m[3/5] build rsc environment...[39m
[2Ktransforming...✓ 159 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 586ms[39m
[34m[4/5] build client environment...[39m
[2Ktransforming...✓ 126 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 383ms[39m
[34m[5/5] build ssr environment...[39m
[2Ktransforming...✓ 125 modules transformed.
rendering chunks...
computing gzip size...
[32m✓ built in 546ms[39m
[0m
  Route (app)
  ┌ ? /                    
  ├ ƒ /:slug               
  ├ ? /barbearia-do-joao   
  ├ ? /cadastro-inicial    
  ├ ? /cliente/entrar      
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

✔ keeps the barbershop image upload flow constrained to supported images (5.850808ms)
✔ creates tenant-isolated storage policies for barbershop images (1.91542ms)
✔ uses the uploaded storage path when authorizing barbershop image uploads (2.061004ms)
✔ normalizes Brazilian WhatsApp numbers and encodes the optional message (1.102082ms)
✔ rejects absent or invalid WhatsApp numbers (0.158959ms)
✔ builds safe Google Maps directions from a real address or a trusted custom URL (0.477397ms)
✔ normalizeCommissionRate normalizes and validates commission correctly (2.381275ms)
✔ commission ledger snapshots completed appointment finances and protects direct access (5.577894ms)
✔ financial report RPCs authorize management and keep anon blocked (2.185708ms)
✔ reports page uses real Supabase financial data instead of demo values (2.018013ms)
✔ getPanelContext resolves owner, manager, barber, and unlinked user contexts correctly (2.122088ms)
✔ getPanelContext fails closed when ownership or membership lookup errors (1.476114ms)
✔ strictly guards all administrative panel routes against barber role access (17.599856ms)
✔ barber self-service availability remains limited to the linked professional (2.177637ms)
✔ customer authentication is separated from management and requires WhatsApp profile completion (6.658906ms)
✔ agenda supports operational WhatsApp, no-show and protected barber self availability (2.516203ms)
✔ management reports provide market-aligned real metrics, filters and CSV exports (2.96571ms)
✔ report and customer profile RPCs enforce tenant roles and explicit grants (1.754918ms)
✔ premium product design system is shared across customer and management surfaces (2.622162ms)
✔ reports a missing booking RPC as environment configuration, not a slot conflict (1.100519ms)
✔ reports a real overlap as an unavailable slot (0.22894ms)
✔ does not present permission and schema failures as slot conflicts (0.219813ms)
✔ server-renders the BarbeariaSP landing page (141.628846ms)
✔ uses the shared premium administrative navigation on main management pages (6.004746ms)
✔ keeps the public booking flow connected to required data and consent operations (3.138673ms)
✔ resolves administrative agenda access for owner, manager and barber roles (2.183344ms)
✔ limits Meus agendamentos to the authenticated customer and dedicated customer login (1.605003ms)
✔ renders the saved public barbershop photo and safe fallback (1.080801ms)
✔ keeps customer details pending before public booking authentication (1.130464ms)
✔ keeps initial registration private, validated and separate from public catalogue (1.648148ms)
✔ enforces 10-minute interval steps for public booking availability (1.140493ms)
✔ defines team invitation schema and secure token flow (1.896268ms)
✔ masks team invitation emails before authentication (0.97885ms)
✔ defines professional commission rate security and management UI (2.928801ms)
✔ resolves team member role in panel routing (0.889602ms)
✔ executable Supabase migrations match the reconciled remote lineage (3.979981ms)
ℹ tests 36
ℹ suites 0
ℹ pass 36
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 863.182594
```

## lint.log
```text

> site-creator-vinext-starter@0.1.0 lint
> eslint . --ignore-pattern dist --ignore-pattern .next


/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/app/[slug]/page.tsx
  226:146  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/app/meus-agendamentos/page.tsx
   86:146  error  Error: Cannot call impure function during render

`Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/app/meus-agendamentos/page.tsx:86:146
  84 |   }, [load]);
  85 |
> 86 |   const upcoming = useMemo(() => items.filter((item) => ["scheduled", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() > Date.now()).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)), [items]);
     |                                                                                                                                                  ^^^^^^^^^^ Cannot call impure function
  87 |   const history = useMemo(() => items.filter((item) => !upcoming.some((future) => future.id === item.id)), [items, upcoming]);
  88 |   const visible = view === "upcoming" ? upcoming : history;
  89 |   const next = upcoming[0] || null;  react-hooks/purity
  169:122  error  Error: Cannot call impure function during render

`Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/app/meus-agendamentos/page.tsx:169:122
  167 |               const shop = item.barbershops[0];
  168 |               const wa = whatsapp(shop?.whatsapp, shop?.name);
> 169 |               const canChange = ["scheduled", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() > Date.now();
      |                                                                                                                          ^^^^^^^^^^ Cannot call impure function
  170 |               return <article className="customer-card customer-appointment" key={item.id}>
  171 |                 <div>
  172 |                   <h3>{shop?.name || "Barbearia"}</h3>                                                                          react-hooks/purity

/home/runner/work/Aplicativo-barbearia/Aplicativo-barbearia/app/painel/configurar/page.tsx
  1037:21  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

✖ 4 problems (2 errors, 2 warnings)

```
