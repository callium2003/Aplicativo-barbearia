# Deploy de homologação na Hostinger

Alvo: `https://barbeariasp.cullentech.com.br`

Este documento descreve o deploy temporário de homologação do BarbeariaSP como aplicação Node.js na Hostinger, usando o repositório privado do GitHub e o Supabase remoto já existente.

## Fonte do deploy

- Repositório: `callium2003/Aplicativo-barbearia`
- Branch: `feat/notification-center-and-preferences-2026-08-08`
- Não usar `main` nesta homologação.

## Runtime e build

O projeto usa Vinext/Next e foi preparado para self-hosting Node.js por bundle standalone.

Configuração recomendada no hPanel:

- Framework: `Other` se Vinext não for detectado automaticamente;
- Node.js: `24.x`;
- Package manager: `npm`;
- Install: `npm ci`;
- Build: `npm run build`;
- Start: `npm run start`;
- Output directory: `dist/standalone`;
- Entry file, se solicitado: `dist/standalone/server.js`.

`next.config.ts` usa `output: "standalone"` e `npm start` executa `node dist/standalone/server.js`.

A Hostinger deve fornecer `PORT` ao processo Node. O servidor standalone do Vinext respeita `PORT`; não fixar uma porta pública no repositório.

## Variáveis de ambiente da Hostinger

Adicionar no hPanel, durante o build/deploy:

```text
VITE_SUPABASE_URL=<URL pública do projeto Supabase>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key pública do projeto Supabase>
NODE_ENV=production
HOST=0.0.0.0
```

As variáveis `VITE_*` são necessárias durante o build porque o frontend as consome por `import.meta.env`.

### Não adicionar na Hostinger

Não colocar no hPanel da aplicação web:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `RESEND_API_KEY`;
- `barbeariasp_resend_api_key`;
- `barbeariasp_notification_cron_secret`;
- qualquer valor secreto do Supabase Vault.

A entrega de e-mail do produto é executada pelo Supabase remoto:

`notification_outbox → pg_cron/pg_net → Edge Function process-notifications → Resend`.

A Hostinger não participa desse fluxo de envio.

## Resend e Hostinger Mail

- remetente oficial: `notificacoes@barbeariasp.cullentech.com.br`;
- domínio do Resend verificado;
- DKIM e SPF verificados;
- caixa correspondente existe na Hostinger Mail;
- nenhuma chave do Resend precisa estar no servidor Hostinger.

## Supabase Auth antes da homologação pública

O endereço publicado precisa ser permitido nos redirects do Supabase Auth para Google e magic link.

Origem esperada:

```text
https://barbeariasp.cullentech.com.br
```

Rotas usadas pela aplicação incluem retorno para `/painel`, página pública da barbearia, Área do Cliente e fluxo de convite. A configuração remota de Auth deve aceitar a origem HTTPS de homologação antes de validar login externo.

## Checklist pós-deploy

1. Abrir `https://barbeariasp.cullentech.com.br` em desktop e mobile.
2. Testar login administrativo por Google.
3. Testar magic link administrativo.
4. Testar login/Área do Cliente.
5. Testar uma página pública `/{slug}`.
6. Testar um novo agendamento.
7. Confirmar que o horário reservado deixa de aparecer como disponível.
8. Testar manager e barber conforme matriz de permissões.
9. Criar/usar uma segunda barbearia para validar isolamento A × B.
10. Validar notificação interna e e-mail.
11. Validar lembrete de 24h em cenário controlado.

## Encerramento da homologação

Ao finalizar esta rodada, remover apenas o deploy/arquivos da aplicação Node.js de homologação conforme a estratégia de publicação definida. Preservar:

- DNS/subdomínio;
- registros de e-mail/DKIM/SPF;
- Hostinger Mail;
- Supabase e migrations;
- Edge Function/Cron/Vault;
- Resend.

Não excluir infraestrutura de e-mail ou banco ao limpar o frontend publicado.
