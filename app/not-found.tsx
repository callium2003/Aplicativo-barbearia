import Link from "next/link";

export default function NotFoundPage() {
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
              background: "var(--sp-surface-soft, #f0f0ed)",
              color: "var(--sp-ink, #111111)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: "bold",
            }}
            aria-hidden="true"
          >
            404
          </div>

          <p className="product-eyebrow" style={{ color: "var(--sp-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
            Página não encontrada
          </p>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", margin: "0 0 12px", color: "var(--sp-ink)" }}>
            Não encontramos esta página
          </h1>
          <p style={{ color: "var(--sp-muted)", fontSize: 15, lineHeight: 1.5, margin: "0 0 28px" }}>
            O endereço digitado pode ter mudado, estar incorreto ou a página não existe mais. Confira o link ou volte para a página inicial.
          </p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link
              href="/"
              className="product-button"
              style={{ minWidth: 180 }}
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
