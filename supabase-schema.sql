-- ============================================================
-- Tu Tiên Online — Supabase schema cho Bạn bè + Nhắn tin
-- DÙNG Ở MILESTONE 2 (bản online). Chạy trong Supabase Dashboard
-- → SQL Editor. Bản offline (milestone 1) không dùng file này.
-- Quy tắc: KHÔNG chuyển Linh Thạch trực tiếp giữa người chơi.
-- ============================================================

-- Hồ sơ nhân vật (1 hàng / người chơi)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  char_id text not null unique,          -- ID duy nhất "TT-XXXXXX", không đổi suốt đời
  name text not null unique,            -- tên hiển thị: không trùng (bản online)
  gender text not null default 'nam' check (gender in ('nam','nu')),
  sect text not null default 'kiem',
  realm int not null default 1,
  tier int not null default 1,
  name_history jsonb not null default '[]',  -- [{name, at}] tên cũ
  last_rename_at timestamptz,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists profiles_char_id_idx on profiles(char_id);
create index if not exists profiles_name_idx on profiles(name);

-- Bạn bè (2 chiều: ghi 2 hàng hoặc 1 hàng + query cả 2 phía;
-- ở đây ghi 2 hàng khi chấp nhận để list đơn giản)
create table if not exists friends (
  user_id uuid not null references profiles(user_id) on delete cascade,
  friend_id uuid not null references profiles(user_id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Lời mời kết bạn
create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles(user_id) on delete cascade,
  to_id uuid not null references profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

-- Tin nhắn 1-1
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles(user_id) on delete cascade,
  to_id uuid not null references profiles(user_id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz default now(),
  check (from_id <> to_id)
);
create index if not exists messages_thread_idx on messages(to_id, created_at desc);
create index if not exists messages_from_idx on messages(from_id, created_at desc);

-- ================= RLS =================
alter table profiles enable row level security;
alter table friends enable row level security;
alter table friend_requests enable row level security;
alter table messages enable row level security;

-- profiles: ai cũng đọc được (để tìm bạn theo tên/ID); chỉ sửa hàng của mình
create policy profiles_select_all on profiles for select to authenticated using (true);
create policy profiles_insert_own on profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update_own on profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- friends: chỉ hàng của mình
create policy friends_all_own on friends for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- friend_requests: đọc khi là người gửi/nhận; gửi với tư cách mình;
-- người nhận được update (accept/decline); cả hai được xóa
create policy fr_select on friend_requests for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy fr_insert on friend_requests for insert to authenticated
  with check (from_id = auth.uid());
create policy fr_update on friend_requests for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());
create policy fr_delete on friend_requests for delete to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

-- messages: đọc khi là người gửi/nhận; gửi với tư cách mình
create policy msg_select on messages for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy msg_insert on messages for insert to authenticated
  with check (from_id = auth.uid());
