export type TabKey = "overview" | "appointments" | "team" | "services" | "clients" | "commissions";
export type Role = "owner" | "manager";

export type Summary = {
  total_appointments: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  no_show: number;
  gross_revenue: number;
  average_ticket: number;
  cancelled_value: number;
  no_show_value: number;
  booked_minutes: number;
  commission_total: number;
  commission_pending: number;
  commission_paid: number;
  net_after_commission: number;
  total_clients: number;
  new_clients: number;
  returning_clients: number;
  rebooked_clients: number;
  rebooking_rate_percent: number;
  cancellation_rate_percent: number;
  no_show_rate_percent: number;
};

export type ProfessionalReport = {
  professional_id: string;
  professional_name: string;
  active: boolean;
  appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
  average_ticket: number;
  booked_minutes: number;
  available_minutes: number;
  occupancy_percent: number;
  commission_total: number;
  commission_pending: number;
  commission_paid: number;
};

export type ServiceReport = {
  service_id: string | null;
  service_name: string;
  completed_services: number;
  revenue: number;
  average_price: number;
  service_minutes: number;
  revenue_share_percent: number;
};

export type CustomerReport = {
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  completed_visits: number;
  period_revenue: number;
  first_appointment: string | null;
  last_completed: string | null;
  next_appointment: string | null;
  lifetime_completed_visits: number;
  lifetime_revenue: number;
  customer_type: "new" | "returning";
};

export type AppointmentReport = {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  customer_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  professional_id: string | null;
  professional_name: string | null;
  service_name: string | null;
  gross_amount: number;
  duration_minutes: number;
};

export type DailyReport = {
  date: string;
  appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
};

export type ManagementReport = {
  period: { start_date: string; end_date: string; professional_id: string | null };
  summary: Summary;
  professionals: ProfessionalReport[];
  services: ServiceReport[];
  daily: DailyReport[];
  customers: CustomerReport[];
  appointments: AppointmentReport[];
};

export type CommissionRow = {
  appointment_id: string;
  starts_at: string;
  professional_id: string | null;
  professional_name: string;
  services: string;
  gross_amount: number;
  commission_rate_percent: number;
  commission_amount: number;
  payment_status: "pending" | "paid";
  paid_at: string | null;
};

export type FinancialReport = { commissions: CommissionRow[] };

export type InactiveCustomerReport = {
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  last_completed: string;
  days_without_return: number;
  completed_visits: number;
  lifetime_revenue: number;
  service_types: string[];
};

export type InactiveCustomerPayload = { customers: InactiveCustomerReport[] };
export type ClientSegment = "period" | "inactive";

export type ProfessionalOption = { id: string; name: string };
export type ReportFilters = {
  startDate: string;
  endDate: string;
  professionalId: string;
};

export type ShopState = { id: string; name: string; role: Role };
