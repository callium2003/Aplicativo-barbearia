# Estado atual do projeto

Atualizado em **05/09/2026**. Este documento prevalece sobre relatorios historicos quando houver divergencia.

Documentos consolidados relacionados: [TECHNICAL-SPEC-20260812.md](TECHNICAL-SPEC-20260812.md), [BUSINESS-RULES-20260812.md](BUSINESS-RULES-20260812.md), [FLOWS-20260812.md](FLOWS-20260812.md) e [RELEASE-STATUS-20260817.md](RELEASE-STATUS-20260817.md). Os documentos datados de 12/08 sao registros historicos.

## Consolidação local — 05/09/2026

Prioridades 1 resolvidas localmente: histórico integrado até `67e6b52`, arquivos de template preservados fora da aplicação, 49 migrations sem versões duplicadas, lint, tipos, build e 74 testes aprovados. Alterações locais ainda não commitadas/publicadas. Evidências e limites: [CONSOLIDACAO-LOCAL-20260905.md](CONSOLIDACAO-LOCAL-20260905.md).

## Entregue no codigo

- Next.js 16/React 19 com Supabase.
- Pagina publica, catalogo, disponibilidade, reserva autenticada e confirmacao final.
- Google e magic link; cliente com perfil e gerenciamento de reservas.
- Painel para dono/gestor: agenda, equipe, clientes, relatorios, comissoes, notificacoes e configuracoes.
- Area do profissional: agenda, disponibilidade e perfil publico.
- Fuso operacional `America/Sao_Paulo`.
- Notificacoes internas e infraestrutura versionada de entrega de e-mail.
- Preferências de marketing do cliente, separadas entre barbearia e aplicativo, com tela em `/meu-perfil`.
- Regra técnica de opt-in: marketing não pertence à reserva; ausência de evento é `false`, e alterações são append-only por escopo.
- Consentimento e direitos do titular integrados do GitHub; a correspondência com migrations e funções remotas não foi verificada nesta consolidação local.
- Navegacao responsiva por papel e inicio visual renovado da Gestao.
- Hardening de privacidade local em revisão: logs e falhas sanitizados, cliente Supabase público centralizado, validação de imagem/perfil e bloqueio de novas observações livres. O estado remoto não foi revalidado nesta consolidação.
- Direitos do titular implementados e validados localmente: portal autenticado, protocolos, exportação JSON própria, reautenticação e anonimização de dados relacionados. Os commits já estão integrados em main; publicação e homologação remotas não foram revalidadas nesta consolidação.
- Homologacao funcional confirmada pelo responsavel: ajustes de menus por perfil, agendamento, perfil do cliente e profissional, agenda e navegacao mobile; sino de notificacoes visivel e funcional; foto de profissional e recebimento de magic link tambem confirmados.
- Worker de notificacoes protegido contra repeticao de chamadas: assinatura HMAC-SHA-256, timestamp valido por cinco minutos e nonce reivindicado atomicamente antes do acesso a fila.

## Em homologacao

- Publicacao Next/Node na Hostinger concluida ate o build `019ff80d-3125-7125-bb35-cda7d5932e9f`; a pagina publica `/cullenbarber` foi confirmada externamente com HTTP 200. O pacote final contem apenas as duas variaveis publicas do Supabase necessarias no build, sem segredos administrativos.
- Disponibilidade: `/api/health` respondeu HTTP 200 com `status: ok` e `no-store` em 05/09/2026. A rota comprova resposta do Next, não a saúde do banco ou o funcionamento dos alertas.
- Verificacao de que o dominio entrega o commit e layout atuais, nao HTML/cache antigo.
- Revalidacao visual do catalogo publico com uma barbearia ativa: em 16/08, a URL historica `/cullenbarber` respondeu que a pagina nao foi encontrada. Confirmar o slug ativo e a origem dos dados antes de chamar a pagina publica de pronta.

## Ainda pendente

- Revisao visual de todas as telas internas, incluindo relatorios, configuracoes e manutencao; em especial, tabelas e indicadores em telas pequenas hoje dependem de rolagem horizontal.
- Limpeza do banco para novo ciclo de testes: aguardando publicacao e definicao final dos dados a preservar.
- Confirmar publicação e homologação do portal de direitos do titular já implementado; não reimplementar esse lote.
- Conferência remota de 06/09: Supabase tem 51 migrations (duas posteriores às 49 locais), o worker remoto ainda não reivindica nonce e o monitor/worker registraram HTTP 500 por configuração indisponível no `pg_net`; ver detalhes em [CONSOLIDACAO-LOCAL-20260905.md](CONSOLIDACAO-LOCAL-20260905.md).
- As duas migrations remotas de 28/08 foram incorporadas localmente com seus nomes/versionamentos originais; falta apenas validar a suíte e publicar a árvore atualizada.
- Lotes posteriores: retenção e descarte; matriz granular de permissões; revisão de `SECURITY DEFINER` e grants; secret scanning; processador único de e-mail; documentos legais; definição de controlador, operador e canal de privacidade; bases legais e contratos. A decisão sobre observações legadas permanece aberta.
- A adequação à LGPD não está concluída: depende dos fluxos de direitos, das definições operacionais e da revisão jurídica final.

## Fora do escopo atual

- planos, assinatura, cobranca, checkout, pagamento e Pix;
- WhatsApp Business API e campanhas.

## Nao fazer sem autorizacao especifica

- alterar schema remoto ou RLS;
- executar migration, reset ou repair no Supabase;
- apagar dados, imagens ou configuracoes de hospedagem;
- publicar como producao;
- incluir credenciais no repositorio.
