-- Shared trigger to keep updated_at current. gen_random_uuid() is a Postgres
-- 13+ core builtin, so no pgcrypto/uuid extension is needed for ids.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
