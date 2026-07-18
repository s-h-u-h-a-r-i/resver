create table public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);

create index characters_project_id_idx on public.characters (project_id);
create index characters_user_id_idx on public.characters (user_id);

create trigger set_updated_at
  before update on public.characters
  for each row
  execute function public.set_updated_at();

alter table public.characters enable row level security;

create policy "characters_select_own" on public.characters
  for select using (user_id = auth.uid());

create policy "characters_insert_own" on public.characters
  for insert with check (user_id = auth.uid());

create policy "characters_update_own" on public.characters
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "characters_delete_own" on public.characters
  for delete using (user_id = auth.uid());
