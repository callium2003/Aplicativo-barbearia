import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import type { RefObject } from "react";

import styles from "./public-page.module.css";
import type { PublicBookingStatus, Shop } from "./types";

type PublicBarbershopHeaderProps = {
  shop: Shop;
  user: User | null;
  bookingAvailable: boolean;
  bookingStatusLoaded: boolean;
  bookingUnavailableReason: PublicBookingStatus;
  photoUrl: string | null;
  photoUnavailable: boolean;
  showOperationalLinks: boolean;
  whatsappLink: string | null;
  mapsLink: string | null;
  homeRef: RefObject<HTMLElement | null>;
  onPhotoError: () => void;
  onScrollHome: () => void;
  onScrollBooking: () => void;
  onOpenBooking: () => void;
};

export function PublicBarbershopHeader({
  shop,
  user,
  bookingAvailable,
  bookingStatusLoaded,
  bookingUnavailableReason,
  photoUrl,
  photoUnavailable,
  showOperationalLinks,
  whatsappLink,
  mapsLink,
  homeRef,
  onPhotoError,
  onScrollHome,
  onScrollBooking,
  onOpenBooking,
}: PublicBarbershopHeaderProps) {
  return (
    <>
      <header className={styles.topbar}>
        <a className={styles.brand} href={"/"} aria-label="BarbeariaSP, início">
          BARBEARIA<span>SP</span>
        </a>
        <nav className={styles.desktopNav} aria-label="Navegação da barbearia">
          <button type="button" onClick={onScrollHome}>
            Barbearia
          </button>
          <button type="button" disabled={!bookingAvailable} onClick={onScrollBooking}>
            Agenda
          </button>
          {!user && <a href={"/entrar"}>Gestão</a>}
        </nav>
      </header>

      <section className={styles.hero} ref={homeRef}>
        <div className={styles.heroImage} style={{ position: "relative" }}>
          {photoUrl && !photoUnavailable ? (
            <Image
              src={photoUrl}
              alt={`Foto da ${shop.name}`}
              fill
              priority
              sizes="(max-width: 760px) 100vw, (max-width: 1200px) 48vw, 520px"
              unoptimized
              onError={onPhotoError}
            />
          ) : (
            <Image
              src="/barbeariasp-institutional-hero.png"
              alt={`Foto da ${shop.name}`}
              fill
              priority
              sizes="(max-width: 760px) 100vw, (max-width: 1200px) 48vw, 520px"
            />
          )}
        </div>
        <div className={styles.heroContent}>
          <h1>{shop.name}</h1>
          {shop.address && (
            <p className={styles.addressBadge}>
              <span>📍</span> {shop.address}
            </p>
          )}
          <p className={styles.heroDescription}>
            {shop.description ||
              "Tradição, cuidado e estilo desde 2015. Mais que um corte, uma experiência feita para você sair sempre na sua melhor versão."}
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.heroPrimaryCta}
              type="button"
              disabled={!bookingAvailable}
              onClick={onOpenBooking}
            >
              <span>📅 Agendar horário</span>
              <small>Escolha a data</small>
            </button>
            <div className={styles.heroSecondaryRow}>
              {showOperationalLinks && whatsappLink && (
                <a
                  className={styles.whatsappButton}
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>💬</span> WhatsApp
                </a>
              )}
              {showOperationalLinks && mapsLink && (
                <a
                  className={styles.ghostButton}
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>📍</span> Como chegar
                </a>
              )}
            </div>
          </div>
          {bookingStatusLoaded && !bookingAvailable && (
            <p className={styles.bookingUnavailable} role="status">
              <strong>Agendamento online indisponível</strong>
              {bookingUnavailableReason === "subscription"
                ? "Sua barbearia não está mais recebendo agendamentos pelo BarbeariaSP."
                : "Esta barbearia ainda está preparando o agendamento online."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
