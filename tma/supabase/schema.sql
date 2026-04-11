create extension if not exists pgcrypto;

create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  telegram_user_id bigint unique not null,
  first_name text,
  last_name text,
  username text,
  photo_url text,
  language_code text,
  created_at timestamptz default now(),
  first_open_at timestamptz,
  last_seen_at timestamptz,
  source text,
  notes text
);

create table if not exists user_access (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  access_type text default 'free',
  max_day int default 0,
  is_active boolean default true,
  granted_by text,
  granted_at timestamptz default now(),
  expires_at timestamptz,
  comment text
);

create table if not exists lesson_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  day_number int not null,
  status text default 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  last_step text,
  checklist_json jsonb,
  quiz_completed boolean default false,
  quiz_score int,
  unique(user_id, day_number)
);

create table if not exists quiz_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  quiz_type text,
  answers_json jsonb,
  result_type text,
  completed_at timestamptz default now()
);

create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  event_name text not null,
  event_props_json jsonb,
  created_at timestamptz default now()
);

create table if not exists access_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  old_access_type text,
  new_access_type text,
  old_max_day int,
  new_max_day int,
  changed_by text,
  changed_at timestamptz default now(),
  comment text
);

alter table users enable row level security;
alter table user_access enable row level security;
alter table lesson_progress enable row level security;
alter table quiz_results enable row level security;
alter table events enable row level security;
alter table access_history enable row level security;

drop policy if exists "anon full access" on users;
drop policy if exists "anon full access" on user_access;
drop policy if exists "anon full access" on lesson_progress;
drop policy if exists "anon full access" on quiz_results;
drop policy if exists "anon full access" on events;
drop policy if exists "anon full access" on access_history;

create policy "anon full access" on users for all using (true) with check (true);
create policy "anon full access" on user_access for all using (true) with check (true);
create policy "anon full access" on lesson_progress for all using (true) with check (true);
create policy "anon full access" on quiz_results for all using (true) with check (true);
create policy "anon full access" on events for all using (true) with check (true);
create policy "anon full access" on access_history for all using (true) with check (true);
