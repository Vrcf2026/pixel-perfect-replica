-- ---------- Tipos ----------
create type public.zone_kind   as enum ('main','playlist','ticker','clock','logo','text','qr','webpage');
create type public.item_kind   as enum ('product','image','video','stream','service','text','qr','webpage','catalog_feed');
create type public.source_kind as enum ('hls','ts','mp4','youtube','webpage','image','none');

create table public.organizations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  logo_url       text,
  theme          jsonb not null default '{
    "primary":"#0F1E36","accent":"#F28C28","background":"#0F1E36","surface":"#F3F5F8",
    "text":"#F3F5F8","text_on_surface":"#0F1E36","muted":"#9DB0CC",
    "font_display":"Barlow Condensed","font_body":"Barlow","radius":12,
    "currency":"EUR","locale":"pt-PT","price_suffix":"IVA incluído"
  }'::jsonb,
  config_version bigint not null default 1,
  created_at     timestamptz not null default now()
);

create table public.org_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'editor' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table public.media (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  path        text not null,
  url         text not null,
  mime        text,
  size_bytes  bigint,
  width       int,
  height      int,
  duration_s  numeric,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table public.sources (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  kind              public.source_kind not null default 'hls',
  url               text,
  media_id          uuid references public.media(id) on delete set null,
  fallback_media_id uuid references public.media(id) on delete set null,
  muted             boolean not null default true,
  volume            int not null default 50 check (volume between 0 and 100),
  loop              boolean not null default true,
  fit               text not null default 'cover' check (fit in ('cover','contain','fill')),
  retry_s           int not null default 60,
  created_at        timestamptz not null default now()
);

create table public.playlists (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  name               text not null,
  shuffle            boolean not null default false,
  default_duration_s int not null default 8 check (default_duration_s > 0),
  transition         text not null default 'fade' check (transition in ('none','fade','slide','zoom')),
  created_at         timestamptz not null default now()
);

create table public.playlist_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  position    int not null default 0,
  kind        public.item_kind not null,
  duration_s  int check (duration_s is null or duration_s > 0),
  enabled     boolean not null default true,
  data        jsonb not null default '{}'::jsonb,
  date_from   date,
  date_to     date,
  days        smallint[] not null default '{1,2,3,4,5,6,7}',
  time_from   time,
  time_to     time,
  created_at  timestamptz not null default now()
);
create index on public.playlist_items (playlist_id, position);

create table public.layouts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  template    text,
  orientation text not null default 'landscape' check (orientation in ('landscape','portrait')),
  background  text not null default '#000000',
  created_at  timestamptz not null default now()
);

