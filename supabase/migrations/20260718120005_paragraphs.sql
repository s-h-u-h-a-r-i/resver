create table public.paragraphs (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null default '',
  position numeric not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (scene_id, position),
  foreign key (scene_id, user_id) references public.scenes (id, user_id) on delete cascade
);

create index paragraphs_user_id_idx on public.paragraphs (user_id);

create trigger set_updated_at
  before update on public.paragraphs
  for each row
  execute function public.set_updated_at();

alter table public.paragraphs enable row level security;

create policy "paragraphs_select_own" on public.paragraphs
  for select using (user_id = auth.uid());

create policy "paragraphs_insert_own" on public.paragraphs
  for insert with check (user_id = auth.uid());

create policy "paragraphs_update_own" on public.paragraphs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "paragraphs_delete_own" on public.paragraphs
  for delete using (user_id = auth.uid());
