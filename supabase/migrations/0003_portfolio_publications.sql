-- Talentfolio AI v2: private profile and explicit public portfolio snapshots
alter table public.profiles add column if not exists website text default '';
alter table public.profiles add column if not exists location text default '';
alter table public.profiles add column if not exists avatar_url text default '';
alter table public.profiles add column if not exists updated_at timestamptz default now();

create table if not exists public.portfolio_publications (
 user_id uuid primary key references auth.users(id) on delete cascade,
 slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) between 3 and 48),
 template text not null default 'modern' check (template in ('modern','minimal','tech')),
 published boolean not null default false,
 snapshot jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.portfolio_publications enable row level security;
create policy "publication owner select" on public.portfolio_publications for select to authenticated using ((select auth.uid()) = user_id);
create policy "publication public published select" on public.portfolio_publications for select to anon using (published = true);
create policy "publication owner insert" on public.portfolio_publications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "publication owner update" on public.portfolio_publications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "publication owner delete" on public.portfolio_publications for delete to authenticated using ((select auth.uid()) = user_id);

-- Uploaded documents are never auto-verified
drop policy if exists "certificates owner all" on public.certificates;
create policy "certificates own select" on public.certificates for select to authenticated using ((select auth.uid()) = user_id);
create policy "certificates own insert unverified" on public.certificates for insert to authenticated with check ((select auth.uid()) = user_id and verification_status = 'self_uploaded');
create policy "certificates own update unverified" on public.certificates for update to authenticated using ((select auth.uid()) = user_id and verification_status = 'self_uploaded') with check ((select auth.uid()) = user_id and verification_status = 'self_uploaded');
create policy "certificates own delete" on public.certificates for delete to authenticated using ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.profiles,public.projects,public.certificates,public.skills,public.portfolio_publications to authenticated;
grant select on public.portfolio_publications to anon;
create index if not exists certificates_user_recent_idx on public.certificates(user_id,created_at desc);
create index if not exists projects_user_recent_idx on public.projects(user_id,created_at desc);
create index if not exists skills_user_recent_idx on public.skills(user_id,created_at desc);
create index if not exists published_slugs_idx on public.portfolio_publications(slug) where published=true;