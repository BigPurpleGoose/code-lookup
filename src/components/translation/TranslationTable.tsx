import type { TranslationResult } from "../../types";
import TranslationTableRow from "./TranslationTableRow";

interface Props {
  result: TranslationResult;
}

export default function TranslationTable({ result }: Props) {
  return (
    <div className="animate-fade-in overflow-x-auto">
      {/* Language badge */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">
          Detected language:
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: "var(--color-surface-raised)",
            color: "var(--color-text-secondary)",
          }}
        >
          {result.language}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">·</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {result.items.length} elements
        </span>
      </div>

      <table
        className="w-full min-w-[600px] border-collapse text-left"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          <col style={{ width: "15%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "55%" }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            {[
              "Semantic Role",
              "Visual Token",
              "Code Element",
              "Plain English",
            ].map((heading) => (
              <th
                key={heading}
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ borderBottom: "1px solid var(--color-border)" }}>
          {result.items.map((item, i) => (
            <TranslationTableRow key={i} item={item} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
