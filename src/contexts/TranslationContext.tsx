import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { LLMProvider, APIKeys, TranslationResult } from "../types";
import { translate as callLLM } from "../services/llmService";

interface TranslationContextValue {
  code: string;
  provider: LLMProvider;
  apiKeys: APIKeys;
  translationResult: TranslationResult | null;
  isLoading: boolean;
  error: string | null;
  hoveredItemIndex: number | null;
  setCode: (code: string) => void;
  setProvider: (provider: LLMProvider) => void;
  setApiKey: (provider: LLMProvider, key: string) => void;
  setHoveredItemIndex: (index: number | null) => void;
  translate: () => Promise<void>;
  clearResult: () => void;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState("");
  const [provider, setProvider] = useState<LLMProvider>("gemini");
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    gemini: import.meta.env.VITE_GEMINI_API_KEY ?? "",
    openai: import.meta.env.VITE_OPENAI_API_KEY ?? "",
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
  });
  const [translationResult, setTranslationResult] =
    useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);

  const setApiKey = useCallback((p: LLMProvider, key: string) => {
    setApiKeys((prev) => ({ ...prev, [p]: key }));
  }, []);

  const translate = useCallback(async () => {
    if (!code.trim()) {
      setError("Please paste some code first.");
      return;
    }
    const key = provider !== "local" ? apiKeys[provider] : "";
    if (provider !== "local" && !key.trim()) {
      setError(
        `No API key found for ${provider}. Add it in the key field above.`,
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await callLLM(code, provider, key);
      setTranslationResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setTranslationResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [code, provider, apiKeys]);

  const clearResult = useCallback(() => {
    setTranslationResult(null);
    setError(null);
  }, []);

  return (
    <TranslationContext.Provider
      value={{
        code,
        provider,
        apiKeys,
        translationResult,
        isLoading,
        error,
        hoveredItemIndex,
        setCode,
        setProvider,
        setApiKey,
        setHoveredItemIndex,
        translate,
        clearResult,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTranslationContext(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx)
    throw new Error(
      "useTranslationContext must be used within TranslationProvider",
    );
  return ctx;
}
