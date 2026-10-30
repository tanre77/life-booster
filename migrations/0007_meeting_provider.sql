-- Video provider preference and the link for a visit.
-- This file does not read or store journal text.

alter table profiles
  add column if not exists meeting_provider text not null default 'google_meet'
  constraint profiles_meeting_provider_check check (meeting_provider in ('zoom', 'google_meet'));

create table if not exists visit_meetings (
  appointment_id integer primary key references appointments (id) on delete cascade,
  provider text not null check (provider in ('zoom', 'google_meet')),
  join_url text not null check (char_length(join_url) between 12 and 2000),
  external_id text not null default '',
  source text not null check (source in ('api', 'instant', 'pasted', 'demo')),
  created_by text not null,
  created_at timestamptz not null default now()
);
