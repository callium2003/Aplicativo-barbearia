# Registro de deploy de homologacao

Este arquivo e um registro operacional; a configuracao vigente esta em [HOSTINGER-NODEJS-HOMOLOGATION.md](HOSTINGER-NODEJS-HOMOLOGATION.md).

## Publicacao concluida — 12/08/2026

- Build Hostinger: `019ff80d-3125-7125-bb35-cda7d5932e9f`, concluido em Node 22.
- Validacao externa: `https://barbeariasp.cullentech.com.br/cullenbarber` respondeu HTTP 200, com o conteudo publico da CullenBarber e sem a tela de pagina nao encontrada.
- Correcao operacional: o workspace temporario `hbuilds` foi recriado por SSH apos autorizacao, e o pacote foi enviado em `tar.gz` com permissoes Unix explicitas. Isso eliminou o `EACCES` que impedia a leitura da arvore de fontes pelo builder.
- Variaveis: a Hostinger manteve `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` cadastradas no painel, mas nao as disponibilizou ao processo de build. O pacote de build recebeu somente essas duas variaveis publicas em `.env.production`; nenhuma chave de servico, Resend, cron ou segredo administrativo foi enviada.
- Escopo publicado: ajustes visuais da agenda do cliente e a secao "Minhas barbearias" no perfil do cliente.

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
- Commit enviado: `23ee740` (`feat: refine notification and team access controls`). Build Hostinger `019ff49f-6b1f-71ec-ac27-0347275e071f` concluído em Node 22 em 12/08/2026. A checagem versionada confirmou HTTP 200 após a publicação.

- Dominio: `barbeariasp.cullentech.com.br`.
- Commit enviado: `5e457f0` (`fix: package Next standalone output for Hostinger`).
- Build Hostinger concluido: `019ff1f4-205e-72c1-baf6-7e2f7449a716`.
- Configuracao detectada: Next.js, Node 22, npm, build `build`, output `.next`.
- Tentativa anterior falhou ao procurar `package.json` em `.next/standalone`; esse erro motivou o empacotamento auxiliar do standalone.
- O dominio retornou HTTP 200, mas foi relatada entrega visual da versao antiga. O deploy nao deve ser considerado validado ate a conferencia do conteudo entregue no navegador.

## Deploy mais recente — 12/08/2026

- Commit: `9f658a9` (`fix: refine professional public access and profile flow`).
- Build Hostinger: `019ff4bf-b913-70a0-9f82-64f312879af2`, concluído em Node 22.
- Validação: `npm run health:check -- https://barbeariasp.cullentech.com.br/api/health` confirmou HTTP 200 e `cache-control: no-store`.

## Deploy mais recente — auditoria de atividade

- Commit publicado: `5b07737` (inclui a implementação `cfc6059` de auditoria transacional).
- Build Hostinger: `019ff4df-aed0-739b-9b16-9b116fd0dd69`, concluído em Node 22.
- Validação: `npm run health:check -- https://barbeariasp.cullentech.com.br/api/health` confirmou HTTP 200 em 12/08/2026.

## Deploy mais recente — hardening de segurança

- Commit publicado: `fa447f0` (`security: harden public professional view`).
- Build Hostinger: `019ff4f0-48bd-701a-a769-8a0007d46703`, concluído em Node 22.
- Validação: health check em `/api/health` confirmou HTTP 200 em 12/08/2026.

## Regra de limpeza

Arquivos de upload devem ser criados em pasta temporaria e removidos apos envio. Nao enviar `.env.local`, `node_modules`, `.next`, logs, credenciais ou diretorios de trabalho para a Hostinger.

## Registro historico superado — preferencias do cliente — 12/08/2026

- Build Hostinger concluido: `019ff528-ab05-7036-a6b1-839cb68528cb`.
- Node 22, Next.js, npm, build `build`, output `.next`.
- O pacote final foi gerado em `tar.gz` fora da pasta sincronizada pelo OneDrive.
- Para evitar o erro de permissao do builder em `app/api/health`, a implementacao foi movida para `app/api/platform-status` e `next.config.ts` preserva a URL publica por rewrite de `/api/health` para `/api/platform-status`.
- Validacao publicada em 12/08/2026: `https://barbeariasp.cullentech.com.br/api/health` respondeu HTTP 200, JSON `status: ok` e `Cache-Control: no-store, max-age=0`.
- A tela de preferencias em `/meu-perfil` e as alteracoes do agendamento agora estao na versao publicada.
- Este registro descreve uma tentativa anterior. O estado vigente esta no topo deste arquivo: o build `019ff80d-3125-7125-bb35-cda7d5932e9f` deixou `/api/health` indisponivel e requer restauracao explicita no proximo deploy.

## Tentativa de publicacao das preferencias do cliente — 12/08/2026

- A versao local inclui a tela de preferencias de comunicacao em `/meu-perfil` e as migrations de consentimento aplicadas no Supabase remoto de homologacao.
- A Hostinger detectou corretamente Node 22, Next.js, npm, build `build` e output `.next`.
- Builds tentados: `019ff50f-5233-72be-a76c-83745732a267`, `019ff510-d390-7326-8e1d-5a8d39c50e95`, `019ff512-9b64-71f0-bd44-e47b9fddc5d8`, `019ff514-227d-72ba-94d0-179975af66d3` e `019ff515-b279-7124-b739-98d1ef69e477`.
- Todos falharam antes da compilacao por `EACCES: permission denied, scandir '/home/u473936226/domains/barbeariasp.cullentech.com.br/hbuilds/source/app/api/health'`.
- Diagnostico atual: o pacote originado na pasta sincronizada pelo OneDrive carrega o diretorio `app/api/health` como reparse point/permissao incompatível com o builder da Hostinger. A nova versao nao deve ser considerada publicada.
- Estado seguro: a versao anterior continua ativa; nenhum dado foi apagado durante as tentativas.
