


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "private"."current_barber_professional_id"("p_barbershop_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ select tm.professional_id from public.team_members tm where tm.barbershop_id=p_barbershop_id and tm.user_id=(select auth.uid()) and tm.status='active' and tm.role='barber' limit 1; $$;


ALTER FUNCTION "private"."current_barber_professional_id"("p_barbershop_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."current_barbershop_role"("p_barbershop_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ select case when exists(select 1 from public.barbershops b where b.id=p_barbershop_id and b.owner_id=(select auth.uid())) then 'owner' else (select tm.role from public.team_members tm where tm.barbershop_id=p_barbershop_id and tm.user_id=(select auth.uid()) and tm.status='active' limit 1) end; $$;


ALTER FUNCTION "private"."current_barbershop_role"("p_barbershop_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_team_member_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ begin if tg_op='INSERT' then insert into public.audit_logs(barbershop_id,actor_user_id,action,entity_type,entity_id,metadata) values(new.barbershop_id,(select auth.uid()),'team_member_created','team_member',new.id,jsonb_build_object('role',new.role,'status',new.status));elsif old.role is distinct from new.role or old.status is distinct from new.status then insert into public.audit_logs(barbershop_id,actor_user_id,action,entity_type,entity_id,metadata) values(new.barbershop_id,(select auth.uid()),'team_member_access_changed','team_member',new.id,jsonb_build_object('old_role',old.role,'new_role',new.role,'old_status',old.status,'new_status',new.status));end if;return new;end;$$;


ALTER FUNCTION "public"."audit_team_member_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_appointment_services_snapshot"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.appointment_services (
    appointment_id, service_id, service_name_snapshot, service_price_snapshot, duration_minutes_snapshot
  )
  select new.id, s.id, s.name, s.price, s.duration_minutes
  from public.services s
  where s.id = any(new.service_ids)
  order by array_position(new.service_ids, s.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."create_appointment_services_snapshot"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_trial_subscription_for_barbershop"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ begin insert into public.barbershop_subscriptions(barbershop_id,status,plan_code,trial_started_at,trial_ends_at) values(new.id,'trialing','trial_30_days',now(),now()+interval '30 days') on conflict(barbershop_id) do nothing; return new; end; $$;


ALTER FUNCTION "public"."create_trial_subscription_for_barbershop"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_availability"("p_slug" "text", "p_date" "date", "p_service_ids" "uuid"[]) RETURNS TABLE("professional_id" "uuid", "professional_name" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$ declare v_barbershop_id uuid; v_duration integer; v_service_count integer; v_weekday integer; begin if p_service_ids is null or cardinality(p_service_ids)=0 or p_date < (now() at time zone 'America/Sao_Paulo')::date or p_date > ((now() at time zone 'America/Sao_Paulo')::date+90) then return; end if; select b.id,coalesce(sum(s.duration_minutes),0),count(*) into v_barbershop_id,v_duration,v_service_count from public.barbershops b join public.services s on s.barbershop_id=b.id and s.id=any(p_service_ids) and s.active where b.slug=p_slug group by b.id limit 1; if v_barbershop_id is null or v_service_count<>cardinality(p_service_ids) or v_duration<1 then return; end if; v_weekday:=extract(dow from p_date)::integer; return query with ps as (select p.id,p.name,h.opens_at,h.closes_at from public.professionals p join public.professional_hours h on h.professional_id=p.id and h.weekday=v_weekday and not h.is_closed where p.barbershop_id=v_barbershop_id and p.active and h.opens_at is not null and h.closes_at is not null), slots as (select ps.id,ps.name,x at time zone 'America/Sao_Paulo' sa,(x+make_interval(mins=>v_duration)) at time zone 'America/Sao_Paulo' ea from ps cross join lateral generate_series(p_date+ps.opens_at,p_date+ps.closes_at-make_interval(mins=>v_duration),interval '30 minutes')x) select s.id,s.name,s.sa,s.ea from slots s where s.sa>now() and not exists(select 1 from public.appointments a where a.professional_id=s.id and a.status<>'cancelled' and a.starts_at<s.ea and a.ends_at>s.sa) and not exists(select 1 from public.professional_breaks b where b.professional_id=s.id and b.weekday=v_weekday and (p_date+b.starts_at) < (s.ea at time zone 'America/Sao_Paulo') and (p_date+b.ends_at) > (s.sa at time zone 'America/Sao_Paulo')) and not exists(select 1 from public.professional_time_blocks t where t.professional_id=s.id and t.starts_at<s.ea and t.ends_at>s.sa) order by s.name,s.sa; end; $$;


ALTER FUNCTION "public"."get_public_availability"("p_slug" "text", "p_date" "date", "p_service_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_active_barbershop_access"("p_barbershop_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$ select exists(select 1 from public.barbershop_subscriptions s where s.barbershop_id=p_barbershop_id and (s.status='active' or(s.status='trialing' and s.trial_ends_at>now()))); $$;


ALTER FUNCTION "public"."has_active_barbershop_access"("p_barbershop_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_customer_appointment_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ begin if old.customer_id=(select auth.uid()) then if old.status not in('scheduled','confirmed') or old.starts_at<=now() then raise exception 'Este agendamento não pode mais ser cancelado pelo cliente.';end if;if new.status<>'cancelled' or(to_jsonb(new)-array['status','cancelled_at','cancelled_by','cancel_reason']) is distinct from(to_jsonb(old)-array['status','cancelled_at','cancelled_by','cancel_reason']) then raise exception 'O cliente pode apenas cancelar o próprio agendamento.';end if;new.cancelled_at:=now();new.cancelled_by:=(select auth.uid());end if;return new;end;$$;


ALTER FUNCTION "public"."protect_customer_appointment_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_new_appointment_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_recipient text;
  v_barbershop_name text;
begin
  select notification_email, name
    into v_recipient, v_barbershop_name
  from public.barbershops
  where id = new.barbershop_id;

  if v_recipient is not null and v_recipient <> '' then
    insert into public.notification_outbox (
      barbershop_id, appointment_id, kind, recipient_email, payload
    )
    values (
      new.barbershop_id,
      new.id,
      'new_appointment',
      v_recipient,
      jsonb_build_object(
        'barbershop_name', v_barbershop_name,
        'customer_name', new.customer_name,
        'customer_phone', new.customer_phone,
        'service', new.service_name_snapshot,
        'professional', new.professional_name_snapshot,
        'starts_at', to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
      )
    )
    on conflict (appointment_id, kind) do nothing;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."queue_new_appointment_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_and_validate_customer_appointment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ declare v_count integer;v_total_duration integer;v_total_price numeric;v_service_names text;v_professional record;v_professional_hours record;v_business_hours record;v_customer_email text;v_local_start timestamp;v_local_end timestamp;v_weekday integer;begin if new.customer_id is null or new.customer_id<>(select auth.uid()) then raise exception 'Cliente não autenticado.';end if;if new.service_ids is null or cardinality(new.service_ids)=0 then new.service_ids:=array[new.service_id];end if;if (select count(*) from unnest(new.service_ids) x)<>(select count(distinct x) from unnest(new.service_ids)x) then raise exception 'Um serviço não pode ser selecionado duas vezes.';end if;if new.starts_at<=now() or new.starts_at>now()+interval '90 days' then raise exception 'O horário escolhido não é válido.';end if;if not exists(select 1 from public.barbershops b where b.id=new.barbershop_id and b.active) then raise exception 'Esta barbearia não está aceitando agendamentos.';end if;select count(*),coalesce(sum(s.duration_minutes),0),coalesce(sum(s.price),0),string_agg(s.name,' + ' order by array_position(new.service_ids,s.id)) into v_count,v_total_duration,v_total_price,v_service_names from public.services s where s.id=any(new.service_ids) and s.barbershop_id=new.barbershop_id and s.active;if v_count<>cardinality(new.service_ids) or v_total_duration<1 then raise exception 'Um ou mais serviços estão indisponíveis.';end if;new.service_id:=new.service_ids[1];select p.id,p.name into v_professional from public.professionals p where p.id=new.professional_id and p.barbershop_id=new.barbershop_id and p.active;if v_professional.id is null then raise exception 'Profissional indisponível.';end if;v_local_start:=new.starts_at at time zone 'America/Sao_Paulo';v_weekday:=extract(dow from v_local_start)::integer;if extract(second from v_local_start)<>0 or mod(extract(minute from v_local_start)::integer,30)<>0 then raise exception 'O horário deve começar em intervalos de 30 minutos.';end if;select opens_at,closes_at into v_professional_hours from public.professional_hours where professional_id=new.professional_id and weekday=v_weekday and is_closed=false;select opens_at,closes_at into v_business_hours from public.business_hours where barbershop_id=new.barbershop_id and weekday=v_weekday and is_closed=false;if v_professional_hours.opens_at is null or v_business_hours.opens_at is null then raise exception 'Não há agenda para esse horário.';end if;v_local_end:=v_local_start+make_interval(mins=>v_total_duration);if v_local_start::time<v_professional_hours.opens_at or v_local_end::time>v_professional_hours.closes_at or v_local_start::time<v_business_hours.opens_at or v_local_end::time>v_business_hours.closes_at then raise exception 'O conjunto de serviços não cabe nesse horário.';end if;if exists(select 1 from public.professional_breaks pb where pb.professional_id=new.professional_id and pb.weekday=v_weekday and(v_local_start::time<pb.ends_at and v_local_end::time>pb.starts_at)) then raise exception 'O horário escolhido coincide com uma pausa.';end if;if exists(select 1 from public.professional_time_blocks tb where tb.professional_id=new.professional_id and tb.starts_at<new.starts_at+make_interval(mins=>v_total_duration) and tb.ends_at>new.starts_at) then raise exception 'O horário escolhido está bloqueado.';end if;select email into v_customer_email from auth.users where id=new.customer_id;new.ends_at:=new.starts_at+make_interval(mins=>v_total_duration);new.status:='scheduled';new.customer_email:=v_customer_email;new.service_name_snapshot:=v_service_names;new.service_price_snapshot:=v_total_price;new.duration_minutes_snapshot:=v_total_duration;new.professional_name_snapshot:=v_professional.name;return new;end;$$;


ALTER FUNCTION "public"."set_and_validate_customer_appointment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_team_member_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ begin if new.professional_id is not null and not exists(select 1 from public.professionals p where p.id=new.professional_id and p.barbershop_id=new.barbershop_id) then raise exception 'O profissional deve pertencer à mesma barbearia.';end if;return new;end;$$;


ALTER FUNCTION "public"."validate_team_member_scope"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointment_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "service_id" "uuid",
    "service_name_snapshot" "text" NOT NULL,
    "service_price_snapshot" numeric NOT NULL,
    "duration_minutes_snapshot" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "appointment_services_duration_minutes_snapshot_check" CHECK ((("duration_minutes_snapshot" >= 5) AND ("duration_minutes_snapshot" <= 480))),
    CONSTRAINT "appointment_services_service_price_snapshot_check" CHECK (("service_price_snapshot" >= (0)::numeric))
);


ALTER TABLE "public"."appointment_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barbershop_id" "uuid" NOT NULL,
    "professional_id" "uuid",
    "service_id" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_email" "text",
    "service_name_snapshot" "text",
    "service_price_snapshot" numeric(10,2),
    "duration_minutes_snapshot" integer,
    "professional_name_snapshot" "text",
    "customer_id" "uuid",
    "service_ids" "uuid"[] NOT NULL,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "cancel_reason" "text",
    CONSTRAINT "appointments_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "appointments_completed_snapshot_required" CHECK ((("status" <> 'completed'::"text") OR (("service_name_snapshot" IS NOT NULL) AND ("service_price_snapshot" IS NOT NULL) AND ("duration_minutes_snapshot" IS NOT NULL) AND ("professional_name_snapshot" IS NOT NULL)))),
    CONSTRAINT "appointments_customer_email_format" CHECK ((("customer_email" IS NULL) OR ("customer_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))),
    CONSTRAINT "appointments_customer_name_check" CHECK ((("char_length"("customer_name") >= 2) AND ("char_length"("customer_name") <= 120))),
    CONSTRAINT "appointments_customer_phone_required" CHECK ((("char_length"("regexp_replace"("customer_phone", '\D'::"text", ''::"text", 'g'::"text")) >= 10) AND ("char_length"("regexp_replace"("customer_phone", '\D'::"text", ''::"text", 'g'::"text")) <= 13))),
    CONSTRAINT "appointments_duration_minutes_snapshot_check" CHECK ((("duration_minutes_snapshot" IS NULL) OR (("duration_minutes_snapshot" >= 5) AND ("duration_minutes_snapshot" <= 480)))),
    CONSTRAINT "appointments_service_ids_required" CHECK ((("cardinality"("service_ids") >= 1) AND ("cardinality"("service_ids") <= 10))),
    CONSTRAINT "appointments_service_price_snapshot_check" CHECK ((("service_price_snapshot" IS NULL) OR ("service_price_snapshot" >= (0)::numeric))),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barbershop_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK ((("char_length"("action") >= 3) AND ("char_length"("action") <= 100))),
    CONSTRAINT "audit_logs_entity_type_check" CHECK ((("char_length"("entity_type") >= 3) AND ("char_length"("entity_type") <= 100)))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."barbershop_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barbershop_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'trialing'::"text" NOT NULL,
    "plan_code" "text",
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "current_period_ends_at" timestamp with time zone,
    "provider" "text",
    "provider_subscription_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "barbershop_subscriptions_provider_check" CHECK ((("provider" = 'asaas'::"text") OR ("provider" IS NULL))),
    CONSTRAINT "barbershop_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."barbershop_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."barbershops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "whatsapp" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "photo_url" "text",
    "instagram_url" "text",
    "facebook_url" "text",
    "phone" "text",
    "notification_email" "text",
    "active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "barbershops_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 120))),
    CONSTRAINT "barbershops_notification_email_format" CHECK ((("notification_email" IS NULL) OR ("notification_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))),
    CONSTRAINT "barbershops_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text"))
);


ALTER TABLE "public"."barbershops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barbershop_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL,
    "opens_at" time without time zone,
    "closes_at" time without time zone,
    "is_closed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "business_hours_check" CHECK (((("is_closed" = true) AND ("opens_at" IS NULL) AND ("closes_at" IS NULL)) OR (("is_closed" = false) AND ("opens_at" IS NOT NULL) AND ("closes_at" IS NOT NULL) AND ("opens_at" < "closes_at")))),
    CONSTRAINT "business_hours_weekday_check" CHECK ((("weekday" >= 0) AND ("weekday" <= 6)))
);


ALTER TABLE "public"."business_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barbershop_id" "uuid" NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "sender_email" "text" DEFAULT 'contato@barbea.cullentech.com.br'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "notification_outbox_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "notification_outbox_kind_check" CHECK (("kind" = 'new_appointment'::"text")),
    CONSTRAINT "notification_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."notification_outbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_breaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL,
    "starts_at" time without time zone NOT NULL,
    "ends_at" time without time zone NOT NULL,
    CONSTRAINT "professional_breaks_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "professional_breaks_weekday_check" CHECK ((("weekday" >= 0) AND ("weekday" <= 6)))
);


ALTER TABLE "public"."professional_breaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL,
    "opens_at" time without time zone,
    "closes_at" time without time zone,
    "is_closed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "professional_hours_check" CHECK (("is_closed" OR (("opens_at" IS NOT NULL) AND ("closes_at" IS NOT NULL) AND ("opens_at" < "closes_at")))),
    CONSTRAINT "professional_hours_weekday_check" CHECK ((("weekday" >= 0) AND ("weekday" <= 6)))
);


ALTER TABLE "public"."professional_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_time_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "reason" "text",
    CONSTRAINT "professional_time_blocks_check" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."professional_time_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professionals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barbershop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "professionals_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 120)))
);


