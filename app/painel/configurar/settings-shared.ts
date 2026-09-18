export type Item = {
  id: string;
  name: string;
  active: boolean;
  price?: number;
  duration_minutes?: number | null;
  scheduleConfigured?: boolean;
  commission_rate_percent?: number;
};

export type Shop = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  notification_email: string | null;
  description: string | null;
  photo_url: string | null;
  role: "owner" | "manager";
};

export type TeamMember = {
  id: string;
  user_id: string;
  role: "manager" | "barber";
  status: string;
  professional_id?: string | null;
  professionals?: { name: string } | null;
};

export type TeamInvitation = {
  id: string;
  email_normalized: string;
  role: "manager" | "barber";
  professional_id?: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  professionals?: { name: string } | null;
};

export type RegistrationDetails = {
  responsible_name: string;
  responsible_phone: string;
  tax_document: string | null;
  postal_code: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
  total_people: number;
  attending_professionals: number;
  service_positions: number;
};

export type Hours = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

export const days = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];

export const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #d9d0c8",
  borderRadius: 7,
  padding: 11,
  fontSize: 15,
  background: "#fff",
};

export const card = {
  background: "#fff",
  padding: 22,
  borderRadius: 12,
  border: "1px solid #e8e0d8",
};

export const button = {
  border: 0,
  borderRadius: 7,
  padding: "11px 14px",
  background: "#d7612c",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
