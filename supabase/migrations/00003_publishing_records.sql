-- Publishing records table
create table publishing_records (
    id              uuid primary key default gen_random_uuid(),
    content_id      uuid not null references content(id) on delete cascade,
    platform        text not null,
    external_id     text,
    external_url    text,
    status          text not null default 'pending'
                    check (status in ('pending', 'published', 'failed')),
    error           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    unique (content_id, platform)
);

create index idx_publishing_records_content_id on publishing_records (content_id);

-- Reuse existing updated_at trigger
create trigger set_updated_at before update on publishing_records
    for each row execute function update_updated_at();

-- RLS: publishing_records (read-only via content ownership)
alter table publishing_records enable row level security;

create policy "Users view own publishing records"
    on publishing_records for select
    using (
        exists (
            select 1 from content
            where content.id = publishing_records.content_id
            and content.user_id = auth.uid()
        )
    );
