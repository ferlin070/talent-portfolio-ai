-- Disposable CI only. All synthetic fixtures roll back.
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,created_at,updated_at) VALUES
 ('61000000-0000-4000-8000-000000000001','tf6-admin@example.invalid',now(),now(),now()),
 ('61000000-0000-4000-8000-000000000002','tf6-lecturer@example.invalid',now(),now(),now()),
 ('61000000-0000-4000-8000-000000000003','tf6-student@example.invalid',now(),now(),now()),
 ('61000000-0000-4000-8000-000000000004','tf6-unassigned@example.invalid',now(),now(),now()),
 ('61000000-0000-4000-8000-000000000005','tf6-suspended@example.invalid',now(),now(),now());
INSERT INTO public.institutions(id,name,slug) VALUES
 ('62000000-0000-4000-8000-000000000001','Synthetic Institution A','tf6-fixture-a'),
 ('62000000-0000-4000-8000-000000000002','Synthetic Institution B','tf6-fixture-b');
INSERT INTO public.institution_memberships(institution_id,user_id,role,status) VALUES
 ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','institution_admin','active'),
 ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','lecturer','active'),
 ('62000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000003','student','active'),
 ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000004','lecturer','active'),
 ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000005','student','suspended');
INSERT INTO public.institution_programmes(institution_id,id,name,code) VALUES
 ('62000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000001','Cloud','CLD'),
 ('62000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000002','Network','NET'),
 ('62000000-0000-4000-8000-000000000002','63000000-0000-4000-8000-000000000003','Data','DAT');
INSERT INTO public.institution_cohorts(institution_id,programme_id,id,name) VALUES
 ('62000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000001','64000000-0000-4000-8000-000000000001','Cloud A'),
 ('62000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000002','64000000-0000-4000-8000-000000000002','Network A'),
 ('62000000-0000-4000-8000-000000000002','63000000-0000-4000-8000-000000000003','64000000-0000-4000-8000-000000000003','Data B');
INSERT INTO public.institution_cohort_assignments(institution_id,cohort_id,user_id,role) VALUES
 ('62000000-0000-4000-8000-000000000001','64000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','lecturer'),
 ('62000000-0000-4000-8000-000000000002','64000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000003','student');
DO $tf6$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['institutions','institution_memberships','institution_programmes','institution_cohorts','institution_cohort_assignments'] LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass) THEN RAISE EXCEPTION 'Missing RLS %',t; END IF;
  IF has_table_privilege('anon','public.'||t,'SELECT') OR has_table_privilege('authenticated','public.'||t,'INSERT') OR has_table_privilege('authenticated','public.'||t,'UPDATE') OR has_table_privilege('authenticated','public.'||t,'DELETE') THEN RAISE EXCEPTION 'Unexpected access %',t; END IF;
 END LOOP;
 BEGIN
  INSERT INTO public.institution_cohorts(institution_id,programme_id,name) VALUES ('62000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000003','Invalid');
  RAISE EXCEPTION 'Cross-tenant programme permitted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO public.institution_cohort_assignments(institution_id,cohort_id,user_id,role) VALUES ('62000000-0000-4000-8000-000000000001','64000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000002','student');
  RAISE EXCEPTION 'Assignment role mismatch permitted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
END $tf6$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
DO $tf6$
BEGIN
 IF (SELECT count(*) FROM public.institutions)<>1 OR (SELECT count(*) FROM public.institution_memberships)<>1 OR (SELECT count(*) FROM public.institution_programmes)<>2 OR (SELECT count(*) FROM public.institution_cohorts)<>2 OR (SELECT count(*) FROM public.institution_cohort_assignments)<>1 THEN RAISE EXCEPTION 'Admin tenant scope failed'; END IF;
END $tf6$;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
DO $tf6$
BEGIN
 IF (SELECT count(*) FROM public.institutions)<>1 OR (SELECT count(*) FROM public.institution_cohorts WHERE name='Cloud A')<>1 OR (SELECT count(*) FROM public.institution_cohorts)<>1 OR (SELECT count(*) FROM public.institution_programmes)<>1 THEN RAISE EXCEPTION 'Lecturer assignment scope failed'; END IF;
 BEGIN
  UPDATE public.institution_memberships SET role='institution_admin';
  RAISE EXCEPTION 'Role escalation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $tf6$;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000003',true);
DO $tf6$
BEGIN
 IF (SELECT count(*) FROM public.institutions WHERE slug='tf6-fixture-b')<>1 OR (SELECT count(*) FROM public.institutions)<>1 OR (SELECT count(*) FROM public.institution_cohorts WHERE name='Data B')<>1 OR (SELECT count(*) FROM public.institution_cohorts)<>1 THEN RAISE EXCEPTION 'Student scope failed'; END IF;
