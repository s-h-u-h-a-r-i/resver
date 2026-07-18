create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  position numeric not null,
  status text not null default 'draft' check (status in ('draft', 'revised', 'final')),
  word_count integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (book_id, position),
  foreign key (book_id, user_id) references public.books (id, user_id) on delete cascade
);

create index scenes_user_id_idx on public.scenes (user_id);

create trigger set_updated_at
  before update on public.scenes
  for each row
  execute function public.set_updated_at();

alter table public.scenes enable row level security;

create policy "scenes_select_own" on public.scenes
  for select using (user_id = auth.uid());

create policy "scenes_insert_own" on public.scenes
  for insert with check (user_id = auth.uid());

create policy "scenes_update_own" on public.scenes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "scenes_delete_own" on public.scenes
  for delete using (user_id = auth.uid());
