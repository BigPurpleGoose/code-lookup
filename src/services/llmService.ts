import type { LLMProvider, TranslationResult, TranslationItem, VisualToken } from '../types';
import { translateWithGemini } from './geminiProvider';
import { translateWithOpenAI } from './openaiProvider';
import { translateWithAnthropic } from './anthropicProvider';
import { translateLocally } from './localProvider';

export const SYSTEM_PROMPT = `You are a code translator for visual learners. Your job is to analyze a code snippet and explain it in plain English so that a non-programmer can understand what it does.

Break the code into its meaningful semantic elements and return ONLY a valid JSON object — no markdown fences, no explanation, just raw JSON — with this exact structure:

{
  "language": "detected language name (e.g. JavaScript, TypeScript, Python, HTML, CSS, SQL)",
  "items": [
    {
      "semanticRole": "short label for the semantic category (e.g. Parent Component, Function, Variable, Keyword, Value)",
      "visualToken": "one of: color-syntax-primary | color-syntax-secondary | color-syntax-accent | color-syntax-muted | color-syntax-value",
      "codeElement": "the exact concise code snippet being described",
      "plainEnglish": "a clear, friendly explanation for someone who has never coded — use everyday analogies"
    }
  ]
}

Token assignment rules:
- color-syntax-primary:   Main containers, parent elements, top-level structures, class/component definitions
- color-syntax-secondary: Child/sub-components, nested blocks, inner methods or sections
- color-syntax-accent:    Attributes, props, function calls, operators, keywords, configuration settings
- color-syntax-value:     String values, numbers, booleans, data literals, variable assignments
- color-syntax-muted:     Punctuation, brackets, closing tags, generic boilerplate, import/export glue

Guidelines:
1. Produce 4–12 items depending on code complexity; group closely related tokens into one item
2. Write plainEnglish using relatable analogies (e.g. "Think of this like a recipe step")
3. codeElement should be a short representative snippet, not an entire long line
4. Return ONLY the JSON object — nothing else`;

const VALID_TOKENS = new Set<VisualToken>([
  'color-syntax-primary',
  'color-syntax-secondary',
  'color-syntax-accent',
  'color-syntax-muted',
  'color-syntax-value',
]);

function sanitizeToken(token: string): VisualToken {
  return VALID_TOKENS.has(token as VisualToken)
    ? (token as VisualToken)
    : 'color-syntax-muted';
}

export function parseResponse(text: string): TranslationResult {
  // Strip markdown code fences if the LLM wrapped its response
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('The AI returned an invalid response. Please try again.');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).language !== 'string' ||
    !Array.isArray((parsed as Record<string, unknown>).items)
  ) {
    throw new Error('Unexpected response format from the AI. Please try again.');
  }

  const raw = parsed as { language: string; items: Record<string, unknown>[] };

  const items: TranslationItem[] = raw.items.map((item) => ({
    semanticRole: String(item.semanticRole ?? 'Unknown'),
    visualToken:  sanitizeToken(String(item.visualToken ?? '')),
    codeElement:  String(item.codeElement ?? ''),
    plainEnglish: String(item.plainEnglish ?? ''),
    searchText:   String(item.codeElement ?? '').trim() || undefined,
  }));

  return { language: raw.language, items };
}

export async function translate(
  code: string,
  provider: LLMProvider,
  apiKey: string,
): Promise<TranslationResult> {
  switch (provider) {
    case 'local':     return translateLocally(code);
    case 'gemini':    return translateWithGemini(code, apiKey);
    case 'openai':    return translateWithOpenAI(code, apiKey);
    case 'anthropic': return translateWithAnthropic(code, apiKey);
  }
}
