-- otoroku: transcription_jobs に minute_id カラムを追加（自動議事録生成用）
alter table transcription_jobs
  add column if not exists minute_id uuid references minutes(id) on delete set null;

-- minute_id での検索用インデックス
create index if not exists idx_transcription_jobs_minute
  on transcription_jobs(minute_id)
  where minute_id is not null;
