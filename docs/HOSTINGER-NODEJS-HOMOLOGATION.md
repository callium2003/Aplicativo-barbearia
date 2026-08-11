# Homologacao na Hostinger (Node.js / Next.js)

Status: **PRONTO PARA CONFIGURACAO NO NODE.JS WEB APP** em 2026-08-10.

O BarbeariaSP usa Next.js com a rota dinamica `/<slug>`. Ele deve ser publicado
no recurso **Node.js Web App** da Hostinger, que gerencia o build e o processo
Node.js para aplicacoes Next.js. VPS e uma alternativa, mas nao e obrigatoria.

## Pre-requisitos

- Plano Hostinger com Node.js Web App habilitado (Business ou Cloud compativel),
  ou uma VPS como alternativa.
- Node.js 22.x selecionado no hPanel.
- Dominio `barbeariasp.cullentech.com.br` associado ao aplicativo Node.js.
- Certificado SSL ativo.
- As variaveis abaixo cadastradas somente no servidor, nunca no Git:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Publicacao de homologacao pelo hPanel

1. No hPanel, abra **Websites > Add website > Deploy Web App**.
2. Conecte o repositorio GitHub da versao aprovada ou envie o ZIP do projeto.
3. Selecione o framework **Next.js** e Node.js **22.x**.
4. Use os comandos abaixo se o painel solicitar configuracao manual:

```bash
npm ci
npm run build
npm run start
```

5. Cadastre as variaveis de ambiente no hPanel e clique em **Deploy**.
6. Associe `barbeariasp.cullentech.com.br` ao aplicativo Node.js.

Depois do deploy, teste:

```bash
curl -I https://barbeariasp.cullentech.com.br/
```

O primeiro resultado esperado e `HTTP/2 200` (nao `403`). Se o painel mostrar
`403` apos a publicacao, faca um redeploy: a Hostinger recria o encaminhamento
para a pasta Node.js automaticamente.

## Verificacao apos publicar

1. Abrir a pagina inicial e os dois logins.
2. Entrar como proprietario, gerente, barbeiro e cliente em contas de teste.
3. Confirmar que gerente nao ve os dados cadastrais privados do proprietario.
4. Criar e cancelar uma reserva de teste, conferindo os horarios em Sao Paulo.
5. Conferir os logs do PM2 e da Hostinger antes de disponibilizar o endereco.

Nao configure pagamentos, planos cobraveis ou e-mail transacional como parte
desta homologacao.
