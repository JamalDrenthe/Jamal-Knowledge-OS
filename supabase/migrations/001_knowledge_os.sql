create extension if not exists "pgcrypto";

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  parent_id uuid references public.folders(id) on delete cascade,
  color text not null default 'violet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default 'Untitled note',
  body text not null default '',
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.folders enable row level security;
alter table public.notes enable row level security;
alter table public.attachments enable row level security;

create policy "Users manage their folders" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their attachments" on public.attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('knowledge-attachments', 'knowledge-attachments', false)
on conflict (id) do nothing;

create policy "Users access their attachment files" on storage.objects
  for all using (
    bucket_id = 'knowledge-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'knowledge-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