ALTER TABLE "public"."professionals" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_barbershop_pages" WITH ("security_invoker"='true') AS
 SELECT "id",
    "slug",
    "name",
    "phone",
    "whatsapp",
    "address",
    "description",
    "photo_url",
    "instagram_url",
    "facebook_url"
   FROM "public"."barbershops";


ALTER VIEW "public"."public_barbershop_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barbershop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "duration_minutes" integer,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "services_duration_minutes_check" CHECK ((("duration_minutes" IS NULL) OR (("duration_minutes" >= 5) AND ("duration_minutes" <= 480)))),
    CONSTRAINT "services_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 100))),
    CONSTRAINT "services_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_barbershop_services" WITH ("security_invoker"='true') AS
 SELECT "barbershop_id",
    "name",
    "price",
    "duration_minutes",
    "id"
   FROM "public"."services"
  WHERE ("active" = true);


ALTER VIEW "public"."public_barbershop_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barbershop_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "professional_id" "uuid",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['manager'::"text", 'barber'::"text"]))),
    CONSTRAINT "team_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_appointment_id_service_id_key" UNIQUE ("appointment_id", "service_id");



ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_no_overlapping_slots" EXCLUDE USING "gist" ("professional_id" WITH =, "tstzrange"("starts_at", "ends_at", '[)'::"text") WITH &&) WHERE (("status" <> 'cancelled'::"text"));



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barbershop_subscriptions"
    ADD CONSTRAINT "barbershop_subscriptions_barbershop_id_key" UNIQUE ("barbershop_id");



