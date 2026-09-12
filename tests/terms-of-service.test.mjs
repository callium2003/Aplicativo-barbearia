import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("publishes comprehensive and legally compliant Termos de Uso (EFS 2776-2778)", async () => {
  const page = await read("../app/termos/page.tsx");

  // Identificação e vigência
  assert.match(page, /Termos de Uso da Plataforma BarbeariaSP/);
  assert.match(page, /Última atualização: 11 de setembro de 2026/);
  assert.match(page, /39\.299\.793\/0001-27/);
  assert.match(page, /Rua Igaratinga, 137/);

  // Delimitação de papéis e responsabilidade presencial vs tecnológica
  assert.match(page, /Definições e Partes do Ecossistema/);
  assert.match(page, /Responsabilidade Exclusiva pelos Atendimentos Presenciais/);
  assert.match(page, /Pagamento Direto no Balcão/);
  assert.doesNotMatch(page, /cartão de crédito de clientes finais/i);

  // Menores e dependentes
  assert.match(page, /Atendimento a Crianças e Adolescentes/);
  assert.match(page, /artigo 14 da LGPD/);

  // Regras de agendamento e comparecimento
  assert.match(page, /Regras de Agendamento, Pontualidade e Tolerância/);
  assert.match(page, /Tolerância de Atraso/);
  assert.match(page, /Cancelamento Responsável pelo Cliente/);

  // Assinatura SaaS da barbearia parceira e direito de arrependimento
  assert.match(page, /Regras da Assinatura da Barbearia Parceira \(SaaS B2B\)/);
  assert.match(page, /30 \(trinta\) dias de teste integral/);
  assert.match(page, /Direito de Arrependimento \(Art\. 49 do CDC\)/);
  assert.match(page, /Dias 1 a 3 pós-término/);
  assert.match(page, /Dias 4 a 15 pós-término/);
  assert.match(page, /Dias 16 a 59 pós-término/);
  assert.match(page, /A partir do 60º dia/);

  // Vínculo com Privacidade e contato
  assert.match(page, /href="\/privacidade"/);
  assert.match(page, /contato@cullentech\.com\.br/);
});
