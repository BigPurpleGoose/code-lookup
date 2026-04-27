import { useEffect, useRef, useState } from "react";
import {
  Compartment,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { EditorView, Decoration, type DecorationSet } from "@codemirror/view";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { basicSetup } from "codemirror";
import { oneDarkTheme } from "@codemirror/theme-one-dark";
import { tags } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { sql } from "@codemirror/lang-sql";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { graphql } from "cm6-graphql";
import { useTranslationContext } from "../../contexts/TranslationContext";
import { useEditorRef } from "../../contexts/EditorRefContext";

type EditorLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "html"
  | "css"
  | "sql"
  | "json"
  | "yaml"
  | "toml"
  | "markdown"
  | "xml"
  | "bash"
  | "graphql"
  | "none";

const LANGUAGE_OPTIONS: { value: EditorLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript / JSX" },
  { value: "typescript", label: "TypeScript / TSX" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
  { value: "markdown", label: "Markdown" },
  { value: "xml", label: "XML" },
  { value: "bash", label: "Bash / Shell" },
  { value: "graphql", label: "GraphQL" },
  { value: "none", label: "Plain text" },
];

function detectedLangToEditorLang(detected: string): EditorLanguage {
  switch (detected.toLowerCase()) {
    case "javascript":
      return "javascript";
    case "typescript":
      return "typescript";
    case "python":
      return "python";
    case "html":
      return "html";
    case "css":
      return "css";
    case "sql":
      return "sql";
    case "json":
      return "json";
    case "yaml":
      return "yaml";
    case "toml":
      return "toml";
    case "markdown":
      return "markdown";
    case "xml":
      return "xml";
    case "bash":
      return "bash";
    case "graphql":
      return "graphql";
    default:
      return "none";
  }
}

function getLanguageExtension(lang: EditorLanguage) {
  switch (lang) {
    case "javascript":
      return javascript({ jsx: true });
    case "typescript":
      return javascript({ jsx: true, typescript: true });
    case "python":
      return python();
    case "html":
      return html();
    case "css":
      return css();
    case "sql":
      return sql();
    case "json":
      return json();
    case "markdown":
      return markdown();
    case "xml":
      return xml();
    case "yaml":
      return yaml();
    case "toml":
      return StreamLanguage.define(toml);
    case "bash":
      return StreamLanguage.define(shell);
    case "graphql":
      return graphql();
    case "none":
      return [];
  }
}

// ─── Syntax highlight theme — maps lezer tags → our 5 OKLCH token vars ───────
// Uses the same CSS variables as the translation table so colours are in sync.
const tokenHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    // Keywords → accent (amber)
    { tag: tags.keyword, color: "var(--color-syntax-accent)" },
    { tag: tags.controlKeyword, color: "var(--color-syntax-accent)" },
    { tag: tags.moduleKeyword, color: "var(--color-syntax-accent)" },
    { tag: tags.operatorKeyword, color: "var(--color-syntax-accent)" },
    // Function names & definitions → primary (blue-violet)
    {
      tag: tags.function(tags.variableName),
      color: "var(--color-syntax-primary)",
      fontWeight: "600",
    },
    {
      tag: tags.function(tags.name),
      color: "var(--color-syntax-primary)",
      fontWeight: "600",
    },
    {
      tag: tags.definition(tags.variableName),
      color: "var(--color-syntax-primary)",
      fontWeight: "600",
    },
    {
      tag: tags.definition(tags.name),
      color: "var(--color-syntax-primary)",
      fontWeight: "600",
    },
    {
      tag: tags.className,
      color: "var(--color-syntax-primary)",
      fontWeight: "600",
    },
    { tag: tags.macroName, color: "var(--color-syntax-primary)" },
    // Strings, numbers, booleans, literals → value (green)
    { tag: tags.string, color: "var(--color-syntax-value)" },
    { tag: tags.special(tags.string), color: "var(--color-syntax-value)" },
    { tag: tags.number, color: "var(--color-syntax-value)" },
    { tag: tags.bool, color: "var(--color-syntax-value)" },
    { tag: tags.null, color: "var(--color-syntax-value)" },
    { tag: tags.literal, color: "var(--color-syntax-value)" },
    { tag: tags.regexp, color: "var(--color-syntax-value)" },
    // Comments → muted
    {
      tag: tags.comment,
      color: "var(--color-syntax-muted)",
      fontStyle: "italic",
    },
    {
      tag: tags.lineComment,
      color: "var(--color-syntax-muted)",
      fontStyle: "italic",
    },
    {
      tag: tags.blockComment,
      color: "var(--color-syntax-muted)",
      fontStyle: "italic",
    },
    {
      tag: tags.docComment,
      color: "var(--color-syntax-muted)",
      fontStyle: "italic",
    },
    // Types, properties, attributes, namespaces → secondary (teal)
    { tag: tags.typeName, color: "var(--color-syntax-secondary)" },
    { tag: tags.typeOperator, color: "var(--color-syntax-secondary)" },
    { tag: tags.propertyName, color: "var(--color-syntax-secondary)" },
    {
      tag: tags.definition(tags.propertyName),
      color: "var(--color-syntax-secondary)",
    },
    { tag: tags.attributeName, color: "var(--color-syntax-secondary)" },
    { tag: tags.namespace, color: "var(--color-syntax-secondary)" },
    { tag: tags.labelName, color: "var(--color-syntax-secondary)" },
    // Operators / punctuation — neutral
    { tag: tags.operator, color: "var(--color-text-secondary)" },
    { tag: tags.punctuation, color: "var(--color-text-secondary)" },
    { tag: tags.separator, color: "var(--color-text-secondary)" },
    { tag: tags.bracket, color: "var(--color-text-secondary)" },
    { tag: tags.angleBracket, color: "var(--color-text-secondary)" },
    // HTML / XML tag names → primary (blue-violet)
    {
      tag: tags.tagName,
      color: "var(--color-syntax-primary)",
      fontWeight: "600",
    },
    // Generic named identifiers (SQL columns, shell commands, etc.) — readable
    { tag: tags.name, color: "var(--color-text-primary)" },
    // Atoms (true/false/null in some grammars) → value (green)
    { tag: tags.atom, color: "var(--color-syntax-value)" },
    // Escape sequences inside strings → accent
    { tag: tags.escape, color: "var(--color-syntax-accent)" },
    // Markdown-specific tags
    {
      tag: tags.heading,
      color: "var(--color-syntax-primary)",
      fontWeight: "700",
    },
    {
      tag: tags.strong,
      color: "var(--color-syntax-accent)",
      fontWeight: "700",
    },
    {
      tag: tags.emphasis,
      color: "var(--color-syntax-secondary)",
      fontStyle: "italic",
    },
    { tag: tags.link, color: "var(--color-syntax-secondary)" },
    { tag: tags.monospace, color: "var(--color-syntax-value)" },
    { tag: tags.url, color: "var(--color-syntax-value)" },
    {
      tag: tags.quote,
      color: "var(--color-syntax-muted)",
      fontStyle: "italic",
    },
    { tag: tags.list, color: "var(--color-syntax-accent)" },
    // Variable names — keep readable
    { tag: tags.variableName, color: "var(--color-text-primary)" },
    { tag: tags.self, color: "var(--color-syntax-accent)" },
    // CSS units (px, em, %) and named colors → value (green)
    { tag: tags.unit, color: "var(--color-syntax-value)" },
    { tag: tags.color, color: "var(--color-syntax-value)" },
    // Decorators (@Component, @Injectable) → accent (amber)
    { tag: tags.meta, color: "var(--color-syntax-accent)" },
    // HTML <!DOCTYPE> and XML <?xml?> → muted
    {
      tag: tags.documentMeta,
      color: "var(--color-syntax-muted)",
      fontStyle: "italic",
    },
    { tag: tags.processingInstruction, color: "var(--color-syntax-muted)" },
    // Markdown --- horizontal rule → muted
    { tag: tags.contentSeparator, color: "var(--color-syntax-muted)" },
    // Character literals → value (green)
    { tag: tags.character, color: "var(--color-syntax-value)" },
    // Markdown ~~strikethrough~~ → muted with line-through
    {
      tag: tags.strikethrough,
      color: "var(--color-syntax-muted)",
      textDecoration: "line-through",
    },
    // Diff annotations
    { tag: tags.inserted, color: "var(--color-syntax-value)" },
    {
      tag: tags.deleted,
      color: "var(--color-syntax-muted)",
      textDecoration: "line-through",
    },
    { tag: tags.changed, color: "var(--color-syntax-accent)" },
    // Invalid / unrecognized tokens → error red
    { tag: tags.invalid, color: "oklch(0.65 0.20 25)" },
  ]),
);

