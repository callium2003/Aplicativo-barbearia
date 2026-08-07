-- Migration: Add secure team invitations schema, RLS, and RPCs
-- Created: 2026-08-04

CREATE TABLE IF NOT EXISTS public.team_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    email_normalized text NOT NULL,
    role text NOT NULL CHECK (role = ANY (ARRAY['manager'::text, 'barber'::text])),
    professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text])),
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_by uuid REFERENCES auth.users(id),
    accepted_at timestamp with time zone,
    revoked_by uuid REFERENCES auth.users(id),
    revoked_at timestamp with time zone,
    CONSTRAINT team_invitations_email_format CHECK (email_normalized ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text),
    CONSTRAINT team_invitations_barber_professional_required CHECK (
        (role = 'barber' AND professional_id IS NOT NULL) OR (role = 'manager' AND professional_id IS NULL)
    )
);

ALTER TABLE public.team_invitations OWNER TO postgres;

CREATE INDEX IF NOT EXISTS team_invitations_barbershop_idx ON public.team_invitations USING btree (barbershop_id, status);
CREATE INDEX IF NOT EXISTS team_invitations_token_hash_idx ON public.team_invitations USING btree (token_hash);
CREATE INDEX IF NOT EXISTS team_invitations_email_idx ON public.team_invitations USING btree (email_normalized, status);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or manager can read team_invitations" ON public.team_invitations
FOR SELECT TO authenticated
USING (
    private.current_barbershop_role(barbershop_id) = 'owner'
    OR (private.current_barbershop_role(barbershop_id) = 'manager' AND role = 'barber')
);