END $tf6$;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000004',true);
DO $tf6$
BEGIN
 IF (SELECT count(*) FROM public.institutions)<>1 OR EXISTS(SELECT 1 FROM public.institution_cohorts) OR EXISTS(SELECT 1 FROM public.institution_programmes) OR EXISTS(SELECT 1 FROM public.institution_cohort_assignments) THEN RAISE EXCEPTION 'Unassigned lecturer access'; END IF;
END $tf6$;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000005',true);
DO $tf6$
BEGIN
 IF EXISTS(SELECT 1 FROM public.institutions) OR EXISTS(SELECT 1 FROM public.institution_memberships) OR EXISTS(SELECT 1 FROM public.institution_cohorts) THEN RAISE EXCEPTION 'Suspended user access'; END IF;
END $tf6$;
RESET ROLE;
UPDATE public.institutions SET status='suspended' WHERE slug='tf6-fixture-a';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
DO $tf6$
BEGIN
 IF EXISTS(SELECT 1 FROM public.institutions) OR EXISTS(SELECT 1 FROM public.institution_cohorts) OR EXISTS(SELECT 1 FROM public.institution_cohort_assignments) THEN RAISE EXCEPTION 'Suspended institution access'; END IF;
END $tf6$;
RESET ROLE;
UPDATE public.institutions SET status='active' WHERE slug='tf6-fixture-a';
DO $tf6write$
BEGIN
 IF has_column_privilege('authenticated','public.institution_programmes','institution_id','UPDATE')
 OR has_column_privilege('authenticated','public.institution_programmes','id','INSERT')
 OR has_column_privilege('authenticated','public.institution_cohorts','programme_id','UPDATE')
 OR has_column_privilege('authenticated','public.institution_cohorts','institution_id','UPDATE')
 OR has_any_column_privilege('authenticated','public.institution_memberships','INSERT')
 OR has_any_column_privilege('authenticated','public.institution_cohort_assignments','UPDATE') THEN
  RAISE EXCEPTION 'Overbroad institution write grants';
 END IF;
END $tf6write$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
DO $tf6write$
DECLARE new_programme uuid; new_cohort uuid; affected integer;
BEGIN
 INSERT INTO public.institution_programmes(institution_id,name,code)
 VALUES ('62000000-0000-4000-8000-000000000001','New synthetic programme','NEW') RETURNING id INTO new_programme;
 INSERT INTO public.institution_cohorts(institution_id,programme_id,name)
 VALUES ('62000000-0000-4000-8000-000000000001',new_programme,'New synthetic cohort') RETURNING id INTO new_cohort;
 UPDATE public.institution_programmes SET name='Updated synthetic programme' WHERE id=new_programme;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin programme edit failed'; END IF;
 UPDATE public.institution_cohorts SET name='Updated synthetic cohort' WHERE id=new_cohort;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin cohort edit failed'; END IF;
 BEGIN
  INSERT INTO public.institution_programmes(institution_id,name,code) VALUES ('62000000-0000-4000-8000-000000000002','Forbidden','FORBID');
  RAISE EXCEPTION 'Cross-tenant admin insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE public.institution_programmes SET name='Forbidden' WHERE institution_id='62000000-0000-4000-8000-000000000002';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Cross-tenant admin update allowed'; END IF;
 BEGIN
  UPDATE public.institution_cohorts SET programme_id='63000000-0000-4000-8000-000000000001' WHERE id=new_cohort;
  RAISE EXCEPTION 'Cohort parent reassignment allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  DELETE FROM public.institution_programmes WHERE id=new_programme;
  RAISE EXCEPTION 'Admin delete allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  INSERT INTO public.institution_cohorts(institution_id,programme_id,name) VALUES ('62000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000003','Forbidden');
  RAISE EXCEPTION 'Cross-tenant cohort parent allowed';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
END $tf6write$;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
DO $tf6write$
DECLARE affected integer;
BEGIN
 UPDATE public.institution_programmes SET name='Forbidden' WHERE code='CLD';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Lecturer programme update allowed'; END IF;
 BEGIN
  INSERT INTO public.institution_cohorts(institution_id,programme_id,name) VALUES ('62000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000001','Forbidden');
  RAISE EXCEPTION 'Lecturer cohort insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $tf6write$;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000003',true);
DO $tf6write$
BEGIN
 BEGIN
  INSERT INTO public.institution_programmes(institution_id,name,code) VALUES ('62000000-0000-4000-8000-000000000002','Forbidden','FORBID');
  RAISE EXCEPTION 'Student programme insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $tf6write$;
RESET ROLE;
UPDATE public.institution_memberships SET status='suspended' WHERE user_id='61000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
DO $tf6write$
BEGIN
 BEGIN
  INSERT INTO public.institution_programmes(institution_id,name,code) VALUES ('62000000-0000-4000-8000-000000000001','Forbidden','FORBID');
  RAISE EXCEPTION 'Suspended admin insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $tf6write$;
RESET ROLE;
ROLLBACK;
