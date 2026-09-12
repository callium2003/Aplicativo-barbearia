"use client";

import { customerSupabase as supabase } from "@/utils/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type CustomerBarbershop = { name: string; slug: string };
type ActiveDestination = "agenda" | "perfil";

export function CustomerBottomNavigation({ active }: { active: ActiveDestination }) {
  const router = useRouter();
  const [barbershops, setBarbershops] = useState<CustomerBarbershop[]>([]);
  const [choosingBarbershop, setChoosingBarbershop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const pickerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let activeRequest = true;

    async function loadBarbershops() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (activeRequest) setLoading(false);
        return;
      }

      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle<{ id: string }>();
      if (!customer) {
        if (activeRequest) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("barbershop_customers")
        .select("barbershops(name,slug)")
        .eq("customer_id", customer.id);
      if (!activeRequest) return;

      setBarbershops(
        Array.from(
          new Map(
            ((data || []) as Array<{ barbershops: CustomerBarbershop | CustomerBarbershop[] | null }>)
              .flatMap((item) => Array.isArray(item.barbershops) ? item.barbershops : item.barbershops ? [item.barbershops] : [])
              .map((barbershop) => [barbershop.slug, barbershop]),
          ).values(),
        ),
      );
      setLoading(false);
    }

    void loadBarbershops();
    return () => { activeRequest = false; };
  }, []);

  useEffect(() => {
    if (!choosingBarbershop) return;
    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      pickerRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      pickerRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [choosingBarbershop]);

  function openBarbershop() {
    setMessage("");
    if (barbershops.length === 1) {
      router.push(`/${barbershops[0].slug}`);
      return;
    }
    if (barbershops.length > 1) {
      setChoosingBarbershop(true);
      return;
    }
    setMessage("Não foi possível encontrar uma barbearia vinculada à sua conta.");
  }

  return (
    <>
      {message && <p className="customer-bottom-navigation-message" role="status">{message}</p>}
      {choosingBarbershop && (
        <section ref={pickerRef} tabIndex={-1} className="customer-barbershop-picker" aria-labelledby="customer-barbershop-picker-title" style={{ scrollMarginTop: 88 }}>
          <p className="customer-eyebrow">SUA BARBEARIA</p>
          <h2 id="customer-barbershop-picker-title">Qual barbearia você quer acessar?</h2>
          <p>Escolha a barbearia que deseja abrir.</p>
          <div>
            {barbershops.map((barbershop) => (
              <Link className="customer-button secondary" href={`/${barbershop.slug}`} key={barbershop.slug} onClick={() => setChoosingBarbershop(false)}>{barbershop.name}</Link>
            ))}
          </div>
          <button className="customer-button secondary" type="button" onClick={() => setChoosingBarbershop(false)}>Cancelar</button>
        </section>
      )}
      <nav className="customer-bottom-bar" aria-label="Navegação móvel" aria-busy={loading}>
        <button className="customer-bottom-item" type="button" disabled={loading} onClick={openBarbershop}><span>Barbearia</span></button>
        <Link className={`customer-bottom-item ${active === "agenda" ? "active" : ""}`} href="/meus-agendamentos"><span>Agenda</span></Link>
        <Link className={`customer-bottom-item ${active === "perfil" ? "active" : ""}`} href="/meu-perfil"><span>Meu perfil</span></Link>
      </nav>
    </>
  );
}
