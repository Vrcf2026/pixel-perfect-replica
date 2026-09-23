do $$
declare t text;
begin
  foreach t in array array['organizations','org_members','media','sources','playlists','playlist_items','layouts','layout_zones','screens','schedules'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from public', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

alter default privileges in schema public revoke all on tables from anon;
revoke usage on schema public from anon;
grant usage on schema public to anon;

revoke all on all sequences in schema public from anon;

revoke execute on function public.create_organization(text) from anon, public;
revoke execute on function public.is_member(uuid, text[]) from anon, public;
revoke execute on function public.trg_check_org() from anon, public;
revoke execute on function public.trg_bump_org() from anon, public;
revoke execute on function public.trg_org_version() from anon, public;
revoke execute on function public.trg_screen_version() from anon, public;
revoke execute on function public._active_layout(uuid) from anon, public;
revoke execute on function public._screen_version(uuid) from anon, public;
revoke execute on function public.assert_same_org(text, uuid, uuid) from anon, public, authenticated;

grant execute on function public.get_player_config(text) to anon, authenticated;
grant execute on function public.player_ping(text, jsonb) to anon, authenticated;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.is_member(uuid, text[]) to authenticated;
