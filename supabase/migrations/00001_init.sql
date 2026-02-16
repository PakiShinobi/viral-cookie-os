-- Content table
create table content (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    title           text not null,
    content_type    text not null default 'video'
                    check (content_type in ('video', 'podcast', 'blog_post', 'short_form', 'newsletter')),
    stage           text not null default 'idea'
                    check (stage in ('idea', 'brief', 'script', 'record', 'edit', 'review', 'publish', 'distribute', 'archived')),
    brief           text,
    script          text,
    blog_body       text,
    seo_title       text,
    seo_description text,
    target_keywords text[],
    tags            text[] default '{}',
    due_date        date,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index idx_content_user on content (user_id);
create index idx_content_stage on content (user_id, stage);

-- AI generation logs
create table ai_generation_logs (
    id              uuid primary key default gen_random_uuid(),
    content_id      uuid references content(id) on delete set null,
    user_id         uuid not null references auth.users(id),
    operation       text not null
                    check (operation in ('expand_idea', 'generate_script', 'generate_blog', 'refine')),
    model           text not null,
    input_tokens    integer not null,
    output_tokens   integer not null,
    accepted        boolean,
    created_at      timestamptz not null default now()
);

create index idx_ai_logs_user on ai_generation_logs (user_id, created_at);

-- Updated at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on content
    for each row execute function update_updated_at();

-- RLS: content
alter table content enable row level security;

create policy "Users can view own content"
    on content for select
    using (auth.uid() = user_id);

create policy "Users can insert own content"
    on content for insert
    with check (auth.uid() = user_id);

create policy "Users can update own content"
    on content for update
    using (auth.uid() = user_id);

create policy "Users can delete own content"
    on content for delete
    using (auth.uid() = user_id);

-- RLS: ai_generation_logs
alter table ai_generation_logs enable row level security;

create policy "Users can view own ai logs"
    on ai_generation_logs for select
    using (auth.uid() = user_id);

create policy "Users can insert own ai logs"
    on ai_generation_logs for insert
    with check (auth.uid() = user_id);
