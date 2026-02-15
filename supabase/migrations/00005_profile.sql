-- Migration: 00005_profile
-- Creates profile table for user onboarding data

create table profile (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade unique,
    youtube_channel_id text,
    youtube_channel_url text,
    niche text not null default '',
    channel_goal text not null default '',
    ctas text[] not null default '{}',
    tone text not null default '',
    audience text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_profile_user_id on profile(user_id);

create trigger set_profile_updated_at
    before update on profile
    for each row execute function update_updated_at();

alter table profile enable row level security;

create policy "Users can view own profile"
    on profile for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert own profile"
    on profile for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update own profile"
    on profile for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
