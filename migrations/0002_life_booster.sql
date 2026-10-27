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

insert into counselor_profiles (
  user_id, display_name, headline, bio, religions, philosophies, specialties, hourly_rate_cents, timezone
) values
(
  'sample-amira',
  'Amira Sol',
  'Grief, faith, and the quiet after',
  'I sit with people in grief and the long quiet after a hard season. Islamic practice and humanist ideas about dignity shape how I listen. I am not a licensed therapist. This is a conversation, not treatment.',
  '["Islam","Humanism"]',
  '["Mindfulness","Humanism"]',
  '["Grief","Faith questions","Low mood"]',
  8000,
  'America/New_York'
),
(
  'sample-jonah',
  'Jonah Hale',
  'Transitions, habits, a steadier week',
  'I help people name what is changing and pick one habit that makes the week lighter. I draw on Christian practice and Stoic ideas, and I am glad to work with people who are secular. I am not a licensed clinician.',
  '["Christianity","Secular"]',
  '["Stoicism","Strengths-based"]',
  '["Life transitions","Stress","Habits"]',
  7000,
  'America/New_York'
),
(
  'sample-leila',
  'Leila Cho',
  'Burnout, work, and sleep',
  'When work has taken the whole day, I slow the conversation down. Buddhist contemplative practice and acceptance-based ideas guide me. I do not diagnose, prescribe, or replace a licensed therapist.',
  '["Buddhism"]',
  '["Acceptance and commitment","Contemplative practice"]',
  '["Burnout","Work","Sleep"]',
  9500,
  'America/New_York'
),
(
  'sample-mateo',
  'Mateo Ruiz',
  'Relationships and family stories',
  'I listen for the story a family keeps telling, and for the one it has not said yet. Catholic faith and a narrative, person-centered style shape the hour. Peer support only. Not therapy.',
  '["Catholicism"]',
  '["Narrative","Person-centered"]',
  '["Relationships","Family","Self-worth"]',
  6000,
  'America/New_York'
)
on conflict (user_id) do nothing;

insert into availability_blocks (counselor_id, weekday, start_min, end_min)
select counselor_id, weekday, start_min, end_min
from (
  values
    ('sample-amira', 1, 540, 1020),
    ('sample-amira', 2, 540, 1020),
    ('sample-amira', 3, 540, 1020),
    ('sample-amira', 4, 540, 1020),
    ('sample-amira', 5, 600, 840),
    ('sample-jonah', 1, 720, 1200),
    ('sample-jonah', 2, 720, 1200),
    ('sample-jonah', 3, 720, 1200),
    ('sample-jonah', 4, 480, 720),
    ('sample-jonah', 6, 600, 900),
    ('sample-leila', 2, 480, 840),
    ('sample-leila', 3, 480, 840),
    ('sample-leila', 4, 480, 840),
    ('sample-leila', 5, 480, 720),
    ('sample-leila', 0, 600, 840),
    ('sample-mateo', 1, 600, 1080),
    ('sample-mateo', 3, 600, 1080),
    ('sample-mateo', 5, 600, 1080),
    ('sample-mateo', 6, 540, 960)
) as v(counselor_id, weekday, start_min, end_min)
where not exists (
  select 1 from availability_blocks b
  where b.counselor_id = v.counselor_id and b.weekday = v.weekday and b.start_min = v.start_min
);

insert into appointments (
  member_id, counselor_id, starts_at, duration_min, hourly_rate_cents,
  ads_discount, amount_cents, pay_method, pay_status, share_mood, status, disclaimer_ack
)
select member_id, counselor_id, starts_at, duration_min, hourly_rate_cents,
  ads_discount, amount_cents, pay_method, pay_status, share_mood, status, disclaimer_ack
from (
  values
    ('sample-member', 'sample-amira', now() - interval '12 days', 60, 8000, false, 8000, 'apple_pay', 'authorized', true, 'completed', true),
    ('sample-member', 'sample-amira', now() - interval '40 days', 30, 8000, true, 3200, 'google_pay', 'authorized', false, 'completed', true),
    ('sample-member', 'sample-jonah', now() - interval '8 days', 60, 7000, false, 7000, 'apple_pay', 'authorized', true, 'completed', true),
    ('sample-member', 'sample-jonah', now() - interval '21 days', 90, 7000, true, 8400, 'google_pay', 'authorized', true, 'completed', true),
    ('sample-member', 'sample-leila', now() - interval '6 days', 60, 9500, false, 9500, 'apple_pay', 'authorized', true, 'completed', true),
    ('sample-member', 'sample-leila', now() - interval '18 days', 120, 9500, true, 15200, 'google_pay', 'authorized', false, 'completed', true),
    ('sample-member', 'sample-mateo', now() - interval '9 days', 60, 6000, false, 6000, 'apple_pay', 'authorized', true, 'completed', true),
    ('sample-member', 'sample-mateo', now() - interval '15 days', 30, 6000, false, 3000, 'google_pay', 'authorized', true, 'completed', true)
) as v(
  member_id, counselor_id, starts_at, duration_min, hourly_rate_cents,
  ads_discount, amount_cents, pay_method, pay_status, share_mood, status, disclaimer_ack
)
where not exists (
  select 1 from appointments a
  where a.member_id = 'sample-member' and a.counselor_id = v.counselor_id and a.starts_at = v.starts_at
);

insert into reviews (appointment_id, member_id, counselor_id, stars, comment, reviewer_name)
select a.id, a.member_id, a.counselor_id, v.stars, v.comment, v.reviewer_name
from (
  select
    counselor_id,
    stars,
    comment,
    reviewer_name,
    row_number() over (partition by counselor_id order by reviewer_name) as rn
  from (
    values
      ('sample-amira', 5, 'Amira let me talk about my father without rushing the silence. I left clearer, not fixed.', 'Jordan P.'),
      ('sample-amira', 4, 'Faith came up on my terms. Nothing was pushed.', 'Casey M.'),
      ('sample-jonah', 4, 'Practical and kind. We picked one morning habit and I actually kept it.', 'Sam K.'),
      ('sample-leila', 5, 'I was fried from work. She helped me see where the day was leaking, without a lecture.', 'Avery L.'),
      ('sample-leila', 3, 'Helpful on sleep, though the second hour felt long for what I needed.', 'Noah S.'),
      ('sample-mateo', 4, 'Gentle with a hard family story. I felt respected the whole hour.', 'Riley N.')
  ) as raw(counselor_id, stars, comment, reviewer_name)
) v
join (
  select
    id,
    member_id,
    counselor_id,
    row_number() over (partition by counselor_id order by starts_at desc) as rn
  from appointments
  where member_id = 'sample-member'
) a on a.counselor_id = v.counselor_id and a.rn = v.rn
where not exists (select 1 from reviews r where r.appointment_id = a.id);

