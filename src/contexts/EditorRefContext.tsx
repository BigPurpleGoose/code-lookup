import { createContext, useContext, useState, type ReactNode } from "react";
import type { EditorView } from "@codemirror/view";

interface EditorRefContextValue {
  editorView: EditorView | null;
  setEditorView: (view: EditorView | null) => void;
}

const EditorRefContext = createContext<EditorRefContextValue | null>(null);

export function EditorRefProvider({ children }: { children: ReactNode }) {
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  return (
    <EditorRefContext.Provider value={{ editorView, setEditorView }}>
      {children}
    </EditorRefContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditorRef(): EditorRefContextValue {
  const ctx = useContext(EditorRefContext);
  if (!ctx)
    throw new Error("useEditorRef must be used within EditorRefProvider");
  return ctx;
}
