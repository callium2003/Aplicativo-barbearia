import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("presents the approved BarbeariaSP commercial journey", async () => {
  const page = await read("../app/page.tsx");

  assert.match(page, /Sua barbearia no controle/);
  assert.match(page, /Sua agenda sempre aberta/);
  assert.match(page, /Conheça o BarbeariaSP por completo/);
  assert.match(page, /Da agenda do cliente à gestão da barbearia/);
  assert.match(page, /Teste por 30 dias/);
  assert.match(page, /Perguntas frequentes/);
  assert.match(page, /href="\/entrar"/);
  assert.doesNotMatch(page, /depoimentos|clientes satisfeitos|garantia de faturamento/i);
});

test("uses the shared subscription catalogue for cards and FAQ without duplicating commercial rules", async () => {
  const page = await read("../app/page.tsx");

  assert.match(page, /import\s*\{\s*subscriptionPlans,\s*formatBRL\s*\}\s*from "@\/utils\/subscription-plans"/);
  assert.match(page, /subscriptionPlans\.map\(/);
  assert.match(page, /formatBRL\(plan\.priceCents\)/);
  assert.match(page, /plan\.months/);
  assert.match(page, /plan\.maxInstallments/);
  assert.match(page, /plan\.professionalLimit/);
  assert.match(page, /Preços totais pelo período contratado/);
  assert.match(page, /profissionais ativos, sob consulta/);
  assert.match(page, /Profissionais inativos não consomem o limite/);
  assert.match(page, /Quanto custam os planos/);
  assert.match(page, /O parcelamento não altera a duração do plano contratado/);
  assert.match(page, /href="\/entrar">Começar teste grátis/);
  assert.match(page, /href="\/entrar">Começar teste grátis/);
  assert.doesNotMatch(page, /const plans\s*=|priceCents\s*:|maxInstallments\s*:|professionalLimit\s*:/);
  assert.doesNotMatch(page, /99[.,]90|284[.,]90|539[.,]90|999[.,]00|9990|28490|53990|99900/);
  assert.doesNotMatch(page, /Valor a definir|Ainda não\. Eles serão|Cobrança a cada|renovação automática|sem juros/i);
});

test("uses optimized real imagery and responsive landing styles", async () => {
  const [page, styles] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/marketing-page.module.css"),
  ]);

  assert.match(page, /import Image from "next\/image"/);
  assert.match(page, /barbeariasp-institutional-hero\.png/);
  assert.match(page, /marketing-public-page\.png/);
  assert.match(page, /marketing-booking-services\.png/);
  assert.match(page, /marketing-customer-area\.png/);
  assert.match(page, /aria-label="Navegação principal"/);
  assert.match(
    styles,
    /\.nav\s*\{[^}]*height:\s*auto[^}]*background:\s*transparent/,
  );
  assert.match(styles, /\.heroImage\s*\{[^}]*object-position:\s*left center/);
  assert.match(styles, /@media\s*\(min-width:\s*761px\)\s*\{[\s\S]*?\.heroImage\s*\{[\s\S]*?object-fit:\s*contain/);
  assert.match(styles, /\.hero\s*\{[^}]*align-items:\s*flex-end/);
  assert.match(styles, /\.hero\s*\{[^}]*min-height:\s*calc\(100svh\s*-\s*78px\)/);
  assert.match(styles, /\.heroContent\s*\{[^}]*margin-left:\s*0/);
  assert.match(styles, /\.hero h1\s*\{[^}]*font-size:\s*clamp\(2\.5rem,\s*4vw,\s*4\.2rem\)/);
  assert.match(styles, /\.screenFrame\s*\{[^}]*aspect-ratio:\s*853\s*\/\s*1844/);
  assert.match(styles, /\.screenFrame img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(styles, /@media\s*\(max-width:\s*760px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.heroImage\s*\{[\s\S]*?object-position:\s*left center/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /:focus-visible/);
});
