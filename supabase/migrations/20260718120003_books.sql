create table public.books (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  position numeric not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (project_id, position),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);

create index books_user_id_idx on public.books (user_id);

create trigger set_updated_at
  before update on public.books
  for each row
  execute function public.set_updated_at();

alter table public.books enable row level security;

create policy "books_select_own" on public.books
  for select using (user_id = auth.uid());

create policy "books_insert_own" on public.books
  for insert with check (user_id = auth.uid());

create policy "books_update_own" on public.books
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "books_delete_own" on public.books
  for delete using (user_id = auth.uid());
