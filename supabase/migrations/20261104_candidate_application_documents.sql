create table if not exists public.candidate_applications (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  application_data jsonb not null default '{}'::jsonb,
  registration_form_path text,
  review_remarks text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Keep any old self-reported grades before removing the public candidates column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='candidates' and column_name='academic_grades'
  ) then
    execute 'insert into public.candidate_applications(candidate_id, applicant_id, application_data) select id, user_id, jsonb_build_object(''legacy_academic_grades'', academic_grades) from public.candidates where academic_grades is not null on conflict (candidate_id) do update set application_data = public.candidate_applications.application_data || excluded.application_data';
  end if;
end $$;

alter table public.candidates
  drop column if exists academic_grades,
  drop column if exists application_data,
  drop column if exists registration_form_path,
  drop column if exists review_remarks,
  drop column if exists reviewed_by_name,
  drop column if exists reviewed_at,
  drop column if exists reviewed_by;

alter table public.candidate_applications enable row level security;
drop policy if exists "candidates_update" on public.candidates;
create policy "candidates_update" on public.candidates for update to authenticated
using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
drop policy if exists "candidate_applications_read_own_or_admin" on public.candidate_applications;
create policy "candidate_applications_read_own_or_admin"
on public.candidate_applications for select to authenticated
using (applicant_id = auth.uid() or public.current_role() = 'admin');
drop policy if exists "candidate_applications_insert_own" on public.candidate_applications;
create policy "candidate_applications_insert_own"
on public.candidate_applications for insert to authenticated
with check (
  applicant_id = auth.uid()
  and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid())
);
drop policy if exists "candidate_applications_update_admin" on public.candidate_applications;
drop policy if exists "candidate_applications_manage_admin" on public.candidate_applications;
create policy "candidate_applications_manage_admin"
on public.candidate_applications for all to authenticated
using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-registration-forms','candidate-registration-forms',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf','image/jpeg','image/png'];
drop policy if exists "candidate_registration_forms_insert_own" on storage.objects;
create policy "candidate_registration_forms_insert_own" on storage.objects for insert to authenticated
with check (bucket_id='candidate-registration-forms' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "candidate_registration_forms_delete_own" on storage.objects;
create policy "candidate_registration_forms_delete_own" on storage.objects for delete to authenticated
using (bucket_id='candidate-registration-forms' and (storage.foldername(name))[1]=auth.uid()::text);
