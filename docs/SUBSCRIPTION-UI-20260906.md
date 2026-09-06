# Central de assinatura — interface mobile

Atualizado em 06/09/2026.

## Entrega local

As paginas abaixo usam o padrao visual compartilhado da gestao, com prioridade para celular:

- `/painel/assinatura`: situacao do trial ou periodo informado, datas e atalhos;
- `/painel/assinatura/planos`: catalogo unico de planos e contratacao sob consulta acima de cinco profissionais;
- `/painel/assinatura/contratar?plano=<codigo>`: valor total, duracao, parcelamento e conferencia dos termos;
- `/painel/assinatura/cobrancas`: historico financeiro, com estado distinto quando a integracao ainda nao existe;
- `/painel/assinatura/cancelar`: nao renovacao e solicitacao de encerramento antecipado;
- `/painel/assinatura/dados`: exportacao, privacidade e prazos apos o termino.

A landing importa o mesmo catalogo, evitando divergencia de preco. A central consulta somente a assinatura legada e a contagem de profissionais ja existentes. Gestores recebem uma orientacao para procurar o proprietario, pois a politica atual da tabela financeira permite leitura ao dono.

## Seguranca de publicacao

Os botoes que exigem integracao externa permanecem desabilitados. Marcar aceite na revisao da contratacao nao grava termos nem cria pedido. O historico nao mostra um estado vazio falso quando o provedor ainda nao esta conectado. Datas calculadas no navegador servem apenas para apresentacao; autorizacao precisa ser aplicada no servidor na etapa de integracao.

A rota `/design/assinatura` existe apenas no ambiente de desenvolvimento para revisar as telas e os estados visuais; no build de producao responde 404.

## Validacao

- funcoes de catalogo e apresentacao testam valores em centavos, divisao inexata de parcelas, plano invalido, trial expirado, dados ausentes e periodo pago ainda valido;
- previa conferida em 390 x 844 px e no desktop;
- `npm test`: build de producao, TypeScript e 89 de 89 testes aprovados;
- `npm run lint`: aprovado sem erros;
- pacote standalone: landing respondeu 200 com o preco do catalogo e `/design/assinatura` respondeu 404;
- nenhuma migration, configuracao remota, credencial, cobranca, commit, push ou deploy faz parte desta entrega.
