create table if not exists public.allowed_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.allowed_users enable row level security;

create policy "Users can read their own access" on public.allowed_users
  for select using (auth.uid() = user_id);

insert into public.allowed_users (user_id)
select id
from auth.users
where email = 'js.drenthe@gmail.com'
on conflict (user_id) do nothing;
