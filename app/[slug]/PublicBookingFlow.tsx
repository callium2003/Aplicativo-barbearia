import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import type {
  Dispatch,
  FormEventHandler,
  RefObject,
  SetStateAction,
} from "react";

import {
  formatBusinessHour,
  formatHour,
  monthLabel,
  serviceImage,
  weekdayLabels,
} from "./booking-formatters";
import styles from "./public-page.module.css";
import type {
  Availability,
  BusinessHour,
  PublicProfessional,
  Service,
  Shop,
} from "./types";

type BookingStep = 1 | 2 | 3 | 4;

type PublicBookingFlowProps = {
  shop: Shop;
  services: Service[];
  businessHours: BusinessHour[];
  publicProfessionals: Record<string, PublicProfessional>;
  bookingStep: BookingStep | null;
  bookingAvailable: boolean;
  selectedServiceIds: string[];
  selectedDate: string;
  calendarMonth: Date;
  calendarDays: Date[];
  calendarAvailability: Record<string, boolean>;
  selectedServices: Service[];
  totalDuration: number;
  totalPrice: number;
  selectedProfessionalId: string | null;
  selectedSlot: Availability | null;
  confirmed: boolean;
  availabilityByProfessional: Record<string, Availability[]>;
  loadingAvailability: boolean;
  telephoneLink: string | null;
  user: User | null;
  customerName: string;
  customerPhone: string;
  email: string;
  isAdministrativeShopMember: boolean;
  saving: boolean;
  sendingLogin: boolean;
  showAuthenticationOptions: boolean;
  showMarketingPreferences: boolean;
  showBarbershopMarketingPreference: boolean;
  showPlatformMarketingPreference: boolean;
  barbershopMarketing: boolean;
  platformMarketing: boolean;
  marketingMessage: string;
  savingMarketingPreferences: boolean;
  message: string;
  bookingRef: RefObject<HTMLElement | null>;
  confirmationRef: RefObject<HTMLElement | null>;
  activeStepHeadingRef: RefObject<HTMLHeadingElement | null>;
  marketingDialogRef: RefObject<HTMLElement | null>;
  setSelectedServiceIds: Dispatch<SetStateAction<string[]>>;
  setCalendarMonth: Dispatch<SetStateAction<Date>>;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  setSelectedSlot: Dispatch<SetStateAction<Availability | null>>;
  setConfirmed: Dispatch<SetStateAction<boolean>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setSelectedProfessionalId: Dispatch<SetStateAction<string | null>>;
  setCustomerName: Dispatch<SetStateAction<string>>;
  setCustomerPhone: Dispatch<SetStateAction<string>>;
  setEmail: Dispatch<SetStateAction<string>>;
  setBarbershopMarketing: Dispatch<SetStateAction<boolean>>;
  setPlatformMarketing: Dispatch<SetStateAction<boolean>>;
  onOpenBooking: (step?: BookingStep) => void;
  onScrollHome: () => void;
  onScrollBooking: () => void;
  onChooseSlot: (slot: Availability) => void;
  onStartNewBooking: () => void;
  onConfirmAppointment: FormEventHandler<HTMLFormElement>;
  onRequestAuthentication: FormEventHandler<HTMLFormElement>;
  onContinueWithGoogle: () => void;
  onSendMagicLink: () => void;
  onSaveMarketingPreferences: (continueWithoutMarketing?: boolean) => void;
  dateForInput: (offsetDays?: number) => string;
  dateKey: (date: Date) => string;
  formatDate: (date: string) => string;
};

