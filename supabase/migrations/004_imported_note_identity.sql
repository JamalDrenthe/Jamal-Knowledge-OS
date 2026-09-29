alter table public.notes
  add column if not exists import_key text;

with ranked_imports as (
  select
    id,
    user_id,
    title,
    row_number() over (
      partition by user_id, title
      order by created_at, id
    ) as import_rank
  from public.notes
  where import_key is null
    and tags @> array['imported']::text[]
    and title in ('QuantumInitium Growth Engine (PDF)', 'QuantumInitium')
)
update public.notes
set import_key = case ranked_imports.title
  when 'QuantumInitium Growth Engine (PDF)' then 'quantuminitium-growth-engine-pdf'
  when 'QuantumInitium' then 'quantuminitium'
end
from ranked_imports
where public.notes.id = ranked_imports.id
  and ranked_imports.import_rank = 1;

create unique index if not exists notes_user_import_key_uidx
  on public.notes (user_id, import_key)
  where import_key is not null;
