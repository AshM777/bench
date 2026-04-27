-- Run this in your Supabase SQL editor

-- Enable pgvector
create extension if not exists vector;

-- Drop and recreate (safe to re-run)
drop table if exists memory_items cascade;
drop function if exists match_memory cascade;

-- Memory table (1024 dims = Titan Embed V2 default)
create table memory_items (
  id text primary key,
  source_type text not null,
  source_ref text,
  content_text text not null,
  content_embedding vector(1024),
  author text,
  recorded_at timestamptz,
  channel_id text,
  created_at timestamptz default now()
);

-- Vector similarity search function
create or replace function match_memory(
  query_embedding vector(1024),
  match_count int default 8
)
returns table (
  id text,
  source_type text,
  source_ref text,
  content_text text,
  author text,
  recorded_at timestamptz,
  channel_id text,
  similarity float
)
language sql stable
as $$
  select
    id, source_type, source_ref, content_text, author, recorded_at, channel_id,
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
