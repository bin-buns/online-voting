alter table public.profiles
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists suffix text,
  add column if not exists is_active boolean not null default true,
  add column if not exists is_temporary_password boolean not null default false,
  add column if not exists first_login_at timestamptz,
  add column if not exists password_change_deadline timestamptz;

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

-- Prevent users from changing their own role or account status through the Data API.
revoke update on public.profiles from authenticated;
grant update (full_name, first_name, middle_name, last_name, suffix, section, strand) on public.profiles to authenticated;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid() and public.current_role() is not null)
  with check (id = auth.uid() and public.current_role() is not null);

drop policy if exists "candidate_applications_read_own_or_admin" on public.candidate_applications;
create policy "candidate_applications_read_own_or_admin" on public.candidate_applications for select to authenticated
  using ((applicant_id = auth.uid() and public.current_role() is not null) or public.current_role() = 'admin');
drop policy if exists "candidate_applications_insert_own" on public.candidate_applications;
create policy "candidate_applications_insert_own" on public.candidate_applications for insert to authenticated
  with check (applicant_id = auth.uid() and public.current_role() is not null and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

drop policy if exists "candidate_registration_forms_insert_own" on storage.objects;
create policy "candidate_registration_forms_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'candidate-registration-forms' and (storage.foldername(name))[1] = auth.uid()::text and public.current_role() is not null);
drop policy if exists "candidate_registration_forms_delete_own" on storage.objects;
create policy "candidate_registration_forms_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'candidate-registration-forms' and (storage.foldername(name))[1] = auth.uid()::text and public.current_role() is not null);

create index if not exists profiles_password_change_deadline_idx
  on public.profiles (password_change_deadline)
  where is_temporary_password = true and is_active = true;

-- Enforce deactivation on schedule even when a student is not actively browsing.
create extension if not exists pg_cron;
create or replace function public.deactivate_expired_temporary_password_accounts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.profiles
  set is_active = false
  where is_active = true
    and is_temporary_password = true
    and password_change_deadline is not null
    and password_change_deadline <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

do $$
declare job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'deactivate-expired-temporary-password-accounts';
  if job_id is not null then perform cron.unschedule(job_id); end if;
  perform cron.schedule(
    'deactivate-expired-temporary-password-accounts',
    '*/15 * * * *',
    'select public.deactivate_expired_temporary_password_accounts();'
  );
end;
$$;