ALTER TABLE ONLY "public"."barbershop_subscriptions"
    ADD CONSTRAINT "barbershop_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barbershop_subscriptions"
    ADD CONSTRAINT "barbershop_subscriptions_provider_subscription_id_key" UNIQUE ("provider_subscription_id");



ALTER TABLE ONLY "public"."barbershops"
    ADD CONSTRAINT "barbershops_owner_id_key" UNIQUE ("owner_id");



ALTER TABLE ONLY "public"."barbershops"
    ADD CONSTRAINT "barbershops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barbershops"
    ADD CONSTRAINT "barbershops_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."business_hours"
    ADD CONSTRAINT "business_hours_barbershop_id_weekday_key" UNIQUE ("barbershop_id", "weekday");



ALTER TABLE ONLY "public"."business_hours"
    ADD CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "notification_outbox_appointment_id_kind_key" UNIQUE ("appointment_id", "kind");



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_breaks"
    ADD CONSTRAINT "professional_breaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_breaks"
    ADD CONSTRAINT "professional_breaks_professional_id_weekday_key" UNIQUE ("professional_id", "weekday");



ALTER TABLE ONLY "public"."professional_hours"
    ADD CONSTRAINT "professional_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_hours"
    ADD CONSTRAINT "professional_hours_professional_id_weekday_key" UNIQUE ("professional_id", "weekday");



