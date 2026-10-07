"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <main className="product-shell">
      <header className="product-topbar">
        <Link className="product-brand" href="/">
          BARBEARIA<span style={{ color: "var(--sp-accent, #c85a35)" }}>SP</span>
        </Link>
        <Link className="management-back-link" href="/" style={{ color: "var(--sp-muted)", textDecoration: "none", fontSize: 13 }}>
          ← Início
        </Link>
      </header>

      <div className="product-content" style={{ maxWidth: 640, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
        <div className="product-card" style={{ background: "white", border: "1px solid var(--sp-line)", borderRadius: "var(--sp-radius, 16px)", padding: "40px 24px", boxShadow: "var(--sp-shadow)" }}>
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

          <p className="product-eyebrow" style={{ color: "var(--sp-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
            Aviso
          </p>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", margin: "0 0 12px", color: "var(--sp-ink)" }}>
            Algo deu errado por aqui
          </h1>
          <p style={{ color: "var(--sp-muted)", fontSize: 15, lineHeight: 1.5, margin: "0 0 28px" }}>
            Não foi possível carregar estas informações no momento. Não se preocupe, seus dados estão seguros. Você pode tentar carregar novamente ou voltar à página inicial.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              className="product-button"
              onClick={() => reset()}
              style={{ minWidth: 160 }}
            >
              Tentar novamente
            </button>
            <Link
              href="/"
              className="product-button secondary"
              style={{ minWidth: 160 }}
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
