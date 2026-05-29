-- Run this in Supabase SQL Editor after creating a project.

create type public.user_role as enum ('admin', 'voter', 'candidate');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  student_id text unique not null,
  full_name text not null,
  role public.user_role not null default 'voter',
  created_at timestamptz not null default now()
);

create table public.election_settings (
  id int primary key default 1 check (id = 1),
  title text not null default 'Organization Election',
  voting_starts_at timestamptz not null,
  voting_ends_at timestamptz not null,
  results_visible_at timestamptz not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  max_winners int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  tagline text,
  bio text,
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (user_id, position_id)
);

create table public.campaign_posts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  title text not null,
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (voter_id, position_id)
);

-- Helper: is voting open right now?
create or replace function public.is_voting_open()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.election_settings e
    where e.is_active
      and now() >= e.voting_starts_at
      and now() <= e.voting_ends_at
  );
$$;

-- Helper: can results be shown?
create or replace function public.can_show_results()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.election_settings e
    where e.is_active
      and now() >= e.results_visible_at
  );
$$;

alter table public.profiles enable row level security;
alter table public.election_settings enable row level security;
alter table public.positions enable row level security;
alter table public.candidates enable row level security;
alter table public.campaign_posts enable row level security;
alter table public.votes enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Profiles: users read all (for candidate names), update own
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Election settings: everyone reads; admin updates
create policy "election_select" on public.election_settings for select to authenticated using (true);
create policy "election_admin_write" on public.election_settings for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Positions: read all; admin write
create policy "positions_select" on public.positions for select to authenticated using (true);
create policy "positions_admin_write" on public.positions for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Candidates: read approved; candidates manage own; admin all
create policy "candidates_select" on public.candidates for select to authenticated
  using (
    status = 'approved'
    or user_id = auth.uid()
    or public.current_role() = 'admin'
  );
create policy "candidates_insert_own" on public.candidates for insert to authenticated
  with check (user_id = auth.uid() and public.current_role() in ('candidate', 'voter'));
create policy "candidates_update" on public.candidates for update to authenticated
  using (user_id = auth.uid() or public.current_role() = 'admin');

-- Campaign posts: read if candidate approved; author write
create policy "campaign_select" on public.campaign_posts for select to authenticated using (
  exists (
    select 1 from public.candidates c
    where c.id = candidate_id and (c.status = 'approved' or c.user_id = auth.uid() or public.current_role() = 'admin')
  )
);
create policy "campaign_insert" on public.campaign_posts for insert to authenticated
  with check (
    exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid())
  );
create policy "campaign_update" on public.campaign_posts for update to authenticated
  using (
    exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid())
  );

-- Votes: voter inserts own during open window; admin reads all; voter reads own only before results
create policy "votes_insert" on public.votes for insert to authenticated
  with check (
    voter_id = auth.uid()
    and public.is_voting_open()
    and public.current_role() in ('voter', 'candidate')
  );
create policy "votes_select" on public.votes for select to authenticated
  using (
    voter_id = auth.uid()
    or public.current_role() = 'admin'
    or public.can_show_results()
  );

-- Auto-create profile on signup (set role in metadata or default voter)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, student_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'student_id', 'unknown'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'voter')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed default election window (admin should update)
insert into public.election_settings (voting_starts_at, voting_ends_at, results_visible_at)
values (
  now() + interval '7 days',
  now() + interval '8 days',
  now() + interval '9 days'
);
