-- Allow three new portfolio themes while preserving existing published choices.
alter table public.portfolio_publications drop constraint if exists portfolio_publications_template_check;
alter table public.portfolio_publications add constraint portfolio_publications_template_check
check (template in ('modern','minimal','tech','amber','neon','crimson'));
