create table if not exists profiles (
  user_id text primary key,
  display_name text not null default '',
  is_operator boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists mood_entries (
  id serial primary key,
  user_id text not null,
  logged_on date not null,
  mood smallint not null check (mood between 1 and 5),
  note text not null default '',
  share_with_counselors boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

create index if not exists mood_entries_user_idx on mood_entries (user_id, logged_on);

create table if not exists counselor_profiles (
  user_id text primary key,
  display_name text not null,
  headline text not null default '',
  bio text not null default '',
  religions text not null default '[]',
  philosophies text not null default '[]',
  specialties text not null default '[]',
  hourly_rate_cents integer not null check (hourly_rate_cents between 1500 and 40000),
  timezone text not null default 'America/New_York',
  standing text not null default 'active' check (standing in ('active', 'dismissed')),
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists availability_blocks (
  id serial primary key,
  counselor_id text not null references counselor_profiles (user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_min integer not null check (start_min between 0 and 1410),
  end_min integer not null check (end_min between 30 and 1440),
  unique (counselor_id, weekday, start_min)
);

create index if not exists availability_counselor_idx on availability_blocks (counselor_id);

create table if not exists appointments (
  id serial primary key,
  member_id text not null,
  counselor_id text not null references counselor_profiles (user_id),
  starts_at timestamptz not null,
  duration_min integer not null check (duration_min in (30, 60, 90, 120)),
  hourly_rate_cents integer not null,
  ads_discount boolean not null default false,
  amount_cents integer not null,
  pay_method text not null,
  pay_status text not null,
  share_mood boolean not null default false,
  status text not null default 'booked' check (status in ('booked', 'completed', 'cancelled')),
  disclaimer_ack boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists appointments_member_idx on appointments (member_id, starts_at);
create index if not exists appointments_counselor_idx on appointments (counselor_id, starts_at);

create table if not exists reviews (
  id serial primary key,
  appointment_id integer not null unique references appointments (id) on delete cascade,
  member_id text not null,
  counselor_id text not null,
  stars smallint not null check (stars between 1 and 5),
  comment text not null default '',
  reviewer_name text not null default 'Member',
  created_at timestamptz not null default now()
);

create index if not exists reviews_counselor_idx on reviews (counselor_id);

create table if not exists session_messages (
  id serial primary key,
  appointment_id integer not null references appointments (id) on delete cascade,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists session_messages_appt_idx on session_messages (appointment_id, id);

create table if not exists call_signals (
  id serial primary key,
  appointment_id integer not null references appointments (id) on delete cascade,
  sender_id text not null,
  kind text not null check (kind in ('offer', 'answer', 'ice')),
  payload text not null,
  created_at timestamptz not null default now()
);

create index if not exists call_signals_appt_idx on call_signals (appointment_id, id);

create table if not exists call_presence (
  appointment_id integer not null references appointments (id) on delete cascade,
  user_id text not null,
  updated_at timestamptz not null default now(),
  primary key (appointment_id, user_id)
);
