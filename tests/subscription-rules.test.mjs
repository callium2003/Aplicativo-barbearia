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

  // Planos e preços homologados Asaas (EFS 24.1 e 48.5.2)
  assert.match(page, /Plano Simple \(até 3 usuários\).*R\$ 49,90\/mês.*R\$ 499,00\/ano/);
  assert.match(page, /Plano Middle \(até 5 usuários\).*R\$ 79,90\/mês.*R\$ 799,00\/ano/);
  assert.match(page, /Plano Master \(até 7 usuários\).*R\$ 119,90\/mês.*R\$ 1\.199,00\/ano/);
  assert.match(page, /Plano Personalizado \(8 ou mais usuários\)/);
  assert.match(page, /Planos Trimestrais e Semestrais Descontinuados/);
  assert.match(page, /Garantia de Preço de Lançamento e Desconto de Renovação/);
  assert.match(page, /15% \(quinze por cento\) de desconto/);
  assert.match(page, /Asaas/);
  assert.match(page, /renovação automática periódica/);

  // Segurança e não armazenamento de cartão
  assert.match(page, /PCI-DSS/);
  assert.match(page, /A BarbeariaSP não armazena números de cartão de crédito/);

  // Arrependimento e cancelamento
  assert.match(page, /Artigo 49 do CDC/);
  assert.match(page, /até 7 \(sete\) dias corridos/);
  assert.match(page, /access_ends_at/);

  // Fases do ciclo de desativação (EFS 44)
  assert.match(page, /Fase 1 — Carência Operacional \(Dias 1 a 5 pós-término\)/);
  assert.match(page, /Fase 2 — Suspensão Pública e Janela de Exportação \(Dias 6 a 15 pós-término\)/);
  assert.match(page, /Fase 3 — Congelamento Seguro \(Dias 16 a 59 pós-término\)/);
  assert.match(page, /Fase 4 — Expurgo ou Anonimização \(A partir do 60º dia\)/);
  assert.match(page, /elegibilidade dos dados pessoais e operacionais para descarte ou anonimização/);
  assert.doesNotMatch(page, /ciclo periódico programado/i);
  assert.doesNotMatch(page, /expurgo irreversível automático/i);

  // Portabilidade, suporte e blindagem jurídica (Salão-Parceiro e DPA B2B)
  assert.match(page, /Portabilidade e Exportação de Dados da Barbearia/);
  assert.match(page, /Após o prazo de retenção, os dados pessoais poderão ser eliminados ou anonimizados e não poderão ser recuperados pela plataforma/);
  assert.match(page, /Conformidade com a Lei do Salão-Parceiro \(Lei nº 13\.352\/2016\)/);
  assert.match(page, /vínculo de emprego, subordinação jurídica ou hierárquica, habitualidade, dependência econômica ou solidariedade trabalhista/);
  assert.match(page, /Acordo de Processamento de Dados Pessoais \(DPA B2B — LGPD Artigo 39\)/);
  assert.match(page, /Barbearia Parceira atua como Controladora/);
  assert.match(page, /BarbeariaSP atua como Operadora/);
  assert.match(page, /Vedação Absoluta de Spam e Finalidades Ilícitas/);
  assert.match(page, /Direito de Regresso por Descumprimento/);
  assert.match(page, /contato@cullentech\.com\.br/);
});
