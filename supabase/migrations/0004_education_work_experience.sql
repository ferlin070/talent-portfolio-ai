create table if not exists public.education (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 institution text not null,
 qualification text not null,
 field_of_study text not null default '',
 start_year integer check (start_year between 1950 and 2100),
 end_year integer check (end_year between 1950 and 2100),
 description text not null default '',
 created_at timestamptz not null default now(),
 constraint education_year_order check (end_year is null or start_year is null or end_year >= start_year)
);
create table if not exists public.work_experience (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 company text not null,
 role text not null,
 start_date date,
 end_date date,
 description text not null default '',
 created_at timestamptz not null default now(),
 constraint work_experience_date_order check (end_date is null or start_date is null or end_date >= start_date)
);
alter table public.education enable row level security;
alter table public.work_experience enable row level security;
create policy "education own all" on public.education for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "experience own all" on public.work_experience for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.education,public.work_experience to authenticated;
create index if not exists education_user_idx on public.education(user_id,created_at desc);
create index if not exists experience_user_idx on public.work_experience(user_id,created_at desc);