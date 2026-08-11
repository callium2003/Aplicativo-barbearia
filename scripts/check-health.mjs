const urlInput = process.env.HEALTHCHECK_URL ?? process.argv[2];

if (!urlInput) {
  console.error("Informe a URL de saúde. Exemplo: npm run health:check -- https://dominio/api/health");
  process.exitCode = 1;
} else {
  try {
    const url = new URL(urlInput);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("A URL deve usar HTTP ou HTTPS.");
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error(`A rota respondeu HTTP ${response.status}.`);
    }

    const body = await response.json();

    if (body?.status !== "ok" || Number.isNaN(Date.parse(body.checkedAt))) {
      throw new Error("A resposta não possui o formato esperado da rota de saúde.");
    }

    console.log(`Saúde confirmada: HTTP ${response.status} em ${body.checkedAt}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida.";
    console.error(`Falha na verificação de saúde: ${message}`);
    process.exitCode = 1;
  }
}