create table public.layout_zones (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  layout_id   uuid not null references public.layouts(id) on delete cascade,
  name        text not null default 'Zona',
  kind        public.zone_kind not null,
  x numeric not null default 0   check (x between 0 and 100),
  y numeric not null default 0   check (y between 0 and 100),
  w numeric not null default 100 check (w > 0 and w <= 100),
  h numeric not null default 100 check (h > 0 and h <= 100),
  z           int not null default 1,
  position    int not null default 0,
  radius      int not null default 0,
  style       jsonb not null default '{}'::jsonb,
  config      jsonb not null default '{}'::jsonb,
  source_id   uuid references public.sources(id)   on delete set null,
  playlist_id uuid references public.playlists(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.layout_zones (layout_id);

create table public.screens (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  token             text not null unique default replace(gen_random_uuid()::text, '-', ''),
  orientation       text not null default 'landscape' check (orientation in ('landscape','portrait')),
  width             int not null default 1920,
  height            int not null default 1080,
  timezone          text not null default 'Europe/Lisbon',
  default_layout_id uuid references public.layouts(id) on delete set null,
  theme_override    jsonb not null default '{}'::jsonb,
  enabled           boolean not null default true,
  pending_command   text check (pending_command in ('reload','clear_cache')),
  last_seen_at      timestamptz,
  player_info       jsonb not null default '{}'::jsonb,
  config_version    bigint not null default 1,
  notes             text,
  created_at        timestamptz not null default now()
);

create table public.schedules (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  screen_id  uuid not null references public.screens(id) on delete cascade,
  layout_id  uuid not null references public.layouts(id) on delete cascade,
  name       text,
  days       smallint[] not null default '{1,2,3,4,5,6,7}',
  time_from  time,
  time_to    time,
  date_from  date,
  date_to    date,
  priority   int not null default 0,
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_member(p_org uuid, p_roles text[] default array['owner','editor','viewer'])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members
                 where org_id = p_org and user_id = auth.uid() and role = any(p_roles));
$$;

create or replace function public.assert_same_org(p_table text, p_id uuid, p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if p_id is null then return; end if;
  execute format('select org_id from public.%I where id = $1', p_table) into v using p_id;
  if v is distinct from p_org then
    raise exception 'O registo % (%) não pertence a esta organização', p_table, p_id;
  end if;
end $$;

create or replace function public.trg_check_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'playlist_items' then
    perform assert_same_org('playlists', new.playlist_id, new.org_id);
  elsif tg_table_name = 'layout_zones' then
    perform assert_same_org('layouts',   new.layout_id,   new.org_id);
    perform assert_same_org('sources',   new.source_id,   new.org_id);
    perform assert_same_org('playlists', new.playlist_id, new.org_id);
  elsif tg_table_name = 'sources' then
    perform assert_same_org('media', new.media_id,          new.org_id);
    perform assert_same_org('media', new.fallback_media_id, new.org_id);
  elsif tg_table_name = 'schedules' then
    perform assert_same_org('screens', new.screen_id, new.org_id);
    perform assert_same_org('layouts', new.layout_id, new.org_id);
  elsif tg_table_name = 'screens' then
    perform assert_same_org('layouts', new.default_layout_id, new.org_id);
  end if;
  return new;
end $$;

create trigger check_org before insert or update on public.playlist_items for each row execute function public.trg_check_org();
create trigger check_org before insert or update on public.layout_zones   for each row execute function public.trg_check_org();
create trigger check_org before insert or update on public.sources        for each row execute function public.trg_check_org();
create trigger check_org before insert or update on public.schedules      for each row execute function public.trg_check_org();
create trigger check_org before insert or update on public.screens        for each row execute function public.trg_check_org();

create or replace function public.trg_bump_org() returns trigger
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if tg_op = 'DELETE' then v := old.org_id; else v := new.org_id; end if;
  update public.organizations set config_version = config_version + 1 where id = v;
  return null;
end $$;

create trigger bump after insert or update or delete on public.media          for each row execute function public.trg_bump_org();
create trigger bump after insert or update or delete on public.sources        for each row execute function public.trg_bump_org();
create trigger bump after insert or update or delete on public.playlists      for each row execute function public.trg_bump_org();
create trigger bump after insert or update or delete on public.playlist_items for each row execute function public.trg_bump_org();
create trigger bump after insert or update or delete on public.layouts        for each row execute function public.trg_bump_org();
create trigger bump after insert or update or delete on public.layout_zones   for each row execute function public.trg_bump_org();
create trigger bump after insert or update or delete on public.schedules      for each row execute function public.trg_bump_org();

create or replace function public.trg_org_version() returns trigger language plpgsql as $$
begin
  if (new.name, new.logo_url, new.theme) is distinct from (old.name, old.logo_url, old.theme) then
    new.config_version := old.config_version + 1;
  end if;
  return new;
end $$;
create trigger org_version before update on public.organizations for each row execute function public.trg_org_version();

create or replace function public.trg_screen_version() returns trigger language plpgsql as $$
begin
  if (new.name, new.orientation, new.width, new.height, new.timezone, new.default_layout_id, new.theme_override, new.enabled)
     is distinct from
     (old.name, old.orientation, old.width, old.height, old.timezone, old.default_layout_id, old.theme_override, old.enabled) then
    new.config_version := old.config_version + 1;
  end if;
  return new;
end $$;
create trigger screen_version before update on public.screens for each row execute function public.trg_screen_version();

create or replace function public._active_layout(p_screen uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare s public.screens%rowtype; v_now timestamp; v uuid;
begin
  select * into s from public.screens where id = p_screen;
  if not found then return null; end if;
  v_now := now() at time zone s.timezone;
  select sc.layout_id into v
  from public.schedules sc
  where sc.screen_id = s.id and sc.enabled
    and extract(isodow from v_now)::smallint = any(sc.days)
    and (sc.date_from is null or v_now::date >= sc.date_from)
    and (sc.date_to   is null or v_now::date <= sc.date_to)
    and (sc.time_from is null or sc.time_to is null
         or (sc.time_from <= sc.time_to and v_now::time >= sc.time_from and v_now::time < sc.time_to)
         or (sc.time_from >  sc.time_to and (v_now::time >= sc.time_from or v_now::time < sc.time_to)))
  order by sc.priority desc, sc.created_at desc
  limit 1;
  return coalesce(v, s.default_layout_id);
end $$;

create or replace function public._screen_version(p_screen uuid)
returns text language sql stable security definer set search_path = public as $$
  select o.config_version::text || '.' || s.config_version::text || '.' || coalesce(public._active_layout(s.id)::text, 'none')
  from public.screens s join public.organizations o on o.id = s.org_id
  where s.id = p_screen;
$$;

create or replace function public.get_player_config(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.screens%rowtype; o public.organizations%rowtype; v_layout uuid; v_layout_json jsonb;
begin
  select * into s from public.screens where token = p_token and enabled;
  if not found then return jsonb_build_object('error', 'screen_not_found'); end if;
  select * into o from public.organizations where id = s.org_id;
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
declare v_id uuid; v_cmd text;
begin
  select id, pending_command into v_id, v_cmd from public.screens where token = p_token and enabled for update;
  if v_id is null then return jsonb_build_object('error', 'screen_not_found'); end if;
  update public.screens
     set last_seen_at = now(), player_info = coalesce(p_info, '{}'::jsonb), pending_command = null
   where id = v_id;
  return jsonb_build_object('version', public._screen_version(v_id), 'command', v_cmd, 'server_time', now());
end $$;

create or replace function public.create_organization(p_name text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'Sem sessão iniciada'; end if;
  insert into public.organizations (name) values (p_name) returning id into v;
  insert into public.org_members (org_id, user_id, role) values (v, auth.uid(), 'owner');
  return v;
end $$;

revoke execute on function public.assert_same_org(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public._active_layout(uuid)  from public, anon;
revoke execute on function public._screen_version(uuid) from public, anon;
grant  execute on function public.get_player_config(text)  to anon, authenticated;
grant  execute on function public.player_ping(text, jsonb) to anon, authenticated;
grant  execute on function public.create_organization(text) to authenticated;

alter table public.organizations enable row level security;
alter table public.org_members   enable row level security;

grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
grant select, insert, update, delete on public.org_members to authenticated;
grant all on public.org_members to service_role;

create policy org_select on public.organizations for select to authenticated using (public.is_member(id));
create policy org_update on public.organizations for update to authenticated
  using (public.is_member(id, array['owner','editor'])) with check (public.is_member(id, array['owner','editor']));
create policy org_delete on public.organizations for delete to authenticated using (public.is_member(id, array['owner']));

create policy members_select on public.org_members for select to authenticated using (public.is_member(org_id));
create policy members_manage on public.org_members for all to authenticated
  using (public.is_member(org_id, array['owner'])) with check (public.is_member(org_id, array['owner']));

do $$
declare t text;
begin
  foreach t in array array['media','sources','playlists','playlist_items','layouts','layout_zones','screens','schedules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(org_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_member(org_id, array[''owner'',''editor'']))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_member(org_id, array[''owner'',''editor''])) with check (public.is_member(org_id, array[''owner'',''editor'']))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_member(org_id, array[''owner'',''editor'']))', t || '_delete', t);
  end loop;
end $$;
