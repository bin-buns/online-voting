create table if not exists public.system_settings (
  id int primary key default 1 check (id = 1),
  system_name text not null default 'Theresian School of Cavite — Smart Voting System',
  logo_url text,
  show_results boolean not null default true,
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.system_settings
  add column if not exists system_name text default 'Theresian School of Cavite — Smart Voting System',
  add column if not exists logo_url text,
  add column if not exists show_results boolean default true,
  add column if not exists maintenance_mode boolean default false,
  add column if not exists updated_at timestamptz default now();

update public.system_settings
set system_name = coalesce(system_name, 'Theresian School of Cavite — Smart Voting System'),
    show_results = coalesce(show_results, true),
    maintenance_mode = coalesce(maintenance_mode, false),
    updated_at = coalesce(updated_at, now());

alter table public.system_settings
  alter column system_name set not null,
  alter column show_results set not null,
  alter column maintenance_mode set not null,
  alter column updated_at set not null;

create unique index if not exists system_settings_id_unique on public.system_settings (id);
alter table public.system_settings enable row level security;
grant select, insert, update on public.system_settings to authenticated;

do $$
declare existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'system_settings'
  loop
    execute format('drop policy %I on public.system_settings', existing_policy.policyname);
  end loop;
end;
$$;

create policy "system_settings_admin_select" on public.system_settings for select to authenticated
  using (public.current_role() = 'admin');

create policy "system_settings_admin_insert" on public.system_settings for insert to authenticated
  with check (public.current_role() = 'admin');

create policy "system_settings_admin_update" on public.system_settings for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

insert into public.system_settings (id) values (1)
on conflict (id) do nothing;
