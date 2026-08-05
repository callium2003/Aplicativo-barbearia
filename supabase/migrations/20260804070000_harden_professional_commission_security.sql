-- Migration: Harden professional commission security
-- Created: 2026-08-04

-- 1. Remove the old function signature
DROP FUNCTION IF EXISTS public.set_professional_commission_rate(uuid, numeric);

-- 2. Remove policies dependent on barbershop_id and drop the column
DROP POLICY IF EXISTS "Owner or manager can read commission settings" ON public.professional_commission_settings;
ALTER TABLE public.professional_commission_settings DROP COLUMN IF EXISTS barbershop_id;

-- 3. Revoke all direct access to the table for standard web roles
REVOKE ALL ON public.professional_commission_settings FROM PUBLIC;
REVOKE ALL ON public.professional_commission_settings FROM anon;
REVOKE ALL ON public.professional_commission_settings FROM authenticated;

-- Ensure RLS is enabled, but without policies it means no direct access
ALTER TABLE public.professional_commission_settings ENABLE ROW LEVEL SECURITY;

-- 4. Correct Read RPC
CREATE OR REPLACE FUNCTION public.get_professional_commission_rates(p_barbershop_id uuid)
RETURNS TABLE (
    professional_id uuid,
    professional_name text,
    professional_active boolean,
    commission_rate_percent numeric(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_caller_role text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    v_caller_role := private.current_barbershop_role(p_barbershop_id);
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'manager') THEN
        RAISE EXCEPTION 'Sem permissão para consultar as comissões desta barbearia.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id AS professional_id,
        p.name AS professional_name,
        p.active AS professional_active,
        COALESCE(c.commission_rate_percent, 0.00) AS commission_rate_percent
    FROM public.professionals p
    LEFT JOIN public.professional_commission_settings c ON p.id = c.professional_id
    WHERE p.barbershop_id = p_barbershop_id
    ORDER BY p.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_professional_commission_rates(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_professional_commission_rates(uuid) TO authenticated;

-- 5. Correct Write RPC
CREATE OR REPLACE FUNCTION public.set_professional_commission_rate(
    p_professional_id uuid,
    p_commission_rate_percent_text text
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
    v_parsed_rate numeric;
    v_previous_rate numeric(5,2);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    IF p_professional_id IS NULL THEN
        RAISE EXCEPTION 'Profissional não informado.';
    END IF;
    
    -- Validar formato decimal rígido
    IF p_commission_rate_percent_text IS NULL OR NOT (p_commission_rate_percent_text ~ '^\d+(\.\d{1,2})?$') THEN
        RAISE EXCEPTION 'Formato decimal inválido. Use até duas casas decimais com ponto (ex: 12.50).';
    END IF;

    v_parsed_rate := p_commission_rate_percent_text::numeric;

    IF v_parsed_rate < 0.00 OR v_parsed_rate > 100.00 THEN
        RAISE EXCEPTION 'O percentual de comissão deve estar entre 0%% e 100%%.';
    END IF;

    -- Localizar o profissional para derivar o tenant
    SELECT id, barbershop_id, name
    INTO v_prof
    FROM public.professionals
    WHERE id = p_professional_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profissional não encontrado.';
    END IF;

    -- Validar owner ou manager do mesmo tenant
    v_caller_role := private.current_barbershop_role(v_prof.barbershop_id);
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'manager') THEN
        RAISE EXCEPTION 'Sem permissão para alterar a comissão nesta barbearia.';
    END IF;

    -- Localizar ou criar a configuração financeira
    INSERT INTO public.professional_commission_settings (professional_id, commission_rate_percent)
    VALUES (p_professional_id, 0.00)
    ON CONFLICT (professional_id) DO NOTHING;

    -- Bloquear a linha e ler o valor atual (FOR UPDATE)
    SELECT commission_rate_percent INTO v_previous_rate
    FROM public.professional_commission_settings
    WHERE professional_id = p_professional_id
    FOR UPDATE;

    -- Atualizar a configuração
    UPDATE public.professional_commission_settings
    SET 
        commission_rate_percent = v_parsed_rate,
        updated_at = now(),
        updated_by = v_caller_id
    WHERE professional_id = p_professional_id;

    -- Registrar auditoria na mesma transação
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
            'previous_rate', v_previous_rate,
            'new_rate', v_parsed_rate
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'professional_id', p_professional_id,
        'commission_rate_percent', v_parsed_rate
    );
END;
$$;

REVOKE ALL ON FUNCTION public.set_professional_commission_rate(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_professional_commission_rate(uuid, text) TO authenticated;
