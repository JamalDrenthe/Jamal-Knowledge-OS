alter table public.folders
  add column if not exists position integer not null default 0;

with ranked_folders as (
  select
    id,
    row_number() over (
      partition by user_id, parent_id
      order by created_at, id
    ) - 1 as next_position
  from public.folders
)
update public.folders
set position = ranked_folders.next_position
from ranked_folders
where public.folders.id = ranked_folders.id;

create index if not exists folders_user_parent_position_idx
  on public.folders (user_id, parent_id, position);
