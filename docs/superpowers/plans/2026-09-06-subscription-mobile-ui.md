# Plano de implementação — central de assinatura mobile

**Objetivo:** entregar as páginas visuais aprovadas para publicação com o aplicativo; integrar pagamentos em lote posterior.
**Referência:** ../../ASSINATURAS-E-COBRANCA.md e aprovação do conjunto de telas na conversa de 06/09/2026.
**Arquitetura:** layout autenticado compartilhado, contexto somente de leitura das tabelas existentes, componentes visuais reutilizados na prévia local. Catálogo único para landing e planos. Nenhuma mutação financeira ou de acesso neste lote.
**Tecnologias:** Next.js 16.3.1, React 19, TypeScript, Supabase existente, CSS Modules e PanelShell.

## Restrições
- Preservar alterações locais, fluxos homologados, RLS e banco remoto.
- Prioridade mobile, mesma tipografia, cores e navegação da gestão.
- Planos em centavos; máximo de parcelas validado; sem prometer juros ou renovação automática.
- Dados ausentes, erro e integração indisponível têm estados distintos. Não inferir expurgo pelo relógio nem afirmar pagamento por retorno de URL.
- Prévia usa apenas dados fictícios, rota indisponível no build de produção.
- Não fazer commit, push ou deploy.

## Sequência
- [x] Catálogo e apresentação de estados: testar parcelas inexatas, planos inválidos, datas ausentes e cancelamento com período pago válido.
- [x] Layout/consulta autenticada: limitar consulta financeira ao proprietário, preservar RLS, erros sanitizados com retry e sessão revalidada.
- [x] Central, planos, contratação, confirmação, cobranças, cancelamento e dados: compor telas móveis com ações externas indisponíveis e explicações claras.
- [x] Atualizar entrada nas Configurações e landing com catálogo único.
- [x] Conferir prévia móvel/desktop, navegação real, proteção da prévia em produção, testes, lint, typecheck e build standalone.
- [x] Registrar arquivos, resultados e limites para o agente de publicação.

## Critério de entrega
Todas as páginas navegáveis e visualmente verificadas. Cobrança, cancelamento, aceite contratual e exportação do tenant não são apresentados como executados. Autorizações no servidor, conciliação Asaas e retenção permanecem para integração posterior.
