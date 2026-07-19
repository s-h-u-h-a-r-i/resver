-- RLS policies only take effect once a role already has the underlying
-- table grant — Postgres checks privileges before consulting RLS. Every
-- earlier migration defined "for authenticated" policies but never granted
-- authenticated the base SELECT/INSERT/UPDATE/DELETE, so every request from
-- a signed-in user was rejected with "permission denied for table X" before
-- RLS ever ran.
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.projects,
  public.books,
  public.characters,
  public.scenes,
  public.paragraphs,
  public.scene_characters,
  public.continuity_notes,
  public.style_notes,
  public.future_beats,
  public.future_beat_continuity
to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
