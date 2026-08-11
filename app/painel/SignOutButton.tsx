"use client";

import { createClient } from "@supabase/supabase-js";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

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

  const control = <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
      <button type="button" onClick={signOut} disabled={isSigningOut} style={{ padding: "9px 12px", border: "1px solid #d9d0c8", borderRadius: 6, background: "white", color: "#3d3028", fontWeight: 700, cursor: isSigningOut ? "wait" : "pointer", boxShadow: "0 2px 8px #291b1020" }}>{isSigningOut ? "Saindo..." : "Sair e trocar de conta"}</button>
      {message && <span role="status" style={{ maxWidth: 300, padding: 10, borderRadius: 6, background: "#fff1e8", color: "#8c3430", fontSize: 13 }}>{message}</span>}
    </div>
  </div>;

  if (headerTarget) return createPortal(control, headerTarget);
  return <div style={{ position: "fixed", top: 12, right: 16, zIndex: 50 }}>{control}</div>;
}
