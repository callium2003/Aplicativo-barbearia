import { createClient } from "@supabase/supabase-js";

import { subscribeToPanelContextCacheInvalidation } from "@/utils/panel-context";
import { getPublicSupabaseConfig } from "@/utils/supabase-config";

const config = getPublicSupabaseConfig();

export const supabase = createClient(config.url, config.publishableKey);

export const customerSupabase = createClient(config.url, config.publishableKey, {
  auth: {
    storageKey: "barbeariasp-customer-auth",
  },
});

subscribeToPanelContextCacheInvalidation(supabase);
subscribeToPanelContextCacheInvalidation(customerSupabase);
