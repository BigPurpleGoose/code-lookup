import { PROVIDER_LABELS, type LLMProvider } from "../../types";
import { useTranslationContext } from "../../contexts/TranslationContext";

const PROVIDERS: LLMProvider[] = ["local", "gemini", "openai", "anthropic"];

export default function LLMSelector() {
  const { provider, setProvider } = useTranslationContext();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="llm-selector"
        className="text-xs text-[var(--color-text-muted)] whitespace-nowrap"
      >
        Model
      </label>
      <select
        id="llm-selector"
        value={provider}
        onChange={(e) => setProvider(e.target.value as LLMProvider)}
        className="text-xs bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--color-syntax-primary)]"
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>
            {PROVIDER_LABELS[p]}
          </option>
        ))}
      </select>
    </div>
  );
}
