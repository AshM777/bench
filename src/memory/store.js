import { createClient } from '@supabase/supabase-js';
import { embed } from './embed.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function upsertMemory({ id, sourceType, sourceRef, contentText, author, timestamp, channelId }) {
  const embedding = await embed(contentText);
  const { error } = await supabase.from('memory_items').upsert({
    id,
    source_type: sourceType,
    source_ref: sourceRef,
    content_text: contentText,
    content_embedding: embedding,
    author,
    recorded_at: timestamp,
    channel_id: channelId,
  });
  if (error) throw error;
}

export async function searchMemory(query, { limit = 8, channelId } = {}) {
  const queryEmbedding = await embed(query);

  let rpc = supabase.rpc('match_memory', {
    query_embedding: queryEmbedding,
    match_count: limit,
  });

  const { data, error } = await rpc;
  if (error) throw error;

  if (channelId) {
    return data.filter(r => !r.channel_id || r.channel_id === channelId);
  }
  return data;
}
