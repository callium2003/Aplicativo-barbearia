"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  BARBERSHOP_NAME_CONFLICT_MESSAGE,
  isBarbershopSlugConflict,
  makeBarbershopSlug,
} from "@/app/barbershop-slug.mjs";
import { getPanelContext } from "@/utils/panel-context";
import styles from "./cadastro-inicial.module.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

type Details = {
  responsibleName: string;
  responsiblePhone: string;
  barbershopName: string;
  barbershopPhone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  totalPeople: string;
  attendingProfessionals: string;
  servicePositions: string;
  taxDocument: string;
};

const emptyDetails: Details = {
  responsibleName: "",
  responsiblePhone: "",
  barbershopName: "",
  barbershopPhone: "",
  postalCode: "",
  address: "",
  addressNumber: "",
  neighborhood: "",
  city: "",
  state: "",
  totalPeople: "",
  attendingProfessionals: "",
  servicePositions: "",
  taxDocument: "",
};

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  const phone = digits(value).slice(0, 11);
  if (phone.length <= 2) return phone ? `(${phone}` : "";
  if (phone.length <= 6) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
  if (phone.length <= 10)
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
}

function validBrazilianPhone(value: string) {
  const phone = digits(value);
  return /^(?:[1-9][0-9])(?:9[0-9]{8}|[2-5][0-9]{7})$/.test(phone);
}

