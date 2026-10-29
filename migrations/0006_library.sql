create table if not exists practices (
  id serial primary key,
  counselor_id text not null references counselor_profiles (user_id) on delete cascade,
  title text not null,
  topic text not null,
  minutes smallint not null check (minutes between 1 and 60),
  body text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists practices_counselor_idx on practices (counselor_id);
create index if not exists practices_topic_idx on practices (topic);

create table if not exists follows (
  user_id text not null,
  counselor_id text not null references counselor_profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, counselor_id)
);
