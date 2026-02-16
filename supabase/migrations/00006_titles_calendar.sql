-- Migration: 00006_titles_calendar
-- Creates title_ideas and calendar_slots tables for Phase 5B

-- ===========================
-- title_ideas
-- ===========================

create table title_ideas (
    id                      uuid primary key default gen_random_uuid(),
    user_id                 uuid not null references auth.users(id) on delete cascade,
    title                   text not null,
    video_style             text not null default 'how_to'
                            check (video_style in ('documentary','how_to','news','opinion','breakdown','story','educational')),
    target_duration_minutes integer,
    status                  text not null default 'draft'
                            check (status in ('draft','recorded','published','deleted')),
    content_id              uuid references content(id) on delete set null,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create index idx_title_ideas_user_created on title_ideas(user_id, created_at desc);

create trigger set_title_ideas_updated_at
    before update on title_ideas
    for each row execute function update_updated_at();

alter table title_ideas enable row level security;

create policy "Users can view own title ideas"
    on title_ideas for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert own title ideas"
    on title_ideas for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update own title ideas"
    on title_ideas for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ===========================
-- calendar_slots
-- ===========================

create table calendar_slots (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    slot_date       date not null,
    title_idea_id   uuid references title_ideas(id) on delete set null,
    content_id      uuid references content(id) on delete set null,
    status          text not null default 'planned'
                    check (status in ('planned','in_progress','done','skipped')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index idx_calendar_slots_user_date on calendar_slots(user_id, slot_date);

create trigger set_calendar_slots_updated_at
    before update on calendar_slots
    for each row execute function update_updated_at();

alter table calendar_slots enable row level security;

create policy "Users can view own calendar slots"
    on calendar_slots for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert own calendar slots"
    on calendar_slots for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update own calendar slots"
    on calendar_slots for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
