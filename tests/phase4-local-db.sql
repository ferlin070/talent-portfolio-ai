-- Local CI ONLY: run on disposable Supabase with all migrations installed.
-- Transaction rolls back every fixture. No credentials or real user data.
BEGIN;
DO $$
BEGIN
 IF to_regprocedure('public.get_published_portfolio_seo(text)') IS NULL
 OR to_regprocedure('public.publish_portfolio_v2(text,text,jsonb,boolean,boolean)') IS NULL
 OR to_regprocedure('public.consume_api_quota(text)') IS NULL THEN
   RAISE EXCEPTION 'Required migration RPC is missing';
 END IF;
 IF has_table_privilege('anon','public.portfolio_publications','SELECT') THEN
   RAISE EXCEPTION 'Anonymous bulk publication access';
 END IF;
 IF NOT has_function_privilege('anon','public.get_published_portfolio_seo(text)','EXECUTE')
 OR has_function_privilege('anon','public.publish_portfolio_v2(text,text,jsonb,boolean,boolean)','EXECUTE')
 OR has_function_privilege('anon','public.consume_api_quota(text)','EXECUTE') THEN
   RAISE EXCEPTION 'Unexpected RPC privileges';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('portfolio_publications','profiles','certificates','api_usage','storage_cleanup_jobs') AND NOT c.relrowsecurity) THEN
   RAISE EXCEPTION 'Required RLS disabled';
 END IF;
 IF has_table_privilege('authenticated','public.api_usage','SELECT')
 OR has_table_privilege('authenticated','public.storage_cleanup_jobs','SELECT') THEN
   RAISE EXCEPTION 'Private operational tables readable';
 END IF;
END $$;
-- Use generated identities solely in this disposable transaction.
INSERT INTO auth.users (id,email,email_confirmed_at,created_at,updated_at)
VALUES ('11111111-1111-4111-8111-111111111111','tf-ci-a@example.invalid',now(),now(),now()),
 ('22222222-2222-4222-8222-222222222222','tf-ci-b@example.invalid',now(),now(),now());
INSERT INTO public.profiles(user_id,display_name,headline,bio)
VALUES ('11111111-1111-4111-8111-111111111111','Synthetic A','Test headline','Test bio'),
 ('22222222-2222-4222-8222-222222222222','Synthetic B','Test headline','Test bio')
ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,headline=excluded.headline,bio=excluded.bio;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT * FROM public.publish_portfolio_v2('tf-ci-fixture-a','modern','{"location":false,"website":false}'::jsonb,true,false);
DO $$
DECLARE result record;
BEGIN
 FOR i IN 1..6 LOOP
   SELECT * INTO result FROM public.consume_api_quota('analysis');
   IF result.allowed IS DISTINCT FROM (i<=5) THEN RAISE EXCEPTION 'Quota enforcement failed'; END IF;
 END LOOP;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$
DECLARE affected integer;
BEGIN
 UPDATE public.profiles SET display_name='Unauthorized' WHERE user_id='11111111-1111-4111-8111-111111111111';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Cross-user profile update allowed'; END IF;
END $$;
-- 5D: owner-only learning milestones and mentor notes.
DO $
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.learning_progress'::regclass AND relrowsecurity) THEN
  RAISE EXCEPTION 'Learning progress RLS is disabled';
 END IF;
 IF has_table_privilege('anon','public.learning_progress','SELECT') OR has_table_privilege('anon','public.learning_progress','INSERT') THEN
  RAISE EXCEPTION 'Anonymous learning progress access';
 END IF;
END $;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
INSERT INTO public.learning_progress(user_id,role_id,milestone_day,status,evidence_note,mentor_note,next_action)
 VALUES ('11111111-1111-4111-8111-111111111111','cloud',30,'in_progress','Synthetic private evidence','Synthetic private mentor note','Synthetic action');
UPDATE public.learning_progress SET status='completed' WHERE user_id='11111111-1111-4111-8111-111111111111' AND role_id='cloud' AND milestone_day=30;
DO $
BEGIN
 IF (SELECT count(*) FROM public.learning_progress WHERE role_id='cloud' AND status='completed')<>1 THEN
  RAISE EXCEPTION 'Owner learning write failed';
 END IF;
 BEGIN
  UPDATE public.learning_progress SET user_id='22222222-2222-4222-8222-222222222222';
  RAISE EXCEPTION 'Learning row ownership transfer permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  INSERT INTO public.learning_progress(user_id,role_id,milestone_day,status)
  VALUES ('11111111-1111-4111-8111-111111111111','cloud',45,'completed');
  RAISE EXCEPTION 'Invalid milestone allowed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  UPDATE public.learning_progress SET mentor_note=repeat('x',2001);
  RAISE EXCEPTION 'Oversized mentor note allowed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $
DECLARE affected integer;
BEGIN
 IF EXISTS(SELECT 1 FROM public.learning_progress WHERE user_id='11111111-1111-4111-8111-111111111111') THEN
  RAISE EXCEPTION 'Cross-user learning read allowed';
 END IF;
 UPDATE public.learning_progress SET mentor_note='Unauthorized' WHERE user_id='11111111-1111-4111-8111-111111111111';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Cross-user mentor note update allowed'; END IF;
 DELETE FROM public.learning_progress WHERE user_id='11111111-1111-4111-8111-111111111111';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Cross-user learning delete allowed'; END IF;
 BEGIN
  INSERT INTO public.learning_progress(user_id,role_id,milestone_day)
  VALUES ('11111111-1111-4111-8111-111111111111','cloud',60);
  RAISE EXCEPTION 'Cross-user learning insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.get_published_portfolio_seo('tf-ci-fixture-a') WHERE noindex IS TRUE AND snapshot->>'name'='Synthetic A' AND snapshot->>'open_to_opportunities'='false' AND snapshot->>'location'='' AND snapshot->>'website'='')<>1 THEN
   RAISE EXCEPTION 'Public snapshot/privacy flags invalid';
 END IF;
 IF EXISTS(SELECT 1 FROM public.get_published_portfolio_seo('tf-ci-missing')) THEN
   RAISE EXCEPTION 'Unknown slug returns data';
 END IF;
END $$;
RESET ROLE;
ROLLBACK;
