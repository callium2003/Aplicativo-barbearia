# Estado atual do projeto

Atualizado em **28/08/2026**. Este documento prevalece sobre relatorios historicos quando houver divergencia.

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
- Consentimento de marketing desacoplado da reserva; a sobrecarga legada ambígua da RPC foi removida do Supabase remoto em 28/08/2026.
- Navegacao responsiva por papel e inicio visual renovado da Gestao.
- Hardening de privacidade aplicado: logs e falhas sanitizados, cliente Supabase público centralizado, validação de imagem/perfil e bloqueio de novas observações livres.
- Direitos do titular implementados: portal autenticado, protocolos, exportação JSON própria, reautenticação e exclusão da conta. Agendamentos futuros são removidos; somente atendimentos concluídos e passados permanecem anonimizados como histórico da barbearia.
- Troca de conta disponível na página pública, inclusive quando uma conta de gestão abre o link de agendamento.
- Pausas recorrentes são exibidas em formato legível, por exemplo `Qua: 13h às 14h`.

## Em homologacao

- O código deste lote passou por lint, typecheck, build, 72 testes automatizados e revisão Codex Security sem achados reportáveis. A publicação atualizada na Hostinger ainda depende da confirmação específica do deploy.
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
- Lotes posteriores: matriz granular de permissões; revisão ampla das demais funções `SECURITY DEFINER` e grants; secret scanning; processador único de e-mail; documentos legais; definição de controlador, operador e canal de privacidade; bases legais e contratos. A decisão sobre observações legadas permanece aberta.
- A adequação à LGPD não está concluída: depende dos fluxos de direitos, das definições operacionais e da revisão jurídica final.

## Nao fazer sem autorizacao especifica

- alterar schema remoto ou RLS;
- executar migration, reset ou repair no Supabase;
- apagar dados, imagens ou configuracoes de hospedagem;
- publicar como producao;
- incluir credenciais no repositorio.
