# Plano de Tarefas - Protocolo V.L.A.E.G.

## Status Atual
- [x] Protocolo 0: Memória inicializada (`task_plan.md`, `findings.md`, `progress.md`, `gemini.md`).
- [x] Limpeza e saneamento do Git (.gitignore raiz e desindexação de pastas efêmeras).
- [x] Auditoria de segurança e atualização de dependências (`npm audit fix`).
- [x] Opção 1: Homologação Visual & Responsividade concluída e registrada.
- [x] Opção 3: Relatórios e Assinatura concluídos e registrados.
- [x] Opção 2: Integração controlada de Segurança P0 concluída (AUTH-01, AUTHZ-01, ABUSE-01).
- [x] Suíte de testes validada com 100% de sucesso (184/184 testes passando).
- [x] Transparência LGPD & Regras de Divulgação: Política de Privacidade (`/privacidade`) integralmente revisada em 15 seções com conformidade LGPD, CDC e boas práticas de mensageria (184/184 testes passando).
- [x] EFS ([FUNCTIONAL-SPEC.md](file:///c:/Users/calli/OneDrive/Documentos/Aplicativo%20barbearia/pagina%20barbearia/work/barbeariasp-platform/docs/FUNCTIONAL-SPEC.md)) atualizada com a resolução formal de LGPD-01.
- [ ] Termos de Uso na Página Pública: A página foi criada em `app/termos/page.tsx`, mas faltou atualizar o rodapé em `app/page.tsx`, que ainda exibe o texto estático "em preparação" em vez de um link clicável. Por isso, os Termos de Uso não estão acessíveis aos visitantes no site publicado. Ajuste pendente para o próximo deploy.
- [x] Publicação em Produção na Hostinger: Build `01a09396-36f8-717e-91d8-9fa326f1b176` concluído em Node 22 (`state: completed`), com as páginas de saúde e privacidade ativas em `barbeariasp.cullentech.com.br`.
- [x] Auditoria documental completa e reconciliação da Seção 48.5 da EFS ([FUNCTIONAL-SPEC.md](file:///c:/Users/calli/OneDrive/Documentos/Aplicativo%20barbearia/pagina%20barbearia/work/barbeariasp-platform/docs/FUNCTIONAL-SPEC.md)) com LGPD-01, TERMOS-01 e Deploy de Produção.

## Próximos Passos
1. **Infraestrutura Transacional:** Validação ponta a ponta do pipeline de notificações e e-mails transacionais (`email-service` e mensageria).
2. **Módulo Financeiro SaaS:** Especificação da integração do gateway de pagamento (Asaas/PCI-DSS) para cobrança recorrente de assinaturas.
3. **Correção do Rodapé (Termos de Uso):** Trocar o texto estático por link ativo para `/termos` em `app/page.tsx`.
