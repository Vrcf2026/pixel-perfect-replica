drop policy if exists media_public_read on storage.objects;
drop policy if exists media_org_select on storage.objects;
drop policy if exists media_org_insert on storage.objects;
drop policy if exists media_org_update on storage.objects;
drop policy if exists media_org_delete on storage.objects;

create policy media_org_select on storage.objects for select to authenticated using (
  bucket_id = 'media' and exists (select 1 from public.org_members m
    where m.user_id = auth.uid() and m.role in ('owner','editor','viewer') and m.org_id::text = (storage.foldername(name))[1]));
create policy media_org_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'media' and exists (select 1 from public.org_members m
    where m.user_id = auth.uid() and m.role in ('owner','editor') and m.org_id::text = (storage.foldername(name))[1]));
create policy media_org_update on storage.objects for update to authenticated using (
  bucket_id = 'media' and exists (select 1 from public.org_members m
    where m.user_id = auth.uid() and m.role in ('owner','editor') and m.org_id::text = (storage.foldername(name))[1]));
create policy media_org_delete on storage.objects for delete to authenticated using (
  bucket_id = 'media' and exists (select 1 from public.org_members m
    where m.user_id = auth.uid() and m.role in ('owner','editor') and m.org_id::text = (storage.foldername(name))[1]));
