import OpenAI from 'openai';
import type { TranslationResult } from '../types';
import { SYSTEM_PROMPT, parseResponse } from './llmService';

export async function translateWithOpenAI(
  code: string,
  apiKey: string,
): Promise<TranslationResult> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: code },
    ],
  });

  const text = response.choices[0]?.message.content ?? '{}';
  return parseResponse(text);
}
