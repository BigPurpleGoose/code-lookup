import type { VisualToken } from "../../types";

const TOKEN_LABELS: Record<VisualToken, string> = {
  "color-syntax-primary": "Primary",
  "color-syntax-secondary": "Secondary",
  "color-syntax-accent": "Accent",
  "color-syntax-muted": "Muted",
  "color-syntax-value": "Value",
};

interface Props {
  token: VisualToken;
}

export default function TokenBadge({ token }: Props) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium font-mono whitespace-nowrap border"
      style={{
        color: `var(--${token})`,
        borderColor: `var(--${token})`,
        backgroundColor: `color-mix(in oklch, var(--${token}) 12%, transparent)`,
      }}
    >
      {TOKEN_LABELS[token]}
    </span>
  );
}
