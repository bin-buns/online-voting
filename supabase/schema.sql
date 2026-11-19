-- Run this in Supabase SQL Editor after creating a project.

create type public.user_role as enum ('admin', 'voter', 'candidate');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  student_id text unique not null,
  full_name text not null,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  section text,
  strand text,
  role public.user_role not null default 'voter',
  is_active boolean not null default true,
  is_temporary_password boolean not null default false,
  first_login_at timestamptz,
  password_change_deadline timestamptz,
  created_at timestamptz not null default now()
);

create table public.election_settings (
  id int primary key default 1 check (id = 1),
  title text not null default 'Organization Election',
  candidate_registration_starts_at timestamptz not null,
  candidate_registration_ends_at timestamptz not null,
  voting_starts_at timestamptz not null,
  voting_ends_at timestamptz not null,
  results_visible_at timestamptz not null,
  archive_at timestamptz not null,
  reminder_sent_at timestamptz,
  start_notice_sent_at timestamptz,
  schedule_notice_sent_at timestamptz,
  end_notice_sent_at timestamptz,
  results_notice_sent_at timestamptz,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.system_settings (
  id int primary key default 1 check (id = 1),
  system_name text not null default 'Theresian School of Cavite — Smart Voting System',
  logo_url text,
  show_results boolean not null default true,
  maintenance_mode boolean not null default false,
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

insert into public.positions (name, description, sort_order) values
  ('Mayor', 'Student Council Mayor', 1),
  ('Vice Mayor', 'Student Council Vice Mayor', 2),
  ('Secretary', 'Student Council Secretary', 3),
  ('Treasurer', 'Student Council Treasurer', 4),
  ('Auditor', 'Student Council Auditor', 5),
  ('P.R.O.', 'Public Relations Officer', 6),
  ('ICT Representative', 'ICT strand representative', 7),
  ('ABM Representative', 'ABM strand representative', 8),
  ('STEM Representative', 'STEM strand representative', 9),
  ('HUMSS Representative', 'HUMSS strand representative', 10),
  ('GAS Representative', 'GAS strand representative', 11),
  ('TVL Representative', 'TVL strand representative', 12)
on conflict (name) do nothing;

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

create table public.candidate_applications (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  application_data jsonb not null default '{}'::jsonb,
  registration_form_path text,
  review_remarks text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
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
  candidate_id uuid references public.candidates (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (voter_id, position_id)
);

create table public.election_archives (
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

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'urgent')),
  audience text not null default 'all' check (audience in ('all', 'voter', 'candidate', 'admin')),
  send_email boolean not null default false,
  emails_sent integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table public.notification_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create table public.notification_email_deliveries (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz,
  primary key (notification_id, user_id)
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
      and now() < e.voting_ends_at
  );
$$;

create or replace function public.is_campaign_open()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.election_settings e
    where e.is_active
      and now() >= e.candidate_registration_starts_at
      and now() < e.candidate_registration_ends_at
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
alter table public.candidate_applications enable row level security;
alter table public.campaign_posts enable row level security;
alter table public.votes enable row level security;
alter table public.election_archives enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.notification_email_deliveries enable row level security;
alter table public.system_settings enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

grant select, insert, update on public.system_settings to authenticated;
drop policy if exists "system_settings_admin_select" on public.system_settings;
create policy "system_settings_admin_select" on public.system_settings for select to authenticated
  using (public.current_role() = 'admin');
drop policy if exists "system_settings_admin_insert" on public.system_settings;
create policy "system_settings_admin_insert" on public.system_settings for insert to authenticated
  with check (public.current_role() = 'admin');
drop policy if exists "system_settings_admin_update" on public.system_settings;
create policy "system_settings_admin_update" on public.system_settings for update to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
insert into public.system_settings (id) values (1) on conflict (id) do nothing;

-- Profiles: users read all (for candidate names), update own
create policy "profiles_select" on public.profiles for select to authenticated using (true);
revoke update on public.profiles from authenticated;
grant update (full_name, first_name, middle_name, last_name, suffix, section, strand) on public.profiles to authenticated;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid() and public.current_role() is not null)
  with check (id = auth.uid() and public.current_role() is not null);

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
  with check (user_id = auth.uid() and public.current_role() in ('candidate', 'voter') and public.is_campaign_open());
create policy "candidates_update" on public.candidates for update to authenticated
  using (public.current_role() = 'admin' and public.is_campaign_open()) with check (public.current_role() = 'admin' and public.is_campaign_open());
create policy "candidates_delete_admin" on public.candidates for delete to authenticated
  using (public.current_role() = 'admin' and public.is_campaign_open());

create policy "candidate_applications_read_own_or_admin" on public.candidate_applications for select to authenticated
  using ((applicant_id = auth.uid() and public.current_role() is not null) or public.current_role() = 'admin');
create policy "candidate_applications_insert_own" on public.candidate_applications for insert to authenticated
  with check (applicant_id = auth.uid() and public.current_role() is not null and public.is_campaign_open() and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));
