-- 0011: Publishing controls, optional availability claim and SEO indexing preference.
-- Idempotent and additive. Apply after 0010 on staging before code rollout.
-- Rollback (after moving back to code that does not call v2):
--   DROP FUNCTION IF EXISTS public.get_published_portfolio_seo(text);
--   DROP FUNCTION IF EXISTS public.publish_portfolio_v2(text,text,jsonb,boolean,boolean);
--   DROP FUNCTION IF EXISTS public.tf_publication_guard(); -- restore guard from 0010
--   ALTER TABLE public.portfolio_publications DROP COLUMN IF EXISTS noindex;
--   ALTER TABLE public.portfolio_publications DROP COLUMN IF EXISTS open_to_opportunities;
--   Restore 0010 guard definition afterward. Never disable RLS.
BEGIN;

ALTER TABLE public.portfolio_publications
 ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;
ALTER TABLE public.portfolio_publications
 ADD COLUMN IF NOT EXISTS open_to_opportunities boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.tf_publication_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.published THEN
    IF NEW.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Tidak dibenarkan menerbitkan portfolio pengguna lain.'
        USING ERRCODE = '42501';
    END IF;

    NEW.sections := jsonb_build_object(
      'skills', coalesce((NEW.sections->>'skills')::boolean, true),
      'education', coalesce((NEW.sections->>'education')::boolean, true),
      'experience', coalesce((NEW.sections->>'experience')::boolean, true),
      'projects', coalesce((NEW.sections->>'projects')::boolean, true),
      'location', coalesce((NEW.sections->>'location')::boolean, true),
      'website', coalesce((NEW.sections->>'website')::boolean, true)
    );

    NEW.snapshot := public.tf_build_public_snapshot(NEW.user_id, NEW.sections);
    IF NEW.snapshot IS NULL THEN
      RAISE EXCEPTION 'Sila lengkapkan profil sebelum terbit.'
        USING ERRCODE = '23514';
    END IF;

    -- Do not invent career availability claims on behalf of the owner.
    NEW.snapshot := NEW.snapshot ||
      jsonb_build_object('open_to_opportunities', NEW.open_to_opportunities);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_portfolio_v2(
  p_slug text,
  p_template text,
  p_sections jsonb DEFAULT '{}'::jsonb,
  p_noindex boolean DEFAULT false,
  p_open_to_opportunities boolean DEFAULT false
)
RETURNS TABLE (slug text, template text, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE actor uuid := (SELECT auth.uid());
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Sila log masuk terlebih dahulu.' USING ERRCODE = '42501';
  END IF;

  -- Reuse slug, ownership and template validation from 0010.
  PERFORM public.publish_portfolio(p_slug, p_template, p_sections);

  UPDATE public.portfolio_publications AS publication
     SET noindex = coalesce(p_noindex, false),
         open_to_opportunities = coalesce(p_open_to_opportunities, false),
         published = true,
         updated_at = now()
   WHERE publication.user_id = actor
   RETURNING publication.slug, publication.template, publication.updated_at
     INTO slug, template, updated_at;

  IF slug IS NULL THEN
    RAISE EXCEPTION 'Penerbitan portfolio gagal.' USING ERRCODE = '42501';
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_portfolio_v2(text,text,jsonb,boolean,boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_portfolio_v2(text,text,jsonb,boolean,boolean)
  TO authenticated;

-- Exact single-slug access, including SEO preference but not email or user_id.
CREATE OR REPLACE FUNCTION public.get_published_portfolio_seo(p_slug text)
RETURNS TABLE (
  slug text,
  template text,
  snapshot jsonb,
  noindex boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
 SELECT p.slug, p.template, p.snapshot, p.noindex, p.updated_at
   FROM public.portfolio_publications p
  WHERE p.published = true
    AND p.slug = p_slug
    AND length(p_slug) BETWEEN 3 AND 48
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_published_portfolio_seo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_portfolio_seo(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.tf_publication_guard() FROM PUBLIC, anon, authenticated;
COMMIT;
