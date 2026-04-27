import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { JORDAN_CLASSIFICATION_PROMPT } from '../agents/jordan.js';

const anthropic = new AnthropicBedrock();

const CONFIDENCE_THRESHOLD = parseFloat(process.env.PROACTIVE_CONFIDENCE_THRESHOLD || '0.75');

export async function shouldRespond(message) {
  const response = await anthropic.messages.create({
    model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    max_tokens: 128,
    system: JORDAN_CLASSIFICATION_PROMPT,
    messages: [{ role: 'user', content: message }],
  });

  try {
    const parsed = JSON.parse(response.content[0].text);
    return {
      shouldRespond: parsed.should_respond && parsed.confidence >= CONFIDENCE_THRESHOLD,
      confidence: parsed.confidence,
      reason: parsed.reason,
    };
  } catch {
    return { shouldRespond: false, confidence: 0, reason: 'parse error' };
  }
}
