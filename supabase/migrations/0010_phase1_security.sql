-- Talentfolio AI — Fasa 1 security hardening (0010), PREVIEW / REVIEW FIRST.
-- IMPORTANT: apply in staging before production; do not replace migrations 0001-0009.
-- Rollback, only if urgently necessary:
--   DROP TRIGGER IF EXISTS tf_publication_rebuild ON public.portfolio_publications;
--   DROP FUNCTION IF EXISTS public.tf_publication_guard();
--   DROP FUNCTION IF EXISTS public.publish_portfolio(text,text,jsonb);
--   DROP FUNCTION IF EXISTS public.get_published_portfolio(text);
--   DROP FUNCTION IF EXISTS public.tf_build_public_snapshot(uuid,jsonb);
--   DROP FUNCTION IF EXISTS public.set_project_cover(uuid);
--   DROP FUNCTION IF EXISTS public.consume_api_quota(text);
--   DROP TABLE IF EXISTS public.api_usage;
--   DROP TABLE IF EXISTS public.storage_cleanup_jobs;
--   -- Recreate old anon SELECT policy only as a temporary emergency rollback,
--   -- since it re-exposes bulk publication enumeration:
--   -- CREATE POLICY "publication public published select"
--   -- ON public.portfolio_publications FOR SELECT TO anon USING (published = true);
--   -- Drop new CHECK constraints and indexes by their tf_* names if required.
--   -- Never roll back by disabling RLS.

BEGIN;