function validDocument(value: string) {
  const document = digits(value);
  if (!document) return true;
  if (/^(\d)\1+$/.test(document)) return false;
  const calculate = (base: string, weights: number[]) =>
    weights.reduce((sum, weight, index) => sum + Number(base[index]) * weight, 0) % 11;

  if (document.length === 11) {
    const first = calculate(document.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const firstDigit = first < 2 ? 0 : 11 - first;
    const second = calculate(document.slice(0, 9) + firstDigit, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return document.endsWith(`${firstDigit}${second < 2 ? 0 : 11 - second}`);
  }

  if (document.length === 14) {
    const first = calculate(document.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const firstDigit = first < 2 ? 0 : 11 - first;
    const second = calculate(document.slice(0, 12) + firstDigit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return document.endsWith(`${firstDigit}${second < 2 ? 0 : 11 - second}`);
  }

  return false;
}

export default function CadastroInicial() {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState<Details>(emptyDetails);
  const [email, setEmail] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Verificando seu acesso...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const context = await getPanelContext(supabase);
      if (!active) return;
      if (!context.userId) {
        window.location.replace("/entrar");
        return;
      }
      if (context.role === "barber" || context.role === "manager") {
        window.location.replace("/painel/agenda");
        return;
      }
      if (context.role === "owner" && context.initialRegistrationCompleted) {
        window.location.replace("/painel");
        return;
      }
      setEmail(context.userEmail || "");
      setShopId(context.barbershopId);
      setMessage("");
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function update(field: keyof Details, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function validateFirst() {
    const next: Record<string, string> = {};
    if (details.responsibleName.trim().length < 2)
      next.responsibleName = "Informe seu nome completo.";
    if (!validBrazilianPhone(details.responsiblePhone))
      next.responsiblePhone = "Informe um telefone brasileiro válido com DDD.";
    setErrors(next);
    return !Object.keys(next).length;
  }

  function validateSecond() {
    const next: Record<string, string> = {};
    const total = Number(details.totalPeople);
    const professionals = Number(details.attendingProfessionals);
    const positions = Number(details.servicePositions);

    if (details.barbershopName.trim().length < 2)
      next.barbershopName = "Informe o nome da barbearia.";
    if (!validBrazilianPhone(details.barbershopPhone))
      next.barbershopPhone = "Informe um telefone brasileiro válido com DDD.";
    if (!/^\d{8}$/.test(digits(details.postalCode)))
      next.postalCode = "Informe um CEP válido com 8 números.";

    (["address", "addressNumber", "neighborhood", "city"] as const).forEach((field) => {
      if (!details[field].trim()) next[field] = "Este campo é obrigatório.";
    });

    if (!/^[A-Za-z]{2}$/.test(details.state.trim()))
      next.state = "Informe a sigla do estado, por exemplo SP.";
    if (!Number.isInteger(total) || total <= 0)
      next.totalPeople = "Informe uma quantidade maior que zero.";
    if (!Number.isInteger(professionals) || professionals <= 0)
      next.attendingProfessionals = "Informe uma quantidade maior que zero.";
    else if (Number.isInteger(total) && professionals > total)
      next.attendingProfessionals = "A quantidade de profissionais não pode ser maior que o total de pessoas.";
    if (!Number.isInteger(positions) || positions <= 0)
      next.servicePositions = "Informe uma quantidade maior que zero.";
    if (!validDocument(details.taxDocument))
      next.taxDocument = "Informe um CPF ou CNPJ válido, ou deixe o campo vazio.";

    setErrors(next);
    return !Object.keys(next).length;
  }

  function continueForm(event: FormEvent) {
    event.preventDefault();
    if (validateFirst()) setStep(2);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving || !validateSecond()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.replace("/entrar");
      return;
    }

    setSaving(true);
    setMessage("Salvando seu cadastro...");

    try {
      const phone = formatPhone(details.barbershopPhone);
      const slug = makeBarbershopSlug(details.barbershopName);
      const shopPayload = {
        name: details.barbershopName.trim(),
        slug,
        phone,
        whatsapp: phone,
        address: `${details.address.trim()}, ${details.addressNumber.trim()} - ${details.neighborhood.trim()}, ${details.city.trim()} - ${details.state.trim().toUpperCase()}`,
        initial_registration_completed: false,
      };

      let currentShopId = shopId;
      if (currentShopId) {
        const { error } = await supabase
          .from("barbershops")
          .update(shopPayload)
          .eq("id", currentShopId);
        if (error) {
          if (isBarbershopSlugConflict(error)) {
            setErrors((current) => ({
              ...current,
              barbershopName: BARBERSHOP_NAME_CONFLICT_MESSAGE,
            }));
            setMessage(BARBERSHOP_NAME_CONFLICT_MESSAGE);
            setSaving(false);
            return;
          }
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("barbershops")
          .insert({ owner_id: user.id, ...shopPayload })
          .select("id")
          .single<{ id: string }>();
        if (error) {
          if (isBarbershopSlugConflict(error)) {
            setErrors((current) => ({
              ...current,
              barbershopName: BARBERSHOP_NAME_CONFLICT_MESSAGE,
            }));
            setMessage(BARBERSHOP_NAME_CONFLICT_MESSAGE);
            setSaving(false);
            return;
          }
          throw error;
        }
        if (!data) throw new Error("Não foi possível criar a barbearia.");
        currentShopId = data.id;
        setShopId(data.id);
      }

      const { error: detailsError } = await supabase
        .from("barbershop_registration_details")
        .upsert({
          barbershop_id: currentShopId,
          responsible_name: details.responsibleName.trim(),
          responsible_phone: formatPhone(details.responsiblePhone),
          tax_document: digits(details.taxDocument) || null,
          postal_code: digits(details.postalCode),
          address_number: details.addressNumber.trim(),
          neighborhood: details.neighborhood.trim(),
          city: details.city.trim(),
          state: details.state.trim().toUpperCase(),
          total_people: Number(details.totalPeople),
          attending_professionals: Number(details.attendingProfessionals),
          service_positions: Number(details.servicePositions),
        });
      if (detailsError) throw detailsError;

      const { error: completionError } = await supabase
        .from("barbershops")
        .update({ initial_registration_completed: true })
        .eq("id", currentShopId);
      if (completionError) throw completionError;

      window.location.replace("/painel/configurar");
    } catch {
      setMessage("Não foi possível salvar agora. Revise os campos e tente novamente.");
      setSaving(false);
    }
  }

  const fieldError = (field: string) =>
    errors[field] ? (
      <small role="alert" className={styles.error}>
        {errors[field]}
      </small>
    ) : null;

  if (message === "Verificando seu acesso...") {
    return (
      <main className={styles.loading}>
        <p>{message}</p>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.brandPanel}>
        <Link className={styles.brand} href="/">
          BARBEARIA<span>SP</span>
        </Link>
        <div className={styles.brandCopy}>
          <small>Configuração inicial</small>
          <h2>{step === 1 ? "Sua operação começa por aqui." : "Agora vamos montar sua barbearia."}</h2>
          <p>
            {step === 1
              ? "Confirme os dados da pessoa responsável. Depois você configura as informações do estabelecimento."
              : "Esses dados criam a base da operação e poderão ser complementados depois em Configurações."}
          </p>
          <div className={styles.progress} aria-label={`Etapa ${step} de 2`}>
            <span data-active="true" />
            <span data-active={step === 2 ? "true" : "false"} />
          </div>
        </div>
      </aside>

      <section className={styles.formPanel}>
        <div className={styles.card}>
          <p className={styles.stepLabel}>Etapa {step} de 2</p>
          <h1 className={styles.title}>{step === 1 ? "Seus dados" : "Sua barbearia"}</h1>
          <p className={styles.subtitle}>
            {step === 1
              ? "Dados da pessoa responsável pela conta e pela barbearia."
              : "Cadastre as informações básicas do estabelecimento. CPF ou CNPJ continua opcional nesta etapa."}
          </p>

          {step === 1 ? (
            <form className={styles.form} onSubmit={continueForm}>
              <div className={styles.field}>
                <label htmlFor="responsible-name">Nome completo</label>
                <input
                  id="responsible-name"
                  className={styles.input}
                  autoComplete="name"
                  required
                  value={details.responsibleName}
                  onChange={(event) => update("responsibleName", event.target.value)}
                />
                {fieldError("responsibleName")}
              </div>

              <div className={styles.field}>
                <label htmlFor="access-email">E-mail de acesso</label>
                <input
                  id="access-email"
                  className={styles.input}
                  readOnly
                  aria-readonly="true"
                  value={email}
                />
                <small className={styles.help}>Seu e-mail de acesso não pode ser alterado aqui.</small>
              </div>

              <div className={styles.field}>
                <label htmlFor="responsible-phone">Telefone / WhatsApp</label>
                <input
                  id="responsible-phone"
                  className={styles.input}
                  autoComplete="tel"
                  required
                  inputMode="tel"
                  value={details.responsiblePhone}
                  onChange={(event) => update("responsiblePhone", formatPhone(event.target.value))}
                  placeholder="(11) 99999-9999"
                />
                {fieldError("responsiblePhone")}
              </div>

              <div className={styles.actions}>
                <button className={styles.primary}>Continuar</button>
              </div>
            </form>
          ) : (
            <form className={styles.form} onSubmit={save}>
              <div className={styles.grid}>
                <div className={`${styles.field} ${styles.full}`}>
                  <label htmlFor="barbershop-name">Nome da barbearia</label>
                  <input
                    id="barbershop-name"
                    className={styles.input}
                    required
                    value={details.barbershopName}
                    onChange={(event) => update("barbershopName", event.target.value)}
                  />
                  {fieldError("barbershopName")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="barbershop-phone">Telefone / WhatsApp</label>
                  <input
                    id="barbershop-phone"
                    className={styles.input}
                    required
                    inputMode="tel"
                    value={details.barbershopPhone}
                    onChange={(event) => update("barbershopPhone", formatPhone(event.target.value))}
                    placeholder="(11) 99999-9999"
                  />
                  {fieldError("barbershopPhone")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="postal-code">CEP</label>
                  <input
                    id="postal-code"
                    className={styles.input}
                    required
                    inputMode="numeric"
                    value={details.postalCode}
                    onChange={(event) => update("postalCode", digits(event.target.value).slice(0, 8))}
                    placeholder="00000000"
                  />
                  {fieldError("postalCode")}
                </div>

                <div className={`${styles.field} ${styles.full}`}>
                  <label htmlFor="address">Endereço</label>
                  <input
                    id="address"
                    className={styles.input}
                    required
                    autoComplete="street-address"
                    value={details.address}
                    onChange={(event) => update("address", event.target.value)}
                  />
                  {fieldError("address")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="address-number">Número</label>
                  <input
                    id="address-number"
                    className={styles.input}
                    required
                    value={details.addressNumber}
                    onChange={(event) => update("addressNumber", event.target.value)}
                  />
                  {fieldError("addressNumber")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="neighborhood">Bairro</label>
                  <input
                    id="neighborhood"
                    className={styles.input}
                    required
                    value={details.neighborhood}
                    onChange={(event) => update("neighborhood", event.target.value)}
                  />
                  {fieldError("neighborhood")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="city">Cidade</label>
                  <input
                    id="city"
                    className={styles.input}
                    required
                    value={details.city}
                    onChange={(event) => update("city", event.target.value)}
                  />
                  {fieldError("city")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="state">Estado</label>
                  <input
                    id="state"
                    className={styles.input}
                    required
                    maxLength={2}
                    value={details.state}
                    onChange={(event) => update("state", event.target.value.toUpperCase())}
                    placeholder="SP"
                  />
                  {fieldError("state")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="total-people">Quantidade total de pessoas</label>
                  <input
                    id="total-people"
                    className={styles.input}
                    required
                    min="1"
                    inputMode="numeric"
                    type="number"
                    value={details.totalPeople}
                    onChange={(event) => update("totalPeople", event.target.value)}
                  />
                  {fieldError("totalPeople")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="attending-professionals">Profissionais que atendem clientes</label>
                  <input
                    id="attending-professionals"
                    className={styles.input}
                    required
                    min="1"
                    inputMode="numeric"
                    type="number"
                    value={details.attendingProfessionals}
                    onChange={(event) => update("attendingProfessionals", event.target.value)}
                  />
                  {fieldError("attendingProfessionals")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="service-positions">Posições de atendimento</label>
                  <input
                    id="service-positions"
                    className={styles.input}
                    required
                    min="1"
                    inputMode="numeric"
                    type="number"
                    value={details.servicePositions}
                    onChange={(event) => update("servicePositions", event.target.value)}
                  />
                  {fieldError("servicePositions")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="tax-document">CPF ou CNPJ (opcional)</label>
                  <input
                    id="tax-document"
                    className={styles.input}
                    inputMode="numeric"
                    value={details.taxDocument}
                    onChange={(event) => update("taxDocument", digits(event.target.value).slice(0, 14))}
                    placeholder="Pode deixar em branco"
                  />
                  {fieldError("taxDocument")}
                </div>
              </div>

              <small className={styles.help}>
                CPF ou CNPJ é opcional neste momento e poderá ser informado ou atualizado depois em Configurações, antes da contratação de um plano pago.
              </small>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setStep(1)}
                  disabled={saving}
                >
                  Voltar
                </button>
                <button className={styles.primary} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar e configurar minha barbearia"}
                </button>
              </div>
            </form>
          )}

          {message && <p role="status" className={styles.status}>{message}</p>}
        </div>
      </section>
    </main>
  );
}
