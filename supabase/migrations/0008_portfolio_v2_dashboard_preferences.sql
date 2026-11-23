ALTER TABLE public.portfolio_publications DROP CONSTRAINT IF EXISTS portfolio_publications_template_check;
ALTER TABLE public.portfolio_publications ADD CONSTRAINT portfolio_publications_template_check
CHECK (template IN ('modern','minimal','tech','amber','neon','crimson','sunny','student3d','noirluxe'));
CREATE TABLE IF NOT EXISTS public.dashboard_preferences(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 theme text NOT NULL DEFAULT 'default' CHECK(theme IN ('default','neumorph')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dashboard_prefs_owner_select" ON public.dashboard_preferences FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
CREATE POLICY "dashboard_prefs_owner_insert" ON public.dashboard_preferences FOR INSERT TO authenticated WITH CHECK((SELECT auth.uid())=user_id);
CREATE POLICY "dashboard_prefs_owner_update" ON public.dashboard_preferences FOR UPDATE TO authenticated USING((SELECT auth.uid())=user_id) WITH CHECK((SELECT auth.uid())=user_id);
GRANT SELECT,INSERT,UPDATE ON public.dashboard_preferences TO authenticated;