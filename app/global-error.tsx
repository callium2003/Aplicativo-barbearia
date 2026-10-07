"use client";

import Link from "next/link";
import "./globals.css";
import "./product-ui.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased" style={{ margin: 0, background: "var(--sp-bg, #f7f7f5)", fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif", color: "var(--sp-ink, #111111)" }}>
        <main className="product-shell">
          <header className="product-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px max(20px, 5vw)", borderBottom: "1px solid var(--sp-line, #e4e3de)", background: "rgba(247, 247, 245, 0.88)" }}>
            <Link className="product-brand" href="/" style={{ color: "var(--sp-ink, #111111)", textDecoration: "none", fontSize: 16, fontWeight: 850, letterSpacing: "0.08em" }}>
              BARBEARIA<span style={{ color: "var(--sp-accent, #c85a35)" }}>SP</span>
            </Link>
            <Link href="/" style={{ color: "var(--sp-muted, #6f6f6a)", textDecoration: "none", fontSize: 13 }}>
              ← Início
            </Link>
          </header>

          <div className="product-content" style={{ maxWidth: 640, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
            <div className="product-card" style={{ background: "white", border: "1px solid var(--sp-line, #e4e3de)", borderRadius: "var(--sp-radius, 16px)", padding: "40px 24px", boxShadow: "0 16px 44px rgba(0, 0, 0, 0.05)" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  margin: "0 auto 20px",
                  borderRadius: "50%",
                  background: "var(--sp-danger-soft, #f9eaea)",
                  color: "var(--sp-danger, #9c3333)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: "bold",
                }}
                aria-hidden="true"
              >
                !
              </div>

              <p className="product-eyebrow" style={{ color: "var(--sp-muted, #6f6f6a)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                Sistema
              </p>
              <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", margin: "0 0 12px", color: "var(--sp-ink, #111111)" }}>
                Não foi possível iniciar o aplicativo
              </h1>
              <p style={{ color: "var(--sp-muted, #6f6f6a)", fontSize: 15, lineHeight: 1.5, margin: "0 0 28px" }}>
                Ocorreu uma falha inesperada ao carregar a aplicação. Tente recarregar a página para restabelecer a conexão.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                <button
                  type="button"
                  className="product-button"
                  onClick={() => reset()}
                  style={{
                    appearance: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 42,
                    padding: "10px 20px",
                    border: "1px solid transparent",
                    borderRadius: "10px",
                    background: "var(--sp-ink, #111111)",
                    color: "white",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: 750,
                    cursor: "pointer",
                    minWidth: 160,
                  }}
                >
                  Recarregar aplicativo
                </button>
                <Link
                  href="/"
                  className="product-button secondary"
                  style={{
                    appearance: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 42,
                    padding: "10px 20px",
                    border: "1px solid var(--sp-line, #e4e3de)",
                    borderRadius: "10px",
                    background: "white",
                    color: "var(--sp-ink, #111111)",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: 750,
                    textDecoration: "none",
                    minWidth: 160,
                  }}
                >
                  Voltar ao início
                </Link>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
