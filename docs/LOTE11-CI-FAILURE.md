# Lote 11 — diagnóstico de falha

O workflow temporário falhou após a tentativa de regenerar/validar o lockfile.

## lote11-install.log
```text

added 511 packages, and audited 512 packages in 22s

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

## lote11-typecheck.log
```text

> site-creator-vinext-starter@0.1.0 typecheck
> tsc --noEmit

db/index.ts(2,25): error TS2307: Cannot find module 'drizzle-orm/d1' or its corresponding type declarations.
db/index.ts(3,25): error TS2307: Cannot find module './schema' or its corresponding type declarations.
examples/d1/app/api/notes/route.ts(1,22): error TS2307: Cannot find module 'drizzle-orm' or its corresponding type declarations.
examples/d1/app/api/notes/route.ts(3,23): error TS2307: Cannot find module '../../../db/schema' or its corresponding type declarations.
vite.config.ts(4,23): error TS2307: Cannot find module './build/sites-vite-plugin' or its corresponding type declarations.
```

