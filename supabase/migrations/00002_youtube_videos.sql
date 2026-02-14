-- YouTube videos table
create table youtube_videos (
    id              uuid primary key default gen_random_uuid(),
    content_id      uuid references content(id) on delete set null,
    video_id        text not null unique,
    title           text not null,
    description     text,
    published_at    timestamptz,
    transcript      text,
    created_at      timestamptz not null default now()
);

create index idx_youtube_videos_video_id on youtube_videos (video_id);
create index idx_youtube_videos_content_id on youtube_videos (content_id);

-- RLS: youtube_videos (read-only via content ownership)
alter table youtube_videos enable row level security;

create policy "Users view own videos"
    on youtube_videos for select
    using (
        exists (
            select 1 from content
            where content.id = youtube_videos.content_id
            and content.user_id = auth.uid()
        )
    );

-- Add columns to content table
alter table content add column auto_publish boolean not null default false;
alter table content add column source text not null default 'manual';
