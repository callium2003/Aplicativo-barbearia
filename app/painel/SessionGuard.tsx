"use client";

import { supabase } from "@/utils/supabase";
import { useEffect } from "react";
import { createSessionNavigationHandler } from "./session-navigation.mjs";

/**
 * A sessão do Supabase é compartilhada por todas as abas do mesmo domínio.
 * Quando ela muda, reavaliamos o papel sem perder uma rota autorizada que a
 * pessoa já estava usando. O evento inicial apenas restaura a sessão atual.
 */
export default function SessionGuard() {
  useEffect(() => {
    const handleSession = createSessionNavigationHandler((action) => {
      if (action === "sign-out") {
        window.location.replace("/entrar");
        return;
      }
      window.location.reload();
    });
    const { data: listener } = supabase.auth.onAuthStateChange(handleSession);
    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
