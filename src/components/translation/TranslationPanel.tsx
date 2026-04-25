import { useTranslationContext } from "../../contexts/TranslationContext";
import TranslationTable from "./TranslationTable";
import SkeletonLoader from "./SkeletonLoader";

export default function TranslationPanel() {
  const { translationResult, isLoading, error } = useTranslationContext();

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="shrink-0 flex items-center px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          Translation
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <SkeletonLoader />}

        {!isLoading && error && (
          <div
            className="m-4 p-4 rounded-lg border animate-fade-in"
            style={{
              borderColor: "oklch(0.65 0.20 25)",
              backgroundColor:
                "color-mix(in oklch, oklch(0.65 0.20 25) 10%, transparent)",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "oklch(0.75 0.18 25)" }}
            >
              Error
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {error}
            </p>
          </div>
        )}

        {!isLoading && !error && translationResult && (
          <TranslationTable result={translationResult} />
        )}

        {!isLoading && !error && !translationResult && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            >
              🔍
            </div>
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                No translation yet
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Paste code on the left and click Translate to see it explained
                here.
              </p>
            </div>

            {/* Color legend */}
            <div
              className="mt-4 p-4 rounded-lg w-full max-w-sm text-left"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            >
              <p
                className="text-xs font-semibold mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                COLOR LEGEND
              </p>
              <div className="space-y-2">
                {(
                  [
                    ["color-syntax-primary", "Parent Components"],
                    ["color-syntax-secondary", "Sub-Components"],
                    ["color-syntax-accent", "Actions / Props"],
                    ["color-syntax-value", "Values / Literals"],
                    ["color-syntax-muted", "Boilerplate"],
                  ] as const
                ).map(([token, label]) => (
                  <div key={token} className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: `var(--${token})` }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
