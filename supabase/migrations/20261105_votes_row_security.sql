-- The UI supports abstaining, so candidate_id must be nullable.
alter table public.votes alter column candidate_id drop not null;

drop policy if exists "votes_insert" on public.votes;
create policy "votes_insert" on public.votes for insert to authenticated
with check (
  voter_id = auth.uid()
  and public.is_voting_open()
  and public.current_role() in ('voter', 'candidate')
  and (
    votes.candidate_id is null
    or exists (
      select 1
      from public.candidates c
      where c.id = votes.candidate_id
        and c.position_id = votes.position_id
        and c.status = 'approved'
    )
  )
);
