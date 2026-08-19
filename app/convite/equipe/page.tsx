"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const PENDING_TOKEN_KEY = "barbeariasp_pending_invitation_token_v2";
const LEGACY_PENDING_TOKEN_KEY = "barbeariasp_pending_invitation_token";
const PENDING_TOKEN_MAX_AGE_MS = 30 * 60 * 1000;

type StoredPendingToken = {
  token: string;
  savedAt: number;
};

function maskEmail(email?: string | null): string {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return "e-mail convidado";
  }

  const parts = email.trim().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return "e-mail convidado";
  }

  const [local, domain] = parts;
  const firstChar = local.charAt(0);
  const restLength = Math.max(3, local.length - 1);
  const maskedLocal = firstChar + "*".repeat(restLength);
  return `${maskedLocal}@${domain}`;
}

function clearPendingToken(): void {
  try {
    localStorage.removeItem(PENDING_TOKEN_KEY);
  } catch {
    // O navegador pode bloquear o armazenamento local.
  }

  try {
    sessionStorage.removeItem(LEGACY_PENDING_TOKEN_KEY);
  } catch {
    // Remove apenas o formato antigo quando ele estiver disponível.
  }
}

function persistPendingToken(token: string): boolean {
  try {
    const payload: StoredPendingToken = {
      token,
      savedAt: Date.now(),
    };
    localStorage.setItem(PENDING_TOKEN_KEY, JSON.stringify(payload));

    try {
      sessionStorage.removeItem(LEGACY_PENDING_TOKEN_KEY);
    } catch {
      // A migração do formato antigo é opcional.
    }

    return true;
  } catch {
    return false;
  }
}

function readPendingToken(): string {
  try {
    const raw = localStorage.getItem(PENDING_TOKEN_KEY);
    if (!raw) return "";

    const parsed = JSON.parse(raw) as Partial<StoredPendingToken>;
    const savedAt = Number(parsed.savedAt);
    const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
    const age = Date.now() - savedAt;

    if (
      !token ||
      !Number.isFinite(savedAt) ||
      age < 0 ||
      age > PENDING_TOKEN_MAX_AGE_MS
    ) {
      clearPendingToken();
      return "";
    }

    return token;
  } catch {
    clearPendingToken();
    return "";
  }
}

function migrateLegacyPendingToken(): string {
  try {
    const legacyToken = sessionStorage
      .getItem(LEGACY_PENDING_TOKEN_KEY)
      ?.trim();

    if (!legacyToken) return "";

    const persisted = persistPendingToken(legacyToken);
    sessionStorage.removeItem(LEGACY_PENDING_TOKEN_KEY);
    return persisted ? legacyToken : "";
  } catch {
    return "";
  }
}

type InvitationDetails = {
  valid: boolean;
  reason?: string;
  barbershop_name?: string;
  email_masked?: string;
  email_normalized?: string;
  email_matches_authenticated_user?: boolean | null;
  role?: "manager" | "barber";
  professional_name?: string | null;
  expires_at?: string;
};

const cardStyle = {
  background: "white",
  maxWidth: 520,
  width: "100%",
  padding: 32,
  borderRadius: 12,
  boxShadow: "0 10px 30px #291b1020",
  border: "1px solid #e8e0d8",
} as const;

const primaryButtonStyle = {
  width: "100%",
  padding: 14,
  border: 0,
  borderRadius: 6,
  background: "#d7612c",
  color: "white",
  fontWeight: 800,
  fontSize: 16,
} as const;

