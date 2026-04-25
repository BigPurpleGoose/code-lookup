import { useState } from "react";
import { useTranslationContext } from "../../contexts/TranslationContext";

export default function APIKeyInput() {
  const { provider, apiKeys, setApiKey } = useTranslationContext();
  const [visible, setVisible] = useState(false);

  if (provider === "local") {
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: "var(--color-syntax-value)" }}
        />
        <span
          className="text-xs italic"
          style={{ color: "var(--color-text-muted)" }}
        >
          No API key needed
        </span>
      </div>
    );
  }

  const currentKey = apiKeys[provider];
  const hasKey = currentKey.trim().length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Status dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        title={hasKey ? "API key set" : "No API key"}
        style={{
          backgroundColor: hasKey
            ? "var(--color-syntax-value)"
            : "oklch(0.65 0.20 25)",
        }}
      />

      <div className="relative flex items-center">
        <input
          type={visible ? "text" : "password"}
          value={currentKey}
          onChange={(e) => setApiKey(provider, e.target.value)}
          placeholder={`${provider} API key…`}
          aria-label={`API key for ${provider}`}
          className="text-xs bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-2 py-1.5 pr-8 w-32 sm:w-48 focus:outline-none focus:border-[var(--color-syntax-primary)]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide key" : "Show key"}
          className="absolute right-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          {visible ? "🙈" : "👁"}
        </button>
      </div>
    </div>
  );
}
