import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TranslationResult } from '../types';
import { SYSTEM_PROMPT, parseResponse } from './llmService';

export async function translateWithGemini(
  code: string,
  apiKey: string,
): Promise<TranslationResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(code);
  const text = result.response.text();
  return parseResponse(text);
}
