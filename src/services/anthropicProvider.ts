import Anthropic from '@anthropic-ai/sdk';
import type { TranslationResult } from '../types';
import { SYSTEM_PROMPT, parseResponse } from './llmService';

export async function translateWithAnthropic(
  code: string,
  apiKey: string,
): Promise<TranslationResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: code }],
  });

  const block = response.content[0];
  const text = block.type === 'text' ? block.text : '{}';
  return parseResponse(text);
}
