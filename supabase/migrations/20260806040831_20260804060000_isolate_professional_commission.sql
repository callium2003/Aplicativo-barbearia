-- Migration: Isolate professional commission rate into a secure financial table
-- Created: 2026-08-04

-- 1. Create the new financial table
CREATE TABLE IF NOT EXISTS public.professional_commission_settings (
    professional_id uuid PRIMARY KEY REFERENCES public.professionals(id) ON DELETE CASCADE,
    barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    commission_rate_percent numeric(5,2) NOT NULL DEFAULT 0.00,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT professional_commission_settings_rate_check CHECK (commission_rate_percent >= 0.00 AND commission_rate_percent <= 100.00)
);

-- 2. Migrate existing data
INSERT INTO public.professional_commission_settings (professional_id, barbershop_id, commission_rate_percent)
SELECT id, barbershop_id, COALESCE(commission_rate_percent, 0.00)
FROM public.professionals
ON CONFLICT (professional_id) DO NOTHING;

-- Insert 0.00 for any professionals that didn't have a record yet
INSERT INTO public.professional_commission_settings (professional_id, barbershop_id, commission_rate_percent)
SELECT p.id, p.barbershop_id, 0.00
FROM public.professionals p
LEFT JOIN public.professional_commission_settings s ON p.id = s.professional_id
WHERE s.professional_id IS NULL;

-- 3. Remove wide manager policy and drop the column
DROP POLICY IF EXISTS "Manager can update professionals" ON public.professionals;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'professionals' AND column_name = 'commission_rate_percent'
  ) THEN
    ALTER TABLE public.professionals DROP COLUMN commission_rate_percent;
  END IF;
END $$;

-- 4. Set up RLS for the new table
ALTER TABLE public.professional_commission_settings ENABLE ROW LEVEL SECURITY;

-- Reading is allowed for owner and manager of the same barbershop.
CREATE POLICY "Owner or manager can read commission settings" ON public.professional_commission_settings
FOR SELECT TO authenticated
USING (private.current_barbershop_role(barbershop_id) IN ('owner', 'manager'));

-- No direct INSERT, UPDATE, DELETE allowed for any roles from the browser.
-- All writes go through the secure RPC.

-- 5. Administrative RPC to read professional commissions
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

-- 6. Secure RPC to update professional commissions
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

    -- Localizar o profissional para derivar o barbershop_id
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

    -- Localizar ou criar a configuração financeira com bloqueio
    -- Primeiro garantimos que a linha exista (já que migramos, deve existir, mas por precaução)
    INSERT INTO public.professional_commission_settings (professional_id, barbershop_id, commission_rate_percent)
    VALUES (p_professional_id, v_prof.barbershop_id, 0.00)
    ON CONFLICT (professional_id) DO NOTHING;

    -- Bloquear a linha e ler o valor atual
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

    -- Registrar auditoria
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

