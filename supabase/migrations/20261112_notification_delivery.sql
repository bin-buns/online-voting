-- Persist broadcast notifications and deliver email to accounts created later.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null default 'info',
  audience text not null default 'all',
  send_email boolean not null default false,
  emails_sent integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists type text not null default 'info';
alter table public.notifications add column if not exists audience text not null default 'all';
alter table public.notifications add column if not exists send_email boolean not null default false;
alter table public.notifications add column if not exists emails_sent integer not null default 0;
alter table public.notifications add column if not exists created_by uuid references auth.users (id) on delete set null;
alter table public.notifications add column if not exists created_at timestamptz not null default now();
alter table public.notifications add column if not exists expires_at timestamptz;

create table if not exists public.notification_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create table if not exists public.notification_email_deliveries (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz,
  primary key (notification_id, user_id)
);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.notification_email_deliveries enable row level security;

drop policy if exists "notifications_audience_select" on public.notifications;
create policy "notifications_audience_select" on public.notifications for select to authenticated
  using (audience = 'all' or audience = public.current_role() or public.current_role() = 'admin');
drop policy if exists "notifications_admin_manage" on public.notifications;
create policy "notifications_admin_manage" on public.notifications for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
drop policy if exists "notification_reads_own" on public.notification_reads;
create policy "notification_reads_own" on public.notification_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
