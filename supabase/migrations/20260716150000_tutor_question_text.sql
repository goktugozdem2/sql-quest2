-- Capture the user's literal question in tutor events (2026-07-16).
-- tutor_events previously stored only challenge_id + phase — we could see
-- WHERE users got stuck but not WHAT confused them. The question text is
-- the raw material for the content-gap map (e.g. 24 users stuck on #4
-- GROUP_CONCAT was only discoverable by volume, not by cause).
alter table public.tutor_events add column if not exists question text;
