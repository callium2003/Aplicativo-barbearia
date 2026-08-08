import vinext from "vinext";
import { defineConfig } from "vite";

// Node.js is the active deployment target for the Hostinger homologation.
// Cloudflare-specific bindings are no longer required by the application: all
// persistent data, auth, storage, realtime and background e-mail processing live
// in Supabase/Resend.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig({
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [vinext()],
});
