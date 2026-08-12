# Operação: backup, restauração e monitoramento

Este procedimento complementa o checklist de incidente. Ele separa o que já existe no produto do que precisa de uma decisão operacional antes de abrir a plataforma comercialmente.

## Estado atual

| Controle | Estado | Evidência |
| --- | --- | --- |
| Verificação pública de disponibilidade | Implementado | `GET /api/health` responde JSON mínimo, sem dados de clientes e com `Cache-Control: no-store`. |
| Comando de checagem | Implementado | `npm run health:check -- https://barbeariasp.cullentech.com.br/api/health` exige HTTP 2xx e JSON válido. |
| Fila de e-mails | Implementado | Central de notificações, cron e Resend estão documentados em `RESEND.md`. |
| Alerta de indisponibilidade pública | Implementado | O Supabase Cron chama a função protegida `monitor-platform-health` a cada 7 minutos. Ela consulta `/api/health` e envia e-mail somente na primeira queda e na recuperação. |
| Backup independente | Pendente | O destino criptografado, responsável e prazo de retenção ainda precisam ser definidos. |
| Teste de restauração | Pendente | Só pode ser executado sobre uma cópia de teste, nunca sobre o projeto de produção. |

## Monitoramento seguro

Execute esta checagem em qualquer computador autorizado, sem informar senhas ou chaves:

```powershell
npm.cmd run health:check -- https://barbeariasp.cullentech.com.br/api/health
```

Resultado esperado: uma única linha com `Saúde confirmada: HTTP 200`. A rota não verifica dados de agenda, clientes nem segredos; ela prova apenas que a aplicação web está atendendo.

O alerta automático já está configurado com intervalo de 7 minutos. O endereço técnico e as chaves permanecem no Supabase Vault, nunca no Git ou no navegador. Em caso de queda confirmada da rota pública, recebem o alerta o responsável técnico e os e-mails operacionais das barbearias ativas; na recuperação, recebem uma única confirmação. A repetição de uma mesma falha não gera e-mails a cada ciclo.

Esse monitor cobre a disponibilidade externa da aplicação publicada. Uma indisponibilidade total do próprio Supabase ou do provedor de e-mail pode impedir que ele envie aviso; por isso o checklist de incidente continua sendo necessário e um monitor realmente independente poderá ser avaliado em etapa futura.

## Backup: decisão necessária antes da execução

Um backup adequado precisa ficar fora do repositório, fora da Hostinger e inacessível ao navegador da aplicação. O destino deve ser um armazenamento controlado pela empresa, com criptografia, acesso restrito e histórico de versões.

O backup diário da Hostinger é útil para recuperar arquivos e a publicação hospedada, conforme a retenção contratada, mas não substitui a cópia dos dados operacionais do Supabase (banco, autenticação e Storage). A restauração de arquivos na Hostinger também não desfaz uma alteração de dados já gravada no Supabase.

Antes de criar o primeiro backup, registrar nesta tabela a decisão aprovada:

| Decisão | Valor a preencher |
| --- | --- |
| Responsável pelo backup | Pendente |
| Destino criptografado e acesso autorizado | Pendente |
| Frequência | Recomendado: diário |
| Retenção | Recomendado: 14 cópias diárias e 3 mensais |
| Pessoa autorizada a testar a restauração | Pendente |
| Data do primeiro teste de restauração | Pendente |

## Escopo obrigatório da cópia

1. Banco de dados Supabase, incluindo estrutura, dados e migrations.
2. Arquivos do Supabase Storage: foto da barbearia, fotos de profissionais e demais arquivos enviados.
3. Configurações operacionais necessárias para recuperar o ambiente, sem armazenar valores de segredos no Git: referências do projeto, procedimento de Vault e configuração de cron.
4. Código-fonte versionado no Git. O código não deve ser duplicado dentro do backup de dados.

Não copiar para o backup: `node_modules`, `.next`, arquivos de log, sessões, valores de `.env*`, chaves de serviço, tokens ou senhas. Segredos devem ser recuperados pelo cofre autorizado e não por arquivos anexados ao backup.

## Procedimento de restauração de teste

1. Criar um projeto Supabase separado, exclusivo para restauração; jamais restaurar por cima do projeto de produção.
2. Restaurar primeiro a estrutura e migrations; depois os dados e os objetos do Storage.
3. Configurar segredos somente no Vault desse ambiente de teste, por pessoa autorizada.
4. Executar os testes automatizados e o roteiro de homologação com contas de teste.
5. Conferir agenda, fotos, perfis, permissões por barbearia e notificações sem enviar mensagens a clientes reais.
6. Registrar data, responsável, duração, dados verificados e falhas encontradas no backlog.
7. Apagar apenas o ambiente temporário de teste após autorização explícita e confirmação de que não contém dados necessários.

Uma restauração é considerada aprovada somente quando os dados, arquivos, isolamento entre barbearias e fluxos essenciais forem comprovados no ambiente separado.
