# Roadmap

## Fase atual — homologacao tecnica e visual

1. Confirmar que `barbeariasp.cullentech.com.br` entrega o commit publicado, sem cache ou configuracao antiga.
2. Testar no dominio: login, magic link, pagina publica, reserva, cancelar/remarcar, agenda, permissoes e notificacoes.
3. Corrigir defeitos encontrados nos testes: upload RLS, feedback de salvar, sessao em navegador compartilhado e acabamento responsivo.
4. Fazer revisao visual tela a tela de Gestao, Agenda, Relatorios, Configuracoes e Manutencao, preservando as funcoes atuais.

## Antes de producao

- definir destino, responsável e teste real de restauração do backup; configurar monitoramento externo e alertas;
- confirmar DNS, redirects do Supabase Auth, SMTP/Resend e recebimento de e-mail;
- preencher e aprovar aviso de privacidade, termos de uso e contratos a partir de `PRONTIDAO-LGPD-E-DOCUMENTOS-LEGAIS.md`.
- revisar seguranca/RLS e teste de isolamento multi-tenant;
- desligar cacheless e validar desempenho;
- concluir landing page e textos institucionais.

## Apos homologacao aprovada

- definir planos, periodo de teste e regras de assinatura;
- implementar faturamento/checkout com provedor escolhido;
- avaliar Pix para a barbearia e pagamentos de assinatura separadamente;
- campanhas de marketing, WhatsApp Business API e notificacoes push.

Pagamentos nao devem ser iniciados como ajuste lateral de agenda ou layout: dependem de regra comercial, provedor, tratamento fiscal e seguranca proprios.
