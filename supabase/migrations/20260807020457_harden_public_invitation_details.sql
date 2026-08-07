-- Endurece a RPC pública de detalhes do convite sem quebrar a tela já publicada.
-- O e-mail completo só é devolvido quando pertence ao usuário autenticado.
-- Consultas públicas recebem apenas a versão mascarada e não alteram o convite.

create or replace function public.get_invitation_details(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_token_hash text;
    v_rec record;
    v_user_email text;
    v_email_matches boolean;
    v_masked_email text;
    v_compat_email text;
begin
    if p_token is null or trim(p_token) = '' then
        return jsonb_build_object('valid', false, 'reason', 'invalid_token');
    end if;

    v_token_hash := encode(extensions.digest(trim(p_token)::bytea, 'sha256'), 'hex');

    select
        ti.id,
        ti.barbershop_id,
        b.name as barbershop_name,
        ti.email_normalized,
        ti.role,
        ti.professional_id,
        p.name as professional_name,
        ti.expires_at,
        ti.status
    into v_rec
    from public.team_invitations ti
    join public.barbershops b on b.id = ti.barbershop_id
    left join public.professionals p on p.id = ti.professional_id
    where ti.token_hash = v_token_hash;

    if not found then
        return jsonb_build_object('valid', false, 'reason', 'not_found');
    end if;

    select lower(u.email)
    into v_user_email
    from auth.users u
    where u.id = auth.uid();

    v_email_matches := case
        when v_user_email is null then null
        else v_user_email = v_rec.email_normalized
    end;

    v_masked_email := case
        when v_rec.email_normalized is null
          or position('@' in v_rec.email_normalized) <= 1
          then 'e-mail convidado'
        else
          left(v_rec.email_normalized, 1)
          || repeat('*', greatest(3, position('@' in v_rec.email_normalized) - 2))
          || substring(v_rec.email_normalized from position('@' in v_rec.email_normalized))
    end;

    -- Compatibilidade temporária com a tela já publicada:
    -- o e-mail completo só é retornado quando pertence ao usuário autenticado.
    v_compat_email := case
        when v_email_matches is true then v_rec.email_normalized
        else v_masked_email
    end;

    if v_rec.status = 'pending' and v_rec.expires_at <= now() then
        return jsonb_build_object(
            'valid', false,
            'reason', 'expired',
            'barbershop_name', v_rec.barbershop_name,
            'email_masked', v_masked_email,
            'email_normalized', v_compat_email,
            'email_matches_authenticated_user', v_email_matches
        );
    end if;

    if v_rec.status <> 'pending' then
        return jsonb_build_object(
            'valid', false,
            'reason', v_rec.status,
            'barbershop_name', v_rec.barbershop_name,
            'email_masked', v_masked_email,
            'email_normalized', v_compat_email,
            'email_matches_authenticated_user', v_email_matches
        );
    end if;

    return jsonb_build_object(
        'valid', true,
        'barbershop_name', v_rec.barbershop_name,
        'email_masked', v_masked_email,
        'email_normalized', v_compat_email,
        'email_matches_authenticated_user', v_email_matches,
        'role', v_rec.role,
        'professional_name', v_rec.professional_name,
        'expires_at', v_rec.expires_at
    );
end;
$function$;

revoke all on function public.get_invitation_details(text) from public;
grant execute on function public.get_invitation_details(text) to anon;
grant execute on function public.get_invitation_details(text) to authenticated;
grant execute on function public.get_invitation_details(text) to service_role;
