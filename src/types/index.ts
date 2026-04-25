export type LLMProvider = 'local' | 'gemini' | 'openai' | 'anthropic';

export type VisualToken =
  | 'color-syntax-primary'
  | 'color-syntax-secondary'
  | 'color-syntax-accent'
  | 'color-syntax-muted'
  | 'color-syntax-value';

export interface TranslationItem {
  semanticRole: string;
  visualToken: VisualToken;
  codeElement: string;
  plainEnglish: string;
  /** Raw text to search for in the editor when this row is hovered. */
  searchText?: string;
}

export interface TranslationResult {
  language: string;
  items: TranslationItem[];
}

export interface APIKeys {
  gemini: string;
  openai: string;
  anthropic: string;
}

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  local:     'Local (No API Key)',
  gemini:    'Gemini (Google)',
  openai:    'GPT-4o (OpenAI)',
  anthropic: 'Claude (Anthropic)',
};
