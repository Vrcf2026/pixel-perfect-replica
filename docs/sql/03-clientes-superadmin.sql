-- =====================================================================
--  VRCF Montra — gestão de clientes pelo superadmin
--  Aplicar tal como está (pedir ao Lovable para correr sem alterações).
-- =====================================================================

-- 1. Novos campos por cliente
alter table public.organizations
  add column if not exists suspended   boolean not null default false,
  add column if not exists max_screens int check (max_screens is null or max_screens >= 0),
  add column if not exists notes       text;

-- 2. O superadmin tem acesso a todas as organizações
create or replace function public.is_member(p_org uuid, p_roles text[] default array['owner','editor','viewer'])
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'superadmin')
      or exists (select 1 from public.org_members
                 where org_id = p_org and user_id = auth.uid() and role = any(p_roles));
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.has_role(auth.uid(), 'superadmin'), false);
$$;
grant execute on function public.is_superadmin() to authenticated;

-- 3. Só o superadmin mexe em suspensão e limite de ecrãs
create or replace function public.trg_org_admin_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.suspended, new.max_screens) is distinct from (old.suspended, old.max_screens)
     and not public.is_superadmin() then
    raise exception 'Só o administrador pode alterar a suspensão ou o limite de ecrãs';
  end if;
  if new.suspended is distinct from old.suspended then
    new.config_version := old.config_version + 1;  -- os ecrãs reagem logo
  end if;
  return new;
end $$;
drop trigger if exists org_admin_fields on public.organizations;
create trigger org_admin_fields before update on public.organizations
  for each row execute function public.trg_org_admin_fields();

-- 4. Limite de ecrãs por cliente
create or replace function public.trg_screen_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_max int; v_count int;
begin
  select max_screens into v_max from public.organizations where id = new.org_id;
  if v_max is null then return new; end if;
  select count(*) into v_count from public.screens where org_id = new.org_id;
  if v_count >= v_max then
    raise exception 'Limite de ecrãs atingido (% de %). Contacte o administrador para aumentar.', v_count, v_max;
  end if;
  return new;
end $$;
drop trigger if exists screen_limit on public.screens;
create trigger screen_limit before insert on public.screens
  for each row execute function public.trg_screen_limit();

-- 5. Criar cliente (sem o superadmin ficar como membro)
create or replace function public.admin_create_organization(p_name text, p_max_screens int default null, p_notes text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Só o superadmin pode criar organizações';
  end if;
  insert into public.organizations (name, max_screens, notes)
  values (p_name, p_max_screens, p_notes) returning id into v;
  return v;
end $$;
revoke execute on function public.admin_create_organization(text, int, text) from public, anon;
grant execute on function public.admin_create_organization(text, int, text) to authenticated;

-- 6. Ecrãs de clientes suspensos deixam de mostrar conteúdo
create or replace function public.get_player_config(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.screens%rowtype; o public.organizations%rowtype; v_layout uuid; v_layout_json jsonb;
begin
  select * into s from public.screens where token = p_token and enabled;
  if not found then return jsonb_build_object('error', 'screen_not_found'); end if;
  select * into o from public.organizations where id = s.org_id;
  if o.suspended then
    return jsonb_build_object('error', 'org_suspended', 'version', public._screen_version(s.id));
  end if;
  v_layout := public._active_layout(s.id);

  select jsonb_build_object(
    'id', l.id, 'name', l.name, 'orientation', l.orientation, 'background', l.background,
    'zones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', z.id, 'name', z.name, 'kind', z.kind,
        'x', z.x, 'y', z.y, 'w', z.w, 'h', z.h, 'z', z.z, 'radius', z.radius,
        'style', z.style, 'config', z.config, 'source_id', z.source_id,
        'playlist', (
          select jsonb_build_object(
            'id', p.id, 'name', p.name, 'shuffle', p.shuffle,
            'default_duration_s', p.default_duration_s, 'transition', p.transition,
            'items', coalesce((
              select jsonb_agg((to_jsonb(i) - 'org_id' - 'playlist_id' - 'created_at') order by i.position)
              from public.playlist_items i where i.playlist_id = p.id and i.enabled
            ), '[]'::jsonb))
          from public.playlists p where p.id = z.playlist_id)
      ) order by z.z, z.position)
      from public.layout_zones z where z.layout_id = l.id
    ), '[]'::jsonb))
  into v_layout_json
  from public.layouts l where l.id = v_layout;

  return jsonb_build_object(
    'version',      public._screen_version(s.id),
    'generated_at', now(),
    'screen', jsonb_build_object('id', s.id, 'name', s.name, 'orientation', s.orientation,
                                 'width', s.width, 'height', s.height, 'timezone', s.timezone),
    'org',    jsonb_build_object('name', o.name, 'logo_url', o.logo_url),
    'theme',  o.theme || coalesce(s.theme_override, '{}'::jsonb),
    'sources', coalesce((
      select jsonb_object_agg(src.id,
        (to_jsonb(src) - 'org_id' - 'created_at') || jsonb_build_object('media_url', m.url, 'fallback_url', fm.url))
      from public.sources src
      left join public.media m  on m.id  = src.media_id
      left join public.media fm on fm.id = src.fallback_media_id
      where src.org_id = s.org_id
    ), '{}'::jsonb),
    'layout', v_layout_json
  );
end $$;

create or replace function public.player_ping(p_token text, p_info jsonb default '{}'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid; v_cmd text; v_susp boolean;
begin
  select s.id, s.pending_command, o.suspended into v_id, v_cmd, v_susp
    from public.screens s join public.organizations o on o.id = s.org_id
   where s.token = p_token and s.enabled for update of s;
  if v_id is null then return jsonb_build_object('error', 'screen_not_found'); end if;
  update public.screens
     set last_seen_at = now(), player_info = coalesce(p_info, '{}'::jsonb), pending_command = null
   where id = v_id;
  return jsonb_build_object('version', public._screen_version(v_id), 'command', v_cmd,
                            'server_time', now(), 'suspended', v_susp);
end $$;

-- 7. Ficheiros: o superadmin também pode gerir a biblioteca dos clientes
drop policy if exists media_org_insert on storage.objects;
drop policy if exists media_org_update on storage.objects;
drop policy if exists media_org_delete on storage.objects;
create policy media_org_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'media' and (public.is_superadmin() or exists (select 1 from public.org_members m
    where m.user_id = auth.uid() and m.role in ('owner','editor') and m.org_id::text = (storage.foldername(name))[1])));
create policy media_org_update on storage.objects for update to authenticated using (
  bucket_id = 'media' and (public.is_superadmin() or exists (select 1 from public.org_members m
    where m.user_id = auth.uid() and m.role in ('owner','editor') and m.org_id::text = (storage.foldername(name))[1])));
create policy media_org_delete on storage.objects for delete to authenticated using (
  bucket_id = 'media' and (public.is_superadmin() or exists (select 1 from public.org_members m
    where m.user_id = auth.uid() and m.role in ('owner','editor') and m.org_id::text = (storage.foldername(name))[1])));

-- 8. (Confirmação) criar organizações pela app normal só para o superadmin
create or replace function public.create_organization(p_name text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null or not public.is_superadmin() then
    raise exception 'Só o superadmin pode criar organizações';
  end if;
  insert into public.organizations (name) values (p_name) returning id into v;
  insert into public.org_members (org_id, user_id, role) values (v, auth.uid(), 'owner');
  return v;
end $$;
