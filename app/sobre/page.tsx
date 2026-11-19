import Link from "next/link";
import type { Metadata } from "next";
import { instagramUrl, productDescription, siteOrigin } from "../../utils/agent-content";
import styles from "../privacidade/privacy-policy.module.css";

export const metadata: Metadata = { title: "Sobre o BarbeariaSP", description: productDescription, alternates: { canonical: `${siteOrigin}/sobre` } };

export default function AboutPage() {
  return <main className={styles.page}><article className={styles.article}>
    <Link className={styles.brand} href="/">BARBEARIA<span>SP</span></Link>
    <h1 className={styles.title}>Sobre o BarbeariaSP</h1>
    <p className={styles.intro}>{productDescription}</p>
    <section className={styles.section}><h2>Para a barbearia e seus clientes</h2><p>A barbearia organiza sua agenda, equipe e operação. O cliente acessa a página da barbearia pelo navegador para consultar serviços e realizar agendamentos. O acesso de cada pessoa respeita seu papel na plataforma.</p></section>
    <section className={styles.section}><h2>Operado por Cullentech</h2><p>O BarbeariaSP é operado por Cullentech. As condições de uso e a identificação do fornecedor estão nos <Link href="/termos">Termos de Uso</Link>.</p><p><a href={instagramUrl}>Instagram oficial: @barbeariasp.app</a></p></section>
    <p><Link href="/contato">Contato e suporte</Link> · <Link href="/privacidade">Privacidade</Link> · <Link href="/#planos">Conhecer os planos</Link></p>
  </article></main>;
}
