# Project Work Gallery

## Current feature
1. Sign in and go to **Projects**.
2. Create a project with title, work description, and an optional URL.
3. In **Work Photo Gallery**, select your project.
4. Upload JPG, PNG, or WebP images, max **5 MB per file**, up to **12 images per project**.
5. Add or edit the caption for each image, choose its cover picture and adjust the order using the up/down arrows.
6. Use the **Simpan Penerangan** button to update the project description and its public visibility.
7. Go to **Portfolio Builder** and click **Publish Portfolio** to refresh the published snapshot.
8. Gallery covers appear in all nine portfolio templates. Visitors can open the gallery image viewer, navigate with arrow controls and close using Escape.

## Privacy model
- The `project-gallery` storage bucket is **public-by-URL** so portfolio visitors can load project imagery. Anyone with a direct image URL may access it, even when the project has not been published. The user-facing UI explicitly warns about this.
- The `project_images` metadata table has RLS and is accessible only to its authenticated owner. Insert/update additionally checks that the chosen project belongs to the owner.
- Storage writes are restricted to `<auth.uid()>/...` paths; public portfolio pages use explicit published project snapshots. Unlisted projects are excluded from the published portfolio snapshot, but public object URLs are not access-revoked by unpublishing.
- **Never upload confidential material** to this public bucket. The separate `certificates` storage bucket stays private.
- Deleting an individual image removes its metadata and storage file. Deleting a project attempts cleanup of its gallery files.
- Portfolio snapshots are refreshed only on **Publish**, so edits may not appear immediately on an already published portfolio.
- Image uploads should be additionally reviewed for content moderation, abuse limits, quota handling and image optimization before full commercial launch.

## Database and deployment
Migration: `supabase/migrations/0009_project_gallery.sql`.
Component: `components/project-gallery-editor.tsx`.
Viewer: `components/project-gallery-public.tsx`.
Styles: `app/project-gallery.css`.

## Limitations
Real-user upload, multi-account RLS, mobile gallery interactions and cleanup error-recovery have not yet been verified end-to-end. The app remains a deployed MVP, not an audited commercial service.
