-- Minimal schema expected by the Next.js serverless API routes.
-- Run this in Supabase SQL Editor (or psql) for your project.

create extension if not exists pgcrypto;

-- If you already created tables earlier with a different schema (for example
-- `complaints.location_id` being NOT NULL), this file also applies a small
-- migration so the current API routes can insert rows using `location` text.

create table if not exists public.cleaning_staff (
  id uuid primary key default gen_random_uuid(),
  assigned_floor text not null,
  phone_number text not null
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location_type text not null,
  staff_floor text not null
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  location_type text not null,
  issue text not null,
  staff_floor text not null,
  photo_url text,
  created_at timestamptz not null default now(),
  completed_by uuid references public.cleaning_staff(id),
  completed_at timestamptz
);

-- Migration for existing `public.complaints` tables with mismatched columns.
alter table public.complaints add column if not exists location text;
alter table public.complaints add column if not exists location_type text;
alter table public.complaints add column if not exists issue text;
alter table public.complaints add column if not exists staff_floor text;
alter table public.complaints add column if not exists photo_url text;
alter table public.complaints add column if not exists created_at timestamptz default now();
alter table public.complaints add column if not exists completed_by uuid;
alter table public.complaints add column if not exists completed_at timestamptz;

-- Migration for existing `public.locations` tables with mismatched columns.
alter table public.locations add column if not exists name text;
alter table public.locations add column if not exists location_type text;
alter table public.locations add column if not exists staff_floor text;

-- If your table has `location_id` and it's NOT NULL, allow it to be nullable
-- so inserts that use `location` (text) work without requiring a separate
-- locations table.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'complaints'
      and column_name = 'location_id'
  ) then
    execute 'alter table public.complaints alter column location_id drop not null';
  end if;
end $$;

create index if not exists complaints_created_at_idx on public.complaints (created_at desc);
create index if not exists complaints_completed_at_idx on public.complaints (completed_at);
create index if not exists cleaning_staff_assigned_floor_idx on public.cleaning_staff (assigned_floor);
create index if not exists locations_staff_floor_idx on public.locations (staff_floor);
create index if not exists locations_type_idx on public.locations (location_type);
