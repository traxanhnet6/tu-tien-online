-- ============================================================
-- Tu Tiên Online — Migration HỆ THỐNG TÀI KHOẢN (2026-10-18)
-- Chạy trong Supabase Dashboard → SQL Editor (sau supabase-schema.sql).
--
-- Mục đích: đăng ký/đăng nhập bằng TÊN TÀI KHOẢN + mật khẩu,
-- email dùng để lấy lại mật khẩu. Supabase Auth (email/password)
-- làm nền; bảng này ánh xạ username → email để đăng nhập bằng tên.
-- ============================================================

-- Ánh xạ tên tài khoản → user (để đăng nhập bằng tên tài khoản)
create table if not exists public.usernames (
  username text primary key,                       -- đã lowercase ở client
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

alter table public.usernames enable row level security;

-- Đọc công khai: cần tra email TRƯỚC khi đăng nhập (chưa có session),
-- và kiểm tra trùng tên khi đăng ký.
create policy usernames_select_all on public.usernames
  for select using (true);

-- Chỉ được tạo hàng cho chính mình (sau khi đã có session).
create policy usernames_insert_own on public.usernames
  for insert with check (user_id = auth.uid());

-- Chỉ mình được xóa hàng của mình (đổi tên tài khoản sau này).
create policy usernames_delete_own on public.usernames
  for delete using (user_id = auth.uid());

-- Thêm cột username vào profiles (hiển thị; name vẫn là tên nhân vật).
alter table public.profiles
  add column if not exists username text;
