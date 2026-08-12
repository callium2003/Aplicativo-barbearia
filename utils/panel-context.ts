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

export async function getPanelContext(
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
