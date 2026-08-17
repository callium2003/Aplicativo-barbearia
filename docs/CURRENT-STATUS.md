# Estado atual do projeto

Atualizado em **12/08/2026**. Este documento prevalece sobre relatorios historicos quando houver divergencia.

Documentos consolidados relacionados: [TECHNICAL-SPEC-20260812.md](TECHNICAL-SPEC-20260812.md), [BUSINESS-RULES-20260812.md](BUSINESS-RULES-20260812.md), [FLOWS-20260812.md](FLOWS-20260812.md) e [RELEASE-STATUS-20260812.md](RELEASE-STATUS-20260812.md).

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
- A migration local de desacoplamento de consentimento aguarda autorização específica para aplicação no Supabase remoto de homologação.
- Navegacao responsiva por papel e inicio visual renovado da Gestao.

## Em homologacao

- Publicacao Next/Node na Hostinger concluida ate o build `019ff80d-3125-7125-bb35-cda7d5932e9f`; a pagina publica `/cullenbarber` foi confirmada externamente com HTTP 200. O pacote final contem apenas as duas variaveis publicas do Supabase necessarias no build, sem segredos administrativos.
- Monitoramento de disponibilidade: a rota publica `/api/health` responde HTTP 404 na versao publicada de emergencia. A funcao de monitoramento do Supabase continua ativa, registra a falha e exige restauracao da rota em um proximo deploy antes de considerar este controle operacional.
- Verificacao de que o dominio entrega o commit e layout atuais, nao HTML/cache antigo.
- Fluxos reais de login, reserva, cancelar/remarcar, agenda e isolamento de tenant.
- Upload de imagem da barbearia e foto do profissional confirmados pelo usuario.
- Entrega de e-mail em caixa real e configuracao SMTP/Auth de producao.

## Ainda pendente

- Revisao visual de todas as telas internas, incluindo relatorios, configuracoes e manutencao.
- Feedback padronizado de salvar/carregar/erro e melhorias de cards/agenda em mobile.
- Regras e tela comercial de planos, assinatura, pagamento e Pix.
- Limpeza do banco para novo ciclo de testes: aguardando publicacao e definicao final dos dados a preservar.

## Nao fazer sem autorizacao especifica

- alterar schema remoto ou RLS;
- executar migration, reset ou repair no Supabase;
- apagar dados, imagens ou configuracoes de hospedagem;
- publicar como producao;
- incluir credenciais no repositorio.
