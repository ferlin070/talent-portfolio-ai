-- Phase 6A.2: scoped programme/cohort creation and editing.
-- No changes to membership, assignments, institution ownership or existing rows.
BEGIN;
GRANT INSERT (institution_id,name,code), UPDATE (name,code) ON public.institution_programmes TO authenticated;
GRANT INSERT (institution_id,programme_id,name), UPDATE (name) ON public.institution_cohorts TO authenticated;
CREATE POLICY "programmes admin insert" ON public.institution_programmes FOR INSERT TO authenticated
 WITH CHECK (
 EXISTS (SELECT 1 FROM public.institutions i WHERE i.id=institution_programmes.institution_id AND i.status='active')
 AND EXISTS (SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_programmes.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role='institution_admin')
 );
CREATE POLICY "programmes admin update" ON public.institution_programmes FOR UPDATE TO authenticated
 USING (
 EXISTS (SELECT 1 FROM public.institutions i WHERE i.id=institution_programmes.institution_id AND i.status='active')
 AND EXISTS (SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_programmes.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role='institution_admin')
 )
 WITH CHECK (
 EXISTS (SELECT 1 FROM public.institutions i WHERE i.id=institution_programmes.institution_id AND i.status='active')
 AND EXISTS (SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_programmes.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role='institution_admin')
 );
CREATE POLICY "cohorts admin insert" ON public.institution_cohorts FOR INSERT TO authenticated
 WITH CHECK (
 EXISTS (SELECT 1 FROM public.institutions i WHERE i.id=institution_cohorts.institution_id AND i.status='active')
 AND EXISTS (SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_cohorts.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role='institution_admin')
 );
CREATE POLICY "cohorts admin update" ON public.institution_cohorts FOR UPDATE TO authenticated
 USING (
 EXISTS (SELECT 1 FROM public.institutions i WHERE i.id=institution_cohorts.institution_id AND i.status='active')
 AND EXISTS (SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_cohorts.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role='institution_admin')
 )
 WITH CHECK (
 EXISTS (SELECT 1 FROM public.institutions i WHERE i.id=institution_cohorts.institution_id AND i.status='active')
 AND EXISTS (SELECT 1 FROM public.institution_memberships m WHERE m.institution_id=institution_cohorts.institution_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role='institution_admin')
 );
-- Column grants deliberately exclude primary keys and parent/tenant reassignment.
-- No DELETE grants. Composite FKs continue enforcing same-tenant programme links.
COMMIT;
