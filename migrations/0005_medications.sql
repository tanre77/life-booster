create table if not exists medications (
  id serial primary key,
  user_id text not null,
  name text not null,
  dose text not null default '',
  taken text not null default '',
  share_with_counselors boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists medications_user_idx on medications (user_id);
