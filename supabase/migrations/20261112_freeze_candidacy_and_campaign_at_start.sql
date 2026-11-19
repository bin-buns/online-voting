create or replace function public.is_campaign_open()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.election_settings e
    where e.is_active and now() < e.voting_starts_at
  );
$$;

drop policy if exists "candidates_insert_own" on public.candidates;
create policy "candidates_insert_own" on public.candidates for insert to authenticated
  with check (user_id = auth.uid() and public.current_role() in ('candidate', 'voter') and public.is_campaign_open());

drop policy if exists "candidates_update" on public.candidates;
create policy "candidates_update" on public.candidates for update to authenticated
  using (public.current_role() = 'admin' and public.is_campaign_open())
  with check (public.current_role() = 'admin' and public.is_campaign_open());

drop policy if exists "candidates_delete_admin" on public.candidates;
create policy "candidates_delete_admin" on public.candidates for delete to authenticated
  using (public.current_role() = 'admin' and public.is_campaign_open());

drop policy if exists "candidate_applications_insert_own" on public.candidate_applications;
create policy "candidate_applications_insert_own" on public.candidate_applications for insert to authenticated
  with check (
    applicant_id = auth.uid()
    and public.current_role() is not null
    and public.is_campaign_open()
    and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid())
  );

drop policy if exists "campaign_insert" on public.campaign_posts;
create policy "campaign_insert" on public.campaign_posts for insert to authenticated
  with check (public.is_campaign_open() and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

drop policy if exists "campaign_update" on public.campaign_posts;
create policy "campaign_update" on public.campaign_posts for update to authenticated
  using (public.is_campaign_open() and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()))
  with check (public.is_campaign_open() and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

drop policy if exists "campaign_delete" on public.campaign_posts;
create policy "campaign_delete" on public.campaign_posts for delete to authenticated
  using (public.is_campaign_open() and exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));
