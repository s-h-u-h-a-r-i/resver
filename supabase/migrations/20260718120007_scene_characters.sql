create table public.scene_characters (
  scene_id uuid not null,
  character_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (scene_id, character_id),
  foreign key (scene_id, user_id) references public.scenes (id, user_id) on delete cascade,
  foreign key (character_id, user_id) references public.characters (id, user_id) on delete cascade
);

create index scene_characters_character_id_idx on public.scene_characters (character_id);
create index scene_characters_user_id_idx on public.scene_characters (user_id);

alter table public.scene_characters enable row level security;

create policy "scene_characters_select_own" on public.scene_characters
  for select using (user_id = auth.uid());

create policy "scene_characters_insert_own" on public.scene_characters
  for insert with check (user_id = auth.uid());

create policy "scene_characters_delete_own" on public.scene_characters
  for delete using (user_id = auth.uid());
