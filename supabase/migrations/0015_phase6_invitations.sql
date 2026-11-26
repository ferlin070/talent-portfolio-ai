-- Phase 6A.3 candidate. Review and test on disposable CI before any production release.
BEGIN;
CREATE SCHEMA tf_institution_private;
REVOKE ALL ON SCHEMA tf_institution_private FROM PUBLIC,anon,authenticated;
CREATE TABLE tf_institution_private.invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
 issued_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 recipient_email text NOT NULL CHECK (char_length(recipient_email) BETWEEN 3 AND 254),
 role text NOT NULL CHECK (role IN ('student','lecturer')),
 token_digest bytea NOT NULL UNIQUE CHECK (octet_length(token_digest)=32),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 accepted_at timestamptz,
 accepted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 CHECK (expires_at>created_at AND expires_at<=created_at+interval '7 days'),
 CHECK ((accepted_at IS NULL)=(accepted_by IS NULL)),
 CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);
CREATE INDEX institution_invites_pending_idx ON tf_institution_private.invitations(institution_id,expires_at);
ALTER TABLE tf_institution_private.invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tf_institution_private.invitations FROM PUBLIC,anon,authenticated;

-- Intentional, narrow RPC boundary. Fixed search_path, fully qualified tables,
-- server-derived user identity, active tenant and role, no arbitrary SQL.
CREATE FUNCTION public.tf_issue_institution_invite(p_institution uuid,p_email text,p_role text)
RETURNS TABLE(invite_id uuid, invite_token text, valid_until timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $invite$
DECLARE caller uuid:=auth.uid(); normalized_email text; raw_token text; new_id uuid; deadline timestamptz;
BEGIN
 IF caller IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=caller AND u.email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501';
 END IF;
 normalized_email:=lower(btrim(p_email));
 IF normalized_email IS NULL OR char_length(normalized_email)>254 OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 OR p_role IS NULL OR p_role NOT IN ('student','lecturer') THEN
  RAISE EXCEPTION 'Invalid invitation input' USING ERRCODE='22023';
 END IF;
 -- Serialize issuance within a tenant and prevent concurrent suspension.
 PERFORM 1 FROM public.institutions i WHERE i.id=p_institution AND i.status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.institution_memberships m WHERE m.institution_id=p_institution AND m.user_id=caller AND m.role='institution_admin' AND m.status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
 IF (SELECT count(*) FROM tf_institution_private.invitations i WHERE i.institution_id=p_institution AND i.created_at>now()-interval '1 hour')>=30
 OR (SELECT count(*) FROM tf_institution_private.invitations i WHERE i.institution_id=p_institution AND i.expires_at>now() AND i.accepted_at IS NULL AND i.revoked_at IS NULL)>=100 THEN
  RAISE EXCEPTION 'Invitation limit reached' USING ERRCODE='22023';
 END IF;
 raw_token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 deadline:=now()+interval '7 days';
 INSERT INTO tf_institution_private.invitations(institution_id,issued_by,recipient_email,role,token_digest,expires_at)
 VALUES(p_institution,caller,normalized_email,p_role,sha256(convert_to(raw_token,'UTF8')),deadline)
 RETURNING id INTO new_id;
 RETURN QUERY SELECT new_id,raw_token,deadline;
END $invite$;

CREATE FUNCTION public.tf_accept_institution_invite(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $invite$
DECLARE caller uuid:=auth.uid(); caller_email text; digest_value bytea; record_invite tf_institution_private.invitations%ROWTYPE;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
 SELECT lower(btrim(u.email)) INTO caller_email FROM auth.users u WHERE u.id=caller AND u.email_confirmed_at IS NOT NULL FOR SHARE;
 IF caller_email IS NULL OR p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501';
 END IF;
 digest_value:=sha256(convert_to(p_token,'UTF8'));
 SELECT i.* INTO record_invite FROM tf_institution_private.invitations i WHERE i.token_digest=digest_value;
 IF NOT FOUND OR record_invite.recipient_email<>caller_email THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
 -- Lock in the same tenant -> issuer -> invitation order as revocation.
 PERFORM 1 FROM public.institutions i WHERE i.id=record_invite.institution_id AND i.status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.institution_memberships m WHERE m.institution_id=record_invite.institution_id AND m.user_id=record_invite.issued_by AND m.status='active' AND m.role='institution_admin' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
 SELECT i.* INTO record_invite FROM tf_institution_private.invitations i WHERE i.token_digest=digest_value FOR UPDATE;
 IF NOT FOUND OR record_invite.recipient_email<>caller_email OR record_invite.revoked_at IS NOT NULL OR record_invite.accepted_at IS NOT NULL OR record_invite.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.institution_memberships(institution_id,user_id,role,status)
 VALUES(record_invite.institution_id,caller,record_invite.role,'active')
 ON CONFLICT(institution_id,user_id) DO NOTHING;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
 UPDATE tf_institution_private.invitations SET accepted_at=clock_timestamp(),accepted_by=caller WHERE id=record_invite.id;
 RETURN record_invite.institution_id;
END $invite$;

CREATE FUNCTION public.tf_revoke_institution_invite(p_institution uuid,p_invite uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $invite$
DECLARE caller uuid:=auth.uid();
BEGIN
 IF caller IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=caller AND u.email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM public.institutions i WHERE i.id=p_institution AND i.status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.institution_memberships m WHERE m.institution_id=p_institution AND m.user_id=caller AND m.role='institution_admin' AND m.status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
 UPDATE tf_institution_private.invitations SET revoked_at=clock_timestamp()
 WHERE id=p_invite AND institution_id=p_institution AND revoked_at IS NULL AND accepted_at IS NULL;
 RETURN FOUND;
END $invite$;
REVOKE ALL ON FUNCTION public.tf_issue_institution_invite(uuid,text,text),public.tf_accept_institution_invite(text),public.tf_revoke_institution_invite(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tf_issue_institution_invite(uuid,text,text),public.tf_accept_institution_invite(text),public.tf_revoke_institution_invite(uuid,uuid) TO authenticated;
COMMENT ON TABLE tf_institution_private.invitations IS 'Private invitation metadata and SHA-256 token digests only. No token recovery. No automatic email delivery.';
COMMIT;
