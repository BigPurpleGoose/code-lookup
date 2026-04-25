import type { TranslationItem } from "../../types";
import TokenBadge from "./TokenBadge";
import { useTranslationContext } from "../../contexts/TranslationContext";

interface Props {
  item: TranslationItem;
  index: number;
}

export default function TranslationTableRow({ item, index }: Props) {
  const { hoveredItemIndex, setHoveredItemIndex } = useTranslationContext();
  const isEven = index % 2 === 0;
  const isHovered = hoveredItemIndex === index;

  return (
    <tr
      className="transition-colors cursor-default"
      onMouseEnter={() => setHoveredItemIndex(index)}
      onMouseLeave={() => setHoveredItemIndex(null)}
      style={{
        backgroundColor: isHovered
          ? `color-mix(in oklch, var(--${item.visualToken}) 12%, var(--color-surface))`
          : isEven
            ? "transparent"
            : "var(--color-surface-raised)",
      }}
    >
      {/* Semantic Role — with token-colored left border when hovered */}
      <td
        className="px-4 py-3 text-sm font-medium transition-all"
        style={{
          color: `var(--${item.visualToken})`,
          borderLeft: isHovered
            ? `3px solid var(--${item.visualToken})`
            : "3px solid transparent",
        }}
      >
        {item.semanticRole}
      </td>

      {/* Visual Token */}
      <td className="px-4 py-3">
        <TokenBadge token={item.visualToken} />
      </td>

      {/* Code Element */}
      <td className="px-4 py-3">
        <code
          className="text-sm font-mono px-2 py-0.5 rounded"
          style={{
            color: `var(--${item.visualToken})`,
            backgroundColor: `color-mix(in oklch, var(--${item.visualToken}) ${isHovered ? "20%" : "10%"}, transparent)`,
          }}
        >
          {item.codeElement}
        </code>
      </td>

      {/* Plain English */}
      <td
        className="px-4 py-3 text-sm leading-relaxed"
        style={{ color: "var(--color-text-primary)" }}
      >
        {item.plainEnglish}
      </td>
    </tr>
  );
}
