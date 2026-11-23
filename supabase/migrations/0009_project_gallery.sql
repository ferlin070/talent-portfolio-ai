-- Work images are public-by-URL for published portfolio use. Certificate files stay private.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('project-gallery','project-gallery',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create table if not exists public.project_images(
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,
 caption text not null default '' check(char_length(caption)<=500),
 sort_order integer not null default 0 check(sort_order>=0),
 is_cover boolean not null default false,
 created_at timestamptz not null default now(),
 constraint project_gallery_owner check (storage_path like user_id::text || '/%')
);
create index if not exists project_images_owner_project_order on public.project_images(user_id,project_id,sort_order,created_at);
alter table public.project_images enable row level security;
create policy "project_gallery_owner_select" on public.project_images for select to authenticated using ((select auth.uid())=user_id);
create policy "project_gallery_owner_insert" on public.project_images for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "project_gallery_owner_update" on public.project_images for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "project_gallery_owner_delete" on public.project_images for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.project_images to authenticated;
create policy "project_gallery_files_owner_select" on storage.objects for select to authenticated using (bucket_id='project-gallery' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "project_gallery_files_owner_insert" on storage.objects for insert to authenticated with check(bucket_id='project-gallery' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "project_gallery_files_owner_update" on storage.objects for update to authenticated using(bucket_id='project-gallery' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='project-gallery' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "project_gallery_files_owner_delete" on storage.objects for delete to authenticated using(bucket_id='project-gallery' and (storage.foldername(name))[1]=(select auth.uid())::text);
