-- Emergency rollback for 20260913b_users_direct_access_off.sql: restores the
-- previous state exactly (a single permissive policy and table grants).
-- Use only if saves are failing after step 2; then fix forward.
begin;
grant select, insert, update, delete on table public.users to anon, authenticated;
drop policy if exists "Allow all" on public.users;
create policy "Allow all" on public.users for all to public using (true) with check (true);
commit;
