alter table public.election_settings
  add column if not exists candidate_registration_starts_at timestamptz,
  add column if not exists candidate_registration_ends_at timestamptz;

update public.election_settings
set candidate_registration_starts_at = coalesce(candidate_registration_starts_at, voting_starts_at - interval '7 days'),
    candidate_registration_ends_at = coalesce(candidate_registration_ends_at, voting_starts_at);

alter table public.election_settings
  alter column candidate_registration_starts_at set not null,
  alter column candidate_registration_ends_at set not null;

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
