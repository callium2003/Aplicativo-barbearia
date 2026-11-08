import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("presents the approved BarbeariaSP commercial journey", async () => {
  const page = await read("../app/page.tsx");

  assert.match(page, /Sistema para sua barbearia/);
  assert.match(page, /Agendamento online 24 horas/);
  assert.match(page, /Conheça o BarbeariaSP por completo/);
  assert.match(page, /Como funciona o agendamento online do BarbeariaSP/);
  assert.match(page, /Experimente o sistema para sua barbearia por 30 dias grátis/);
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
  const [page, styles, demos] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/marketing-page.module.css"),
    read("../app/marketing-demo-screens.mjs"),
  ]);

  assert.match(page, /import Image from "next\/image"/);
  assert.match(page, /barbeariasp-institutional-hero\.png/);
  assert.match(page, /demoScreenGroups\.map\(/);
  assert.match(page, /Telas reais do aplicativo com dados fictícios/);
  assert.match(demos, /screen\('pagina-publica'/);
  assert.match(demos, /screen\('reserva-servicos'/);
  assert.match(demos, /screen\('cliente-agenda'/);
  assert.match(demos, /screen\('gestao-faturamento'/);
  assert.doesNotMatch(page, /marketing-public-page\.png|marketing-booking-services\.png|marketing-customer-area\.png/);
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
  assert.match(styles, /\.screenFrame\s*\{[^}]*aspect-ratio:\s*375\s*\/\s*811/);
  assert.match(styles, /\.screenFrame img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(styles, /@media\s*\(max-width:\s*760px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.heroImage\s*\{[\s\S]*?object-position:\s*left center/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /:focus-visible/);
});

test("protects header and hero elements from viewport clipping on tablet (iPad Mini) and mobile (iPhone)", async () => {
  const [styles, videoStyles] = await Promise.all([
    read("../app/marketing-page.module.css"),
    read("../app/components/landing-hero-video.module.css"),
  ]);

  // Tablet & iPad Mini: hides inline nav to keep brand and actions from overflowing
  assert.match(styles, /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.nav\s*\{[^}]*display:\s*none/);
  assert.match(styles, /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.header\s*\{[^}]*grid-template-columns:\s*auto 1fr/);

  // Mobile & iPhone: compacts padding, gap, and font sizes to prevent cutting off login buttons
  assert.match(styles, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.clientLoginLink\s*\{[^}]*font-size:\s*clamp/);
  assert.match(styles, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.loginLink\s*\{[^}]*font-size:\s*clamp/);
  assert.match(styles, /@media\s*\(max-width:\s*380px\)/);

  // Video badges: switches to non-overlapping flow layout on tablets and mobile (<= 900px)
  assert.match(videoStyles, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.badge\s*\{[^}]*position:\s*static/);
});
