-- Local dev seed data. Mirrors preview-draft/mock-data.js so the preview UI
-- and a real Supabase-backed build show the same "Tidewater Cycle" /
-- "Standalones" content. Login: demo@resver.app / password.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'demo@resver.app',
  crypt('password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'demo@resver.app')::jsonb,
  'email',
  now(), now(), now()
);

do $$
declare
  v_user_id constant uuid := '11111111-1111-1111-1111-111111111111';

  v_p1 uuid; -- Tidewater Cycle
  v_p2 uuid; -- Standalones

  v_fb_elias uuid;
  v_fb_coast uuid;

  v_b1 uuid; -- The Salt Road
  v_b2 uuid; -- The Drowned Coast
  v_b3 uuid; -- Ash & Ember

  v_b1s1 uuid; v_b1s2 uuid; v_b1s3 uuid; v_b1s4 uuid; v_b1s5 uuid; v_b1s6 uuid;
  v_b2s1 uuid; v_b2s2 uuid; v_b2s3 uuid;
  v_b3s1 uuid; v_b3s2 uuid;

  -- paragraphs that continuity notes anchor to
  v_p_gate uuid;
  v_p_irontide uuid;
  v_p_scarflame uuid;
  v_p_cistern uuid;
  v_p_names uuid;
  v_p_coastredraw uuid;
  v_p_kittiwake uuid;
  v_p_lamps uuid;

  v_cn_name uuid;
  v_cn_coastredraw uuid;
