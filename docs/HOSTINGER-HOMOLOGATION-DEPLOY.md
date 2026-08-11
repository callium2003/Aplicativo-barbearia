# Registro de deploy de homologacao

Este arquivo e um registro operacional; a configuracao vigente esta em [HOSTINGER-NODEJS-HOMOLOGATION.md](HOSTINGER-NODEJS-HOMOLOGATION.md).

## 11/08/2026

- Commit enviado: `d38d604` (`fix: harden customer booking and mobile navigation`).
- Build Hostinger concluído: `019ff2b1-e7be-70ee-aacb-7b2ad5dd0bf2` em Node 22.
- Publicação gerada a partir de arquivo temporário do commit, sem `.env.local`, `node_modules`, `.next` ou a alteração local pré-existente de `package-lock.json`.
- Domínio respondeu HTTP 200 após a publicação, com cache normal ativo (`x-hcdn-cache-status: DYNAMIC`). A validação funcional autenticada continua pendente.

- Dominio: `barbeariasp.cullentech.com.br`.
- Commit enviado: `5e457f0` (`fix: package Next standalone output for Hostinger`).
- Build Hostinger concluido: `019ff1f4-205e-72c1-baf6-7e2f7449a716`.
- Configuracao detectada: Next.js, Node 22, npm, build `build`, output `.next`.
- Tentativa anterior falhou ao procurar `package.json` em `.next/standalone`; esse erro motivou o empacotamento auxiliar do standalone.
- O dominio retornou HTTP 200, mas foi relatada entrega visual da versao antiga. O deploy nao deve ser considerado validado ate a conferencia do conteudo entregue no navegador.

## Regra de limpeza

Arquivos de upload devem ser criados em pasta temporaria e removidos apos envio. Nao enviar `.env.local`, `node_modules`, `.next`, logs, credenciais ou diretorios de trabalho para a Hostinger.
