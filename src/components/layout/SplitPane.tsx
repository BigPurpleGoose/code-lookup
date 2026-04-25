import type { ReactNode } from "react";

interface Props {
  left: ReactNode;
  right: ReactNode;
}

export default function SplitPane({ left, right }: Props) {
  return (
    <div className="grid flex-1 overflow-hidden grid-rows-[2fr_3fr] md:grid-rows-1 md:grid-cols-2">
      {/* Left pane — editor */}
      <div
        className="overflow-hidden border-b md:border-b-0 md:border-r border-[var(--color-border)]"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {left}
      </div>

      {/* Right pane — translation */}
      <div
        className="overflow-auto"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        {right}
      </div>
    </div>
  );
}
