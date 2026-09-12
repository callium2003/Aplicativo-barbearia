"use client";

import { supabase } from "@/utils/supabase";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

function getHeaderTarget() {
  return typeof document === "undefined"
    ? null
    : document.getElementById("panel-header-actions");
}

function subscribeToHeaderTarget(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState("");
  const headerTarget = useSyncExternalStore(
    subscribeToHeaderTarget,
    getHeaderTarget,
    () => null,
  );

  const signOut = async () => {
    setMessage("");
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        setMessage(`Não foi possível sair agora: ${"Falha técnica"}`);
        return;
      }
      window.location.replace("/entrar");
    } catch (error) {
      setMessage(`Não foi possível sair agora: ${error instanceof Error ? "Falha técnica" : "erro desconhecido"}`);
    } finally {
      setIsSigningOut(false);
    }
  };

  const control = <div className="product-sign-out-control">
    <button
      className="product-sign-out"
      type="button"
      onClick={signOut}
      disabled={isSigningOut}
      aria-label="Sair ou trocar de conta"
      title="Sair ou trocar de conta"
    >
      {isSigningOut ? "Saindo..." : "Sair"}
    </button>
    {message && <span className="product-sign-out-message" role="status">{message}</span>}
  </div>;

  if (headerTarget) return createPortal(control, headerTarget);
  return <div style={{ position: "fixed", top: 12, right: 16, zIndex: 50 }}>{control}</div>;
}
