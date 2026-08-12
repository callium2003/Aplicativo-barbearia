# Registro de deploy de homologacao

Este arquivo e um registro operacional; a configuracao vigente esta em [HOSTINGER-NODEJS-HOMOLOGATION.md](HOSTINGER-NODEJS-HOMOLOGATION.md).

## 11/08/2026

- Commit enviado: `d38d604` (`fix: harden customer booking and mobile navigation`).
- Build Hostinger concluído: `019ff2b1-e7be-70ee-aacb-7b2ad5dd0bf2` em Node 22.
- Commit enviado: `feb9751` (`fix: align mobile landing navigation`).
- Build Hostinger concluído: `019ff2b7-6a67-72dd-8d95-63363845c320` em Node 22; validação visual a 390 px confirmou os quatro atalhos do menu inicial.
- Publicação gerada a partir de arquivo temporário do commit, sem `.env.local`, `node_modules`, `.next` ou a alteração local pré-existente de `package-lock.json`.
- Domínio respondeu HTTP 200 após a publicação, com cache normal ativo (`x-hcdn-cache-status: DYNAMIC`). A validação funcional autenticada continua pendente.
- Commit enviado: `e8e5dff` (`fix: return customers from panel routes`). Build Hostinger `019ff2ca-e2c0-709b-90a3-d1ed4cdbc5c2` concluído em Node 22.
- Commit enviado: `73ac0a4` (`fix: prevent long public shop names from wrapping poorly`). Build Hostinger `019ff2cf-4746-730b-9475-6462c62db908` concluído em Node 22.
- Commit enviado: `07c9415` (`fix: clarify optional marketing opt-out`). Build Hostinger `019ff2d1-b6c1-706f-94b4-16ff2c422002` concluído em Node 22.
- Commit enviado: `20c9598` (`fix: compact next customer appointment card`). Build Hostinger `019ff2d6-66a8-7141-9fc8-3b9d8a1360eb` concluído em Node 22.
- Commit enviado: `e5eb93a` (`fix: place panel sign out control in header`). Build Hostinger `019ff2d9-4b8f-7282-94c0-e94f7b97ec90` concluído em Node 22.
- Commit enviado: `b561adb` (`fix: compact settings forms on mobile`). Build Hostinger `019ff2f5-af18-7325-a6ff-68872130b8be` concluído em Node 22. A rota de saúde continuou respondendo HTTP 200 após a publicação, com `cache-control: no-store`.
- Commit enviado: `e5848cd` (`chore: refresh lint tooling and panel effects`). Build Hostinger `019ff311-df2f-706c-ab83-c9ab8456a486` concluído em Node 22. A rota de saúde respondeu HTTP 200 após a publicação, com `cache-control: no-store` e sem exposição de dados.
- Commit enviado: `7ffeb89` (`perf: optimize public storage images`). Build Hostinger `019ff326-19f9-7159-8d43-607abc7836b4` concluído em Node 22. A rota de saúde respondeu HTTP 200 e a página pública carregou a foto pelo endpoint `/_next/image`, apontando somente para o Storage Supabase autorizado.
- Commit enviado: `63c0198` (`docs: make homologation checklist executable`). Build Hostinger `019ff458-d0c9-731c-889c-028b63132059` concluído em Node 22. A checagem versionada `npm run health:check` confirmou HTTP 200 em 12/08/2026, com `cache-control: no-store`.

- Dominio: `barbeariasp.cullentech.com.br`.
- Commit enviado: `5e457f0` (`fix: package Next standalone output for Hostinger`).
- Build Hostinger concluido: `019ff1f4-205e-72c1-baf6-7e2f7449a716`.
- Configuracao detectada: Next.js, Node 22, npm, build `build`, output `.next`.
- Tentativa anterior falhou ao procurar `package.json` em `.next/standalone`; esse erro motivou o empacotamento auxiliar do standalone.
- O dominio retornou HTTP 200, mas foi relatada entrega visual da versao antiga. O deploy nao deve ser considerado validado ate a conferencia do conteudo entregue no navegador.

## Regra de limpeza

Arquivos de upload devem ser criados em pasta temporaria e removidos apos envio. Nao enviar `.env.local`, `node_modules`, `.next`, logs, credenciais ou diretorios de trabalho para a Hostinger.