-- 1.1: Do not permit bulk listing of published portfolios by anon via REST.
DROP POLICY IF EXISTS "publication public published select" ON public.portfolio_publications;
REVOKE SELECT ON TABLE public.portfolio_publications FROM anon;
ALTER TABLE public.portfolio_publications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_published_portfolio(p_slug text)
RETURNS TABLE (slug text, template text, snapshot jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.slug, p.template, p.snapshot
    FROM public.portfolio_publications AS p
   WHERE p.slug = p_slug
     AND p.published IS TRUE
     AND length(p_slug) BETWEEN 3 AND 48
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_published_portfolio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_portfolio(text) TO anon, authenticated;

-- 1.3: Reserve application routes to avoid confusing or malicious slugs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tf_publication_reserved_slug') THEN
    ALTER TABLE public.portfolio_publications ADD CONSTRAINT tf_publication_reserved_slug
      CHECK (lower(slug) <> ALL (ARRAY[
        'admin','api','auth','dashboard','settings','profile','projects',
        'education','experience','certificates','skills','portfolio','resume',
        'prompt-generator','u','www','login','logout','signup','register',
        'security','support','terms','privacy','help','assets','static','robots','sitemap'
      ]));
  END IF;
END$$;

-- 1.4: Protect write APIs even if client-side maxLength or filtering is bypassed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tf_profile_field_limits') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT tf_profile_field_limits CHECK (
      char_length(display_name) <= 100 AND char_length(headline) <= 160
      AND char_length(bio) <= 3000
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tf_project_field_limits') THEN
    ALTER TABLE public.projects ADD CONSTRAINT tf_project_field_limits CHECK (
      char_length(title) <= 120 AND char_length(description) <= 2000
      AND (url IS NULL OR url ~* '^https?://[^[:space:]]+$')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tf_snapshot_limit') THEN
    ALTER TABLE public.portfolio_publications ADD CONSTRAINT tf_snapshot_limit
      CHECK (pg_column_size(snapshot) < 200000);
  END IF;
END$$;

-- Gallery paths must belong to the expected project, not just the account.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tf_gallery_path_project') THEN
    ALTER TABLE public.project_images ADD CONSTRAINT tf_gallery_path_project
      CHECK (storage_path LIKE user_id::text || '/' || project_id::text || '/%');
  END IF;
END; $$;

-- 1.5: Prevent duplicate skill names by case-insensitive owner+name.
CREATE UNIQUE INDEX IF NOT EXISTS tf_skills_owner_name_ci
  ON public.skills (user_id, lower(btrim(name)));

-- 1.4: Cap gallery metadata to 12 pictures per project, with concurrency guard.
CREATE OR REPLACE FUNCTION public.tf_gallery_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  PERFORM 1 FROM public.projects
   WHERE id = NEW.project_id AND user_id = NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Projek tidak ditemui atau tiada kebenaran.' USING ERRCODE='42501'; END IF;
  IF (SELECT count(*) FROM public.project_images WHERE project_id=NEW.project_id) >= 12 THEN
    RAISE EXCEPTION 'Maksimum 12 gambar bagi setiap projek.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS tf_gallery_quota_insert ON public.project_images;
CREATE TRIGGER tf_gallery_quota_insert BEFORE INSERT ON public.project_images
  FOR EACH ROW EXECUTE FUNCTION public.tf_gallery_quota();

-- 1.4: Certificate metadata quota of 30 per account.
CREATE OR REPLACE FUNCTION public.tf_certificate_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
  IF (SELECT count(*) FROM public.certificates WHERE user_id=NEW.user_id) >= 30 THEN
    RAISE EXCEPTION 'Maksimum 30 sijil bagi setiap akaun.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS tf_certificate_quota_insert ON public.certificates;
CREATE TRIGGER tf_certificate_quota_insert BEFORE INSERT ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.tf_certificate_quota();

-- Enforce quotas on Storage objects too, so files cannot bypass metadata checks.
-- Five avatar photos/user, 30 certificate files/user, 12 gallery files/project.
CREATE OR REPLACE FUNCTION public.tf_storage_object_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 owner_folder text;
 project_folder text;
 quota_prefix text;
 max_files integer;
BEGIN
 IF NEW.bucket_id NOT IN ('profile-photos','certificates','project-gallery') THEN
   RETURN NEW;
 END IF;
 owner_folder := split_part(NEW.name,'/',1);
 project_folder := split_part(NEW.name,'/',2);
 IF owner_folder = '' OR owner_folder !~ '^[0-9a-f-]{36}$' THEN
   RAISE EXCEPTION 'Laluan fail tidak sah.' USING ERRCODE='23514';
 END IF;
 IF NEW.bucket_id='project-gallery' THEN
   IF project_folder !~ '^[0-9a-f-]{36}$' OR split_part(NEW.name,'/',3)='' THEN
     RAISE EXCEPTION 'Laluan gambar projek mesti mempunyai folder projek.' USING ERRCODE='23514';
   END IF;
   quota_prefix:=owner_folder||'/'||project_folder||'/';
   max_files:=12;
 ELSE
   quota_prefix:=owner_folder||'/';
   max_files:=CASE WHEN NEW.bucket_id='certificates' THEN 30 ELSE 5 END;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('storage:'||NEW.bucket_id||':'||quota_prefix));
 IF (SELECT count(*) FROM storage.objects
     WHERE bucket_id=NEW.bucket_id AND name LIKE quota_prefix||'%') >= max_files THEN
   RAISE EXCEPTION 'Had bilangan fail untuk folder ini telah dicapai.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.tf_storage_object_quota() FROM PUBLIC;
DROP TRIGGER IF EXISTS tf_storage_object_quota_insert ON storage.objects;
CREATE TRIGGER tf_storage_object_quota_insert BEFORE INSERT ON storage.objects
 FOR EACH ROW WHEN (NEW.bucket_id IN ('profile-photos','certificates','project-gallery'))
 EXECUTE FUNCTION public.tf_storage_object_quota();

-- 1.2: A server-side, owner-scoped snapshot builder (never trust a browser snapshot).
ALTER TABLE public.portfolio_publications
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL
  DEFAULT '{"skills":true,"education":true,"experience":true,"projects":true,"location":true,"website":true}'::jsonb;

CREATE OR REPLACE FUNCTION public.tf_build_public_snapshot(p_owner uuid, p_sections jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$
SELECT jsonb_build_object(
  'name', left(coalesce(pr.display_name,''),100),
  'headline', left(coalesce(pr.headline,''),160),
  'bio', left(coalesce(pr.bio,''),3000),
  'location', CASE WHEN coalesce((p_sections->>'location')::boolean,true)
                     THEN coalesce(pr.location,'') ELSE '' END,
  'website', CASE WHEN coalesce((p_sections->>'website')::boolean,true)
                    THEN coalesce(pr.website,'') ELSE '' END,
  'avatar', coalesce(pr.avatar_url,''),
  'skills', CASE WHEN coalesce((p_sections->>'skills')::boolean,true) THEN
    (SELECT coalesce(jsonb_agg(jsonb_build_object('name',s.name) ORDER BY s.created_at DESC),'[]'::jsonb)
       FROM public.skills s WHERE s.user_id=p_owner)
    ELSE '[]'::jsonb END,
  'education', CASE WHEN coalesce((p_sections->>'education')::boolean,true) THEN
    (SELECT coalesce(jsonb_agg(jsonb_build_object('institution',e.institution,
      'qualification',e.qualification,'field',e.field_of_study,'start',e.start_year,
      'end',e.end_year,'description',e.description) ORDER BY e.created_at DESC),'[]'::jsonb)
       FROM public.education e WHERE e.user_id=p_owner)
    ELSE '[]'::jsonb END,
  'experience', CASE WHEN coalesce((p_sections->>'experience')::boolean,true) THEN
    (SELECT coalesce(jsonb_agg(jsonb_build_object('company',w.company,'role',w.role,
      'start',w.start_date,'end',w.end_date,'description',w.description)
      ORDER BY w.created_at DESC),'[]'::jsonb)
       FROM public.work_experience w WHERE w.user_id=p_owner)
    ELSE '[]'::jsonb END,
  'projects', CASE WHEN coalesce((p_sections->>'projects')::boolean,true) THEN
    (SELECT coalesce(jsonb_agg(jsonb_build_object(
       'title',p.title,'description',p.description,'url',coalesce(p.url,''),
       'images',(SELECT coalesce(jsonb_agg(jsonb_build_object(
            'url','/storage/v1/object/public/project-gallery/'||im.storage_path,
            'caption',im.caption,'is_cover',im.is_cover,'sort_order',im.sort_order)
            ORDER BY im.is_cover DESC,im.sort_order,im.created_at),'[]'::jsonb)
            FROM public.project_images im
            WHERE im.project_id=p.id AND im.user_id=p_owner))
      ORDER BY p.created_at DESC),'[]'::jsonb)
      FROM public.projects p WHERE p.user_id=p_owner AND p.is_public)
    ELSE '[]'::jsonb END
)
FROM public.profiles pr
WHERE pr.user_id=p_owner AND pr.user_id=(SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.tf_build_public_snapshot(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tf_build_public_snapshot(uuid,jsonb) TO authenticated;

-- Guard direct REST writes: published snapshots are always rebuilt from owned DB data.
CREATE OR REPLACE FUNCTION public.tf_publication_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF NEW.published THEN
    IF NEW.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Tidak dibenarkan menerbitkan portfolio pengguna lain.' USING ERRCODE='42501';
    END IF;
    NEW.sections := jsonb_build_object(
      'skills',coalesce((NEW.sections->>'skills')::boolean,true),
      'education',coalesce((NEW.sections->>'education')::boolean,true),
      'experience',coalesce((NEW.sections->>'experience')::boolean,true),
      'projects',coalesce((NEW.sections->>'projects')::boolean,true),
      'location',coalesce((NEW.sections->>'location')::boolean,true),
      'website',coalesce((NEW.sections->>'website')::boolean,true)
    );
    NEW.snapshot := public.tf_build_public_snapshot(NEW.user_id, NEW.sections);
    IF NEW.snapshot IS NULL THEN RAISE EXCEPTION 'Sila lengkapkan profil sebelum terbit.' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS tf_publication_rebuild ON public.portfolio_publications;
CREATE TRIGGER tf_publication_rebuild
  BEFORE INSERT OR UPDATE OF snapshot,sections,slug,template,published
  ON public.portfolio_publications
  FOR EACH ROW EXECUTE FUNCTION public.tf_publication_guard();

CREATE OR REPLACE FUNCTION public.publish_portfolio(
  p_slug text, p_template text, p_sections jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (slug text, template text, updated_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE actor uuid := (SELECT auth.uid());
DECLARE clean_slug text := lower(btrim(p_slug));
DECLARE safe_sections jsonb;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sesi tidak sah.' USING ERRCODE='42501'; END IF;
  IF clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(clean_slug) NOT BETWEEN 3 AND 48
    OR clean_slug = ANY(ARRAY['admin','api','auth','dashboard','settings','profile',
     'projects','education','experience','certificates','skills','portfolio','resume',
     'prompt-generator','u','www','login','logout','signup','register','security',
     'support','terms','privacy','help','assets','static','robots','sitemap']) THEN
    RAISE EXCEPTION 'Slug mesti 3-48 aksara dan tidak menggunakan nama halaman sistem.' USING ERRCODE='22023';
  END IF;
  IF p_template NOT IN ('modern','minimal','tech','amber','neon','crimson','sunny','student3d','noirluxe') THEN
    RAISE EXCEPTION 'Template portfolio tidak sah.' USING ERRCODE='22023';
  END IF;
  IF p_sections IS NULL OR jsonb_typeof(p_sections)<>'object' OR pg_column_size(p_sections)>2048 THEN
    RAISE EXCEPTION 'Pilihan seksyen tidak sah.' USING ERRCODE='22023';
  END IF;
  safe_sections := jsonb_build_object(
   'skills',coalesce((p_sections->>'skills')::boolean,true),
   'education',coalesce((p_sections->>'education')::boolean,true),
   'experience',coalesce((p_sections->>'experience')::boolean,true),
   'projects',coalesce((p_sections->>'projects')::boolean,true),
   'location',coalesce((p_sections->>'location')::boolean,true),
   'website',coalesce((p_sections->>'website')::boolean,true)
  );
  BEGIN
    INSERT INTO public.portfolio_publications AS publication
      (user_id,slug,template,published,sections,snapshot,updated_at)
    VALUES (actor,clean_slug,p_template,true,safe_sections,'{}'::jsonb,now())
    ON CONFLICT (user_id) DO UPDATE SET
      slug=excluded.slug,template=excluded.template,published=true,
      sections=excluded.sections,updated_at=now()
    RETURNING publication.slug,publication.template,publication.updated_at
      INTO slug,template,updated_at;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Slug ini sudah digunakan. Sila pilih nama pautan lain.' USING ERRCODE='23505';
  END;
  RETURN NEXT;
END; $$;
REVOKE ALL ON FUNCTION public.publish_portfolio(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_portfolio(text,text,jsonb) TO authenticated;

-- 1.5: Setting the gallery cover is now atomic under a project row lock.
CREATE OR REPLACE FUNCTION public.set_project_cover(p_image_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE owner_id uuid := (SELECT auth.uid());
DECLARE target_project uuid;
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Sesi tidak sah.' USING ERRCODE='42501'; END IF;
 SELECT pi.project_id INTO target_project FROM public.project_images pi
  JOIN public.projects p ON p.id=pi.project_id AND p.user_id=owner_id
  WHERE pi.id=p_image_id AND pi.user_id=owner_id;
 IF target_project IS NULL THEN
  RAISE EXCEPTION 'Gambar tidak ditemui.' USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM public.projects WHERE id=target_project AND user_id=owner_id FOR UPDATE;
 UPDATE public.project_images SET is_cover=false
  WHERE project_id=target_project AND user_id=owner_id AND is_cover;
 UPDATE public.project_images SET is_cover=true
  WHERE id=p_image_id AND user_id=owner_id AND project_id=target_project;
END; $$;
REVOKE ALL ON FUNCTION public.set_project_cover(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_project_cover(uuid) TO authenticated;
CREATE UNIQUE INDEX IF NOT EXISTS tf_project_single_cover
  ON public.project_images (project_id) WHERE is_cover;

-- 1.6: Asynchronous storage-deletion queue for deleted records.
CREATE TABLE IF NOT EXISTS public.storage_cleanup_jobs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid,
 bucket_id text NOT NULL CHECK (bucket_id IN ('project-gallery','certificates','profile-photos')),
 object_path text NOT NULL CHECK (length(object_path) BETWEEN 3 AND 1024),
 enqueued_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 UNIQUE(bucket_id,object_path)
);
ALTER TABLE public.storage_cleanup_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup_jobs FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.tf_queue_storage_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_bucket text; target_path text;
BEGIN
  IF TG_TABLE_NAME='project_images' THEN
    target_bucket:='project-gallery'; target_path:=OLD.storage_path;
  ELSIF TG_TABLE_NAME='certificates' THEN
    target_bucket:='certificates'; target_path:=OLD.storage_path;
  ELSIF TG_TABLE_NAME='profiles' THEN
    target_bucket:='profile-photos';
    IF TG_OP='UPDATE' THEN
      IF OLD.avatar_url IS NOT DISTINCT FROM NEW.avatar_url THEN RETURN NEW; END IF;
    END IF;
    target_path:=split_part(OLD.avatar_url,'/storage/v1/object/public/profile-photos/',2);
  END IF;
  IF target_path IS NOT NULL AND target_path<>'' THEN
    INSERT INTO public.storage_cleanup_jobs(user_id,bucket_id,object_path)
      VALUES(OLD.user_id,target_bucket,target_path)
    ON CONFLICT(bucket_id,object_path) DO NOTHING;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.tf_queue_storage_delete() FROM PUBLIC;
DROP TRIGGER IF EXISTS tf_gallery_queue_cleanup ON public.project_images;
CREATE TRIGGER tf_gallery_queue_cleanup AFTER DELETE ON public.project_images
 FOR EACH ROW EXECUTE FUNCTION public.tf_queue_storage_delete();
DROP TRIGGER IF EXISTS tf_certificate_queue_cleanup ON public.certificates;
CREATE TRIGGER tf_certificate_queue_cleanup AFTER DELETE ON public.certificates
 FOR EACH ROW EXECUTE FUNCTION public.tf_queue_storage_delete();
DROP TRIGGER IF EXISTS tf_profile_queue_cleanup ON public.profiles;
CREATE TRIGGER tf_profile_queue_cleanup AFTER DELETE OR UPDATE OF avatar_url ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.tf_queue_storage_delete();

-- 1.7: Fixed hourly per-user budgets, inaccessible directly through Data API.
CREATE TABLE IF NOT EXISTS public.api_usage (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 operation text NOT NULL CHECK (operation IN ('analysis','connection_test')),
 window_start timestamptz NOT NULL,
 usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count BETWEEN 0 AND 100),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,operation,window_start)
);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_quota(p_operation text)
RETURNS TABLE (allowed boolean, retry_after integer, remaining integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid := (SELECT auth.uid());
DECLARE period timestamptz := date_trunc('hour',now());
DECLARE maximum integer;
DECLARE counter integer;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sesi tidak sah.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Sila sahkan e-mel akaun terlebih dahulu.' USING ERRCODE='42501';
 END IF;
 IF p_operation='analysis' THEN maximum:=5;
 ELSIF p_operation='connection_test' THEN maximum:=10;
 ELSE RAISE EXCEPTION 'Jenis penggunaan tidak sah.' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.api_usage(user_id,operation,window_start,usage_count)
 VALUES(actor,p_operation,period,1)
 ON CONFLICT(user_id,operation,window_start)
 DO UPDATE SET usage_count=public.api_usage.usage_count+1,updated_at=now()
 WHERE public.api_usage.usage_count < maximum
 RETURNING usage_count INTO counter;
 allowed:=counter IS NOT NULL;
 remaining:=greatest(maximum-coalesce(counter,maximum),0);
 retry_after:=CASE WHEN allowed THEN 0 ELSE greatest(1,ceil(extract(epoch from (period+interval '1 hour'-now())))::integer) END;
 RETURN NEXT;
END; $$;
REVOKE ALL ON FUNCTION public.consume_api_quota(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_api_quota(text) TO authenticated;
CREATE INDEX IF NOT EXISTS tf_api_usage_recent ON public.api_usage (window_start);

COMMIT;

-- Production operator: test RLS anon enumeration, owner A vs owner B, and
-- public single-slug RPC BEFORE changing the Next.js site to use this schema.
-- Orphan cleaner: deploy supabase/functions/cleanup-orphaned-objects/index.ts
-- and schedule its protected endpoint (see docs/PHASE1_SECURITY_SETUP.md).
