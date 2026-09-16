export type Shop = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  description: string | null;
  photo_url: string | null;
};

export type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number | null;
};

export type Availability = {
  professional_id: string;
  professional_name: string;
  starts_at: string;
  ends_at: string;
};

export type BusinessHour = {
  weekday: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

export type PublicProfessional = {
  id: string;
  name: string;
  photo_url: string | null;
  instagram_url: string | null;
};

export type MarketingBarbershop = {
  barbershop_id: string;
  barbershop_name: string;
  barbershop_marketing: boolean;
  barbershop_choice_recorded: boolean;
};

export type MarketingPreferences = {
  platform_marketing: boolean;
  platform_choice_recorded: boolean;
  barbershops: MarketingBarbershop[];
};

export type PublicBookingStatus = "available" | "setup" | "subscription" | "unavailable";
