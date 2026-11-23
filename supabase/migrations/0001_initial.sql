-- Starter schema, intentionally private by default.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  user_type text not null default 'student' check (user_type in ('student','worker')),
  headline text not null default '',
  bio text not null default '',
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  issuer text,
  issued_on date,
  expires_on date,
  storage_path text,
  verification_status text not null default 'self_uploaded'
    check (verification_status in ('self_uploaded','pending','verified')),
  created_at timestamptz not null default now()
);
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  self_rating integer check (self_rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique(user_id,name)
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.certificates enable row level security;
alter table public.skills enable row level security;

create policy "profiles owner read" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles owner insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles owner update" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects owner all" on public.projects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "certificates owner all" on public.certificates for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "skills owner all" on public.skills for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Uploaded credentials should use a PRIVATE bucket and Storage policies.
-- Public portfolio publishing must use explicitly approved fields only.
-- This migration does not yet configure certificate uploading or public profile APIs.
