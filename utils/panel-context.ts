import { SupabaseClient } from "@supabase/supabase-js";

export type PanelRole = "owner" | "manager" | "barber" | null;

export type PanelContext = {
  userId: string;
  userEmail: string | null;
  barbershopId: string | null;
  role: PanelRole;
  professionalId: string | null;
  initialRegistrationCompleted: boolean;
};

const anonymousPanelContext: PanelContext = {
  userId: "",
  userEmail: null,
  barbershopId: null,
  role: null,
  professionalId: null,
  initialRegistrationCompleted: false,
};

type CacheEntry = {
  context: PanelContext;
  expiresAt: number;
};

const contextCache = new WeakMap<object, CacheEntry>();
const inflightRequests = new WeakMap<object, Promise<PanelContext>>();

function isFutureJwtError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const failure = error as { code?: string; message?: string; details?: string };
  if (failure.code === "PGRST303") return true;
  if (typeof failure.message === "string" && failure.message.toLowerCase().includes("jwt issued at future")) return true;
  if (typeof failure.details === "string" && failure.details.toLowerCase().includes("jwt issued at future")) return true;
  return false;
}

export function clearPanelContextCache(supabase?: SupabaseClient): void {
  if (supabase && typeof supabase === "object") {
    contextCache.delete(supabase);
    inflightRequests.delete(supabase);
  }
}

export async function getPanelContext(
  supabase: SupabaseClient
): Promise<PanelContext> {
  const clientKey = (supabase as object) || {};
  const cached = contextCache.get(clientKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.context;
  }

  const existingInflight = inflightRequests.get(clientKey);
  if (existingInflight) {
    return existingInflight;
  }

  const promise = (async () => {
    try {
      const context = await fetchPanelContextWithRetry(supabase);
      if (context.userId) {
        contextCache.set(clientKey, {
          context,
          expiresAt: Date.now() + 5000,
        });
      }
      return context;
    } finally {
      inflightRequests.delete(clientKey);
    }
  })();

  inflightRequests.set(clientKey, promise);
  return promise;
}

async function fetchPanelContextWithRetry(
  supabase: SupabaseClient
): Promise<PanelContext> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await readPanelContext(supabase);
    } catch (error) {
      if (attempt >= 2 || !isFutureJwtError(error)) throw error;
      // Transient clock skew between Supabase Auth and PostgREST.
      // Wait for server time to advance past token iat without replacing the valid token.
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
}

async function readPanelContext(
  supabase: SupabaseClient
): Promise<PanelContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // An absent browser session is the normal state before login. Supabase
  // reports it as an AuthSessionMissingError, which must not surface as a
  // console error or block the redirect to the login screen.
  if (userError?.name === "AuthSessionMissingError") {
    return anonymousPanelContext;
  }

  if (userError) throw userError;

  if (!user) {
    return anonymousPanelContext;
  }

  // 1. Check if user is owner of a barbershop.
  // Query errors must never be interpreted as "no ownership", otherwise a
  // transient/RLS failure can incorrectly send an existing team member to onboarding.
  const { data: ownedShop, error: ownedShopError } = await supabase
    .from("barbershops")
    .select("id, initial_registration_completed")
    .eq("owner_id", user.id)
    .maybeSingle<{ id: string; initial_registration_completed: boolean }>();

  if (ownedShopError) throw ownedShopError;

  if (ownedShop) {
    return {
      userId: user.id,
      userEmail: user.email || null,
      barbershopId: ownedShop.id,
      role: "owner",
      professionalId: null,
      initialRegistrationCompleted: !!ownedShop.initial_registration_completed,
    };
  }

  // 2. Check if user is active member in team_members.
  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("barbershop_id, role, professional_id")
    .eq("user_id", user.id)
    .in("role", ["manager", "barber"])
    .eq("status", "active")
    .maybeSingle<{
      barbershop_id: string;
      role: "manager" | "barber";
      professional_id?: string | null;
    }>();

  if (membershipError) throw membershipError;

  if (membership) {
    return {
      userId: user.id,
      userEmail: user.email || null,
      barbershopId: membership.barbershop_id,
      role: membership.role,
      professionalId: membership.professional_id || null,
      initialRegistrationCompleted: true,
    };
  }

  // 3. User has no barbershop and no active team membership.
  return {
    userId: user.id,
    userEmail: user.email || null,
    barbershopId: null,
    role: null,
    professionalId: null,
    initialRegistrationCompleted: false,
  };
}
