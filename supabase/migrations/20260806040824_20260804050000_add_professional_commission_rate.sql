-- Migration: Add professional commission rate column, RLS policies, and RPC
-- Created: 2026-08-04

ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS commission_rate_percent numeric(5,2) DEFAULT 0.00 NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'professionals_commission_rate_percent_check'
  ) THEN
    ALTER TABLE public.professionals
    ADD CONSTRAINT professionals_commission_rate_percent_check
    CHECK (commission_rate_percent >= 0.00 AND commission_rate_percent <= 100.00);
  END IF;
END $$;

CREATE POLICY "Manager can update professionals" ON public.professionals
FOR UPDATE TO authenticated
USING (private.current_barbershop_role(barbershop_id) = 'manager')
WITH CHECK (private.current_barbershop_role(barbershop_id) = 'manager');

CREATE OR REPLACE FUNCTION public.set_professional_commission_rate(
    p_professional_id uuid,
    p_commission_rate_percent numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_caller_id uuid;
    v_caller_role text;
    v_prof record;
    v_new_rate numeric(5,2);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    IF p_professional_id IS NULL THEN
        RAISE EXCEPTION 'Profissional não informado.';
    END IF;

    IF p_commission_rate_percent IS NULL OR p_commission_rate_percent < 0.00 OR p_commission_rate_percent > 100.00 THEN
        RAISE EXCEPTION 'O percentual de comissão deve estar entre 0%% e 100%%.';
    END IF;

    v_new_rate := round(p_commission_rate_percent::numeric, 2);

    SELECT id, barbershop_id, name, commission_rate_percent
    INTO v_prof
    FROM public.professionals
    WHERE id = p_professional_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profissional não encontrado.';
    END IF;

    v_caller_role := private.current_barbershop_role(v_prof.barbershop_id);
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'manager') THEN
        RAISE EXCEPTION 'Sem permissão para alterar a comissão nesta barbearia.';
    END IF;

    UPDATE public.professionals
    SET commission_rate_percent = v_new_rate
    WHERE id = p_professional_id;

    INSERT INTO public.audit_logs (
        barbershop_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_prof.barbershop_id,
        v_caller_id,
        'set_professional_commission_rate',
        'professional',
        p_professional_id,
        jsonb_build_object(
            'professional_name', v_prof.name,
            'previous_rate', v_prof.commission_rate_percent,
            'new_rate', v_new_rate
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'professional_id', p_professional_id,
        'commission_rate_percent', v_new_rate
    );
END;
$$;

REVOKE ALL ON FUNCTION public.set_professional_commission_rate(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_professional_commission_rate(uuid, numeric) TO authenticated;
