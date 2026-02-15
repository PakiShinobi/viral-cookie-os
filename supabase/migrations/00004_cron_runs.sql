-- Migration: 00004_cron_runs
-- Creates cron_runs table for tracking cron job execution

create table cron_runs (
    id uuid primary key default gen_random_uuid(),
    route text not null,
    status text not null default 'running'
        check (status in ('running', 'success', 'failed')),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    duration_ms integer,
    summary jsonb not null default '{}'::jsonb,
    error text,
    created_at timestamptz not null default now()
);

-- Indexes for querying by route and recency
create index idx_cron_runs_route_started_at
    on cron_runs (route, started_at desc);

create index idx_cron_runs_status_started_at
    on cron_runs (status, started_at desc);

-- RLS: authenticated users can read, service-role handles writes
alter table cron_runs enable row level security;

create policy "Authenticated users can view cron runs"
    on cron_runs for select
    to authenticated
    using (true);
