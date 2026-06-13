create table auth_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  label text not null,
  api_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス: ユーザーごとの検索を高速化
create index idx_auth_data_user_id on auth_data(user_id);

-- RLS 有効化
alter table auth_data enable row level security;

-- 各ユーザーは自分のデータのみ参照可能
create policy "ユーザーは自分の auth_data を参照できる"
  on auth_data for select
  using (auth.uid() = user_id);

-- 各ユーザーは自分のデータのみ挿入可能
create policy "ユーザーは自分の auth_data を挿入できる"
  on auth_data for insert
  with check (auth.uid() = user_id);

-- 各ユーザーは自分のデータのみ更新可能
create policy "ユーザーは自分の auth_data を更新できる"
  on auth_data for update
  using (auth.uid() = user_id);

-- 各ユーザーは自分のデータのみ削除可能
create policy "ユーザーは自分の auth_data を削除できる"
  on auth_data for delete
  using (auth.uid() = user_id);

-- updated_at 自動更新トリガー
create extension if not exists moddatetime schema extensions;
create trigger handle_auth_data_updated_at before update on auth_data
  for each row execute procedure moddatetime(updated_at);
