"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

/**
 * A sessão do Supabase é compartilhada por todas as abas do mesmo domínio.
 * Quando ela muda, desmontamos telas que podem ter sido carregadas pelo perfil
 * anterior e reavaliamos o papel no painel.
 */
export default function SessionGuard() {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (window.location.pathname === "/painel") return;
        window.location.replace("/painel");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
