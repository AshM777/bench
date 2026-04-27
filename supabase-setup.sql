-- Run this in your Supabase SQL editor

-- Enable pgvector
create extension if not exists vector;

-- Memory table
create table if not exists memory_items (
  id text primary key,
  source_type text not null,   -- slack_message | google_sheet
  source_ref text,             -- thread_ts or spreadsheet_id
  content_text text not null,
  content_embedding vector(1536),
  author text,
  timestamp timestamptz,
  channel_id text,
  created_at timestamptz default now()
);

-- Vector similarity search function
create or replace function match_memory(
  query_embedding vector(1536),
  match_count int default 8
)
returns table (
  id text,
  source_type text,
  source_ref text,
  content_text text,
  author text,
  timestamp timestamptz,
  channel_id text,
  similarity float
)
language sql stable
as $$
  select
    id, source_type, source_ref, content_text, author, timestamp, channel_id,
    1 - (content_embedding <=> query_embedding) as similarity
  from memory_items
  where content_embedding is not null
  order by content_embedding <=> query_embedding
  limit match_count;
$$;

-- Index for fast vector search
create index if not exists memory_items_embedding_idx
  on memory_items using ivfflat (content_embedding vector_cosine_ops)
  with (lists = 100);
