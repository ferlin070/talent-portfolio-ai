-- Phase 5D: owner-private learning milestones and self-recorded mentor feedback.
-- Review and test on disposable databases first. No production application here.
BEGIN;
CREATE TABLE public.learning_progress (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role_id text NOT NULL CHECK (role_id IN ('fullstack','cloud','data','uiux','devops','cybersecurity')),
 milestone_day integer NOT NULL CHECK (milestone_day IN (30,60,90)),
 status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
 evidence_note text NOT NULL DEFAULT '' CHECK (char_length(evidence_note)<=2000),
 mentor_note text NOT NULL DEFAULT '' CHECK (char_length(mentor_note)<=2000),
 next_action text NOT NULL DEFAULT '' CHECK (char_length(next_action)<=500),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,role_id,milestone_day)
);
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_progress FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.learning_progress TO authenticated;
CREATE POLICY "learning progress owner read" ON public.learning_progress FOR SELECT TO authenticated
 USING ((SELECT auth.uid())=user_id);
CREATE POLICY "learning progress owner insert" ON public.learning_progress FOR INSERT TO authenticated
 WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY "learning progress owner update" ON public.learning_progress FOR UPDATE TO authenticated
 USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY "learning progress owner delete" ON public.learning_progress FOR DELETE TO authenticated
 USING ((SELECT auth.uid())=user_id);
COMMENT ON TABLE public.learning_progress IS 'Private self-reported learning and mentor notes. Not a verified credential or mentor-authored review. Never included in public portfolio snapshots.';
COMMIT;