// ─── Decoration StateField — highlights searchText occurrences in the editor ──
const setHighlightEffect = StateEffect.define<{
  text: string;
  tokenVar: string;
} | null>();

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const effect of tr.effects) {
      if (!effect.is(setHighlightEffect)) continue;
      if (!effect.value || !effect.value.text.trim()) return Decoration.none;
      const { text } = effect.value;
      const doc = tr.state.doc;
      const ranges: { from: number; to: number }[] = [];
      let pos = 0;
      const full = doc.toString();
      while (pos < full.length) {
        const idx = full.indexOf(text, pos);
        if (idx === -1) break;
        ranges.push({ from: idx, to: idx + text.length });
        pos = idx + text.length;
      }
      if (ranges.length === 0) return Decoration.none;
      return Decoration.set(
        ranges.map((r) =>
          Decoration.mark({ class: "cm-token-highlight" }).range(r.from, r.to),
        ),
        true,
      );
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

const editorTheme = EditorView.theme({
  "&": { backgroundColor: "var(--color-surface)", height: "100%" },
  ".cm-gutters": {
    backgroundColor: "var(--color-surface)",
    borderRight: "1px solid var(--color-border)",
    color: "var(--color-text-muted)",
  },
  ".cm-activeLineGutter": { backgroundColor: "var(--color-surface-raised)" },
  ".cm-activeLine": { backgroundColor: "var(--color-surface-raised)" },
  ".cm-selectionBackground": {
    backgroundColor: "oklch(0.40 0.10 264) !important",
  },
});

export default function CodeInputPanel() {
  const {
    code,
    setCode,
    translate,
    isLoading,
    hoveredItemIndex,
    translationResult,
  } = useTranslationContext();
  const { setEditorView } = useEditorRef();
  const [selectedLang, setSelectedLang] =
    useState<EditorLanguage>("javascript");

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompartment = useRef(new Compartment());

  // Mount editor once
  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [
          basicSetup,
          oneDarkTheme,
          tokenHighlightStyle,
          editorTheme,
          highlightField,
          langCompartment.current.of(getLanguageExtension("javascript")),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setCode(update.state.doc.toString());
            }
          }),
          EditorView.lineWrapping,
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    setEditorView(view);
    return () => {
      view.destroy();
      setEditorView(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-switch CodeMirror language when translation detects a different language
  useEffect(() => {
    const detected = translationResult?.language;
    if (!detected) return;
    const lang = detectedLangToEditorLang(detected);
    setSelectedLang(lang);
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: langCompartment.current.reconfigure(
          getLanguageExtension(lang),
        ),
      });
    }
  }, [translationResult?.language]);

  // Sync external value changes into editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== code) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: code } });
    }
  }, [code]);

  // Drive editor highlight from hovered translation row
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const item =
      hoveredItemIndex !== null
        ? translationResult?.items[hoveredItemIndex]
        : undefined;
    const searchText = item?.searchText;
    const tokenVar = item ? `var(--${item.visualToken})` : "";
    if (searchText) {
      view.dispatch({
        effects: setHighlightEffect.of({ text: searchText, tokenVar }),
      });
      // Scroll first match into view
      const idx = view.state.doc.toString().indexOf(searchText);
      if (idx !== -1)
        view.dispatch({
          effects: EditorView.scrollIntoView(idx, { y: "nearest" }),
        });
    } else {
      view.dispatch({ effects: setHighlightEffect.of(null) });
    }
  }, [hoveredItemIndex, translationResult]);

  function handleLangChange(lang: EditorLanguage) {
    setSelectedLang(lang);
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: langCompartment.current.reconfigure(
          getLanguageExtension(lang),
        ),
      });
    }
  }

  // Track which token color is active for the CSS highlight var
  const hoveredToken =
    hoveredItemIndex !== null
      ? (translationResult?.items[hoveredItemIndex]?.visualToken ?? null)
      : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          Code Input
        </span>
        <select
          value={selectedLang}
          onChange={(e) => handleLangChange(e.target.value as EditorLanguage)}
          aria-label="Editor language"
          className="text-xs bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--color-syntax-primary)]"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Editor mount point */}
      <div
        className="flex-1 overflow-hidden"
        ref={containerRef}
        style={
          hoveredToken
            ? ({
                "--cm-highlight-color": `var(--${hoveredToken})`,
              } as React.CSSProperties)
            : undefined
        }
      />

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          Paste any code snippet above, then click Translate.
        </p>
        <button
          onClick={translate}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-opacity disabled:opacity-50 whitespace-nowrap"
          style={{
            backgroundColor: "var(--color-syntax-primary)",
            color: "var(--color-bg)",
          }}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Translating…
            </>
          ) : (
            "Translate →"
          )}
        </button>
      </div>
    </div>
  );
}
