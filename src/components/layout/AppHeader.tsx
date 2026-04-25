import LLMSelector from "../settings/LLMSelector";
import APIKeyInput from "../settings/APIKeyInput";

export default function AppHeader() {
  return (
    <header
      className="shrink-0 flex flex-wrap items-center justify-between px-5 gap-3 border-b border-[var(--color-border)]"
      style={{
        minHeight: "var(--header-height)",
        paddingBlock: "0.5rem",
        backgroundColor: "var(--color-surface)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
          style={{ backgroundColor: "var(--color-syntax-primary)" }}
        >
          <span style={{ color: "var(--color-bg)" }}>⟨/⟩</span>
        </div>
        <div>
          <h1
            className="text-sm font-semibold leading-none"
            style={{ color: "var(--color-text-primary)" }}
          >
            Code for Visual Learners
          </h1>
          <p
            className="text-[11px] leading-none mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Translate any code into plain English
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <LLMSelector />
        <div
          className="w-px h-5 shrink-0"
          style={{ backgroundColor: "var(--color-border)" }}
          aria-hidden
        />
        <APIKeyInput />
      </div>
    </header>
  );
}
