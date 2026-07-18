create table public.continuity_notes (
  id uuid primary key default gen_random_uuid(),
  paragraph_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null default '',
  supersedes_id uuid unique references public.continuity_notes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (supersedes_id is null or supersedes_id <> id),
  foreign key (paragraph_id, user_id) references public.paragraphs (id, user_id) on delete cascade
);

create index continuity_notes_paragraph_id_idx on public.continuity_notes (paragraph_id);
create index continuity_notes_user_id_idx on public.continuity_notes (user_id);

create trigger set_updated_at
  before update on public.continuity_notes
  for each row
  execute function public.set_updated_at();

-- supersedes_id is unique and can't self-reference (forks/self-loops blocked above),
-- but two rows could still point at each other. Enforcing that a note may only
-- supersede a strictly older row makes cycles impossible, since created_at only
-- moves forward.
create or replace function public.check_continuity_supersedes_chronology()
returns trigger
language plpgsql
as $$
declare
  target_created_at timestamptz;
begin
  if new.supersedes_id is not null then
    select created_at into target_created_at
    from public.continuity_notes
    where id = new.supersedes_id;

    if target_created_at is null then
      raise exception 'supersedes_id references a nonexistent continuity_notes row';
    end if;

    if target_created_at >= new.created_at then
      raise exception 'a continuity_notes row can only supersede an older row';
    end if;
  end if;
  return new;
end;
$$;

create trigger check_supersedes_chronology
  before insert or update on public.continuity_notes
  for each row
  execute function public.check_continuity_supersedes_chronology();

alter table public.continuity_notes enable row level security;

create policy "continuity_notes_select_own" on public.continuity_notes
  for select using (user_id = auth.uid());

create policy "continuity_notes_insert_own" on public.continuity_notes
  for insert with check (user_id = auth.uid());

create policy "continuity_notes_update_own" on public.continuity_notes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "continuity_notes_delete_own" on public.continuity_notes
  for delete using (user_id = auth.uid());

create table public.style_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);

create index style_notes_project_id_idx on public.style_notes (project_id);
create index style_notes_user_id_idx on public.style_notes (user_id);

create trigger set_updated_at
  before update on public.style_notes
  for each row
  execute function public.set_updated_at();

alter table public.style_notes enable row level security;

create policy "style_notes_select_own" on public.style_notes
  for select using (user_id = auth.uid());

create policy "style_notes_insert_own" on public.style_notes
  for insert with check (user_id = auth.uid());

create policy "style_notes_update_own" on public.style_notes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "style_notes_delete_own" on public.style_notes
  for delete using (user_id = auth.uid());