ALTER TABLE ONLY "public"."professional_time_blocks"
    ADD CONSTRAINT "professional_time_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_barbershop_id_user_id_key" UNIQUE ("barbershop_id", "user_id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_professional_id_key" UNIQUE ("professional_id");



CREATE INDEX "appointments_barbershop_starts_at_idx" ON "public"."appointments" USING "btree" ("barbershop_id", "starts_at");



CREATE INDEX "appointments_customer_id_idx" ON "public"."appointments" USING "btree" ("customer_id");



CREATE INDEX "appointments_professional_starts_at_idx" ON "public"."appointments" USING "btree" ("professional_id", "starts_at");



CREATE INDEX "audit_logs_barbershop_created_at_idx" ON "public"."audit_logs" USING "btree" ("barbershop_id", "created_at" DESC);



CREATE INDEX "barbershop_subscriptions_status_ends_at_idx" ON "public"."barbershop_subscriptions" USING "btree" ("status", "trial_ends_at");



CREATE UNIQUE INDEX "business_hours_barbershop_weekday_key" ON "public"."business_hours" USING "btree" ("barbershop_id", "weekday");



CREATE INDEX "professionals_barbershop_id_idx" ON "public"."professionals" USING "btree" ("barbershop_id");



CREATE INDEX "services_barbershop_id_idx" ON "public"."services" USING "btree" ("barbershop_id");



CREATE INDEX "team_members_user_id_idx" ON "public"."team_members" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "audit_team_member_change" AFTER INSERT OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."audit_team_member_change"();



CREATE OR REPLACE TRIGGER "create_appointment_services_snapshot" AFTER INSERT ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."create_appointment_services_snapshot"();



CREATE OR REPLACE TRIGGER "create_trial_subscription_after_barbershop_insert" AFTER INSERT ON "public"."barbershops" FOR EACH ROW EXECUTE FUNCTION "public"."create_trial_subscription_for_barbershop"();



CREATE OR REPLACE TRIGGER "protect_customer_appointment_update" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."protect_customer_appointment_update"();



CREATE OR REPLACE TRIGGER "queue_new_appointment_notification" AFTER INSERT ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."queue_new_appointment_notification"();



CREATE OR REPLACE TRIGGER "set_and_validate_customer_appointment" BEFORE INSERT ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_and_validate_customer_appointment"();



CREATE OR REPLACE TRIGGER "validate_team_member_scope" BEFORE INSERT OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."validate_team_member_scope"();



ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."barbershop_subscriptions"
    ADD CONSTRAINT "barbershop_subscriptions_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."barbershops"
    ADD CONSTRAINT "barbershops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_hours"
    ADD CONSTRAINT "business_hours_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "notification_outbox_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "notification_outbox_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_breaks"
    ADD CONSTRAINT "professional_breaks_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_hours"
    ADD CONSTRAINT "professional_hours_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_time_blocks"
    ADD CONSTRAINT "professional_time_blocks_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Barber can read own appointments" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("professional_id" = "private"."current_barber_professional_id"("barbershop_id")));



