# Arquitetura

BarbeariaSP é uma aplicação React/Next executada por Vinext/Vite. O Supabase fornece PostgreSQL, Auth e Storage; `@supabase/supabase-js` é usado diretamente pelas telas. `worker/index.ts` participa do runtime/build. Drizzle e D1 são remanescentes do template e não são o banco de produção.

| Componente | Estado | Responsabilidade |
|---|---|---|
| `app/[slug]/page.tsx` | IMPLEMENTADO | página pública, foto, catálogo, disponibilidade, reserva autenticada, WhatsApp e Maps |
| `app/entrar/page.tsx` | IMPLEMENTADO | Google e magic link com retorno ao painel |
| `app/painel/` | PARCIAL | dashboard, configuração, agenda e clientes reais; relatórios demonstrativos |
| Supabase PostgreSQL | IMPLEMENTADO | dados operacionais, RPCs, migrations e RLS |
| Supabase Storage | IMPLEMENTADO | foto pública da barbearia com escrita isolada por tenant |

## Tenancy, papéis e CRM

Cada dado operacional pertence a uma barbearia. RLS, e não filtros do navegador, impõe o isolamento. Os papéis administrativos são `owner`, `manager` e `barber`; `customer` não é membro administrativo.

`customers` representa o cliente global autenticado. `barbershop_customers` relaciona-o à barbearia e `barbershop_customer_history`, com `security_invoker`, calcula visitas, datas e receita concluída a partir de agendamentos e snapshots. Owner e manager leem o CRM da própria barbearia; barber não lê o CRM completo. A tela de clientes consulta esse histórico real. A tela de relatórios ainda usa dados demonstrativos.

## Página pública, imagem e contatos

O endereço público é `/{slug}`. O dashboard monta a URL com `window.location.origin + "/" + slug`, sem domínio fixo, e oferece abrir em nova aba ou copiar. Se não houver slug, não gera URL e encaminha às configurações somente por esse motivo.

A foto é validada no navegador (JPG, PNG ou WebP; até 3 MB), preserva proporção e é reduzida quando necessário. O arquivo é gravado em `barbershop-images/{barbershop-id}/{arquivo}`. A URL pública é persistida somente depois do upload e a imagem anterior é removida depois que a troca é bem-sucedida.

WhatsApp usa `wa.me` com número brasileiro normalizado e mensagem apenas preenchida. Maps usa `/maps/dir/?api=1&destination=` a partir do endereço, ou URL HTTPS validada do Google Maps. Não há API externa, geocodificação, mensagem automática ou chave de API no cliente.

## Reserva pública autenticada

O visitante seleciona serviços ativos, profissional, data e horário público. Em seguida, informa nome, telefone com DDD e os consentimentos opcionais. Antes da RPC de agendamento, o telefone é reduzido a dígitos e deve ter 10 ou 11 caracteres.

Se não houver sessão, a página grava a reserva pendente no `sessionStorage` e em `localStorage` do navegador. O espelhamento local permite a retomada quando o magic link é aberto em outra aba. O conteúdo contém somente slug, identificadores de serviços/profissional, horário, nome, telefone, consentimentos e `savedAt`; é descartado após 30 minutos, se o horário já passou ou depois da confirmação. O retorno de Google ou magic link restaura os dados, recarrega a disponibilidade por `get_public_availability` e apresenta o botão final. Somente `book_customer_appointment` cria o agendamento.

## Autenticação e navegação

O cliente Supabase recebe somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. No login administrativo, Google usa `signInWithOAuth` e e-mail usa `signInWithOtp` com retorno a `${window.location.origin}/painel`. Na reserva pública, ambos usam a URL pública atual, preservando a seleção de horário e permitindo a retomada após o callback.

O layout de `/painel` inclui os controles “Abrir painel de gestão” e “Sair”. Sair revoga apenas a sessão local e direciona a `/entrar`. O logotipo nas telas administrativas e o atalho de retorno direcionam a `/painel`. Agenda, Clientes e Relatórios mantêm a barra de navegação centralizada, inclusive quando os itens quebram em telas menores.