begin
  -- projects -----------------------------------------------------------
  insert into public.projects (user_id, title, description)
  values (v_user_id, 'Tidewater Cycle', 'Smuggler-turned-captain vs. the customs inspector who does not yet know her name.')
  returning id into v_p1;

  insert into public.projects (user_id, title, description)
  values (v_user_id, 'Standalones', 'One-off stories that do not belong to a series.')
  returning id into v_p2;

  -- characters -----------------------------------------------------------
  insert into public.characters (project_id, user_id, name, description) values
    (v_p1, v_user_id, 'Marisol Vane', 'Lead. Salt-smuggler of the drowned channels, later captain of the Kittiwake. Her scarred left hand keeps its distance from any flame.'),
    (v_p1, v_user_id, 'Elias Corr', 'Foil. Customs inspector of the Tidewatch. He counts everything and believes almost none of it — and does not yet know her name.'),
    (v_p1, v_user_id, 'Dun', 'Ally. The ferryman, who speaks only in tolls.'),
    (v_p1, v_user_id, 'Sister Wren', 'Ally. Keeps the tide-chapel and the names of the drowned. Follows it south in later books.'),
    (v_p1, v_user_id, 'The Cartographer', 'Foil. Maps a coast that keeps rearranging itself. Trades in a certainty he does not have.');

  insert into public.characters (project_id, user_id, name, description) values
    (v_p2, v_user_id, 'Ren', 'Lead. A lamplighter in a city that has forgotten why it fears the dark.'),
    (v_p2, v_user_id, 'Hale', 'Foil. Sells oil by day and rumours by night.');

  -- style notes -----------------------------------------------------------
  insert into public.style_notes (project_id, user_id, title, content) values
    (v_p1, v_user_id, 'Voice', 'Close third, past tense. Stay in one head at a time — no head-hopping inside a scene.'),
    (v_p1, v_user_id, 'Dialogue', 'Curly quotes. Em dash for interruption, ellipsis for trailing off.'),
    (v_p1, v_user_id, 'Numbers', 'Spell out under a hundred; numerals for coin and cargo weights.'),
    (v_p1, v_user_id, 'Place names', 'The Tidewatch, the drowned channels, the cisterns — lowercase “the” except at a sentence start.'),
    (v_p1, v_user_id, 'Ships', 'Vessels set in italics — the Kittiwake, the Gannet.');

  insert into public.style_notes (project_id, user_id, title, content) values
    (v_p2, v_user_id, 'Keep it lean', 'Short sentences. This is a thriller, not a tapestry.');

  -- future beats (project-level; linked to continuity notes below) -------
  insert into public.future_beats (project_id, user_id, title, content)
  values (v_p1, v_user_id, 'Elias learns her name', 'Payoff for the whole first book — must land after the Tidewatch gate no longer separates them.')
  returning id into v_fb_elias;

  insert into public.future_beats (project_id, user_id, title, content)
  values (v_p1, v_user_id, 'The coast finally holds still', 'A single chapter, late in the cycle, where the redrawing stops — signals the series is ending.')
  returning id into v_fb_coast;

  -- books -----------------------------------------------------------
  insert into public.books (project_id, user_id, title, position) values (v_p1, v_user_id, 'The Salt Road', 1) returning id into v_b1;
  insert into public.books (project_id, user_id, title, position) values (v_p1, v_user_id, 'The Drowned Coast', 2) returning id into v_b2;
  insert into public.books (project_id, user_id, title, position) values (v_p2, v_user_id, 'Ash & Ember', 1) returning id into v_b3;

  -- The Salt Road: scenes + paragraphs ------------------------------------
  insert into public.scenes (book_id, user_id, title, position, status) values (v_b1, v_user_id, 'The Tidewatch Gate', 1, 'final') returning id into v_b1s1;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s1, v_user_id, 'The gate had teeth. Everyone said so, though only the drowned could name them.', 1)
  returning id into v_p_gate;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s1, v_user_id, 'Marisol waited in the lee of the customs house until the bells went quiet, counting the inspectors the way her mother had taught her to count debts — twice, and then once more for the one you missed.', 2);

  insert into public.scenes (book_id, user_id, title, position, status) values (v_b1, v_user_id, 'Marisol''s Bargain', 2, 'draft') returning id into v_b1s2;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s2, v_user_id, 'The tide came in the color of old iron, and with it came the smell of the cisterns — brine and rust and something sweeter underneath that Marisol had learned, over years, not to name.', 1)
  returning id into v_p_irontide;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s2, v_user_id, 'Elias Corr was waiting at the third mooring, exactly where the letter said he would be. He had the look of a man who counted things for a living: salt, coin, the small dishonesties of everyone who passed his gate.', 2);
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s2, v_user_id, '“You''re late,” he said, without turning. “The Watch closes at dusk. You know this.”', 3);
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s2, v_user_id, '“I know the tide better than the Watch does.” She let the skiff drift the last few feet, keeping her scarred hand low against the gunwale, away from the lantern. “And the tide says we have an hour.”', 4)
  returning id into v_p_scarflame;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s2, v_user_id, 'He turned then. Whatever he had expected, it was not her — not the ledger she carried, not the name she had not yet given him, not the bargain already forming in the space between them like frost on glass.', 5);

  insert into public.scenes (book_id, user_id, title, position, status) values (v_b1, v_user_id, 'Ash in the Cistern', 3, 'draft') returning id into v_b1s3;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s3, v_user_id, 'The fire had left the cistern years ago, but the ash never fully went. It gathered in the low places, and Marisol''s hand remembered every one of them.', 1)
  returning id into v_p_cistern;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s3, v_user_id, 'She descended without a light. Down here, light was a way of announcing your debts to whoever waited in the dark.', 2);

  insert into public.scenes (book_id, user_id, title, position, status) values (v_b1, v_user_id, 'The Long Ford', 4, 'draft') returning id into v_b1s4;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s4, v_user_id, 'This scene waits, outlined but unwritten.', 1);

  insert into public.scenes (book_id, user_id, title, position, status) values (v_b1, v_user_id, 'Names for the Drowned', 5, 'draft') returning id into v_b1s5;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s5, v_user_id, '', 1)
  returning id into v_p_names;

  insert into public.scenes (book_id, user_id, title, position, status) values (v_b1, v_user_id, 'The Cartographer''s Debt', 6, 'draft') returning id into v_b1s6;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b1s6, v_user_id, '', 1);

  -- The Salt Road: continuity notes -----------------------------------------
  insert into public.continuity_notes (paragraph_id, user_id, title, content)
  values (v_p_gate, v_user_id, 'The gate closes at dusk', 'The bargain scene runs on a single hour — the closing gate is the clock beneath every line.');
  insert into public.continuity_notes (paragraph_id, user_id, title, content)
  values (v_p_irontide, v_user_id, 'The “iron tide”', 'The sea reads as old iron at dusk — hold that metal note whenever the tide turns.');
  insert into public.continuity_notes (paragraph_id, user_id, title, content)
  values (v_p_scarflame, v_user_id, 'Scarred hand near flame', 'She keeps it low, away from the lantern here — consistent with the cistern burn.');
  insert into public.continuity_notes (paragraph_id, user_id, title, content)
  values (v_p_cistern, v_user_id, 'The scarred hand', 'Since the cistern fire. She shields it from the lantern.');
  insert into public.continuity_notes (paragraph_id, user_id, title, content)
  values (v_p_names, v_user_id, 'Her true name', 'Elias must not learn it before the closing scenes.')
  returning id into v_cn_name;

  -- The Drowned Coast: scenes + paragraphs ---------------------------------
  insert into public.scenes (book_id, user_id, title, position, status) values (v_b2, v_user_id, 'Salt and Ash', 1, 'draft') returning id into v_b2s1;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b2s1, v_user_id, 'The coast had moved again in the night, the way it always did after a hard blow, and the Cartographer stood at the rail cursing his own maps.', 1)
  returning id into v_p_coastredraw;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b2s1, v_user_id, '“You could just ask the water,” Marisol said. “It never lies. It only forgets.”', 2);

  insert into public.scenes (book_id, user_id, title, position, status) values (v_b2, v_user_id, 'The Kittiwake', 2, 'draft') returning id into v_b2s2;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b2s2, v_user_id, 'Outlined: Marisol takes on a cargo she is forbidden to inspect.', 1)
  returning id into v_p_kittiwake;

  insert into public.scenes (book_id, user_id, title, position, status) values (v_b2, v_user_id, 'What the Tide Kept', 3, 'draft') returning id into v_b2s3;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b2s3, v_user_id, '', 1);

  -- The Drowned Coast: continuity notes -------------------------------------
  insert into public.continuity_notes (paragraph_id, user_id, title, content)
  values (v_p_coastredraw, v_user_id, 'The coast redraws itself', 'After every storm. No map older than a season can be trusted.')
  returning id into v_cn_coastredraw;
  insert into public.continuity_notes (paragraph_id, user_id, title, content)
  values (v_p_kittiwake, v_user_id, 'Marisol commands the Kittiwake', 'Not a smuggler''s skiff any longer.');

  -- Ash & Ember: scenes + paragraphs ---------------------------------------
  insert into public.scenes (book_id, user_id, title, position, status) values (v_b3, v_user_id, 'Last Light', 1, 'draft') returning id into v_b3s1;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b3s1, v_user_id, 'Ren climbed the seventh lamp as the bells struck six, and for the first time in her life the wick would not catch.', 1)
  returning id into v_p_lamps;

  insert into public.scenes (book_id, user_id, title, position, status) values (v_b3, v_user_id, 'The Long Dark', 2, 'draft') returning id into v_b3s2;
  insert into public.paragraphs (scene_id, user_id, content, position)
  values (v_b3s2, v_user_id, '', 1);

  -- Ash & Ember: continuity notes ---------------------------------------
  insert into public.continuity_notes (paragraph_id, user_id, title, content)
  values (v_p_lamps, v_user_id, 'The lamps must never all go dark at once', 'Ren has believed this since childhood.');

  -- future beat <-> continuity links ---------------------------------------
  insert into public.future_beat_continuity (future_beat_id, continuity_note_id, user_id)
  values (v_fb_elias, v_cn_name, v_user_id);
  insert into public.future_beat_continuity (future_beat_id, continuity_note_id, user_id)
  values (v_fb_coast, v_cn_coastredraw, v_user_id);
end $$;
