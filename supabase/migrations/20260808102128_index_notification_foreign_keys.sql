create index if not exists notification_outbox_appointment_id_idx on public.notification_outbox(appointment_id);
create index if not exists notification_outbox_recipient_user_id_idx on public.notification_outbox(recipient_user_id);
create index if not exists notification_preferences_user_id_idx on public.notification_preferences(user_id);
create index if not exists user_notifications_appointment_id_idx on public.user_notifications(appointment_id);
create index if not exists user_notifications_barbershop_id_idx on public.user_notifications(barbershop_id);