GRANT ALL ON TABLE public.team_invitations TO authenticated;
GRANT ALL ON TABLE public.team_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.create_team_invitation(
    p_barbershop_id uuid,
    p_email text,
    p_role text,
    p_professional_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_caller_id uuid;
    v_caller_role text;
    v_email text;
    v_raw_token text;
    v_token_hash text;
    v_prof_barbershop_id uuid;
    v_prof_active boolean;
    v_already_active boolean;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    v_caller_role := private.current_barbershop_role(p_barbershop_id);
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'manager') THEN
        RAISE EXCEPTION 'Sem permissão para criar convite nesta barbearia.';
    END IF;

    IF v_caller_role = 'manager' AND p_role <> 'barber' THEN
        RAISE EXCEPTION 'Gerentes só podem convidar barbeiros.';
    END IF;

    IF p_role NOT IN ('manager', 'barber') THEN
        RAISE EXCEPTION 'Papel de convite inválido.';
    END IF;

    v_email := lower(trim(p_email));
    IF v_email IS NULL OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RAISE EXCEPTION 'Endereço de e-mail inválido.';
    END IF;

    IF p_role = 'barber' THEN
        IF p_professional_id IS NULL THEN
            RAISE EXCEPTION 'Convite para barbeiro exige um profissional vinculado.';
        END IF;

        SELECT barbershop_id, active INTO v_prof_barbershop_id, v_prof_active
        FROM public.professionals
        WHERE id = p_professional_id;

        IF v_prof_barbershop_id IS NULL OR v_prof_barbershop_id <> p_barbershop_id THEN
            RAISE EXCEPTION 'O profissional deve pertencer a esta barbearia.';
        END IF;

        IF NOT v_prof_active THEN
            RAISE EXCEPTION 'O profissional selecionado não está ativo.';
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.team_members
            WHERE professional_id = p_professional_id AND status = 'active'
        ) INTO v_already_active;

        IF v_already_active THEN
            RAISE EXCEPTION 'Este profissional já possui um membro de equipe ativo vinculado.';
        END IF;
    ELSE
        IF p_professional_id IS NOT NULL THEN
            RAISE EXCEPTION 'Convite para gerente não deve possuir profissional vinculado.';
        END IF;
    END IF;

    UPDATE public.team_invitations
    SET status = 'revoked', revoked_by = v_caller_id, revoked_at = now()
    WHERE barbershop_id = p_barbershop_id AND email_normalized = v_email AND role = p_role AND status = 'pending';

    v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_token_hash := encode(extensions.digest(v_raw_token::bytea, 'sha256'), 'hex');

    INSERT INTO public.team_invitations (
        barbershop_id,
        email_normalized,
        role,
        professional_id,
        token_hash,
        expires_at,
        status,
        created_by
    ) VALUES (
        p_barbershop_id,
        v_email,
        p_role,
        p_professional_id,
        v_token_hash,
        now() + interval '7 days',
        'pending',
        v_caller_id
    );

    INSERT INTO public.audit_logs (
        barbershop_id,
        actor_user_id,
        action,
        entity_type,
        metadata
    ) VALUES (
        p_barbershop_id,
        v_caller_id,
        'create_team_invitation',
        'team_invitation',
        jsonb_build_object(
            'email', v_email,
            'role', p_role,
            'professional_id', p_professional_id
        )
    );

    RETURN v_raw_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_invitation(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team_invitation(uuid, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_invitation_details(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_token_hash text;
    v_rec record;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'invalid_token');
    END IF;

    v_token_hash := encode(extensions.digest(trim(p_token)::bytea, 'sha256'), 'hex');

    SELECT
        ti.id,
        ti.barbershop_id,
        b.name AS barbershop_name,
        ti.email_normalized,
        ti.role,
        ti.professional_id,
        p.name AS professional_name,
        ti.expires_at,
        ti.status
    INTO v_rec
    FROM public.team_invitations ti
    JOIN public.barbershops b ON b.id = ti.barbershop_id
    LEFT JOIN public.professionals p ON p.id = ti.professional_id
    WHERE ti.token_hash = v_token_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
    END IF;

    IF v_rec.status = 'pending' AND v_rec.expires_at <= now() THEN
        UPDATE public.team_invitations
        SET status = 'expired'
        WHERE id = v_rec.id;
        v_rec.status := 'expired';
    END IF;

    IF v_rec.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'reason', v_rec.status,
            'barbershop_name', v_rec.barbershop_name,
            'email_normalized', v_rec.email_normalized
        );
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'id', v_rec.id,
        'barbershop_id', v_rec.barbershop_id,
        'barbershop_name', v_rec.barbershop_name,
        'email_normalized', v_rec.email_normalized,
        'role', v_rec.role,
        'professional_id', v_rec.professional_id,
        'professional_name', v_rec.professional_name,
        'expires_at', v_rec.expires_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_details(text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_user_id uuid;
    v_user_email text;
    v_token_hash text;
    v_invitation record;
    v_prof_barbershop_id uuid;
    v_prof_active boolean;
    v_already_active boolean;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT lower(email) INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Não foi possível verificar o e-mail do usuário autenticado.';
    END IF;

    IF p_token IS NULL OR trim(p_token) = '' THEN
        RAISE EXCEPTION 'Token de convite inválido.';
    END IF;

    v_token_hash := encode(extensions.digest(trim(p_token)::bytea, 'sha256'), 'hex');

    SELECT * INTO v_invitation
    FROM public.team_invitations
    WHERE token_hash = v_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Convite inválido ou não encontrado.';
    END IF;

    IF v_invitation.status = 'pending' AND v_invitation.expires_at <= now() THEN
        UPDATE public.team_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RAISE EXCEPTION 'Este convite expirou.';
    END IF;

    IF v_invitation.status <> 'pending' THEN
        RAISE EXCEPTION 'Este convite já foi utilizado ou revogado.';
    END IF;

    IF v_invitation.email_normalized <> v_user_email THEN
        RAISE EXCEPTION 'Este convite foi enviado para %, mas você está autenticado como %.', v_invitation.email_normalized, v_user_email;
    END IF;

    IF v_invitation.role = 'barber' THEN
        IF v_invitation.professional_id IS NULL THEN
            RAISE EXCEPTION 'Convite de barbeiro sem profissional associado.';
        END IF;

        SELECT barbershop_id, active INTO v_prof_barbershop_id, v_prof_active
        FROM public.professionals
        WHERE id = v_invitation.professional_id;

        IF v_prof_barbershop_id IS NULL OR v_prof_barbershop_id <> v_invitation.barbershop_id OR NOT v_prof_active THEN
            RAISE EXCEPTION 'O profissional vinculado a este convite não está mais ativo ou válido nesta barbearia.';
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.team_members
            WHERE professional_id = v_invitation.professional_id AND status = 'active' AND user_id <> v_user_id
        ) INTO v_already_active;

        IF v_already_active THEN
            RAISE EXCEPTION 'Este profissional já possui outro membro de equipe ativo vinculado.';
        END IF;
    END IF;

    INSERT INTO public.team_members (
        barbershop_id,
        user_id,
        role,
        professional_id,
        status
    ) VALUES (
        v_invitation.barbershop_id,
        v_user_id,
        v_invitation.role,
        v_invitation.professional_id,
        'active'
    )
    ON CONFLICT (barbershop_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        professional_id = EXCLUDED.professional_id,
        status = 'active';

    UPDATE public.team_invitations
    SET status = 'accepted',
        accepted_by = v_user_id,
        accepted_at = now()
    WHERE id = v_invitation.id;

    INSERT INTO public.audit_logs (
        barbershop_id,
        actor_user_id,
        action,
        entity_type,
        metadata
    ) VALUES (
        v_invitation.barbershop_id,
        v_user_id,
        'accept_team_invitation',
        'team_invitation',
        jsonb_build_object(
            'invitation_id', v_invitation.id,
            'role', v_invitation.role,
            'professional_id', v_invitation.professional_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'barbershop_id', v_invitation.barbershop_id,
        'role', v_invitation.role
    );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_team_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_caller_id uuid;
    v_caller_role text;
    v_invitation record;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT * INTO v_invitation
    FROM public.team_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Convite não encontrado.';
    END IF;

    v_caller_role := private.current_barbershop_role(v_invitation.barbershop_id);
    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'Sem permissão nesta barbearia.';
    END IF;

    IF v_caller_role = 'manager' AND v_invitation.role <> 'barber' THEN
        RAISE EXCEPTION 'Gerentes só podem revogar convites de barbeiros.';
    END IF;

    IF v_caller_role NOT IN ('owner', 'manager') THEN
        RAISE EXCEPTION 'Sem permissão para revogar convites.';
    END IF;

    IF v_invitation.status <> 'pending' THEN
        RAISE EXCEPTION 'Apenas convites pendentes podem ser revogados.';
    END IF;

    UPDATE public.team_invitations
    SET status = 'revoked',
        revoked_by = v_caller_id,
        revoked_at = now()
    WHERE id = v_invitation.id;

    INSERT INTO public.audit_logs (
        barbershop_id,
        actor_user_id,
        action,
        entity_type,
        metadata
    ) VALUES (
        v_invitation.barbershop_id,
        v_caller_id,
        'revoke_team_invitation',
        'team_invitation',
        jsonb_build_object(
            'invitation_id', v_invitation.id,
            'email', v_invitation.email_normalized,
            'role', v_invitation.role
        )
    );

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_team_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_team_invitation(uuid) TO authenticated;
