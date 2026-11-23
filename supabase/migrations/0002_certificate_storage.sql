-- Private certificate storage. Object paths must begin with the owner's UUID.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('certificates','certificates',false,5242880,array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;

create policy "certificate file owner read" on storage.objects for select to authenticated
using (bucket_id='certificates' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "certificate file owner upload" on storage.objects for insert to authenticated
with check (bucket_id='certificates' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "certificate file owner update" on storage.objects for update to authenticated
using (bucket_id='certificates' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='certificates' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "certificate file owner delete" on storage.objects for delete to authenticated
using (bucket_id='certificates' and (storage.foldername(name))[1]=(select auth.uid())::text);
