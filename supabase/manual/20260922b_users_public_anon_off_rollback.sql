grant select on public.users_public to anon, authenticated;
notify pgrst, 'reload schema';
