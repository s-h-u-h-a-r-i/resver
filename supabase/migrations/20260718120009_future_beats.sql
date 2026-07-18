create table public.future_beats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);

create index future_beats_project_id_idx on public.future_beats (project_id);
create index future_beats_user_id_idx on public.future_beats (user_id);

create trigger set_updated_at
  before update on public.future_beats
  for each row
  execute function public.set_updated_at();

alter table public.future_beats enable row level security;

create policy "future_beats_select_own" on public.future_beats
  for select using (user_id = auth.uid());

create policy "future_beats_insert_own" on public.future_beats
  for insert with check (user_id = auth.uid());

create policy "future_beats_update_own" on public.future_beats
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "future_beats_delete_own" on public.future_beats
  for delete using (user_id = auth.uid());

create table public.future_beat_continuity (
  future_beat_id uuid not null,
  continuity_note_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (future_beat_id, continuity_note_id),
  foreign key (future_beat_id, user_id) references public.future_beats (id, user_id) on delete cascade,
  foreign key (continuity_note_id, user_id) references public.continuity_notes (id, user_id) on delete cascade
);

create index future_beat_continuity_continuity_note_id_idx on public.future_beat_continuity (continuity_note_id);
create index future_beat_continuity_user_id_idx on public.future_beat_continuity (user_id);

alter table public.future_beat_continuity enable row level security;

create policy "future_beat_continuity_select_own" on public.future_beat_continuity
  for select using (user_id = auth.uid());

create policy "future_beat_continuity_insert_own" on public.future_beat_continuity
  for insert with check (user_id = auth.uid());

create policy "future_beat_continuity_delete_own" on public.future_beat_continuity
  for delete using (user_id = auth.uid());
