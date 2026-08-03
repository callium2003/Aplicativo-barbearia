"use client";

import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpeningPanel, setIsOpeningPanel] = useState(false);
  const [message, setMessage] = useState("");

  const signOut = async () => {
    setMessage("");
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        setMessage(`Não foi possível sair agora: ${error.message}`);
        return;
      }
      window.location.replace("/entrar");
    } catch (error) {
      setMessage(`Não foi possível sair agora: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setIsSigningOut(false);
    }
  };

  const openManagementPanel = async () => {
    setMessage("");
    setIsOpeningPanel(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/entrar"); return; }
      const { data: shop } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).maybeSingle<{ id: string }>();
      if (!shop) { window.location.assign("/painel"); return; }
      const [registration, services, professionals, businessHours] = await Promise.all([
        supabase.from("barbershop_registration_details").select("barbershop_id").eq("barbershop_id", shop.id).maybeSingle(),
        supabase.from("services").select("id").eq("barbershop_id", shop.id).eq("active", true),
        supabase.from("professionals").select("id").eq("barbershop_id", shop.id).eq("active", true),
        supabase.from("business_hours").select("weekday").eq("barbershop_id", shop.id).eq("is_closed", false).limit(1),
      ]);
      const professionalIds = (professionals.data || []).map((professional) => professional.id);
      const { data: professionalHours } = professionalIds.length
        ? await supabase.from("professional_hours").select("professional_id").in("professional_id", professionalIds).eq("is_closed", false)
        : { data: [] as { professional_id: string }[] };
      const scheduledProfessionals = new Set((professionalHours || []).map((hour) => hour.professional_id));
      const incomplete = registration.data && (!services.data?.length || !professionalIds.length || !businessHours.data?.length || professionalIds.some((id) => !scheduledProfessionals.has(id)));
      if (incomplete) {
        setMessage("Antes de abrir o painel de gestão, conclua os serviços, profissionais e horários da agenda em Configurações.");
        return;
      }
      window.location.assign("/painel");
    } catch {
      setMessage("Não foi possível verificar a configuração agora. Tente novamente.");
    } finally {
      setIsOpeningPanel(false);
    }
  };

  return <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "flex-end" }}>
    <button type="button" onClick={() => void openManagementPanel()} disabled={isOpeningPanel} style={{ padding: "9px 12px", border: "1px solid #d9d0c8", borderRadius: 6, background: "white", color: "#3d3028", fontWeight: 700, cursor: isOpeningPanel ? "wait" : "pointer", boxShadow: "0 2px 8px #291b1020" }}>{isOpeningPanel ? "Verificando..." : "Abrir painel de gestão"}</button>
    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
      <button type="button" onClick={signOut} disabled={isSigningOut} style={{ padding: "9px 12px", border: "1px solid #d9d0c8", borderRadius: 6, background: "white", color: "#3d3028", fontWeight: 700, cursor: isSigningOut ? "wait" : "pointer", boxShadow: "0 2px 8px #291b1020" }}>{isSigningOut ? "Saindo..." : "Sair"}</button>
      {message && <span role="status" style={{ maxWidth: 300, padding: 10, borderRadius: 6, background: "#fff1e8", color: "#8c3430", fontSize: 13 }}>{message}</span>}
    </div>
  </div>;
}
