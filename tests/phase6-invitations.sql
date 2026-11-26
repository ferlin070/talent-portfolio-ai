-- Disposable local database only. Synthetic identities and invitations roll back.
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,created_at,updated_at) VALUES
 ('65000000-0000-4000-8000-000000000001','invite-admin@example.invalid',now(),now(),now()),
 ('65000000-0000-4000-8000-000000000002','invite-student@example.invalid',now(),now(),now()),
 ('65000000-0000-4000-8000-000000000003','invite-other@example.invalid',now(),now(),now()),
 ('65000000-0000-4000-8000-000000000004','invite-unconfirmed@example.invalid',NULL,now(),now());
INSERT INTO public.institutions(id,name,slug) VALUES
 ('66000000-0000-4000-8000-000000000001','Synthetic Invite Institution','tf6-invite-a'),
 ('66000000-0000-4000-8000-000000000002','Synthetic Other Institution','tf6-invite-b');
INSERT INTO public.institution_memberships(institution_id,user_id,role) VALUES
 ('66000000-0000-4000-8000-000000000001','65000000-0000-4000-8000-000000000001','institution_admin');
DO $inviteqa$
BEGIN
 IF has_schema_privilege('authenticated','tf_institution_private','USAGE') OR has_table_privilege('authenticated','tf_institution_private.invitations','SELECT')
 OR has_function_privilege('anon','public.tf_issue_institution_invite(uuid,text,text)','EXECUTE')
 OR has_function_privilege('anon','public.tf_accept_institution_invite(text)','EXECUTE')
 OR has_function_privilege('anon','public.tf_revoke_institution_invite(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Unexpected invitation access';
 END IF;
END $inviteqa$;
SET LOCAL ROLE authenticated;
DO $inviteqa$
DECLARE issued record; revoked record; target uuid; reused boolean; existing record;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','65000000-0000-4000-8000-000000000001',true);
 BEGIN
  PERFORM public.tf_issue_institution_invite('66000000-0000-4000-8000-000000000001','invite-student@example.invalid','institution_admin');
  RAISE EXCEPTION 'Admin invitation allowed';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 BEGIN
  PERFORM public.tf_issue_institution_invite('66000000-0000-4000-8000-000000000002','invite-student@example.invalid','student');
  RAISE EXCEPTION 'Cross-tenant invitation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 SELECT * INTO issued FROM public.tf_issue_institution_invite('66000000-0000-4000-8000-000000000001',' Invite-Student@EXAMPLE.INVALID ','student');
 IF issued.invite_token !~ '^[a-f0-9]{64}$' OR issued.valid_until<=now() THEN RAISE EXCEPTION 'Invalid issued token'; END IF;
 SELECT * INTO revoked FROM public.tf_issue_institution_invite('66000000-0000-4000-8000-000000000001','invite-other@example.invalid','lecturer');
 IF NOT public.tf_revoke_institution_invite('66000000-0000-4000-8000-000000000001',revoked.invite_id) THEN RAISE EXCEPTION 'Revocation failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub','65000000-0000-4000-8000-000000000003',true);
 BEGIN
  PERFORM public.tf_accept_institution_invite(issued.invite_token);
  RAISE EXCEPTION 'Wrong email accepted invitation';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.tf_accept_institution_invite(revoked.invite_token);
  RAISE EXCEPTION 'Revoked invitation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.tf_issue_institution_invite('66000000-0000-4000-8000-000000000001','invite-other@example.invalid','student');
  RAISE EXCEPTION 'Non-admin invitation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub','65000000-0000-4000-8000-000000000002',true);
 target:=public.tf_accept_institution_invite(issued.invite_token);
 IF target<>'66000000-0000-4000-8000-000000000001'::uuid OR NOT EXISTS(SELECT 1 FROM public.institution_memberships WHERE institution_id=target AND role='student' AND status='active') THEN
  RAISE EXCEPTION 'Invitation acceptance failed';
 END IF;
 BEGIN
  PERFORM public.tf_accept_institution_invite(issued.invite_token);
  RAISE EXCEPTION 'Invitation replay permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub','65000000-0000-4000-8000-000000000001',true);
 SELECT * INTO existing FROM public.tf_issue_institution_invite('66000000-0000-4000-8000-000000000001','invite-student@example.invalid','lecturer');
 SELECT * INTO revoked FROM public.tf_issue_institution_invite('66000000-0000-4000-8000-000000000001','invite-unconfirmed@example.invalid','student');
 PERFORM set_config('request.jwt.claim.sub','65000000-0000-4000-8000-000000000004',true);
 BEGIN
  PERFORM public.tf_accept_institution_invite(revoked.invite_token);
  RAISE EXCEPTION 'Unconfirmed email accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub','65000000-0000-4000-8000-000000000002',true);
 BEGIN
  PERFORM public.tf_accept_institution_invite(existing.invite_token);
  RAISE EXCEPTION 'Existing membership overwritten';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF NOT EXISTS(SELECT 1 FROM public.institution_memberships WHERE institution_id=target AND role='student') THEN RAISE EXCEPTION 'Existing role changed'; END IF;
END $inviteqa$;
RESET ROLE;
DO $inviteqa$
BEGIN
 IF (SELECT count(*) FROM tf_institution_private.invitations WHERE accepted_at IS NOT NULL)<>1 THEN RAISE EXCEPTION 'Unexpected redemption count'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='tf_institution_private' AND table_name='invitations' AND column_name='invite_token') THEN RAISE EXCEPTION 'Raw token storage'; END IF;
END $inviteqa$;
ROLLBACK;
