-- Migration 2026-10-18: bạn bè 1 hàng / tình bạn (thay vì 2 hàng),
-- để RLS cho phép 1 trong 2 bên ghi/xóa.
-- Chạy trong Supabase Dashboard → SQL Editor (sau supabase-schema.sql).
drop policy if exists friends_all_own on friends;
create policy friends_all_own on friends for all to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid())
  with check (user_id = auth.uid() or friend_id = auth.uid());
