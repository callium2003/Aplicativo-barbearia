import type { FormEventHandler, RefObject } from "react";

export type Role = "owner" | "manager";
export type Shop = { id: string; name: string; role: Role };
export type Professional = {
  id: string;
  name: string;
  phone: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  photo_url: string | null;
  active: boolean;
  schedule_mode: "barbershop" | "custom";
};
export type Member = { professional_id: string | null; status: string };
export type Invitation = {
  id: string;
  professional_id: string | null;
  status: string;
  expires_at: string;
  email_normalized: string;
};
export type Hours = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};
export type Break = {
  id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
};
export type DeactivationReview = { id: string; open_appointment_count: number };
export type FeedbackScope =
  | "data"
  | "commission"
  | "schedule"
  | "break"
  | "block"
  | "invite"
  | "access"
  | "operational"
  | "review";
export type Feedback = {
  scope: FeedbackScope;
  message: string;
  tone: "success" | "error";
};

export const days = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export type FeedbackValue = { message: string; tone: "success" | "error" };
export type FormSubmit = FormEventHandler<HTMLFormElement>;
export type InputRef = RefObject<HTMLInputElement | null>;
