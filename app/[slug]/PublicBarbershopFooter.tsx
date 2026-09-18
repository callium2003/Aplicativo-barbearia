import type { User } from "@supabase/supabase-js";

import { CustomerBottomNavigation } from "@/app/customer-bottom-navigation";

import styles from "./public-page.module.css";

type PublicBarbershopFooterProps = {
  user: User | null;
  customerNavigationEligible: boolean;
};

export function PublicBarbershopFooter({
  user,
  customerNavigationEligible,
}: PublicBarbershopFooterProps) {
  return (
    <>
      <footer className={styles.footer}>
        <span><a href={"/"} className={styles.footerBrand}>BarbeariaSP</a> · sua agenda, sua marca, seu atendimento.</span>
        <span>
          Desenvolvido pela Cullentech · {!user ? (
            <a href={"/entrar"}>Acesso da equipe</a>
          ) : null}
        </span>
      </footer>
      {customerNavigationEligible && <CustomerBottomNavigation active="barbershop" />}
    </>
  );
}
