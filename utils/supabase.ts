import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseConfig } from "@/utils/supabase-config";

const config = getPublicSupabaseConfig();

export const supabase = createClient(config.url, config.publishableKey);
