import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("publishes comprehensive and legally compliant Subscription Rules (EFS Section 44)", async () => {
  const page = await read("../app/regras-assinatura/page.tsx");

  // Identificação e vigência
  assert.match(page, /Regras de Assinatura e Contratação SaaS/);
  assert.match(page, /39\.299\.793\/0001-27/);
  assert.match(page, /Rua Igaratinga, 137/);

  // Natureza jurídica
  assert.match(page, /licença temporária, não exclusiva, revogável e intransferível/);
  assert.match(page, /SaaS B2B/);

  // Período de avaliação gratuita (Trial 30 dias)
  assert.match(page, /30 \(trinta\) dias corridos/);
  assert.match(page, /Sem Cartão no Cadastro/);
  assert.match(page, /Sem Cobrança Surpresa/);

  // Planos e preços
  assert.match(page, /Plano Mensal.*R\$ 99,90/);
  assert.match(page, /Plano Trimestral.*R\$ 284,90.*até 2x/);
  assert.match(page, /Plano Semestral.*R\$ 539,90.*até 3x/);
  assert.match(page, /Plano Anual.*R\$ 999,00.*até 4x/);
  assert.match(page, /5 \(cinco\) profissionais ativos/);

  // Segurança e não armazenamento de cartão
  assert.match(page, /PCI-DSS/);
  assert.match(page, /A BarbeariaSP não armazena números de cartão de crédito/);

  // Arrependimento e cancelamento
  assert.match(page, /Artigo 49 do CDC/);
  assert.match(page, /até 7 \(sete\) dias corridos/);
  assert.match(page, /access_ends_at/);

  // Fases do ciclo de desativação (EFS 44)
  assert.match(page, /Fase 1 — Carência Operacional \(Dias 1 a 3 pós-término\)/);
  assert.match(page, /Fase 2 — Suspensão Pública e Janela de Exportação \(Dias 4 a 15 pós-término\)/);
  assert.match(page, /Fase 3 — Congelamento Seguro \(Dias 16 a 59 pós-término\)/);
  assert.match(page, /Fase 4 — Expurgo Definitivo \(A partir do 60º dia\)/);

  // Portabilidade e suporte
  assert.match(page, /Portabilidade e Exportação de Dados da Barbearia/);
  assert.match(page, /contato@cullentech\.com\.br/);
});
