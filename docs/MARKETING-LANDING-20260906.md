# Landing comercial do BarbeariaSP — 06/09/2026

## Estado

Implementada e validada localmente. Ainda não publicada nem homologada no domínio de produção.

## Escopo entregue

- nova página inicial comercial em `/`;
- fotografia principal com a marca `BarbeariaSP` aplicada como placa na parede;
- destaque principal reduzido e posicionado abaixo da placa, conforme revisão visual;
- apresentação da página pública, do agendamento e da área do cliente com imagens reais do conceito aprovado;
- cards de produto na proporção integral `853 / 1844`, sem recorte interno;
- explicação da jornada do cliente até a gestão da barbearia;
- recursos, segurança e privacidade, perguntas frequentes e chamada final;
- períodos mensal, trimestral, semestral e anual apresentados sem inventar preços;
- chamada para 30 dias de teste, direcionada à rota existente `/entrar`.
- leitura direta das duas variáveis públicas do Supabase no módulo compartilhado, permitindo que o Next.js as incorpore corretamente no cliente e que `/entrar` carregue no navegador.

## Limites desta entrega

- nenhum fluxo de cobrança, checkout, pagamento ou Pix foi criado;
- a landing passou a usar o catálogo comercial aprovado e compartilhado com a central de assinatura;
- a rota pública dinâmica `/{slug}` e as telas internas não foram redesenhadas neste lote;
- nenhuma migration, política RLS ou configuração remota do Supabase foi alterada;
- não houve commit, push nem publicação na Hostinger;
- sem as variáveis públicas do Supabase, a aplicação continua falhando de forma segura por configuração ausente; a prévia foi validada apenas com valores locais descartáveis, sem credenciais reais.

## Arquivos principais

- `app/page.tsx`
- `app/marketing-page.module.css`
- `public/marketing-barbershop-hero.png`
- `public/marketing-public-page.png`
- `public/marketing-booking-services.png`
- `public/marketing-customer-area.png`
- `tests/marketing-landing.test.mjs`

## Validação executada

- `npm.cmd run typecheck`: aprovado;
- `npm.cmd run lint`: aprovado;
- `npm.cmd run build`: aprovado, com pacote standalone preparado;
- `npm.cmd test`: 78 testes aprovados, 0 falhas;
- inspeção no navegador local: placa visível, conteúdo principal abaixo da marca, cards sem recorte interno, navegação por âncora, FAQ expansível e CTA abrindo `/entrar`.

## Próxima etapa recomendada

Definir a configuração visual da barbearia por tenant antes de alterar `app/[slug]`: identidade, capa, logo, cores, textos públicos, catálogo e regras de exibição. Depois disso, aplicar a mesma linguagem visual às páginas públicas sem modificar as regras homologadas do agendamento.