export function PublicBookingFlow({
  shop,
  services,
  businessHours,
  publicProfessionals,
  bookingStep,
  bookingAvailable,
  selectedServiceIds,
  selectedDate,
  calendarMonth,
  calendarDays,
  calendarAvailability,
  selectedServices,
  totalDuration,
  totalPrice,
  selectedProfessionalId,
  selectedSlot,
  confirmed,
  availabilityByProfessional,
  loadingAvailability,
  telephoneLink,
  user,
  customerName,
  customerPhone,
  email,
  isAdministrativeShopMember,
  saving,
  sendingLogin,
  showAuthenticationOptions,
  showMarketingPreferences,
  showBarbershopMarketingPreference,
  showPlatformMarketingPreference,
  barbershopMarketing,
  platformMarketing,
  marketingMessage,
  savingMarketingPreferences,
  message,
  bookingRef,
  confirmationRef,
  activeStepHeadingRef,
  marketingDialogRef,
  setSelectedServiceIds,
  setCalendarMonth,
  setSelectedDate,
  setSelectedSlot,
  setConfirmed,
  setMessage,
  setSelectedProfessionalId,
  setCustomerName,
  setCustomerPhone,
  setEmail,
  setBarbershopMarketing,
  setPlatformMarketing,
  onOpenBooking,
  onScrollHome,
  onScrollBooking,
  onChooseSlot,
  onStartNewBooking,
  onConfirmAppointment,
  onRequestAuthentication,
  onContinueWithGoogle,
  onSendMagicLink,
  onSaveMarketingPreferences,
  dateForInput,
  dateKey,
  formatDate,
}: PublicBookingFlowProps) {
  return (
    <div className={styles.content}>
      {bookingStep === null && <>
      {/* Serviços em destaque conforme mockup exec-7b8e1062 */}
      <section className={styles.showcaseSection}>
        <div className={styles.sectionHeaderRow}>
          <h2>Serviços</h2>
          <button
            type="button"
            className={styles.seeAllButton}
            disabled={!bookingAvailable}
            onClick={() => onOpenBooking(2)}
          >
            Ver todos &rsaquo;
          </button>
        </div>
        <div className={styles.serviceCirclesRow}>
          {services.slice(0, 4).map((service) => (
            <button
              key={service.id}
              type="button"
              className={styles.serviceCircleItem}
              disabled={!bookingAvailable}
              onClick={() => {
                setSelectedServiceIds([service.id]);
                onOpenBooking(2);
              }}
            >
              <div className={styles.serviceCircleIcon} aria-hidden="true">
                <Image src={serviceImage(service.name)} alt="" width={48} height={48} />
              </div>
              <strong>{service.name}</strong>
              <span>{service.duration_minutes || 0} min · R$ {Number(service.price).toFixed(2).replace(".", ",")}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Equipe conforme mockup exec-7b8e1062 */}
      <section className={styles.showcaseSection}>
        <div className={styles.sectionHeaderRow}>
          <h2>Nossa equipe</h2>
          <button
            type="button"
            className={styles.seeAllButton}
            disabled={!bookingAvailable}
            onClick={onScrollBooking}
          >
            Ver todos &rsaquo;
          </button>
        </div>
        <div className={styles.teamCirclesRow}>
          {Object.values(publicProfessionals).map((professional) => (
            <button key={professional.id} type="button" className={styles.teamCircleItem} disabled={!bookingAvailable} data-has-photo={Boolean(professional.photo_url)} onClick={() => onOpenBooking(2)}>
              {professional.photo_url && <div className={styles.teamCircleAvatar}>
                <Image src={professional.photo_url} alt="" width={68} height={68} unoptimized />
              </div>}
              <strong>{professional.name}</strong>
              <span>Profissional</span>
            </button>
          ))}
        </div>
      </section>

      {businessHours.length > 0 && (
        <section className={styles.infoCard}>
          <div className={styles.infoCardIcon}>🕒</div>
          <div className={styles.infoCardBody}>
            <h3>Horários de atendimento</h3>
            <div className={styles.infoCardHours}>
              {businessHours.map((hour) => (
                <p key={hour.weekday}>
                  <span>{weekdayLabels[hour.weekday]}</span>
                  {formatBusinessHour(hour)}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Endereço e contato conforme mockup exec-7b8e1062 */}
      <section className={styles.infoCard}>
        <div className={styles.infoCardIcon}>📍</div>
        <div className={styles.infoCardBody}>
          <h3>Endereço e contato</h3>
          {shop.address && <p className={styles.infoCardAddress}>{shop.address}</p>}
          {shop.phone && <p className={styles.infoCardPhone}>📞 {telephoneLink ? <a href={telephoneLink}>{shop.phone}</a> : shop.phone}</p>}
        </div>
      </section>
      </>}

      {bookingStep !== null && <section className={styles.bookingSection} ref={bookingRef}>
        {/* Stepper visual inspirado nos mockups aprovados */}
        <div className={styles.bookingStepper} aria-hidden="true">
          <div className={styles.stepperStep} data-active="true" data-completed={Boolean(selectedDate)}>
            <div className={styles.stepperNode}>1</div>
            <span className={styles.stepperLabel}>Data</span>
          </div>
          <div className={styles.stepperLine} data-completed={selectedServices.length > 0} />
          <div className={styles.stepperStep} data-active={selectedServices.length > 0} data-completed={selectedServices.length > 0}>
            <div className={styles.stepperNode}>2</div>
            <span className={styles.stepperLabel}>Serviços</span>
          </div>
          <div className={styles.stepperLine} data-completed={Boolean(selectedSlot)} />
          <div className={styles.stepperStep} data-active={Boolean(selectedSlot)} data-completed={Boolean(selectedSlot)}>
            <div className={styles.stepperNode}>3</div>
            <span className={styles.stepperLabel}>Horário</span>
          </div>
          <div className={styles.stepperLine} data-completed={confirmed} />
          <div className={styles.stepperStep} data-active={confirmed} data-completed={confirmed}>
            <div className={styles.stepperNode}>4</div>
            <span className={styles.stepperLabel}>Confirmação</span>
          </div>
        </div>

        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>AGENDAMENTO ONLINE</p>
          <h2 ref={activeStepHeadingRef} tabIndex={-1}>{bookingStep === 1 ? "Escolha a data" : bookingStep === 2 ? "Serviços e profissional" : bookingStep === 3 ? "Escolha o horário" : "Confirme seu agendamento"}</h2>
          <p>{bookingStep === 1 ? "Selecione o dia desejado para o seu agendamento." : bookingStep === 2 ? "Selecione de um a três serviços. Você escolherá o horário com o profissional disponível." : bookingStep === 3 ? "Escolha o profissional e o horário que preferir." : "Revise os detalhes antes de confirmar."}</p>
        </div>

        {bookingStep === 1 && (
          <div className={styles.dateStep}>
            <div className={styles.calendarHeader}>
              <button type="button" className={styles.calendarMonthButton} aria-label="Mês anterior" disabled={calendarMonth <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)} onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button>
              <h3>{monthLabel(calendarMonth)}</h3>
              <button type="button" className={styles.calendarMonthButton} aria-label="Próximo mês" disabled={calendarMonth >= new Date(new Date(dateForInput(90)).getFullYear(), new Date(dateForInput(90)).getMonth(), 1)} onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button>
            </div>
            <div className={styles.calendarWeekdays} aria-hidden="true">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className={styles.calendarGrid} role="grid" aria-label="Escolha a data do agendamento">
              {calendarDays.map((day) => {
                const key = dateKey(day);
                const available = key >= dateForInput() && key <= dateForInput(90) && calendarAvailability[key] === true;
                const selected = key === selectedDate && available;
                return <button key={key} type="button" className={styles.calendarDay} data-selected={selected ? "true" : "false"} disabled={!available} aria-pressed={selected} aria-label={new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(day)} onClick={() => { setCalendarMonth(new Date(day.getFullYear(), day.getMonth(), 1)); setSelectedDate(key); setSelectedSlot(null); setConfirmed(false); }}>{day.getDate()}</button>;
              })}
            </div>
            <div className={styles.calendarLegend}><span><i data-kind="selected" />Selecionado</span><span><i data-kind="today" />Hoje</span><span><i data-kind="unavailable" />Indisponível</span></div>
            <button type="button" className={styles.primaryButton} disabled={calendarAvailability[selectedDate] !== true} onClick={() => onOpenBooking(2)}>Continuar</button>
            <button type="button" className={styles.secondaryButton} onClick={onScrollHome}>Voltar</button>
          </div>
        )}

        {bookingStep === 2 && <>
        <div className={styles.serviceGrid}>
          {services.length ? (
            services.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  className={styles.serviceCard}
                  data-selected={isSelected ? "true" : "false"}
                  disabled={!isSelected && selectedServiceIds.length >= 3}
                  onClick={() => {
                    setSelectedServiceIds((current) => {
                      if (isSelected) return current.filter((id) => id !== service.id);
                      if (current.length >= 3) {
                        setMessage("Selecione no máximo três serviços por agendamento.");
                        return current;
                      }
                      return [...current, service.id];
                    });
                    setConfirmed(false);
                  }}
                >
                  <div className={styles.serviceItemLeft}>
                    <div className={styles.serviceCheckbox}>
                      {isSelected ? "✓" : ""}
                    </div>
                    <div className={styles.serviceItemIcon}>
                      <Image src={serviceImage(service.name)} alt="" width={30} height={30} />
                    </div>
                    <span>
                      <strong>{service.name}</strong>
                      <small>{service.duration_minutes} minutos</small>
                    </span>
                  </div>
                  <b>
                    R$ {Number(service.price).toFixed(2).replace(".", ",")}
                  </b>
                </button>
              );
            })
          ) : (
            <p className={styles.emptyState}>
              Os serviços serão publicados em breve.
            </p>
          )}
        </div>

        <p className={styles.selectionHint} role="status">
          Escolha até três serviços para o mesmo profissional.
        </p>

        {selectedServices.length > 0 && (
          <>
            <div className={styles.selectionSummary}>
              <strong>{selectedServices.length} de 3 serviços</strong>
              <span>{totalDuration} min · R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
            </div>
            <fieldset className={styles.professionalPicker}>
              <legend>Profissional</legend>
              <div className={styles.professionalPickerRow}>
                <button type="button" className={styles.professionalChoice} data-selected={selectedProfessionalId === null ? "true" : "false"} onClick={() => setSelectedProfessionalId(null)}>
                  <span className={styles.professionalChoiceAvatar}>✓</span>
                  Sem preferência
                </button>
                {Object.values(publicProfessionals).map((professional) => (
                  <button key={professional.id} type="button" className={styles.professionalChoice} data-selected={selectedProfessionalId === professional.id ? "true" : "false"} onClick={() => setSelectedProfessionalId(professional.id)}>
                    {professional.photo_url && (
                      <span className={styles.professionalChoiceAvatar}>
                        <Image src={professional.photo_url} alt="" width={42} height={42} unoptimized />
                      </span>
                    )}
                    {professional.name}
                  </button>
                ))}
              </div>
            </fieldset>
            <button type="button" className={styles.primaryButton} onClick={() => onOpenBooking(3)}>Continuar para horários</button>
          </>
        )}
        <button type="button" className={styles.secondaryButton} onClick={() => onOpenBooking(1)}>Voltar</button>
        </>}

        {bookingStep === 3 && selectedServices.length > 0 && (
          <div className={styles.availabilityArea}>
            <button type="button" className={styles.changeDateButton} onClick={() => onOpenBooking(1)}>Alterar data: {formatDate(selectedDate)}</button>
            <div className={styles.availabilityHeading}>
              <h3>Profissionais e horários disponíveis</h3>
              <p>Escolha o profissional e o horário que preferir.</p>
            </div>
            {loadingAvailability ? (
              <p className={styles.emptyState}>Consultando a agenda...</p>
            ) : Object.keys(availabilityByProfessional).length ? (
              <div className={styles.professionalGrid}>
                {Object.values(availabilityByProfessional).map((slots) => {
                  const professional = publicProfessionals[slots[0].professional_id];
                  return (
                    <article key={slots[0].professional_id} className={styles.professionalCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        {professional?.photo_url ? (
                          <Image
                            src={professional.photo_url}
                            alt={professional.name}
                            width={42}
                            height={42}
                            unoptimized
                            sizes="42px"
                            style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }}
                          />
                        ) : null}
                        <div style={{ display: "grid", gap: 3 }}>
                          <strong>{slots[0].professional_name}</strong>
                          <span>Profissional disponível</span>
                          {professional?.instagram_url && (
                            <a
                              href={professional.instagram_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#9a5a00", fontSize: 12, fontWeight: 800 }}
                            >
                              Ver Instagram
                            </a>
                          )}
                        </div>
                      </div>
                      <div className={styles.slotList}>
                        {slots.map((slot) => (
                          <button
                            key={slot.starts_at}
                            type="button"
                            data-selected={selectedSlot?.starts_at === slot.starts_at && selectedSlot.professional_id === slot.professional_id ? "true" : "false"}
                            onClick={() => onChooseSlot(slot)}
                          >
                            {formatHour(slot.starts_at)}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyState}>
                Não há horário disponível nesta data. Escolha outro dia.
              </p>
            )}
            {selectedSlot && <button type="button" className={styles.primaryButton} onClick={() => onOpenBooking(4)}>Revisar agendamento</button>}
            <button type="button" className={styles.secondaryButton} onClick={() => onOpenBooking(2)}>Voltar</button>
          </div>
        )}

        {bookingStep === 4 && selectedSlot && selectedServices.length > 0 && (
          <section className={styles.confirmationCard} ref={confirmationRef}>
            {user && (
              <div className="user-logged-card">
                <div className="user-avatar-circle">👤</div>
                <div>
                  <div className="user-logged-name">
                    Olá, {customerName || user.email?.split("@")[0] || "Cliente"}
                  </div>
                  <div className="user-logged-email">{user.email}</div>
                </div>
              </div>
            )}

            <div>
              <p className={styles.eyebrow}>BARBEARIASP</p>
              <h3 className={styles.confirmationTitle}>
                {user ? "Confirme seu agendamento" : "Entre para confirmar"}
              </h3>
              <p className={styles.confirmationIntro}>
                {user
                  ? "Revise os detalhes do seu agendamento antes de confirmar."
                  : "Entre ou crie sua conta para finalizar. Seus dados e horário serão preservados."}
              </p>
            </div>

            {/* Stepper conectado idêntico à Imagem 5 */}
            <div className="stepper-connected-bar" aria-hidden="true">
              <div className="stepper-step-node"><div className="stepper-circle completed">✓</div><span className="stepper-step-label">Data</span></div>
              <div className="stepper-connector-line active" />
              <div className="stepper-step-node"><div className="stepper-circle completed">✓</div><span className="stepper-step-label">Serviço e profissional</span></div>
              <div className="stepper-connector-line active" />
              <div className="stepper-step-node"><div className="stepper-circle completed">✓</div><span className="stepper-step-label">Horário</span></div>
              <div className="stepper-connector-line active" />
              <div className="stepper-step-node active"><div className="stepper-circle active">4</div><span className="stepper-step-label">Confirmação</span></div>
            </div>

            {/* Card detalhado de confirmação idêntico à Imagem 5 */}
            <div className="editorial-receipt-card" style={{ marginBottom: 12 }}>
              <div className="editorial-receipt-row"><div className="editorial-receipt-left"><div className="editorial-receipt-icon">📅</div><div><div className="editorial-receipt-label">Data</div><div className="editorial-receipt-value" style={{ textAlign: "left" }}>{formatDate(selectedDate)}</div></div></div></div>
              <hr className="editorial-receipt-divider" />
              <div className="editorial-receipt-row"><div className="editorial-receipt-left"><div className="editorial-receipt-icon">🕒</div><div><div className="editorial-receipt-label">Horário</div><div className="editorial-receipt-value" style={{ textAlign: "left" }}>{formatHour(selectedSlot.starts_at)}</div></div></div></div>
              <hr className="editorial-receipt-divider" />
              <div className="editorial-receipt-row"><div className="editorial-receipt-left"><div className="editorial-receipt-icon">✂</div><div><div className="editorial-receipt-label">Serviços</div><div className="editorial-receipt-value" style={{ textAlign: "left" }}>{selectedServices.map((s) => `${s.name} — R$ ${s.price.toFixed(2).replace(".", ",")}`).join(" | ")}</div></div></div></div>
              <hr className="editorial-receipt-divider" />
              <div className="editorial-receipt-row"><div className="editorial-receipt-left"><div className="editorial-receipt-icon">👤</div><div><div className="editorial-receipt-label">Profissional</div><div className="editorial-receipt-value" style={{ textAlign: "left" }}>{selectedSlot.professional_name}</div></div></div></div>
              <hr className="editorial-receipt-divider" />
              <div className="editorial-receipt-row"><div className="editorial-receipt-left"><div className="editorial-receipt-icon">🕒</div><div><div className="editorial-receipt-label">Duração</div><div className="editorial-receipt-value" style={{ textAlign: "left" }}>{totalDuration} min</div></div></div></div>
              <hr className="editorial-receipt-divider" />
              <div className="editorial-receipt-row"><div className="editorial-receipt-left"><div className="editorial-receipt-icon">💈</div><div><div className="editorial-receipt-label">Barbearia</div><div className="editorial-receipt-value" style={{ textAlign: "left" }}>{shop.name}</div></div></div></div>
            </div>

            {/* Total Box com destaque terracota */}
            <div className="confirmation-total-box"><span className="confirmation-total-label">Total</span><span className="confirmation-total-amount">R$ {totalPrice.toFixed(2).replace(".", ",")}</span></div>

            {/* Nota de disponibilidade */}
            <div className="confirmation-note-box"><span>ⓘ</span><span>A disponibilidade será verificada novamente no momento da confirmação.</span></div>
            {confirmed ? (
              <section className={styles.bookingSuccess} role="status">
                <div className={styles.successIcon} aria-hidden="true">✓</div>
                <div>
                  <p className={styles.eyebrow}>AGENDADO!</p>
                  <h3>Seu horário está reservado.</h3>
                  <p>Você receberá a confirmação pelos contatos informados. Se precisar, a barbearia também poderá falar com você.</p>
                </div>
                <dl className={styles.successDetails}>
                  <div><dt>Serviço</dt><dd>{selectedServices.map((service) => service.name).join(" + ")}</dd></div>
                  <div><dt>Profissional</dt><dd>{selectedSlot.professional_name}</dd></div>
                  <div><dt>Data</dt><dd>{formatDate(selectedDate)}</dd></div>
                  <div><dt>Horário</dt><dd>{formatHour(selectedSlot.starts_at)}</dd></div>
                  <div><dt>Valor</dt><dd>R$ {totalPrice.toFixed(2).replace(".", ",")}</dd></div>
                </dl>
                <div className={styles.successActions}>
                  <button className={styles.primaryButton} type="button" onClick={onStartNewBooking}>Novo agendamento</button>
                  <a className={styles.secondaryButton} href={"/meus-agendamentos"}>Gerenciar agendamento</a>
                </div>
                {showMarketingPreferences && (
                  <section
                    aria-labelledby="marketing-preferences-title"
                    aria-modal="true"
                    className={styles.marketingPreferences}
                    ref={marketingDialogRef}
                    role="dialog"
                    tabIndex={-1}
                  >
                    <div>
                      <p className={styles.eyebrow}>OPCIONAL</p>
                      <h4 id="marketing-preferences-title">Preferências de comunicação</h4>
                      <p>Seu agendamento já está confirmado. Você pode alterar estas escolhas a qualquer momento em Meu perfil.</p>
                    </div>
                    <form
                      className={styles.marketingPreferenceForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        onSaveMarketingPreferences();
                      }}
                    >
                      {showBarbershopMarketingPreference && (
                        <label className={styles.consent}>
                          <input checked={barbershopMarketing} onChange={(event) => setBarbershopMarketing(event.target.checked)} type="checkbox" />
                          <span>Aceito receber promoções e novidades desta barbearia.</span>
                        </label>
                      )}
                      {showPlatformMarketingPreference && (
                        <label className={styles.consent}>
                          <input checked={platformMarketing} onChange={(event) => setPlatformMarketing(event.target.checked)} type="checkbox" />
                          <span>Aceito receber novidades e benefícios do aplicativo BarbeariaSP.</span>
                        </label>
                      )}
                      {marketingMessage && <p className={styles.statusMessage} role="status">{marketingMessage}</p>}
                      <div className={styles.marketingPreferenceActions}>
                        <button className={styles.primaryButton} disabled={savingMarketingPreferences}>{savingMarketingPreferences ? "Salvando..." : "Salvar preferências"}</button>
                        <button className={styles.secondaryButton} disabled={savingMarketingPreferences} onClick={() => onSaveMarketingPreferences(true)} type="button">Continuar sem receber novidades</button>
                      </div>
                    </form>
                  </section>
                )}
              </section>
            ) : (
              <form onSubmit={user ? onConfirmAppointment : onRequestAuthentication} className={styles.confirmationForm}>
                {user && (
                  <label><span>E-mail</span><input value={user.email || ""} disabled autoComplete="email" /></label>
                )}
                <label>
                  <span>Seu nome</span>
                  <input required minLength={2} autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                </label>
                <label>
                  <span>Celular com DDD</span>
                  <input required inputMode="tel" minLength={10} autoComplete="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="(11) 99999-9999" />
                </label>
                {isAdministrativeShopMember && <p className={styles.statusMessage} role="status">Para agendar nesta barbearia, entre com uma conta de cliente.</p>}
                {user ? (
                  <>
                    <button className={styles.primaryButton} disabled={saving || isAdministrativeShopMember}>{saving ? "Confirmando..." : "Confirmar agendamento"}</button>
                    <button type="button" className={styles.secondaryButton} style={{ marginTop: 8, borderColor: "#B45334", color: "#B45334", fontWeight: 700 }} onClick={() => setSelectedSlot(null)}>Alterar agendamento</button>
                  </>
                ) : (
                  !showAuthenticationOptions && <button className={styles.primaryButton}>Continuar</button>
                )}
                {!user && showAuthenticationOptions && (
                  <div className={styles.authenticationOptions}>
                    <div className={styles.authenticationPrompt}>
                      <p className={styles.authenticationPromptTitle}>Faça login para seguir com seu agendamento.</p>
                      <p className={styles.authenticationPromptDetail}>Sua agenda é preservada enquanto você entra.</p>
                    </div>
                    <button type="button" className={styles.secondaryButton} onClick={onContinueWithGoogle} disabled={sendingLogin}>Continuar com Google</button>
                    <label>
                      <span>Seu e-mail</span>
                      <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" />
                    </label>
                    <button type="button" className={styles.primaryButton} onClick={onSendMagicLink} disabled={sendingLogin}>{sendingLogin ? "Enviando..." : "Receber link por e-mail"}</button>
                  </div>
                )}
              </form>
            )}
            {message && <p className={styles.statusMessage} role="status">{message}</p>}
          </section>
        )}
      </section>}
    </div>
  );
}