CREATE POLICY "Barber can update own appointments" ON "public"."appointments" FOR UPDATE TO "authenticated" USING (("professional_id" = "private"."current_barber_professional_id"("barbershop_id"))) WITH CHECK (("professional_id" = "private"."current_barber_professional_id"("barbershop_id")));



CREATE POLICY "Customer can cancel own future appointment" ON "public"."appointments" FOR UPDATE TO "authenticated" USING ((("customer_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text"])) AND ("starts_at" > "now"()))) WITH CHECK ((("customer_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'cancelled'::"text")));



CREATE POLICY "Customer can create own valid appointment" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Customer can read own appointments" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("customer_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "No direct client access" ON "public"."appointment_services" AS RESTRICTIVE TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "No direct client access" ON "public"."notification_outbox" AS RESTRICTIVE TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Owner can create own barbershop" ON "public"."barbershops" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Owner can create professionals" ON "public"."professionals" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "professionals"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can create services for own barbershop" ON "public"."services" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "services"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can delete own barbershop" ON "public"."barbershops" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Owner can delete professionals" ON "public"."professionals" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "professionals"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can delete services for own barbershop" ON "public"."services" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "services"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can manage business hours" ON "public"."business_hours" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "business_hours"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "business_hours"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can manage team access" ON "public"."team_members" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "team_members"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "team_members"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can read audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (("private"."current_barbershop_role"("barbershop_id") = 'owner'::"text"));



CREATE POLICY "Owner can read own barbershop" ON "public"."barbershops" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Owner can read own barbershop subscription" ON "public"."barbershop_subscriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops" "b"
  WHERE (("b"."id" = "barbershop_subscriptions"."barbershop_id") AND ("b"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can read own professionals" ON "public"."professionals" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops" "b"
  WHERE (("b"."id" = "professionals"."barbershop_id") AND ("b"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can read own services" ON "public"."services" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops" "b"
  WHERE (("b"."id" = "services"."barbershop_id") AND ("b"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can update own barbershop" ON "public"."barbershops" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Owner can update professionals" ON "public"."professionals" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "professionals"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "professionals"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner can update services for own barbershop" ON "public"."services" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "services"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."barbershops"
  WHERE (("barbershops"."id" = "services"."barbershop_id") AND ("barbershops"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Owner or manager can manage professional blocks" ON "public"."professional_time_blocks" TO "authenticated" USING (("private"."current_barbershop_role"(( SELECT "p"."barbershop_id"
   FROM "public"."professionals" "p"
  WHERE ("p"."id" = "professional_time_blocks"."professional_id"))) = ANY (ARRAY['owner'::"text", 'manager'::"text"]))) WITH CHECK (("private"."current_barbershop_role"(( SELECT "p"."barbershop_id"
   FROM "public"."professionals" "p"
  WHERE ("p"."id" = "professional_time_blocks"."professional_id"))) = ANY (ARRAY['owner'::"text", 'manager'::"text"])));



CREATE POLICY "Owner or manager can manage professional breaks" ON "public"."professional_breaks" TO "authenticated" USING (("private"."current_barbershop_role"(( SELECT "p"."barbershop_id"
   FROM "public"."professionals" "p"
  WHERE ("p"."id" = "professional_breaks"."professional_id"))) = ANY (ARRAY['owner'::"text", 'manager'::"text"]))) WITH CHECK (("private"."current_barbershop_role"(( SELECT "p"."barbershop_id"
   FROM "public"."professionals" "p"
  WHERE ("p"."id" = "professional_breaks"."professional_id"))) = ANY (ARRAY['owner'::"text", 'manager'::"text"])));



CREATE POLICY "Owner or manager can manage professional hours" ON "public"."professional_hours" TO "authenticated" USING (("private"."current_barbershop_role"(( SELECT "p"."barbershop_id"
   FROM "public"."professionals" "p"
  WHERE ("p"."id" = "professional_hours"."professional_id"))) = ANY (ARRAY['owner'::"text", 'manager'::"text"]))) WITH CHECK (("private"."current_barbershop_role"(( SELECT "p"."barbershop_id"
   FROM "public"."professionals" "p"
  WHERE ("p"."id" = "professional_hours"."professional_id"))) = ANY (ARRAY['owner'::"text", 'manager'::"text"])));



CREATE POLICY "Owner or manager can read appointments" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("private"."current_barbershop_role"("barbershop_id") = ANY (ARRAY['owner'::"text", 'manager'::"text"])));



CREATE POLICY "Owner or manager can update appointments" ON "public"."appointments" FOR UPDATE TO "authenticated" USING (("private"."current_barbershop_role"("barbershop_id") = ANY (ARRAY['owner'::"text", 'manager'::"text"]))) WITH CHECK (("private"."current_barbershop_role"("barbershop_id") = ANY (ARRAY['owner'::"text", 'manager'::"text"])));



CREATE POLICY "Professional can read own access" ON "public"."team_members" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Public can read active barbershops" ON "public"."barbershops" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "Public can read active professionals of active barbershops" ON "public"."professionals" FOR SELECT TO "authenticated", "anon" USING (("active" AND (EXISTS ( SELECT 1
   FROM "public"."barbershops" "b"
  WHERE (("b"."id" = "professionals"."barbershop_id") AND "b"."active")))));



CREATE POLICY "Public can read active services of active barbershops" ON "public"."services" FOR SELECT TO "authenticated", "anon" USING (("active" AND (EXISTS ( SELECT 1
   FROM "public"."barbershops" "b"
  WHERE (("b"."id" = "services"."barbershop_id") AND "b"."active")))));



CREATE POLICY "Public can read hours of active barbershops" ON "public"."business_hours" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."barbershops" "b"
  WHERE (("b"."id" = "business_hours"."barbershop_id") AND "b"."active"))));