create policy "candidate_applications_manage_admin" on public.candidate_applications for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Campaign posts: read if candidate approved; author write
create policy "campaign_select" on public.campaign_posts for select to authenticated using (
  exists (
    select 1 from public.candidates c
    where c.id = candidate_id and (c.status = 'approved' or c.user_id = auth.uid() or public.current_role() = 'admin')
  )
);
create policy "campaign_insert" on public.campaign_posts for insert to authenticated
  with check (
    public.is_campaign_open() and
    exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid() and c.status = 'approved')
  );
create policy "campaign_update" on public.campaign_posts for update to authenticated
  using (
    public.is_campaign_open() and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid() and c.status = 'approved')
  ) with check (
    public.is_campaign_open() and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid() and c.status = 'approved')
  );
create policy "campaign_delete" on public.campaign_posts for delete to authenticated
  using (public.is_campaign_open() and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid() and c.status = 'approved'));

-- Votes: voter inserts own during open window; admin reads all; voter reads own only before results
create policy "votes_insert" on public.votes for insert to authenticated
  with check (
    voter_id = auth.uid()
    and public.is_voting_open()
    and public.current_role() in ('voter', 'candidate')
    and (
      votes.candidate_id is null
      or exists (
        select 1 from public.candidates c
        where c.id = votes.candidate_id
          and c.position_id = votes.position_id
          and c.status = 'approved'
      )
    )
  );
create policy "votes_select" on public.votes for select to authenticated
  using (
    voter_id = auth.uid()
    or public.current_role() = 'admin'
    or public.can_show_results()
  );
create policy "votes_delete_admin" on public.votes for delete to authenticated
  using (public.current_role() = 'admin');

create policy "election_archives_admin" on public.election_archives for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "notifications_audience_select" on public.notifications for select to authenticated
  using (audience = 'all' or audience = public.current_role() or public.current_role() = 'admin');
create policy "notifications_admin_manage" on public.notifications for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "notification_reads_own" on public.notification_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create profile on signup (set role in metadata or default voter)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, student_id, full_name, first_name, middle_name, last_name, suffix, section, strand, role, is_temporary_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'student_id', 'unknown'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'middle_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'suffix',
    new.raw_user_meta_data->>'section',
    new.raw_user_meta_data->>'strand',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'voter'),
    coalesce((new.raw_user_meta_data->>'temporary_password')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed default election window (admin should update)
create or replace function public.reset_election_notice_flags()
returns trigger language plpgsql as $$
begin
  if new.title is distinct from old.title
     or new.candidate_registration_starts_at is distinct from old.candidate_registration_starts_at
     or new.candidate_registration_ends_at is distinct from old.candidate_registration_ends_at
     or new.voting_starts_at is distinct from old.voting_starts_at
     or new.voting_ends_at is distinct from old.voting_ends_at
     or new.results_visible_at is distinct from old.results_visible_at then
    new.schedule_notice_sent_at := null;
    new.reminder_sent_at := null;
    new.start_notice_sent_at := null;
    new.end_notice_sent_at := null;
    new.results_notice_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_election_notice_flags on public.election_settings;
create trigger trg_reset_election_notice_flags
  before update on public.election_settings
  for each row execute function public.reset_election_notice_flags();

insert into public.election_settings (candidate_registration_starts_at, candidate_registration_ends_at, voting_starts_at, voting_ends_at, results_visible_at, archive_at)
values (
  now(),
  now() + interval '7 days',
  now() + interval '7 days',
  now() + interval '8 days',
  now() + interval '9 days',
  now() + interval '10 days'
);

create extension if not exists pg_cron;
create or replace function public.deactivate_expired_temporary_password_accounts()
returns integer language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update public.profiles set is_active = false
  where is_active = true and is_temporary_password = true
    and password_change_deadline is not null and password_change_deadline <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
do $$
declare job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'deactivate-expired-temporary-password-accounts';
  if job_id is not null then perform cron.unschedule(job_id); end if;
  perform cron.schedule('deactivate-expired-temporary-password-accounts','*/15 * * * *','select public.deactivate_expired_temporary_password_accounts();');
end;
$$;
