import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

import { subscribeToPanelContextCacheInvalidation } from "@/utils/panel-context";
import { getPublicSupabaseConfig } from "@/utils/supabase-config";

const config = getPublicSupabaseConfig();

export const supabase = createBrowserClient(config.url, config.publishableKey, {
  auth: {
    // Somente Gestão pode consumir seu callback; o Cliente tem sessão própria.
    detectSessionInUrl: typeof window !== "undefined" && ["/entrar", "/convite/equipe"].includes(window.location.pathname),
  },
});

export const customerSupabase = createClient(config.url, config.publishableKey, {
  auth: {
    storageKey: "barbeariasp-customer-auth",
    detectSessionInUrl: typeof window !== "undefined" && !["/entrar", "/convite/equipe"].includes(window.location.pathname),
  },
});

subscribeToPanelContextCacheInvalidation(supabase);
subscribeToPanelContextCacheInvalidation(customerSupabase);
