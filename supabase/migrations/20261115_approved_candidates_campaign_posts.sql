drop policy if exists "campaign_insert" on public.campaign_posts;
create policy "campaign_insert" on public.campaign_posts for insert to authenticated
  with check (
    public.is_campaign_open()
    and exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid() and c.status = 'approved'
    )
  );

drop policy if exists "campaign_update" on public.campaign_posts;
create policy "campaign_update" on public.campaign_posts for update to authenticated
  using (
    public.is_campaign_open()
    and exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid() and c.status = 'approved'
    )
  )
  with check (
    public.is_campaign_open()
    and exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid() and c.status = 'approved'
    )
  );

drop policy if exists "campaign_delete" on public.campaign_posts;
create policy "campaign_delete" on public.campaign_posts for delete to authenticated
  using (
    public.is_campaign_open()
    and exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid() and c.status = 'approved'
    )
  );
