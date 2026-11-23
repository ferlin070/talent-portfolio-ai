-- Enable authenticated owners to inspect, replace and remove their public profile images.
create policy "profile_photos_owner_read" on storage.objects for select to authenticated
 using (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
