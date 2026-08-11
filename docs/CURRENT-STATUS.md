# Estado atual do projeto

Atualizado em **11/08/2026**. Este documento prevalece sobre relatorios historicos quando houver divergencia.

## Entregue no codigo

- Next.js 16/React 19 com Supabase.
- Pagina publica, catalogo, disponibilidade, reserva autenticada e confirmacao final.
- Google e magic link; cliente com perfil e gerenciamento de reservas.
- Painel para dono/gestor: agenda, equipe, clientes, relatorios, comissoes, notificacoes e configuracoes.
- Area do profissional: agenda, disponibilidade e perfil publico.
- Fuso operacional `America/Sao_Paulo`.
- Notificacoes internas e infraestrutura versionada de entrega de e-mail.
- Navegacao responsiva por papel e inicio visual renovado da Gestao.

## Em homologacao

- Publicacao Next/Node na Hostinger.
- Verificacao de que o dominio entrega o commit e layout atuais, nao HTML/cache antigo.
- Fluxos reais de login, reserva, cancelar/remarcar, agenda e isolamento de tenant.
- Upload de imagem da barbearia apos relato de erro de RLS.
- Entrega de e-mail em caixa real e configuracao SMTP/Auth de producao.

## Ainda pendente

- Revisao visual de todas as telas internas, incluindo relatorios, configuracoes e manutencao.
- Feedback padronizado de salvar/carregar/erro e melhorias de cards/agenda em mobile.
- Regras e tela comercial de planos, assinatura, pagamento e Pix.
- Backup, observabilidade, monitoramento e checklist de producao.

## Nao fazer sem autorizacao especifica

- alterar schema remoto ou RLS;
- executar migration, reset ou repair no Supabase;
- apagar dados, imagens ou configuracoes de hospedagem;
- publicar como producao;
- incluir credenciais no repositorio.