CREATE POLICY "Public can read hours of active professionals" ON "public"."professional_hours" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."professionals" "p"
     JOIN "public"."barbershops" "b" ON (("b"."id" = "p"."barbershop_id")))
  WHERE (("p"."id" = "professional_hours"."professional_id") AND "p"."active" AND "b"."active"))));



ALTER TABLE "public"."appointment_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."barbershop_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."barbershops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_hours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_breaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_hours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_time_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professionals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";










































































































































































































































































































































































































































































































































































































































































































































REVOKE ALL ON FUNCTION "private"."current_barber_professional_id"("p_barbershop_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."current_barber_professional_id"("p_barbershop_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."current_barbershop_role"("p_barbershop_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."current_barbershop_role"("p_barbershop_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."audit_team_member_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_team_member_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_appointment_services_snapshot"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_appointment_services_snapshot"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_trial_subscription_for_barbershop"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_trial_subscription_for_barbershop"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_availability"("p_slug" "text", "p_date" "date", "p_service_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_availability"("p_slug" "text", "p_date" "date", "p_service_ids" "uuid"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_public_availability"("p_slug" "text", "p_date" "date", "p_service_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_availability"("p_slug" "text", "p_date" "date", "p_service_ids" "uuid"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."has_active_barbershop_access"("p_barbershop_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_active_barbershop_access"("p_barbershop_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_customer_appointment_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_customer_appointment_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."queue_new_appointment_notification"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."queue_new_appointment_notification"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_and_validate_customer_appointment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_and_validate_customer_appointment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_team_member_scope"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_team_member_scope"() TO "service_role";


















GRANT ALL ON TABLE "public"."appointment_services" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT SELECT("professional_id") ON TABLE "public"."appointments" TO "anon";



GRANT SELECT("starts_at") ON TABLE "public"."appointments" TO "anon";



GRANT SELECT("ends_at") ON TABLE "public"."appointments" TO "anon";



GRANT SELECT("status") ON TABLE "public"."appointments" TO "anon";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."barbershop_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."barbershop_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."barbershop_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."barbershops" TO "authenticated";
GRANT ALL ON TABLE "public"."barbershops" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("name") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("slug") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("whatsapp") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("address") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("description") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("photo_url") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("instagram_url") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("facebook_url") ON TABLE "public"."barbershops" TO "anon";



GRANT SELECT("phone") ON TABLE "public"."barbershops" TO "anon";



GRANT ALL ON TABLE "public"."business_hours" TO "anon";
GRANT ALL ON TABLE "public"."business_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."business_hours" TO "service_role";



GRANT ALL ON TABLE "public"."notification_outbox" TO "service_role";



GRANT ALL ON TABLE "public"."professional_breaks" TO "anon";
GRANT ALL ON TABLE "public"."professional_breaks" TO "authenticated";
GRANT ALL ON TABLE "public"."professional_breaks" TO "service_role";



GRANT ALL ON TABLE "public"."professional_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."professional_hours" TO "service_role";



GRANT SELECT("professional_id") ON TABLE "public"."professional_hours" TO "anon";



GRANT SELECT("weekday") ON TABLE "public"."professional_hours" TO "anon";



GRANT SELECT("opens_at") ON TABLE "public"."professional_hours" TO "anon";



GRANT SELECT("closes_at") ON TABLE "public"."professional_hours" TO "anon";



GRANT SELECT("is_closed") ON TABLE "public"."professional_hours" TO "anon";



GRANT ALL ON TABLE "public"."professional_time_blocks" TO "anon";
GRANT ALL ON TABLE "public"."professional_time_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."professional_time_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."professionals" TO "authenticated";
GRANT ALL ON TABLE "public"."professionals" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."professionals" TO "anon";



GRANT SELECT("barbershop_id") ON TABLE "public"."professionals" TO "anon";



GRANT SELECT("name") ON TABLE "public"."professionals" TO "anon";



GRANT SELECT("active") ON TABLE "public"."professionals" TO "anon";



GRANT ALL ON TABLE "public"."public_barbershop_pages" TO "anon";
GRANT ALL ON TABLE "public"."public_barbershop_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."public_barbershop_pages" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."services" TO "anon";



GRANT SELECT("barbershop_id") ON TABLE "public"."services" TO "anon";



GRANT SELECT("name") ON TABLE "public"."services" TO "anon";



GRANT SELECT("price") ON TABLE "public"."services" TO "anon";



GRANT SELECT("duration_minutes") ON TABLE "public"."services" TO "anon";



GRANT SELECT("active") ON TABLE "public"."services" TO "anon";



GRANT ALL ON TABLE "public"."public_barbershop_services" TO "anon";
GRANT ALL ON TABLE "public"."public_barbershop_services" TO "authenticated";
GRANT ALL ON TABLE "public"."public_barbershop_services" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "No direct client access" on "public"."appointment_services";

drop policy "Public can read active barbershops" on "public"."barbershops";

drop policy "Public can read hours of active barbershops" on "public"."business_hours";

drop policy "No direct client access" on "public"."notification_outbox";

drop policy "Public can read hours of active professionals" on "public"."professional_hours";

drop policy "Public can read active professionals of active barbershops" on "public"."professionals";

drop policy "Public can read active services of active barbershops" on "public"."services";

revoke references on table "public"."appointment_services" from "anon";

revoke trigger on table "public"."appointment_services" from "anon";

revoke truncate on table "public"."appointment_services" from "anon";

revoke references on table "public"."appointment_services" from "authenticated";

revoke trigger on table "public"."appointment_services" from "authenticated";

revoke truncate on table "public"."appointment_services" from "authenticated";

revoke references on table "public"."appointments" from "anon";

revoke trigger on table "public"."appointments" from "anon";

revoke truncate on table "public"."appointments" from "anon";

revoke references on table "public"."barbershops" from "anon";

revoke trigger on table "public"."barbershops" from "anon";

revoke truncate on table "public"."barbershops" from "anon";

revoke references on table "public"."notification_outbox" from "anon";

revoke trigger on table "public"."notification_outbox" from "anon";

revoke truncate on table "public"."notification_outbox" from "anon";

revoke references on table "public"."notification_outbox" from "authenticated";

revoke trigger on table "public"."notification_outbox" from "authenticated";

revoke truncate on table "public"."notification_outbox" from "authenticated";

revoke references on table "public"."professional_hours" from "anon";

revoke trigger on table "public"."professional_hours" from "anon";

revoke truncate on table "public"."professional_hours" from "anon";

revoke references on table "public"."professionals" from "anon";

revoke trigger on table "public"."professionals" from "anon";

revoke truncate on table "public"."professionals" from "anon";

revoke references on table "public"."services" from "anon";

revoke trigger on table "public"."services" from "anon";

revoke truncate on table "public"."services" from "anon";


  create policy "No direct client access"
  on "public"."appointment_services"
  as restrictive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "Public can read active barbershops"
  on "public"."barbershops"
  as permissive
  for select
  to anon, authenticated
using ((active = true));



  create policy "Public can read hours of active barbershops"
  on "public"."business_hours"
  as permissive
  for select
  to anon, authenticated
using ((EXISTS ( SELECT 1
   FROM public.barbershops b
  WHERE ((b.id = business_hours.barbershop_id) AND b.active))));



  create policy "No direct client access"
  on "public"."notification_outbox"
  as restrictive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "Public can read hours of active professionals"
  on "public"."professional_hours"
  as permissive
  for select
  to anon, authenticated
using ((EXISTS ( SELECT 1
   FROM (public.professionals p
     JOIN public.barbershops b ON ((b.id = p.barbershop_id)))
  WHERE ((p.id = professional_hours.professional_id) AND p.active AND b.active))));



  create policy "Public can read active professionals of active barbershops"
  on "public"."professionals"
  as permissive
  for select
  to anon, authenticated
using ((active AND (EXISTS ( SELECT 1
   FROM public.barbershops b
  WHERE ((b.id = professionals.barbershop_id) AND b.active)))));



  create policy "Public can read active services of active barbershops"
  on "public"."services"
  as permissive
  for select
  to anon, authenticated
using ((active AND (EXISTS ( SELECT 1
   FROM public.barbershops b
  WHERE ((b.id = services.barbershop_id) AND b.active)))));
