# Registro de deploy de homologacao

Este arquivo e um registro operacional; a configuracao vigente esta em [HOSTINGER-NODEJS-HOMOLOGATION.md](HOSTINGER-NODEJS-HOMOLOGATION.md).

## 11/08/2026

- Dominio: `barbeariasp.cullentech.com.br`.
- Commit enviado: `5e457f0` (`fix: package Next standalone output for Hostinger`).
- Build Hostinger concluido: `019ff1f4-205e-72c1-baf6-7e2f7449a716`.
- Configuracao detectada: Next.js, Node 22, npm, build `build`, output `.next`.
- Tentativa anterior falhou ao procurar `package.json` em `.next/standalone`; esse erro motivou o empacotamento auxiliar do standalone.
- O dominio retornou HTTP 200, mas foi relatada entrega visual da versao antiga. O deploy nao deve ser considerado validado ate a conferencia do conteudo entregue no navegador.

## Regra de limpeza

Arquivos de upload devem ser criados em pasta temporaria e removidos apos envio. Nao enviar `.env.local`, `node_modules`, `.next`, logs, credenciais ou diretorios de trabalho para a Hostinger.
