-- A URL pública de uma foto nova é autorizada pela origem assinada da sessão.
-- A imagem também precisa existir no caminho do próprio profissional no Storage.
create or replace function public.update_professional_v2(
  p_professional_id uuid,
  p_name text,
  p_phone text default null,
  p_contact_email text default null,
  p_instagram_url text default null,
  p_photo_url text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_professional public.professionals%rowtype;
  v_role text;
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_contact_email text := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_instagram text := nullif(trim(coalesce(p_instagram_url, '')), '');
  v_photo text := nullif(trim(coalesce(p_photo_url, '')), '');
  v_origin text := nullif(
    regexp_replace(coalesce(auth.jwt() ->> 'iss', ''), '/auth/v1/?$', ''),
    ''
  );
  v_photo_prefix text;
  v_photo_path text;
begin
  select * into v_professional
  from public.professionals
  where id = p_professional_id;

  if not found then
    raise exception 'Profissional não encontrado.' using errcode = 'P0002';
  end if;
  v_role := private.current_barbershop_role(v_professional.barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para editar este profissional.' using errcode = '42501';
  end if;
  if char_length(v_name) not between 2 and 120 then
    raise exception 'O nome deve ter entre 2 e 120 caracteres.' using errcode = '22023';
  end if;
  if v_phone is not null and char_length(v_phone) not between 10 and 13 then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if v_contact_email is not null and (
    char_length(v_contact_email) > 254
    or v_contact_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ) then
    raise exception 'E-mail de contato inválido.' using errcode = '22023';
  end if;
  if v_instagram is not null
    and v_instagram !~* '^https://(www\.)?instagram\.com/[A-Za-z0-9._-]+/?$' then
    raise exception 'URL do Instagram inválida.' using errcode = '22023';
  end if;

  if v_photo is not null and v_photo is distinct from v_professional.photo_url then
    v_photo_prefix := v_origin || '/storage/v1/object/public/professional-images/'
      || p_professional_id::text || '/';
    if v_origin is null
      or v_photo !~~ (v_photo_prefix || '%')
      or v_photo like '%?%' or v_photo like '%#%' or v_photo like '%\\%'
      or v_photo like '%..%' or position('%' in v_photo) > 0
      or length(v_photo) <= length(v_photo_prefix) then
      raise exception 'URL da foto inválida.' using errcode = '22023';
    end if;
    v_photo_path := substring(v_photo from length(v_photo_prefix) + 1);
    if not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'professional-images'
        and object.name = p_professional_id::text || '/' || v_photo_path
    ) then
      raise exception 'A foto enviada não foi encontrada.' using errcode = '22023';
    end if;
  end if;

  update public.professionals
  set name = v_name,
      phone = v_phone,
      contact_email = v_contact_email,
      instagram_url = v_instagram,
      photo_url = v_photo
  where id = p_professional_id;
end;
$$;

revoke all on function public.update_professional_v2(uuid, text, text, text, text, text)
  from public, anon;
grant execute on function public.update_professional_v2(uuid, text, text, text, text, text)
  to authenticated;

