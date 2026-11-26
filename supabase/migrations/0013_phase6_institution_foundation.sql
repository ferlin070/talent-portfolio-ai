-- Phase 6A: read-only tenant directory. Trusted provisioning only.
-- Apply to disposable local databases first; no production release in this branch.
BEGIN;
CREATE TABLE public.institutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended'))
);
CREATE TABLE public.institution_memberships (
 institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('institution_admin','lecturer','student')),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
 PRIMARY KEY (institution_id,user_id),
 UNIQUE (institution_id,user_id,role)
);
CREATE INDEX institution_memberships_user_idx ON public.institution_memberships(user_id,institution_id);
CREATE TABLE public.institution_programmes (
 institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
 code text NOT NULL CHECK (char_length(btrim(code)) BETWEEN 1 AND 40),
 PRIMARY KEY(institution_id,id), UNIQUE(institution_id,code)
);
CREATE TABLE public.institution_cohorts (
 institution_id uuid NOT NULL,
 programme_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
 PRIMARY KEY(institution_id,id),
 FOREIGN KEY(institution_id,programme_id) REFERENCES public.institution_programmes(institution_id,id) ON DELETE CASCADE
);
CREATE TABLE public.institution_cohort_assignments (
 institution_id uuid NOT NULL,
 cohort_id uuid NOT NULL,
 user_id uuid NOT NULL,
 role text NOT NULL CHECK (role IN ('lecturer','student')),
 PRIMARY KEY(institution_id,cohort_id,user_id),
 FOREIGN KEY(institution_id,cohort_id) REFERENCES public.institution_cohorts(institution_id,id) ON DELETE CASCADE,
 FOREIGN KEY(institution_id,user_id,role) REFERENCES public.institution_memberships(institution_id,user_id,role) ON DELETE CASCADE
);
CREATE INDEX institution_cohort_assignments_user_idx ON public.institution_cohort_assignments(user_id,institution_id,cohort_id);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_cohort_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.institutions,public.institution_memberships,public.institution_programmes,public.institution_cohorts,public.institution_cohort_assignments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.institutions,public.institution_memberships,public.institution_programmes,public.institution_cohorts,public.institution_cohort_assignments TO authenticated;
-- Acyclic policy dependencies: memberships -> no other table; institutions -> memberships;
-- assignments -> institutions/memberships; cohorts -> assignments/institutions/memberships;
-- programmes -> cohorts/institutions/memberships. No privileged functions.
CREATE POLICY "memberships own active read" ON public.institution_memberships FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) AND status='active');
CREATE POLICY "institutions active membership read" ON public.institutions FOR SELECT TO authenticated
 USING (status='active' AND EXISTS(SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institutions.id AND m.user_id=(SELECT auth.uid()) AND m.status='active'));
CREATE POLICY "assignments scoped read" ON public.institution_cohort_assignments FOR SELECT TO authenticated
 USING (
 EXISTS(SELECT 1 FROM public.institutions i WHERE i.id=institution_cohort_assignments.institution_id)
 AND EXISTS(SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_cohort_assignments.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND (m.role='institution_admin' OR (institution_cohort_assignments.user_id=m.user_id AND institution_cohort_assignments.role=m.role)))
 );
CREATE POLICY "cohorts scoped read" ON public.institution_cohorts FOR SELECT TO authenticated
 USING (
 EXISTS(SELECT 1 FROM public.institutions i WHERE i.id=institution_cohorts.institution_id)
 AND (EXISTS(SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_cohorts.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role='institution_admin')
 OR EXISTS(SELECT 1 FROM public.institution_cohort_assignments a WHERE a.institution_id=institution_cohorts.institution_id AND a.cohort_id=institution_cohorts.id AND a.user_id=(SELECT auth.uid())))
 );
CREATE POLICY "programmes scoped read" ON public.institution_programmes FOR SELECT TO authenticated
 USING (
 EXISTS(SELECT 1 FROM public.institutions i WHERE i.id=institution_programmes.institution_id)
 AND (EXISTS(SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_programmes.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role='institution_admin')
 OR EXISTS(SELECT 1 FROM public.institution_cohorts c WHERE c.institution_id=institution_programmes.institution_id AND c.programme_id=institution_programmes.id))
 );
COMMENT ON TABLE public.institution_memberships IS 'Trusted operator provisioned; clients may read only their own active membership. No self-service role changes.';
COMMIT;
