import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { searchMemory } from '../memory/store.js';
import { JORDAN_SYSTEM_PROMPT } from '../agents/jordan.js';

const anthropic = new AnthropicBedrock();

export async function buildResponse(userMessage, { channelId, threadContext = [] } = {}) {
  const relevant = await searchMemory(userMessage, { limit: 8, channelId });

  const contextBlock = relevant.length
    ? `Relevant context from your memory:\n\n${relevant.map(r =>
        `[${r.source_type} | ${r.timestamp?.slice(0, 10) ?? ''}]\n${r.content_text}`
      ).join('\n\n---\n\n')}`
    : '';

  const messages = [
    ...threadContext,
    {
      role: 'user',
      content: contextBlock
        ? `${contextBlock}\n\n---\n\nMessage to respond to:\n${userMessage}`
        : userMessage,
    },
  ];

  const response = await anthropic.messages.create({
    model: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    max_tokens: 1024,
    system: JORDAN_SYSTEM_PROMPT,
    messages,
  });

  return response.content[0].text;
}
