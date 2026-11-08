"use client";

import { useState, useId } from "react";
import styles from "./lead-capture-form.module.css";
import { handleLeadFormSubmissionResult } from "@/utils/leads";

export default function LeadCaptureForm() {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [barbershopName, setBarbershopName] = useState("");
  const [teamSize, setTeamSize] = useState("1 a 3 profissionais");
  const [cityState, setCityState] = useState("");
  const [notes, setNotes] = useState("");
  const [websiteHoneypot, setWebsiteHoneypot] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const nameId = useId();
  const whatsappId = useId();
  const shopId = useId();
  const teamId = useId();
  const cityId = useId();
  const notesId = useId();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setWhatsapp(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          whatsapp,
          barbershopName,
          teamSize,
          cityState,
          notes,
          websiteHoneypot,
        }),
      });

      const data = await response.json();

      const next = handleLeadFormSubmissionResult(
        { fullName, whatsapp, barbershopName, cityState, notes, status: "submitting", message: "" },
        response.ok,
        data
      );

      setStatus(next.status);
      setMessage(next.message);
      setFullName(next.fullName);
      setWhatsapp(next.whatsapp);
      setBarbershopName(next.barbershopName);
      setCityState(next.cityState);
      setNotes(next.notes);
    } catch {
      setStatus("error");
      setMessage("Erro de conexão. Por favor, tente novamente em instantes.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.badge}>ATENDIMENTO CULLENTECH</span>
        <h3>Quer ver como a BarbeariaSP funciona no seu negócio?</h3>
        <p>Preencha os dados e receba uma demonstração guiada diretamente no seu WhatsApp, sem compromisso.</p>
      </div>

      {status === "success" ? (
        <div className={styles.successCard} role="status">
          <div className={styles.successIcon}>✓</div>
          <h4>Demonstração Solicitada com Sucesso!</h4>
          <p>{message}</p>
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => setStatus("idle")}
          >
            Enviar outra mensagem
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Honeypot invisível para captura de bots */}
          <div style={{ display: "none" }} aria-hidden="true">
            <label htmlFor="website-hp">Website</label>
            <input
              id="website-hp"
              type="text"
              name="websiteHoneypot"
              tabIndex={-1}
              autoComplete="off"
              value={websiteHoneypot}
              onChange={(e) => setWebsiteHoneypot(e.target.value)}
            />
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor={nameId}>Seu Nome *</label>
              <input
                id={nameId}
                type="text"
                placeholder="Ex: Carlos Silva"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={status === "submitting"}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={whatsappId}>WhatsApp com DDD *</label>
              <input
                id={whatsappId}
                type="tel"
                placeholder="(11) 99999-9999"
                required
                value={whatsapp}
                onChange={handlePhoneChange}
                disabled={status === "submitting"}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={shopId}>Nome da Barbearia *</label>
              <input
                id={shopId}
                type="text"
                placeholder="Ex: Barbearia Dom Pedro"
                required
                value={barbershopName}
                onChange={(e) => setBarbershopName(e.target.value)}
                disabled={status === "submitting"}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={teamId}>Tamanho da Equipe</label>
              <select
                id={teamId}
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                disabled={status === "submitting"}
              >
                <option value="1 a 3 profissionais">1 a 3 profissionais (Plano Simple)</option>
                <option value="4 a 5 profissionais">4 a 5 profissionais (Plano Middle)</option>
                <option value="6 a 7 profissionais">6 a 7 profissionais (Plano Master)</option>
                <option value="8 ou mais profissionais">8 ou mais profissionais (Personalizado)</option>
              </select>
            </div>

            <div className={styles.fieldFull}>
              <label htmlFor={cityId}>Cidade / Estado</label>
              <input
                id={cityId}
                type="text"
                placeholder="Ex: São Paulo / SP"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                disabled={status === "submitting"}
              />
            </div>

            <div className={styles.fieldFull}>
              <label htmlFor={notesId}>Dúvida ou Mensagem (opcional)</label>
              <textarea
                id={notesId}
                rows={3}
                placeholder="Conte-nos como funciona seu atendimento hoje ou tire suas dúvidas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={status === "submitting"}
              />
            </div>
          </div>

          {status === "error" && (
            <div className={styles.errorMessage} role="alert">
              {message}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Enviando informações..." : "Solicitar Contato no WhatsApp"}
            </button>
            <p className={styles.privacyNotice}>
              Seus dados serão utilizados exclusivamente pela CullenTech Soluções Digitais para apresentar a plataforma.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

