"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const PENDING_TOKEN_KEY = "barbeariasp_pending_invitation_token";

type InvitationDetails = {
  valid: boolean;
  reason?: string;
  id?: string;
  barbershop_id?: string;
  barbershop_name?: string;
  email_normalized?: string;
  role?: "manager" | "barber";
  professional_id?: string | null;
  professional_name?: string | null;
  expires_at?: string;
};

export default function ConviteEquipe() {
  const [token, setToken] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const init = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const urlParams = new URLSearchParams(window.location.search);
    let activeToken = urlParams.get("token");

    if (activeToken) {
      try {
        sessionStorage.setItem(PENDING_TOKEN_KEY, activeToken);
        localStorage.setItem(PENDING_TOKEN_KEY, activeToken);
      } catch {
        // ignore storage errors
      }
    } else {
      try {
        activeToken =
          sessionStorage.getItem(PENDING_TOKEN_KEY) ||
          localStorage.getItem(PENDING_TOKEN_KEY) ||
          "";
      } catch {
        activeToken = "";
      }
    }

    setToken(activeToken || "");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setIsAuthenticated(true);
      setUserEmail(user.email || null);
    } else {
      setIsAuthenticated(false);
      setUserEmail(null);
    }

    if (activeToken) {
      const { data, error } = await supabase.rpc("get_invitation_details", {
        p_token: activeToken,
      });

      if (error) {
        setInvitation({ valid: false, reason: "rpc_error" });
      } else {
        setInvitation((data || { valid: false }) as InvitationDetails);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void init(), 0);
    return () => window.clearTimeout(timer);
  }, [init]);

  async function handleGoogleLogin() {
    setMessage("");
    setSubmitting(true);
    try {
      const redirectUrl = token
        ? `${window.location.origin}/convite/equipe?token=${encodeURIComponent(token)}`
        : `${window.location.origin}/convite/equipe`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) {
        setMessage(`Não foi possível iniciar acesso com Google: ${error.message}`);
      }
    } catch (err) {
      setMessage(
        `Erro ao entrar com Google: ${
          err instanceof Error ? err.message : "desconhecido"
        }`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMagicLink(event: FormEvent) {
    event.preventDefault();
    if (!emailInput.trim()) return;
    setMessage("");
    setSubmitting(true);
    try {
      const redirectUrl = token
        ? `${window.location.origin}/convite/equipe?token=${encodeURIComponent(token)}`
        : `${window.location.origin}/convite/equipe`;
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) {
        setMessage(`Não foi possível enviar o e-mail: ${error.message}`);
      } else {
        setMessage("Enviamos um link de acesso para seu e-mail. Abra-o para prosseguir com o convite.");
      }
    } catch (err) {
      setMessage(
        `Erro ao enviar link de acesso: ${
          err instanceof Error ? err.message : "desconhecido"
        }`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptInvitation() {
    if (!token) return;
    setMessage("");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("accept_team_invitation", {
        p_token: token,
      });

      if (error) {
        setMessage(`Não foi possível aceitar o convite: ${error.message}`);
      } else if (data?.success) {
        try {
          sessionStorage.removeItem(PENDING_TOKEN_KEY);
          localStorage.removeItem(PENDING_TOKEN_KEY);
        } catch {
          // ignore storage error
        }
        setMessage("CONVITE_ACEITO_SUCESSO");
      }
    } catch (err) {
      setMessage(
        `Erro ao aceitar convite: ${
          err instanceof Error ? err.message : "desconhecido"
        }`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f6f2ed",
          fontFamily: "Arial, sans-serif",
          padding: 24,
        }}
      >
        <p style={{ color: "#6d6257" }}>Carregando dados do convite...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f2ed",
        color: "#1b1714",
        fontFamily: "Arial, sans-serif",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          background: "white",
          maxWidth: 520,
          width: "100%",
          padding: 32,
          borderRadius: 12,
          boxShadow: "0 10px 30px #291b1020",
          border: "1px solid #e8e0d8",
        }}
      >
        <Link
          href="/"
          style={{ color: "#1b1714", fontWeight: 900, textDecoration: "none" }}
        >
          BARBEARIA<span style={{ color: "#e4773a" }}>SP</span>
        </Link>

        <p
          style={{
            color: "#d7612c",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 1.4,
            marginTop: 18,
            marginBottom: 4,
          }}
        >
          CONVITE DE EQUIPE
        </p>

        {!token ? (
          <div>
            <h1 style={{ font: "bold 32px Georgia, serif", margin: "10px 0" }}>
              Nenhum convite informado.
            </h1>
            <p style={{ color: "#6d6257", lineHeight: 1.6 }}>
              Verifique se você copiou o link de convite completo fornecido pelo
              gestor da barbearia.
            </p>
            <Link
              href="/entrar"
              style={{
                display: "inline-block",
                marginTop: 16,
                padding: "11px 18px",
                background: "#d7612c",
                color: "white",
                borderRadius: 6,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Ir para o login
            </Link>
          </div>
        ) : message === "CONVITE_ACEITO_SUCESSO" ? (
          <div>
            <h1 style={{ font: "bold 32px Georgia, serif", margin: "10px 0", color: "#166534" }}>
              Convite aceito com sucesso!
            </h1>
            <p style={{ color: "#6d6257", lineHeight: 1.6 }}>
              Você agora faz parte da equipe de <b>{invitation?.barbershop_name}</b> como{" "}
              <b>{invitation?.role === "manager" ? "Gerente" : "Barbeiro"}</b>.
            </p>
            <button
              onClick={() => window.location.replace("/painel")}
              style={{
                width: "100%",
                marginTop: 20,
                padding: 14,
                border: 0,
                borderRadius: 6,
                background: "#d7612c",
                color: "white",
                fontWeight: 800,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Ir para o painel de gestão
            </button>
          </div>
        ) : invitation && !invitation.valid ? (
          <div>
            <h1 style={{ font: "bold 32px Georgia, serif", margin: "10px 0", color: "#991b1b" }}>
              Convite indisponível
            </h1>
            <p style={{ color: "#6d6257", lineHeight: 1.6 }}>
              {invitation.reason === "expired"
                ? "Este convite expirou. Solicite um novo convite ao proprietário ou gerente da barbearia."
                : invitation.reason === "accepted"
                ? "Este convite já foi aceito anteriormente."
                : invitation.reason === "revoked"
                ? "Este convite foi revogado."
                : "Não foi possível validar este convite. Verifique o link e tente novamente."}
            </p>
            {isAuthenticated ? (
              <Link
                href="/painel"
                style={{
                  display: "inline-block",
                  marginTop: 16,
                  padding: "11px 18px",
                  background: "#d7612c",
                  color: "white",
                  borderRadius: 6,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Ir para o painel
              </Link>
            ) : (
              <Link
                href="/entrar"
                style={{
                  display: "inline-block",
                  marginTop: 16,
                  padding: "11px 18px",
                  background: "#d7612c",
                  color: "white",
                  borderRadius: 6,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Ir para o login
              </Link>
            )}
          </div>
        ) : (
          <div>
            <h1 style={{ font: "bold 34px Georgia, serif", margin: "8px 0 14px" }}>
              {invitation?.barbershop_name || "Barbearia"}
            </h1>
            <div
              style={{
                background: "#fff8f3",
                border: "1px solid #ead8ca",
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              <p style={{ margin: 0 }}>
                <b>Papel:</b>{" "}
                {invitation?.role === "manager" ? "Gerente" : "Barbeiro"}
              </p>
              {invitation?.professional_name && (
                <p style={{ margin: "4px 0 0" }}>
                  <b>Profissional vinculado:</b> {invitation.professional_name}
                </p>
              )}
              <p style={{ margin: "4px 0 0" }}>
                <b>E-mail convidado:</b> {invitation?.email_normalized}
              </p>
            </div>

            {!isAuthenticated ? (
              <div>
                <p style={{ color: "#6d6257", lineHeight: 1.5, marginBottom: 16 }}>
                  Para aceitar o convite, faça login com a conta de e-mail{" "}
                  <b>{invitation?.email_normalized}</b>.
                </p>

                <button
                  onClick={() => void handleGoogleLogin()}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: 13,
                    background: "white",
                    border: "1px solid #d9d0c8",
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: submitting ? "wait" : "pointer",
                  }}
                >
                  Entrar com Google
                </button>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    margin: "18px 0",
                    color: "#978b80",
                  }}
                >
                  <span style={{ height: 1, background: "#ddd", flex: 1 }} />
                  ou
                  <span style={{ height: 1, background: "#ddd", flex: 1 }} />
                </div>

                <form onSubmit={handleMagicLink}>
                  <label style={{ fontWeight: 700, display: "block" }}>
                    E-mail do convite
                    <input
                      required
                      type="email"
                      disabled={submitting}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={invitation?.email_normalized || "seu@email.com"}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: 6,
                        padding: 12,
                        border: "1px solid #d9d0c8",
                        borderRadius: 6,
                      }}
                    />
                  </label>
                  <button
                    disabled={submitting}
                    style={{
                      width: "100%",
                      marginTop: 12,
                      padding: 13,
                      border: 0,
                      borderRadius: 6,
                      background: "#d7612c",
                      color: "white",
                      fontWeight: 800,
                      cursor: submitting ? "wait" : "pointer",
                    }}
                  >
                    {submitting ? "Enviando..." : "Receber link mágico no e-mail"}
                  </button>
                </form>

                {message && (
                  <p role="status" style={{ marginTop: 14, color: "#6d6257" }}>
                    {message}
                  </p>
                )}
              </div>
            ) : userEmail?.toLowerCase() !==
              invitation?.email_normalized?.toLowerCase() ? (
              <div
                role="alert"
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: 8,
                  padding: 16,
                  color: "#991b1b",
                }}
              >
                <b>E-mail incompatível</b>
                <p style={{ margin: "6px 0 12px", lineHeight: 1.5 }}>
                  Este convite foi destido a <b>{invitation?.email_normalized}</b>, mas
                  você está conectado como <b>{userEmail}</b>.
                </p>
                <button
                  onClick={() => void handleSignOut()}
                  style={{
                    border: "1px solid #dc2626",
                    background: "white",
                    color: "#dc2626",
                    padding: "8px 14px",
                    borderRadius: 5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Sair e usar outro e-mail
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: "#166534", fontWeight: 700, marginBottom: 16 }}>
                  Autenticado como {userEmail}. Tudo pronto para aceitar seu convite.
                </p>
                <button
                  onClick={() => void handleAcceptInvitation()}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: 14,
                    border: 0,
                    borderRadius: 6,
                    background: "#166534",
                    color: "white",
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: submitting ? "wait" : "pointer",
                  }}
                >
                  {submitting ? "Aceitando convite..." : "Aceitar convite"}
                </button>
                {message && message !== "CONVITE_ACEITO_SUCESSO" && (
                  <p role="status" style={{ marginTop: 14, color: "#991b1b" }}>
                    {message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
