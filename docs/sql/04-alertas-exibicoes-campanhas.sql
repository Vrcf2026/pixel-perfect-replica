-- =====================================================================
--  VRCF Montra — horário, alertas, registo de exibições, campanhas, zonas novas
--  Requer o 03-clientes-superadmin.sql aplicado antes.
--  Aplicar tal como está.
-- =====================================================================

-- 1. Novos tipos de zona
alter type public.zone_kind add value if not exists 'weather';
alter type public.zone_kind add value if not exists 'rss';

-- 2. Horário de funcionamento por ecrã (usado nos alertas e para ligar/desligar a TV)
alter table public.screens
  add column if not exists open_days      smallint[] not null default '{1,2,3,4,5,6}',
  add column if not exists open_from      time default '09:00',
  add column if not exists open_to        time default '19:00',
  add column if not exists alerts_enabled boolean not null default true,
  add column if not exists alert_sent_at  timestamptz;

-- 3. Emails de alerta por cliente e definições da plataforma (só superadmin)
alter table public.organizations
  add column if not exists alert_emails text[] not null default '{}';

create table if not exists public.platform_settings (
  id              boolean primary key default true check (id),
  admin_email     text,
  from_email      text not null default 'alertas@vrcf.pt',
  alert_after_min int  not null default 10 check (alert_after_min between 2 and 240),
  updated_at      timestamptz not null default now()
);
insert into public.platform_settings (id) values (true) on conflict do nothing;
alter table public.platform_settings enable row level security;
drop policy if exists platform_settings_admin on public.platform_settings;
create policy platform_settings_admin on public.platform_settings for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
grant select, update on public.platform_settings to authenticated;

-- Estado de alerta de cada ecrã (usado pela função agendada check-screens, com service role)
create or replace function public.screens_alert_state()
returns table (screen_id uuid, screen_name text, org_id uuid, org_name text, emails text[],
               state text, last_seen_at timestamptz, timezone text)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select coalesce(max(alert_after_min), 10) as m, max(admin_email) as admin from public.platform_settings
  ),
  s as (
    select s.*, o.name as org_name, o.alert_emails, (now() at time zone s.timezone) as lt
      from public.screens s join public.organizations o on o.id = s.org_id
     where s.enabled and not o.suspended and s.alerts_enabled
  ),
  x as (
    select s.id, s.name, s.org_id, s.org_name,
           array_remove(s.alert_emails || array[cfg.admin], null) as emails,
           case
             when s.alert_sent_at is null
              and s.last_seen_at is not null
              and s.last_seen_at < now() - make_interval(mins => cfg.m)
              and extract(isodow from s.lt)::smallint = any(s.open_days)
              and (s.open_from is null or s.lt::time >= s.open_from + make_interval(mins => cfg.m))
              and (s.open_to   is null or s.lt::time <  s.open_to)
             then 'down'
             when s.alert_sent_at is not null and s.last_seen_at > s.alert_sent_at
             then 'recovered'
           end as state,
           s.last_seen_at, s.timezone
      from s, cfg
  )
  select * from x where state is not null;
$$;
revoke execute on function public.screens_alert_state() from public, anon, authenticated;

-- 4. Registo de exibições (agregado por dia)
create table if not exists public.play_stats (
  org_id      uuid not null references public.organizations(id) on delete cascade,
  screen_id   uuid not null references public.screens(id) on delete cascade,
  item_key    text not null,
  item_id     uuid,
  playlist_id uuid,
  label       text,
  kind        text,
  day         date not null,
  plays       int  not null default 0,
  seconds     int  not null default 0,
  primary key (screen_id, item_key, day)
);
create index if not exists play_stats_org_day on public.play_stats (org_id, day);
alter table public.play_stats enable row level security;
drop policy if exists play_stats_select on public.play_stats;
create policy play_stats_select on public.play_stats for select to authenticated using (public.is_member(org_id));
grant select on public.play_stats to authenticated;

create or replace function public.player_log_plays(p_token text, p_entries jsonb)
returns int language plpgsql volatile security definer set search_path = public as $$
declare s public.screens%rowtype; n int := 0; uuid_re text := '^[0-9a-fA-F-]{36}$';
begin
  select * into s from public.screens where token = p_token and enabled;
  if not found or jsonb_typeof(p_entries) <> 'array' then return 0; end if;
  insert into public.play_stats (org_id, screen_id, item_key, item_id, playlist_id, label, kind, day, plays, seconds)
  select s.org_id, s.id, k, max(item_id::text)::uuid, max(playlist_id::text)::uuid, max(label), max(kind), d,
         least(100000, sum(plays))::int, least(8640000, sum(seconds))::int
    from (
      select left(e->>'key', 120) as k,
             case when e->>'item_id' ~ uuid_re then (e->>'item_id')::uuid end as item_id,
             case when e->>'playlist_id' ~ uuid_re then (e->>'playlist_id')::uuid end as playlist_id,
             left(e->>'label', 120) as label,
             left(e->>'kind', 30) as kind,
             (e->>'day')::date as d,
             greatest(0, least(100000, coalesce((e->>'plays')::int, 0))) as plays,
             greatest(0, least(8640000, coalesce((e->>'seconds')::int, 0))) as seconds
        from (select e from jsonb_array_elements(p_entries) e limit 500) q
       where e->>'key' is not null
         and e->>'day' ~ '^\d{4}-\d{2}-\d{2}$'
         and (e->>'day')::date between current_date - 3 and current_date + 1
    ) r
   group by k, d
  on conflict (screen_id, item_key, day) do update
     set plays = public.play_stats.plays + excluded.plays,
         seconds = public.play_stats.seconds + excluded.seconds,
         label = coalesce(excluded.label, public.play_stats.label);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.player_log_plays(text, jsonb) from public;
grant execute on function public.player_log_plays(text, jsonb) to anon, authenticated;

-- 5. Campanhas urgentes
create table if not exists public.campaigns (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  title      text not null,
  body       text,
  style      text not null default 'banner' check (style in ('banner','fullscreen')),
  bg         text not null default '#E11D48',
  text_color text not null default '#FFFFFF',
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz not null,
  screen_ids uuid[],            -- null = todos os ecrãs do cliente
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table public.campaigns enable row level security;
drop policy if exists campaigns_select on public.campaigns;
drop policy if exists campaigns_write on public.campaigns;
create policy campaigns_select on public.campaigns for select to authenticated using (public.is_member(org_id));
create policy campaigns_write on public.campaigns for all to authenticated
  using (public.is_member(org_id, array['owner','editor'])) with check (public.is_member(org_id, array['owner','editor']));
grant select, insert, update, delete on public.campaigns to authenticated;
drop trigger if exists bump on public.campaigns;
create trigger bump after insert or update or delete on public.campaigns
  for each row execute function public.trg_bump_org();

-- 6. Configuração do player: acrescenta campanhas (e mantém a suspensão do 03)
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
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'body', c.body, 'style', c.style,
                                          'bg', c.bg, 'text_color', c.text_color,
                                          'starts_at', c.starts_at, 'ends_at', c.ends_at) order by c.starts_at)
      from public.campaigns c
      where c.org_id = s.org_id and c.enabled
        and c.ends_at > now() and c.starts_at < now() + interval '1 day'
        and (c.screen_ids is null or s.id = any(c.screen_ids))
    ), '[]'::jsonb),
    'layout', v_layout_json
  );
end $$;
