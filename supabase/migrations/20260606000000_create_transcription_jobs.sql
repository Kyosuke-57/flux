-- otoroku: 文字起こしジョブ管理テーブル
-- Realtime 有効化必須: Supabase Dashboard → Database → Replication → transcription_jobs を追加

create table if not exists transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null,
  user_id uuid not null,
  r2_key text not null,
  file_name text not null,
  file_size bigint not null default 0,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  total_chunks int not null default 1,
  completed_chunks int not null default 0,
  transcript text,
  error_message text,
  groq_retry_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_transcription_jobs_status on transcription_jobs(status);
create index if not exists idx_transcription_jobs_recording on transcription_jobs(recording_id);
create index if not exists idx_transcription_jobs_user on transcription_jobs(user_id);
create index if not exists idx_transcription_jobs_created on transcription_jobs(created_at desc);

-- updated_at 自動更新トリガー
create or replace function update_transcription_jobs_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists transcription_jobs_updated_at_trigger on transcription_jobs;
create trigger transcription_jobs_updated_at_trigger
  before update on transcription_jobs
  for each row
  execute function update_transcription_jobs_updated_at();
