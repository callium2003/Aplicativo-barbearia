# Homologacao Hostinger — Node.js / Next.js

Alvo de teste: `https://barbeariasp.cullentech.com.br`

## Estado em 11/08/2026

- A Hostinger reconhece o projeto como **Next.js** e o build com Node 22 foi concluido.
- O codigo possui `output: "standalone"` e prepara o bundle para os dois modos de inicializacao usados pelo painel.
- O dominio respondeu HTTP 200 durante a verificacao, mas o usuario relatou que a interface entregue era a versao antiga. Portanto, a homologacao visual/publicacao esta **pendente**, mesmo com build concluido.
- O modo cacheless foi ativado temporariamente para testes; desative-o ao encerrar a investigacao.

## Configuracao correta

| Item | Valor |
| --- | --- |
| Tipo | Aplicacao Node.js / Next.js |
| Node.js | 22.x |
| Gerenciador | npm |
| Build | `npm run build` |
| Inicio | `npm run start` no projeto, ou `node server.js` quando o hPanel iniciar o bundle standalone |
| Saida aceita | `.next` pelo detector automatico; `.next/standalone` quando o painel exigir bundle standalone |

Variaveis no hPanel:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NODE_ENV=production
HOST=0.0.0.0
```

Nao cadastrar na Hostinger: `SUPABASE_SERVICE_ROLE_KEY`, chave Resend, segredo do Cron ou valores do Vault.

## Publicacao limpa por ZIP

Use um ZIP criado do commit aprovado, contendo apenas arquivos rastreados. Excluir `.env.local`, `.next`, `node_modules`, `.git`, logs e artefatos locais. Exemplo:

```powershell
git archive --format=zip --output "$env:TEMP\BarbeariaSP-Hostinger-Test.zip" <commit>
```

O build da Hostinger instala dependencias e gera a saida. O arquivo temporario deve ser removido apos upload.

## Verificacao obrigatoria apos deploy

1. Confirmar no hPanel a implantacao ativa e o log de build/runtime.
2. Abrir o dominio em janela anonima e validar um marcador visual exclusivo do commit.
3. Conferir `curl -I` e headers de cache; HTTP 200 nao confirma a versao do HTML.
4. Se aparecer codigo antigo, verificar deployment ativo, cache/CDN, diretorio de saida, origem do ZIP e dominio associado antes de reenviar.
5. Testar Google, magic link, pagina `/{slug}`, reserva, cancelar/remarcar, agenda, perfis e isolamento de duas barbearias.

Nao marcar como producao enquanto essa lista nao estiver concluida.
