-- Run once in Supabase → SQL Editor. Safe to re-run.
-- Tracks automatic schedule, reminder, voting, closure, and results notices.

alter table public.election_settings
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists start_notice_sent_at timestamptz,
  add column if not exists schedule_notice_sent_at timestamptz,
  add column if not exists end_notice_sent_at timestamptz,
  add column if not exists results_notice_sent_at timestamptz;

-- A changed election schedule is a new announcement cycle.
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
