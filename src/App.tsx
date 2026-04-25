import { TranslationProvider } from "./contexts/TranslationContext";
import { EditorRefProvider } from "./contexts/EditorRefContext";
import AppHeader from "./components/layout/AppHeader";
import SplitPane from "./components/layout/SplitPane";
import CodeInputPanel from "./components/editor/CodeInputPanel";
import TranslationPanel from "./components/translation/TranslationPanel";

export default function App() {
  return (
    <EditorRefProvider>
      <TranslationProvider>
        <div
          className="flex flex-col"
          style={{ height: "100vh", overflow: "hidden" }}
        >
          <AppHeader />
          <SplitPane left={<CodeInputPanel />} right={<TranslationPanel />} />
        </div>
      </TranslationProvider>
    </EditorRefProvider>
  );
}
