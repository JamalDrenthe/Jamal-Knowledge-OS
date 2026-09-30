alter table public.folders
  add column if not exists import_key text;

create unique index if not exists folders_user_import_key_idx
  on public.folders (user_id, import_key)
  where import_key is not null;
