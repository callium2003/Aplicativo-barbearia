import Link from "next/link";
import type { Metadata } from "next";
import { instagramUrl, siteOrigin, supportEmail } from "../../utils/agent-content";
import styles from "../privacidade/privacy-policy.module.css";

export const metadata: Metadata = { title: "Contato e suporte | BarbeariaSP", description: "Contato oficial de suporte do BarbeariaSP, operado por Cullentech.", alternates: { canonical: `${siteOrigin}/contato` } };

export default function ContactPage() {
  return <main className={styles.page}><article className={styles.article}>
    <Link className={styles.brand} href="/">BARBEARIA<span>SP</span></Link>
    <h1 className={styles.title}>Contato e suporte</h1>
    <p className={styles.intro}>Entre em contato com a equipe do BarbeariaSP, operado por Cullentech.</p>
    <section className={styles.section}><h2>Canais oficiais</h2><p>E-mail: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p><p>Instagram: <a href={instagramUrl}>@barbeariasp.app</a></p><p>Para conversar sobre o produto, você também pode usar o <Link href="/#contato">formulário de contato na página inicial</Link>.</p></section>
    <p><Link href="/sobre">Sobre o BarbeariaSP</Link> · <Link href="/termos">Termos de Uso</Link> · <Link href="/privacidade">Política de Privacidade</Link></p>
  </article></main>;
}