export default function ConviteEquipe() {
  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState("");

  const displayInvitationEmail = useMemo(
    () =>
      invitation?.email_masked ||
      maskEmail(invitation?.email_normalized) ||
      "e-mail convidado",
    [invitation]
  );

  const emailMismatch = useMemo(() => {
    if (!isAuthenticated || !invitation) return false;

    if (invitation.email_matches_authenticated_user === false) {
      return true;
    }

    if (
      invitation.email_matches_authenticated_user == null &&
      invitation.email_normalized &&
      userEmail
    ) {
      return (
        userEmail.toLowerCase() !== invitation.email_normalized.toLowerCase()
      );
    }

    return false;
  }, [invitation, isAuthenticated, userEmail]);

  const init = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const currentUrl = new URL(window.location.href);
      const tokenFromUrl = currentUrl.searchParams.get("token")?.trim() || "";
      let activeToken = "";

      if (tokenFromUrl) {
        activeToken = tokenFromUrl;
        const persisted = persistPendingToken(tokenFromUrl);

        currentUrl.searchParams.delete("token");
        const cleanUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
        window.history.replaceState(window.history.state, "", cleanUrl);

        if (!persisted) {
          setMessage(
            "Seu navegador bloqueou o armazenamento temporário. O convite continuará disponível nesta tela, mas o login pode precisar que você reabra o link original."
          );
        }
      } else {
        activeToken = readPendingToken() || migrateLegacyPendingToken();
      }

      setToken(activeToken);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsAuthenticated(Boolean(user));
      setUserEmail(user?.email || null);

      if (!activeToken) {
        setInvitation(null);
        return;
      }

      const { data, error } = await supabase.rpc("get_invitation_details", {
        p_token: activeToken,
      });

      if (error) {
        setInvitation({ valid: false, reason: "rpc_error" });
        return;
      }

      const details = (data || { valid: false }) as InvitationDetails;
      setInvitation(details);

      if (!details.valid) {
        clearPendingToken();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void init(), 0);
    return () => window.clearTimeout(timer);
  }, [init]);

  async function handleGoogleLogin() {
    if (!token) return;

    setMessage("");
    setSubmitting(true);

    try {
      if (!persistPendingToken(token)) {
        setMessage(
          "Não foi possível preservar o convite para o retorno do Google. Reabra o link original e permita o armazenamento local do navegador."
        );
        return;
      }

      const redirectUrl = `${window.location.origin}/convite/equipe`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });

      if (error) {
        setMessage(`Não foi possível iniciar acesso com Google: ${"Falha técnica"}`);
      }
    } catch (error) {
      setMessage(
        `Erro ao entrar com Google: ${
          error instanceof Error ? "Falha técnica" : "desconhecido"
        }`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMagicLink(event: FormEvent) {
    event.preventDefault();
    if (!token || !emailInput.trim()) return;

    setMessage("");
    setSubmitting(true);

    try {
      if (!persistPendingToken(token)) {
        setMessage(
          "Não foi possível preservar o convite para o retorno do e-mail. Reabra o link original e permita o armazenamento local do navegador."
        );
        return;
      }

      const redirectUrl = `${window.location.origin}/convite/equipe`;
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) {
        setMessage(`Não foi possível enviar o e-mail: ${"Falha técnica"}`);
      } else {
        setMessage(
          "Enviamos um link de acesso para seu e-mail. Abra-o neste navegador para prosseguir com o convite."
        );
      }
    } catch (error) {
      setMessage(
        `Erro ao enviar link de acesso: ${
          error instanceof Error ? "Falha técnica" : "desconhecido"
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
        setMessage(`Não foi possível aceitar o convite: ${"Falha técnica"}`);
      } else if (data?.success) {
        clearPendingToken();
        setMessage("CONVITE_ACEITO_SUCESSO");
      }
    } catch (error) {
      setMessage(
        `Erro ao aceitar convite: ${
          error instanceof Error ? "Falha técnica" : "desconhecido"
        }`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSwitchAccount() {
    if (token) {
      persistPendingToken(token);
    }

    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/convite/equipe");
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
      <section style={cardStyle}>
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
              O convite não foi encontrado ou o armazenamento temporário expirou.
              Reabra o link original enviado pelo gestor da barbearia.
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
            <h1
              style={{
                font: "bold 32px Georgia, serif",
                margin: "10px 0",
                color: "#166534",
              }}
            >
              Convite aceito com sucesso!
            </h1>
            <p style={{ color: "#6d6257", lineHeight: 1.6 }}>
              Você agora faz parte da equipe de{" "}
              <b>{invitation?.barbershop_name}</b> como{" "}
              <b>{invitation?.role === "manager" ? "Gerente" : "Barbeiro"}</b>.
            </p>
            <button
              onClick={() => window.location.replace("/painel")}
              style={{ ...primaryButtonStyle, cursor: "pointer" }}
            >
              Ir para o painel de gestão
            </button>
          </div>
        ) : invitation && !invitation.valid ? (
          <div>
            <h1
              style={{
                font: "bold 32px Georgia, serif",
                margin: "10px 0",
                color: "#991b1b",
              }}
            >
              Convite indisponível
            </h1>
            <p style={{ color: "#6d6257", lineHeight: 1.6 }}>
              {invitation.reason === "expired"
                ? "Este convite expirou. Solicite um novo convite ao proprietário ou gerente da barbearia."
                : invitation.reason === "accepted"
                  ? "Este convite já foi aceito anteriormente."
                  : invitation.reason === "revoked"
                    ? "Este convite foi revogado."
                    : invitation.reason === "rpc_error"
                      ? "Não foi possível validar o convite agora. Reabra o link original e tente novamente."
                      : "Não foi possível validar este convite. Verifique o link e tente novamente."}
            </p>
            <Link
              href={isAuthenticated ? "/painel" : "/entrar"}
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
              {isAuthenticated ? "Ir para o painel" : "Ir para o login"}
            </Link>
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
                <b>E-mail convidado:</b> {displayInvitationEmail}
              </p>
            </div>

            {!isAuthenticated ? (
              <div>
                <p style={{ color: "#6d6257", lineHeight: 1.5, marginBottom: 16 }}>
                  Para aceitar o convite, faça login com a conta de e-mail{" "}
                  <b>{displayInvitationEmail}</b>.
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
                      onChange={(event) => setEmailInput(event.target.value)}
                      placeholder={displayInvitationEmail}
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
                      ...primaryButtonStyle,
                      marginTop: 12,
                      padding: 13,
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
            ) : emailMismatch ? (
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
                  Este convite pertence a outro endereço de e-mail. Saia e entre
                  com a conta que recebeu o convite. Você está conectado como{" "}
                  <b>{userEmail}</b>.
                </p>
                <button
                  onClick={() => void handleSwitchAccount()}
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
                    ...primaryButtonStyle,
                    background: "#166534",
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
