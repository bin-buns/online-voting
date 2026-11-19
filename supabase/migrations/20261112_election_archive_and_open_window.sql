-- Keep the schedule used by the application complete for existing databases.
alter table public.election_settings
  add column if not exists archive_at timestamptz;

update public.election_settings
set archive_at = results_visible_at
where archive_at is null;

alter table public.election_settings
  alter column archive_at set not null;

create table if not exists public.election_archives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  voting_starts_at timestamptz not null,
  voting_ends_at timestamptz not null,
  results_visible_at timestamptz not null,
  archived_at timestamptz not null default now(),
  auto_archived boolean not null default false,
  total_voters integer not null default 0,
  total_votes integer not null default 0,
  results jsonb not null default '[]'::jsonb
);

alter table public.election_archives enable row level security;

drop policy if exists "election_archives_admin" on public.election_archives;
create policy "election_archives_admin" on public.election_archives for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists "votes_delete_admin" on public.votes;
create policy "votes_delete_admin" on public.votes for delete to authenticated
  using (public.current_role() = 'admin');

-- Match the application: the election is open from its start instant up to,
-- but not including, its end instant.
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
      and now() < e.voting_ends_at
  );
$$;
