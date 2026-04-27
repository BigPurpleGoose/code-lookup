/**
 * Local (offline) code translator — no API key required.
 * Uses regex pattern-matching to identify semantic elements across six languages.
 */
import type { TranslationResult, TranslationItem, VisualToken } from '../types';

// ─── Language detection ───────────────────────────────────────────────────────

function detectLanguage(code: string): string {
  const t = code.trim();

  // HTML — doctype or root html tag
  if (/^\s*<!DOCTYPE\s+html/i.test(t) || /^\s*<html[\s>]/i.test(t)) return 'HTML';

  // XML — XML declaration or non-HTML root tag
  if (/^\s*<\?xml\s/i.test(t)) return 'XML';
  if (/^\s*<[A-Za-z][A-Za-z0-9_-]*[\s>]/.test(t) && !/<html/i.test(t) && !/<[A-Z]/.test(t)) return 'XML';

  // JSON — starts with { or [
  if (/^\s*[{[]/.test(t)) {
    try { JSON.parse(t); return 'JSON'; } catch { /* fall through */ }
  }

  // TOML — key = value pairs, section headers [section]
  if (/^\s*\[[\w."-]+\]$/m.test(t) && /^\s*\w[\w.-]*\s*=\s*.+$/m.test(t)) return 'TOML';

  // YAML — key: value lines, optional leading document marker
  if (
    (t.startsWith('---') || /^\w[\w-]*:\s*.+/m.test(t)) &&
    /^\s*[\w-]+:\s*/m.test(t) &&
    !/^\s*[{[]/.test(t) &&
    !/\bfunction\b/.test(t)
  ) return 'YAML';

  // GraphQL — schema definition or query keywords
  if (/^\s*(?:type\s+\w+\s*\{|query\s|mutation\s|subscription\s|fragment\s|schema\s*\{)/m.test(t)) return 'GraphQL';

  // Bash / Shell
  if (/^\s*(?:#!\/(?:bin|usr\/bin\/env)\s*(?:bash|sh|zsh)|set\s+-[eux])/m.test(t)) return 'Bash';
  if (/^\s*(?:echo\s|if\s*\[|for\s+\w+\s+in\s|while\s+\[|function\s+\w+\s*\(\)|export\s+\w+=)/m.test(t) && !/\bconst\b/.test(t)) return 'Bash';

  // Markdown — heading markers, bold/italic, or code fences
  if (/^#{1,6}\s+.+/m.test(t) || /^\s*```/m.test(t) || /\*\*.+\*\*/.test(t)) return 'Markdown';

  // SQL — must have a primary command; exclude files with JS/Python keywords
  const hasSQLCmd = /(SELECT\s+|INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE)/i.test(t);
  if (hasSQLCmd && !/\b(function|const|let|def\s)\b/.test(t)) return 'SQL';

  // CSS — selector block pattern, no angle brackets
  if (
    /^[.#:\w*@][\w\s.#:[\](),-]*\s*\{/m.test(t) &&
    /:\s*[^{;\n]+;/.test(t) &&
    !/<[A-Za-z]/.test(t)
  ) return 'CSS';

  // Python — has def/class but no JS function keyword
  if (/^\s*(?:async\s+)?def\s+\w+\s*\(/m.test(t) && !/\bfunction[\s(]/.test(t)) return 'Python';

  // TypeScript — type annotations, interface, or type keyword
  if (
    /\binterface\s+\w/.test(t) ||
    /\btype\s+\w+\s*=/.test(t) ||
    /:\s*(?:string|number|boolean|void|never|unknown)\b/.test(t)
  ) return 'TypeScript';

  // JavaScript / JSX / TSX
  if (
    /\b(?:import|export|require|const|let|var|function|class|async|await)\b/.test(t) ||
    /<[A-Z]/.test(t)
  ) return 'JavaScript';

  return 'Code';
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

function trunc(s: string, max = 55): string {
  const c = s.trim().replace(/\s+/g, ' ');
  return c.length > max ? c.slice(0, max - 1) + '…' : c;
}

class Builder {
  private _items: TranslationItem[] = [];
  private _keys = new Set<string>();

  add(role: string, token: VisualToken, el: string, plainEnglish: string, searchText?: string): void {
    if (!el.trim()) return;
    const key = `${role}|${trunc(el, 35)}`;
    if (this._keys.has(key)) return;
    this._keys.add(key);
    this._items.push({ semanticRole: role, visualToken: token, codeElement: trunc(el), plainEnglish, searchText });
  }

  getItems(): TranslationItem[] { return this._items; }
}

// ─── JavaScript / TypeScript / JSX / TSX ─────────────────────────────────────

function parseJSTS(code: string): TranslationItem[] {
  const b = new Builder();

  // Imports ──────────────────────────────────────────────────────────────────
  const importSrcs: string[] = [];
  for (const m of code.matchAll(/\bimport\s[\s\S]*?from\s+['"]([^'"]+)['"]/g)) importSrcs.push(m[1]);
  for (const m of code.matchAll(/require\(['"]([^'"]+)['"]\)/g))               importSrcs.push(m[1]);
  if (importSrcs.length > 0) {
    const uniq = [...new Set(importSrcs)];
    const preview = uniq.slice(0, 3).map(s => `'${s}'`).join(', ');
    b.add('Import', 'color-syntax-muted',
      `import … from ${preview}${uniq.length > 3 ? ', …' : ''}`,
      `These lines pull in ready-made code from other packages (${uniq.slice(0, 3).join(', ')}). Like borrowing specific tools from a shared toolbox before starting a project.`,
      'import',
    );
  }

  // TypeScript interfaces & type aliases ────────────────────────────────────
  for (const m of code.matchAll(/\binterface\s+(\w+)/g)) {
    b.add('Interface', 'color-syntax-primary', `interface ${m[1]}`,
      `"interface ${m[1]}" defines the required shape of an object — a contract specifying which properties it must have. Any object claiming to be a "${m[1]}" must match this structure exactly.`,
      m[1],
    );
  }
  for (const m of code.matchAll(/\btype\s+(\w+)\s*=/g)) {
    b.add('Type Alias', 'color-syntax-primary', `type ${m[1]}`,
      `"type ${m[1]}" creates a named shorthand for a TypeScript type — like giving a nickname to a complex description so you can reuse it by name throughout the codebase.`,
      m[1],
    );
  }

  // Classes ──────────────────────────────────────────────────────────────────
  for (const m of code.matchAll(/\bclass\s+(\w+)(?:\s+extends\s+(\w+))?/g)) {
    b.add('Class', 'color-syntax-primary',
      m[2] ? `class ${m[1]} extends ${m[2]}` : `class ${m[1]}`,
      m[2]
        ? `Creates a blueprint called "${m[1]}" that inherits all behavior from "${m[2]}". Like a child class that gains all of its parent's abilities, then adds its own on top.`
        : `Defines a reusable blueprint called "${m[1]}" for creating objects. Like an architectural drawing you can use to build multiple identical structures.`,
      m[1],
    );
  }

  // Named function declarations ──────────────────────────────────────────────
  for (const m of code.matchAll(/\bfunction\s+(\w+)\s*\(([^)]*)\)/g)) {
    const paramCount = m[2].trim() ? m[2].split(',').length : 0;
    b.add('Function', 'color-syntax-primary',
      `function ${m[1]}(${m[2].trim() ? '…' : ''})`,
      `Defines a reusable action named "${m[1]}"${paramCount ? ` that accepts ${paramCount} input${paramCount > 1 ? 's' : ''}` : ''}. Like writing a named recipe step you can call on demand.`,
      m[1],
    );
  }

  // Arrow function variables ─────────────────────────────────────────────────
  const arrowFnNames = new Set<string>();
  for (const m of code.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g)) {
    arrowFnNames.add(m[1]);
    b.add('Arrow Function', 'color-syntax-primary',
      `${m[1]} = (…) =>`,
      `"${m[1]}" is a function stored as a variable. Arrow functions (=>) are a concise modern form — like a sticky note with instructions, labeled so you can call it by name later.`,
      m[1],
    );
  }

  // React Hooks ──────────────────────────────────────────────────────────────
  const hookExplain: Record<string, string> = {
    useState:    '"useState" stores data the component remembers across renders. When it changes, the UI refreshes — like a whiteboard that redraws itself automatically.',
    useEffect:   '"useEffect" runs code in response to changes — like a motion sensor that triggers an action when something moves.',
    useCallback: '"useCallback" saves a function reference to avoid unnecessary recreation, improving performance.',
    useMemo:     '"useMemo" caches a calculation result and only recomputes when its dependencies change — saving processing time.',
    useRef:      '"useRef" holds a persistent value or a DOM reference without triggering a re-render when it changes.',
    useContext:  '"useContext" reads shared data from a parent provider — like tuning into a broadcast channel all descendants can receive.',
    useReducer:  '"useReducer" manages complex state through explicit named actions — like a state machine with defined transitions.',
  };
  for (const m of code.matchAll(/\b(use[A-Z]\w+)\s*\(/g)) {
    b.add('React Hook', 'color-syntax-accent', `${m[1]}(…)`,
      hookExplain[m[1]] ?? `"${m[1]}" is a React hook that adds built-in behavior (state, effects, or context) to a functional component.`,
      m[1],
    );
  }

  // JSX parent components (capitalized, no dot suffix) ──────────────────────
  for (const m of code.matchAll(/<([A-Z][A-Za-z0-9]*)(?![.\w])/g)) {
    b.add('Parent Component', 'color-syntax-primary', `<${m[1]}>`,
      `"<${m[1]}>" is the main container component. Think of it as the outer shell — like the cardboard box everything else is packed inside.`,
      m[1],
    );
  }

  // JSX sub-components (dot notation: Component.Part) ───────────────────────
  for (const m of code.matchAll(/<([A-Z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*)/g)) {
    const parts = m[1].split('.');
    const parent = parts[0], sub = parts[1];
    b.add('Sub-Component', 'color-syntax-secondary', `<${m[1]}>`,
      `"<${m[1]}>" is the "${sub}" region of "${parent}". Dot-notation sub-components divide a parent into named slots — like labeling the header, body, and footer of a physical card.`,
      m[1],
    );
  }

  // HTML elements inside JSX ─────────────────────────────────────────────────
  const htmlTagsFound = new Set<string>();
  for (const m of code.matchAll(/<(div|span|p|section|article|main|header|footer|nav|ul|ol|li|button|input|form|label|table|tr|td|th|h[1-6]|img|a|select|textarea)\b/gi)) {
    htmlTagsFound.add(m[1].toLowerCase());
  }
  if (htmlTagsFound.size > 0) {
    const list = [...htmlTagsFound].slice(0, 4);
    b.add('HTML Elements', 'color-syntax-secondary', list.map(t => `<${t}>`).join(', '),
      `Native HTML tags like <${list.join('>, <')}> define visible structure using the browser's built-in building blocks — they determine whether content is a paragraph, a list, a button, etc.`,
      `<${list[0]}`,
    );
  }

  // Props (attribute=value) ──────────────────────────────────────────────────
  const propNames: string[] = [];
  for (const m of code.matchAll(/\s([a-z][a-zA-Z0-9]*)=(?:\{|["'`])/g)) propNames.push(m[1]);
  if (propNames.length > 0) {
    const uniq = [...new Set(propNames)].slice(0, 4);
    b.add('Props', 'color-syntax-accent', uniq.map(p => `${p}=`).join('  '),
      `Props like "${uniq.join('", "')}" pass configuration into a component — like filling in a form to customize what it displays or how it behaves. Each prop is an instruction from the parent.`,
      uniq[0],
    );
  }

  // Spread props {…props} ────────────────────────────────────────────────────
  for (const m of code.matchAll(/\{\.\.\.(\w+)\}/g)) {
    b.add('Spread Props', 'color-syntax-accent', `{...${m[1]}}`,
      `"{...${m[1]}}" forwards all properties from "${m[1]}" into the component at once — like handing someone your entire bag of supplies rather than passing items one at a time.`,
      `...${m[1]}`,
    );
  }

  // Children slots {Props.children} ─────────────────────────────────────────
  for (const m of code.matchAll(/\{(\w+(?:\.\w+)*\.children)\}/g)) {
    b.add('Children Slot', 'color-syntax-value', `{${m[1]}}`,
      `"{${m[1]}}" renders whatever content the parent passed in. This is a fill-in-the-blank slot — the calling component decides what content appears here, not the component itself.`,
    );
  }

  // Variable declarations (non-function) ────────────────────────────────────
  const varDecls: string[] = [];
  for (const m of code.matchAll(/\b(const|let|var)\s+(\w+)\s*=/g)) {
    if (!arrowFnNames.has(m[2])) varDecls.push(`${m[1]} ${m[2]}`);
  }
  if (varDecls.length > 0) {
    const shown = [...new Set(varDecls)].slice(0, 3);
    b.add('Variables', 'color-syntax-secondary', shown.join(', '),
      `${shown.map(v => `"${v}"`).join(', ')} store values that can be referenced by name. "const" means the binding is fixed; "let" allows reassignment. Like labeled boxes — you decide whether the box can be repacked.`,
      shown[0]?.split(' ')[1],
    );
  }

  // Async / await ────────────────────────────────────────────────────────────
  if (/\basync\b/.test(code) && /\bawait\b/.test(code)) {
    b.add('Async / Await', 'color-syntax-accent', 'async … await',
      '"async" marks a function that performs time-consuming work (like fetching data from a server). "await" pauses execution until that work finishes — like placing an order and waiting at the counter before continuing.',
      'async',
    );
  }

  // Template literals ────────────────────────────────────────────────────────
  if (/`[^`]*\$\{/.test(code)) {
    b.add('Template Literal', 'color-syntax-value', '`…${variable}…`',
      'Template literals embed variable values inside strings using ${…}. Like a fill-in-the-blank sentence — the blanks are filled in automatically with each variable\'s current value.',
      '`',
    );
  }

  // Literal values (strings, numbers, booleans) ──────────────────────────────
  const strLiterals = [...new Set(code.match(/["'][^"'\n]{2,40}["']/g) ?? [])];
  const numLiterals = [...new Set(code.match(/\b\d+(?:\.\d+)?\b/g) ?? [])];
  const boolLiterals = [...new Set(code.match(/\b(?:true|false|null|undefined)\b/g) ?? [])];
  const allLiterals = [...strLiterals.slice(0, 2), ...numLiterals.slice(0, 2), ...boolLiterals.slice(0, 1)];
  if (allLiterals.length > 0) {
    b.add('Literal Values', 'color-syntax-value', allLiterals.slice(0, 4).join(', '),
      'Literal values are hardcoded data — strings (text in quotes), numbers, or booleans (true/false). They represent concrete values written directly in the code rather than computed results.',
      allLiterals[0],
    );
  }

  // Export ───────────────────────────────────────────────────────────────────
  if (/\bexport\s+(?:default|const|function|class|type|interface)\b/.test(code)) {
    b.add('Export', 'color-syntax-muted', 'export …',
      '"export" makes this definition available to other files — like placing a finished product on a shared shelf so other parts of the project can import and use it.',
      'export',
    );
  }

  // Return ───────────────────────────────────────────────────────────────────
  if (/\breturn\s*[(/<"'`{[]/.test(code)) {
    b.add('Return', 'color-syntax-muted', 'return (…)',
      '"return" sends the result back to wherever this function was called from. For a React component, this is the JSX markup that will actually be rendered on screen.',
      'return',
    );
  }

  // Closing tags ─────────────────────────────────────────────────────────────
  if ((code.match(/<\/[A-Za-z.]+>/g) ?? []).length >= 2) {
    b.add('Closing Tags', 'color-syntax-muted', '</Component>, …',
      'Closing tags mark where a component or element ends. Every opening tag must have a matching closing tag — like closing a parenthesis after you open one.',
    );
  }

  return b.getItems();
}

// ─── Python ───────────────────────────────────────────────────────────────────

function parsePython(code: string): TranslationItem[] {
  const b = new Builder();

  // Imports
  const pyImports: string[] = [];
  for (const m of code.matchAll(/^(?:from\s+(\S+)\s+import|import\s+(\S+))/gm)) {
    pyImports.push(m[1] ?? m[2] ?? '');
  }
  if (pyImports.length > 0) {
    const uniq = pyImports.filter(Boolean);
    b.add('Import', 'color-syntax-muted',
      `import ${uniq.slice(0, 3).join(', ')}${uniq.length > 3 ? ', …' : ''}`,
      `These lines bring in external modules (${uniq.slice(0, 3).join(', ')}). Like pulling reference books off a shelf to use their contents.`,
      'import',
    );
  }

  // Decorators
  for (const m of code.matchAll(/^(@[\w.]+)/gm)) {
    b.add('Decorator', 'color-syntax-accent', m[1],
      `"${m[1]}" is a decorator — it wraps the function below it with extra behavior. Like putting a "fragile" sticker on a package to change how it's handled without changing its contents.`,
    );
  }

  // Classes
  for (const m of code.matchAll(/^class\s+(\w+)(?:\((\w+)\))?:/gm)) {
    b.add('Class', 'color-syntax-primary',
      m[2] ? `class ${m[1]}(${m[2]}):` : `class ${m[1]}:`,
      m[2]
        ? `Defines a class "${m[1]}" that inherits from "${m[2]}". Like a child blueprint extending a parent blueprint — it starts with everything the parent has, then adds its own.`
        : `Defines a class called "${m[1]}" — a blueprint for creating objects that share the same attributes and methods.`,
      m[1],
    );
  }

  // Functions / methods
  for (const m of code.matchAll(/^(\s*)(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm)) {
    const isMethod = m[1].length >= 4;
    const cleanParams = m[3].trim().replace(/self,?\s*/, '');
    const paramCount = cleanParams ? cleanParams.split(',').length : 0;
    b.add(isMethod ? 'Method' : 'Function', 'color-syntax-primary',
      `def ${m[2]}(${cleanParams ? '…' : ''})`,
      `"def ${m[2]}" defines a${isMethod ? ' method (a function inside a class)' : ' function'} named "${m[2]}"${paramCount ? ` that takes ${paramCount} argument${paramCount > 1 ? 's' : ''}` : ''}. It packages a set of instructions under one callable name.`,
      m[2],
    );
  }

  // Variable assignments
  const pyVars: string[] = [];
  for (const m of code.matchAll(/^(\s{0,4})(\w+)\s*=(?!=)/gm)) {
    if (!['True', 'False', 'None', 'self'].includes(m[2])) pyVars.push(m[2]);
  }
  if (pyVars.length > 0) {
    const shown = [...new Set(pyVars)].slice(0, 3);
    b.add('Variable Assignment', 'color-syntax-secondary', shown.join(', ') + ' = …',
      `${shown.map(v => `"${v}"`).join(', ')} store data values. Python variables need no keyword — write "name = value" and the variable is created. Like labeled containers holding information.`,
      shown[0],
    );
  }

  // For loops
  const forMatch = code.match(/\bfor\s+(\w+)\s+in\s+(.+?):/);
  if (forMatch) {
    b.add('For Loop', 'color-syntax-accent',
      `for ${forMatch[1]} in ${trunc(forMatch[2], 20)}:`,
      'A "for" loop repeats a block of code for each item in a sequence — like reading a list one item at a time and doing something with each.',
      `for ${forMatch[1]}`,
    );
  }

  // Conditionals
  if (/\bif\s+/.test(code)) {
    b.add('Conditional', 'color-syntax-accent', 'if … : / else:',
      '"if" runs code only when a condition is true. "else" handles the opposite case — like a fork in the road: your code takes one path or the other based on the condition.',
      'if ',
    );
  }

  // Return
  if (/\breturn\s+/.test(code)) {
    b.add('Return', 'color-syntax-muted', 'return …',
      '"return" sends a result back to wherever the function was called. Like completing an order and handing back the finished product.',
      'return',
    );
  }

  // String / number literals
  const pyStrings = [...new Set(code.match(/(?:"[^"\n]{2,40}"|'[^'\n]{2,40}')/g) ?? [])];
  const pyNums    = [...new Set(code.match(/\b\d+(?:\.\d+)?\b/g) ?? [])];
  if (pyStrings.length > 0 || pyNums.length > 0) {
    b.add('Literal Values', 'color-syntax-value',
      [...pyStrings.slice(0, 2), ...pyNums.slice(0, 2)].join(', '),
      'Literal values are hardcoded data — strings (text), numbers, or booleans. These are the raw data your code directly works with.',
      pyStrings[0] ?? pyNums[0],
    );
  }

  return b.getItems();
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function parseHTML(code: string): TranslationItem[] {
  const b = new Builder();

  if (/<!DOCTYPE\s+html/i.test(code)) {
    b.add('Document Declaration', 'color-syntax-muted', '<!DOCTYPE html>',
      '"<!DOCTYPE html>" tells the browser this is an HTML5 document. It\'s a required first line — like putting the correct label on a file before filing it.',
    );
  }

  // Structural elements
  const structural = ['html', 'head', 'body', 'main', 'header', 'footer', 'nav', 'aside'];
  const foundStructural = structural.filter(t => new RegExp(`<${t}[\\s>]`, 'i').test(code));
  if (foundStructural.length > 0) {
    b.add('Structural Elements', 'color-syntax-primary',
      foundStructural.slice(0, 4).map(t => `<${t}>`).join(', '),
      `Tags like <${foundStructural.slice(0, 3).join('>, <')}> define the page skeleton — the rooms of a building. <header> is the entrance, <main> is the living area, <footer> is the exit.`,
    );
  }

  // Semantic elements
  const semantic = ['section', 'article', 'figure', 'figcaption', 'details', 'summary', 'dialog'];
  const foundSemantic = semantic.filter(t => new RegExp(`<${t}[\\s>]`, 'i').test(code));
  if (foundSemantic.length > 0) {
    b.add('Semantic Elements', 'color-syntax-secondary',
      foundSemantic.slice(0, 3).map(t => `<${t}>`).join(', '),
      `Semantic tags like <${foundSemantic.slice(0, 3).join('>, <')}> describe the meaning of content beyond its appearance — helping screen readers and search engines understand the page structure.`,
    );
  }

  // Content elements
  const contentTags = new Set<string>();
  for (const m of code.matchAll(/<(div|span|p|h[1-6]|ul|ol|li|table|tr|td|th|pre|code|blockquote)\b/gi)) {
    contentTags.add(m[1].toLowerCase());
  }
  if (contentTags.size > 0) {
    const list = [...contentTags].slice(0, 4);
    b.add('Content Elements', 'color-syntax-secondary', list.map(t => `<${t}>`).join(', '),
      `<${list.join('>, <')}> structure visible content — headings, paragraphs, lists, and tables. Like choosing whether text lives in a heading, a bullet point, or a table cell.`,
    );
  }

  // Interactive elements
  const interactiveTags = new Set<string>();
  for (const m of code.matchAll(/<(a|button|input|form|label|select|textarea)\b/gi)) {
    interactiveTags.add(m[1].toLowerCase());
  }
  if (interactiveTags.size > 0) {
    const list = [...interactiveTags].slice(0, 3);
    b.add('Interactive Elements', 'color-syntax-accent', list.map(t => `<${t}>`).join(', '),
      `<${list.join('>, <')}> create the parts users interact with — links, buttons, and form controls they can click, type into, or submit.`,
    );
  }

  // Attributes
  const attrs = new Set<string>();
  for (const m of code.matchAll(/\s(class|id|href|src|alt|type|name|value|placeholder|aria-\w+|data-\w+)=/gi)) {
    attrs.add(m[1].toLowerCase());
  }
  if (attrs.size > 0) {
    const list = [...attrs].slice(0, 4);
    b.add('Attributes', 'color-syntax-accent', list.join(', '),
      `Attributes like "${list.join('", "')}" configure each element. "class"/"id" target elements for styling; "href" points to a link destination; "src" sets an image or script source.`,
    );
  }

  // Text content
  const textNodes = code.match(/>([A-Za-z][^<]{3,60})</g) ?? [];
  const firstNode = textNodes[0];
  if (firstNode) {
    const sample = firstNode.replace(/^>/, '').replace(/<$/, '').trim();
    b.add('Text Content', 'color-syntax-value', `"${trunc(sample, 40)}"`,
      'Text content between tags is what users actually read on screen — the words and information, not the structural code surrounding it.',
    );
  }

  return b.getItems();
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

function parseCSS(code: string): TranslationItem[] {
  const b = new Builder();

  // Media queries
  for (const m of code.matchAll(/@media\s*([^{]+)\{/g)) {
    b.add('Media Query', 'color-syntax-primary', `@media ${trunc(m[1].trim(), 35)}`,
      'A media query applies styles only when specific conditions are true — like screen width or print mode. This is how designs adapt to different screen sizes.',
    );
  }

  // Selectors
  const selectors: string[] = [];
  for (const m of code.matchAll(/^([.#:\w*@[\]][^{,\n]*?)\s*\{/gm)) {
    selectors.push(m[1].trim());
  }
  if (selectors.length > 0) {
    const uniq = [...new Set(selectors)].slice(0, 3);
    b.add('Selectors', 'color-syntax-primary', uniq.join(', '),
      `Selectors like "${uniq.join('", "')}" target specific HTML elements to apply styles to. "." targets a class name; "#" targets an ID; a plain word targets an element type.`,
      uniq[0],
    );
  }

  // CSS custom properties (variables)
  const cssVars = new Set<string>();
  for (const m of code.matchAll(/(--[\w-]+)/g)) cssVars.add(m[1]);
  if (cssVars.size > 0) {
    const list = [...cssVars].slice(0, 3);
    b.add('CSS Variables', 'color-syntax-secondary', list.join(', '),
      `CSS custom properties (variables) like "${list.join('", "')}" store reusable values. Define once, reference anywhere — like a color palette you can update in one place to change the whole design.`,
    );
  }

  // Properties
  const props = new Set<string>();
  for (const m of code.matchAll(/^\s*([\w-]+)\s*:/gm)) {
    if (!/https?/.test(m[1])) props.add(m[1]);
  }
  if (props.size > 0) {
    const list = [...props].slice(0, 5);
    const propDesc: Record<string, string> = {
      display: 'layout mode', color: 'text color', 'background-color': 'background',
      'font-size': 'text size', margin: 'outer spacing', padding: 'inner spacing',
      border: 'element border', width: 'width', height: 'height',
    };
    const desc = list.map(p => propDesc[p] ? `"${p}" (${propDesc[p]})` : `"${p}"`).join(', ');
    b.add('Properties', 'color-syntax-accent', list.join(';  '),
      `Properties like ${desc} define how elements look. Each property controls one visual aspect — color, size, spacing, or layout behavior.`,
    );
  }

  // Values
  const vals: string[] = [];
  for (const m of code.matchAll(/:\s*([^;{}\n]{2,40});/g)) vals.push(m[1].trim());
  if (vals.length > 0) {
    const uniq = [...new Set(vals)].slice(0, 4);
    b.add('Values', 'color-syntax-value', uniq.join(', '),
      `Values like "${uniq.slice(0, 3).join('", "')}" are the settings assigned to each property. They can be keywords ("flex"), measurements ("16px"), colors ("#333"), or percentages.`,
    );
  }

  return b.getItems();
}

// ─── SQL ──────────────────────────────────────────────────────────────────────

function parseSQL(code: string): TranslationItem[] {
  const b = new Builder();

  const cmdExplain: Record<string, string> = {
    'SELECT':       'SELECT retrieves rows from the database — like asking "show me everything that matches these criteria" from a spreadsheet.',
    'INSERT INTO':  'INSERT INTO adds a new row of data — like filling in and submitting a new entry in a form.',
    'UPDATE':       'UPDATE modifies existing rows — like correcting information already written on a form.',
    'DELETE FROM':  'DELETE FROM removes matching rows permanently — like erasing specific lines from a spreadsheet.',
    'CREATE TABLE': 'CREATE TABLE defines a new table structure — like designing a blank spreadsheet with named columns.',
    'DROP TABLE':   'DROP TABLE permanently removes a table and all its data — like shredding an entire spreadsheet.',
    'ALTER TABLE':  'ALTER TABLE modifies a table\'s structure — like adding or renaming columns in a spreadsheet.',
  };
  for (const [cmd, explain] of Object.entries(cmdExplain)) {
    if (new RegExp(`\\b${cmd}\\b`, 'i').test(code)) {
      // searchText: first word of the command (SELECT, INSERT, UPDATE, etc.)
      b.add('SQL Command', 'color-syntax-primary', cmd, explain, cmd.split(' ')[0]);
      break;
    }
  }

  // FROM (table name)
  const fromMatch = code.match(/\bFROM\s+(\w+)/i);
  if (fromMatch) {
    b.add('Table', 'color-syntax-secondary', fromMatch[1],
      `"${fromMatch[1]}" is the database table being queried — like naming which spreadsheet tab you're reading from.`,
      fromMatch[1],
    );
  }

  // JOINs
  for (const m of code.matchAll(/\b((?:LEFT|RIGHT|INNER|OUTER|FULL|CROSS)\s+)?JOIN\s+(\w+)\s+ON\s+([^\n]+)/gi)) {
    const joinType = (m[1] ?? 'INNER').trim();
    b.add('JOIN', 'color-syntax-secondary', `${joinType} JOIN ${m[2]}`,
      `"${joinType} JOIN" combines rows from two tables where they share matching values in the ON condition — like merging two spreadsheets where matching IDs line up side by side.`,
    );
  }

  // SELECT columns
  const selectMatch = code.match(/\bSELECT\s+([\s\S]+?)\s+FROM\b/i);
  if (selectMatch) {
    const cols = selectMatch[1].trim();
    b.add('Selected Columns', 'color-syntax-accent', trunc(cols === '*' ? '* (all columns)' : cols, 45),
      cols === '*'
        ? '"*" selects every column — like asking for an entire row from a spreadsheet with no filtering.'
        : `These columns (${trunc(cols, 40)}) are the specific data fields to retrieve — like choosing which spreadsheet columns to display.`,
    );
  }

  // WHERE
  const whereMatch = code.match(/\bWHERE\s+([^\n;]+)/i);
  if (whereMatch) {
    b.add('WHERE Condition', 'color-syntax-accent', `WHERE ${trunc(whereMatch[1], 40)}`,
      `WHERE filters rows — only rows where the condition is true are returned. Like applying a spreadsheet filter to show only matching entries.`,
    );
  }

  // ORDER BY
  const orderMatch = code.match(/\bORDER\s+BY\s+([^\n;]+)/i);
  if (orderMatch) {
    b.add('ORDER BY', 'color-syntax-muted', `ORDER BY ${trunc(orderMatch[1], 30)}`,
      '"ORDER BY" sorts the results — like clicking a column header in a spreadsheet to sort rows alphabetically or numerically.',
    );
  }

  // GROUP BY
  const groupMatch = code.match(/\bGROUP\s+BY\s+([^\n;]+)/i);
  if (groupMatch) {
    b.add('GROUP BY', 'color-syntax-muted', `GROUP BY ${trunc(groupMatch[1], 30)}`,
      '"GROUP BY" clusters rows that share the same value into buckets — like grouping spreadsheet rows by category so you can run totals per group.',
    );
  }

  // LIMIT
  const limitMatch = code.match(/\bLIMIT\s+(\d+)/i);
  if (limitMatch) {
    b.add('LIMIT', 'color-syntax-muted', `LIMIT ${limitMatch[1]}`,
      `"LIMIT ${limitMatch[1]}" caps the number of results returned — only the first ${limitMatch[1]} matching rows come back, like showing only the first page of results.`,
    );
  }

  return b.getItems();
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

function parseJSON(code: string): TranslationItem[] {
  const b = new Builder();

  let parsed: unknown;
  try { parsed = JSON.parse(code); } catch { parsed = null; }

  const isArray  = Array.isArray(parsed);
  const isObject = parsed !== null && typeof parsed === 'object' && !isArray;

  if (isArray) {
    const arr = parsed as unknown[];
    b.add('Array', 'color-syntax-primary', `[ … ]  (${arr.length} item${arr.length !== 1 ? 's' : ''})`,
      `The outermost structure is an array — an ordered list of ${arr.length} item${arr.length !== 1 ? 's' : ''}. Think of it like a numbered list where position matters.`,
    );
  } else if (isObject) {
    const keys = Object.keys(parsed as object);
    b.add('Object', 'color-syntax-primary', `{ … }  (${keys.length} key${keys.length !== 1 ? 's' : ''})`,
      `The outermost structure is an object with ${keys.length} key${keys.length !== 1 ? 's' : ''}. Like a labeled form — each field has a name and a value.`,
    );
  }

  // Top-level keys
  if (isObject) {
    const keys = Object.keys(parsed as object).slice(0, 6);
    b.add('Keys', 'color-syntax-secondary', keys.map(k => `"${k}"`).join(', '),
      `Keys like ${keys.slice(0, 3).map(k => `"${k}"`).join(', ')} are the field names — labels on each compartment of the object that tell you what kind of data to expect inside.`,
    );

    // Categorize value types
    const obj = parsed as Record<string, unknown>;
    const strings  = keys.filter(k => typeof obj[k] === 'string');
    const numbers  = keys.filter(k => typeof obj[k] === 'number');
    const bools    = keys.filter(k => typeof obj[k] === 'boolean');
    const nulls    = keys.filter(k => obj[k] === null);
    const nested   = keys.filter(k => typeof obj[k] === 'object' && obj[k] !== null);

    if (strings.length > 0) {
      const shown = strings.slice(0, 2);
      b.add('String Values', 'color-syntax-value',
        shown.map(k => `"${k}": "${trunc(String(obj[k]), 20)}"`).join(', '),
        `String values (text in double quotes) like ${shown.map(k => `"${k}"`).join(', ')} hold human-readable information — names, descriptions, IDs, URLs, or any text content.`,
      );
    }
    if (numbers.length > 0) {
      const shown = numbers.slice(0, 2);
      b.add('Numeric Values', 'color-syntax-value',
        shown.map(k => `"${k}": ${obj[k]}`).join(', '),
        `Numeric values like ${shown.map(k => `"${k}": ${obj[k]}`).join(', ')} store counts, measurements, or identifiers. JSON numbers have no quotes — that's how you tell them apart from strings.`,
      );
    }
    if (bools.length > 0) {
      const shown = bools.slice(0, 2);
      b.add('Boolean Values', 'color-syntax-value',
        shown.map(k => `"${k}": ${obj[k]}`).join(', '),
        `Boolean values are binary flags — either true or false. ${shown.map(k => `"${k}"`).join(', ')} act like on/off switches that control behavior or state.`,
      );
    }
    if (nulls.length > 0) {
      b.add('Null Values', 'color-syntax-muted',
        nulls.slice(0, 2).map(k => `"${k}": null`).join(', '),
        '"null" explicitly means "no value here". It\'s different from a missing key — the field intentionally exists but has no data, like a blank form field that was left empty on purpose.',
      );
    }
    if (nested.length > 0) {
      b.add('Nested Objects / Arrays', 'color-syntax-secondary',
        nested.slice(0, 2).map(k => `"${k}": ${Array.isArray(obj[k]) ? '[…]' : '{…}'}`).join(', '),
        `Some values are themselves objects or arrays — ${nested.slice(0, 2).map(k => `"${k}"`).join(', ')} contain additional nested data. Like a folder inside a folder — you can keep drilling down to find more details.`,
      );
    }
  }

  // Strings inside arrays
  if (isArray) {
    const arr = parsed as unknown[];
    const strItems = arr.filter(v => typeof v === 'string').slice(0, 3) as string[];
    if (strItems.length > 0) {
      b.add('String Items', 'color-syntax-value', strItems.map(s => `"${trunc(s, 18)}"`).join(', '),
        `Each text item in this list is a plain string — like reading individual entries from a bullet-point list one by one.`,
      );
    }
    const objItems = arr.filter(v => typeof v === 'object' && v !== null && !Array.isArray(v));
    if (objItems.length > 0) {
      const firstKeys = Object.keys(objItems[0] as object).slice(0, 3);
      b.add('Object Items', 'color-syntax-secondary', `{ ${firstKeys.map(k => `"${k}"`).join(', ')}, … }`,
        `Each item in this array is an object. They all share a common shape — like rows in a spreadsheet where every row has the same column names but different values.`,
      );
    }
  }

  return b.getItems();
}

// ─── YAML ─────────────────────────────────────────────────────────────────────

function parseYAML(code: string): TranslationItem[] {
  const b = new Builder();

  // Document marker
  if (/^---/m.test(code)) {
    b.add('Document Marker', 'color-syntax-muted', '---',
      '"---" marks the start of a YAML document. A single file can contain multiple YAML documents separated by this marker — like chapter dividers in a book.',
    );
  }

  // Top-level keys (no leading whitespace)
  const topKeys: string[] = [];
  for (const m of code.matchAll(/^([\w-]+)\s*:/gm)) topKeys.push(m[1]);
  if (topKeys.length > 0) {
    const uniq = [...new Set(topKeys)].slice(0, 5);
    b.add('Top-Level Keys', 'color-syntax-primary', uniq.join(': …,  ') + ': …',
      `Top-level keys like "${uniq.join('", "')}" are the main sections of this config. Each is a labeled container — like the top-level headings of a settings file.`,
    );
  }

  // Nested keys (indented)
  const nestedKeys: string[] = [];
  for (const m of code.matchAll(/^  +([\w-]+)\s*:/gm)) nestedKeys.push(m[1]);
  if (nestedKeys.length > 0) {
    const uniq = [...new Set(nestedKeys)].slice(0, 4);
    b.add('Nested Keys', 'color-syntax-secondary', uniq.join(': …,  ') + ': …',
      `Nested keys like "${uniq.join('", "')}" are sub-properties inside their parent section. Indentation is meaningful in YAML — it defines the hierarchy, like sub-bullets under a heading.`,
    );
  }

  // List items
  const listItems: string[] = [];
  for (const m of code.matchAll(/^\s*-\s+(.+)/gm)) listItems.push(m[1].trim());
  if (listItems.length > 0) {
    b.add('List Items', 'color-syntax-value',
      `- ${listItems.slice(0, 3).map(v => trunc(v, 20)).join('\n- ')}`,
      `Items starting with "- " form a list. YAML lists are equivalent to JSON arrays — an ordered collection of values. Like a bulleted list where each dash introduces one entry.`,
    );
  }

  // String values (quoted or unquoted)
  const strVals: string[] = [];
  for (const m of code.matchAll(/:\s+["']?([A-Za-z][^#\n"']{2,40})["']?$/gm)) strVals.push(m[1].trim());
  if (strVals.length > 0) {
    b.add('String Values', 'color-syntax-value',
      strVals.slice(0, 3).map(v => trunc(v, 22)).join(', '),
      'String values hold text data — names, paths, descriptions, or identifiers. Unlike JSON, most YAML strings don\'t need quotes unless they contain special characters.',
    );
  }

  // Numeric values
  const numVals = [...new Set(code.match(/:\s+\d+(?:\.\d+)?$/gm) ?? [])].slice(0, 3);
  if (numVals.length > 0) {
    b.add('Numeric Values', 'color-syntax-value', numVals.map(v => v.trim()).join(', '),
      'Numeric values (no quotes needed in YAML) store counts, ports, timeouts, or measurements — any number the configuration uses directly.',
    );
  }

  // Boolean values
  if (/:\s+(?:true|false|yes|no|on|off)$/mi.test(code)) {
    b.add('Boolean Values', 'color-syntax-value', 'true / false / yes / no',
      'YAML supports several spellings for booleans: true/false, yes/no, on/off. They all represent an on/off switch — enabling or disabling a feature or behavior.',
    );
  }

  // Anchors & aliases
  const anchors: string[] = [];
  for (const m of code.matchAll(/&(\w+)/g)) anchors.push(m[1]);
  if (anchors.length > 0) {
    b.add('Anchors & Aliases', 'color-syntax-accent', `&${anchors[0]}  /  *${anchors[0]}`,
      `"&${anchors[0]}" defines a named anchor — a reusable block of config. Wherever "*${anchors[0]}" appears it pastes in that block, avoiding repetition. Like a copy-paste shortcut built into the file format.`,
    );
  }

  // Multi-line blocks
  if (/:\s*[|>]/.test(code)) {
    b.add('Multi-Line Block', 'color-syntax-secondary', ': |  or  : >',
      '"| " (literal block) and "> " (folded block) let a value span multiple lines. "|" preserves newlines as-is; ">" folds them into spaces. Useful for embedding long text like scripts or descriptions.',
    );
  }

  // Comments
  if (/#.+/.test(code)) {
    b.add('Comments', 'color-syntax-muted', '# …',
      'Lines starting with "#" are comments — human-readable notes that YAML parsers ignore. Like margin annotations in a printed document.',
    );
  }

  return b.getItems();
}

// ─── TOML ─────────────────────────────────────────────────────────────────────

function parseTOML(code: string): TranslationItem[] {
  const b = new Builder();

  // Section tables [section] and [[array tables]]
  const tables: string[] = [];
  for (const m of code.matchAll(/^\[{1,2}([\w."'-]+)\]{1,2}$/gm)) tables.push(m[1]);
  if (tables.length > 0) {
    const shown = tables.slice(0, 4);
    b.add('Tables', 'color-syntax-primary', shown.map(t => `[${t}]`).join(', '),
      `Tables like [${shown.slice(0, 2).join('], [')}] are named sections that group related settings together — like labeled tabs on a binder. "[[table]]" (double brackets) creates an array of those sections.`,
    );
  }

  // Key = value pairs
  const pairs: string[] = [];
  for (const m of code.matchAll(/^([\w.-]+)\s*=\s*(.+)/gm)) pairs.push(`${m[1]} = ${trunc(m[2], 25)}`);
  if (pairs.length > 0) {
    b.add('Key-Value Pairs', 'color-syntax-secondary', pairs.slice(0, 3).join('\n'),
      'TOML is built on "key = value" pairs. The key names the setting; the value is its data. Like filling in a labeled form — the left side is the label, the right side is what you write in.',
    );
  }

  // String values
  const strVals: string[] = [];
  for (const m of code.matchAll(/=\s*"([^"\n]{2,40})"/g)) strVals.push(`"${m[1]}"`);
  if (strVals.length > 0) {
    b.add('String Values', 'color-syntax-value', strVals.slice(0, 3).join(', '),
      'String values are text wrapped in double quotes — names, paths, URLs, or any configuration text. Triple-quoted strings (""") can span multiple lines.',
    );
  }

  // Integer / float values
  const numVals = [...new Set(code.match(/=\s*\d+(?:\.\d+)?(?:\s*#.*)?$/gm) ?? [])].slice(0, 3);
  if (numVals.length > 0) {
    b.add('Numeric Values', 'color-syntax-value', numVals.map(v => v.trim()).join(', '),
      'Numeric values are written without quotes. Integers store whole numbers; floats store decimals. TOML also supports hex (0xFF), octal (0o77), and binary (0b1010) integers.',
    );
  }

  // Boolean values
  if (/=\s*(?:true|false)$/m.test(code)) {
    b.add('Boolean Values', 'color-syntax-value', 'true / false',
      'TOML booleans are always lowercase "true" or "false" — never "True" or "yes". They act as on/off switches for feature flags or optional behaviors.',
    );
  }

  // Inline arrays
  if (/=\s*\[/.test(code)) {
    b.add('Arrays', 'color-syntax-secondary', 'key = [ … ]',
      'Arrays store multiple values under one key. TOML arrays are type-homogeneous — all items must be the same type. Like a list of allowed values for a single setting.',
    );
  }

  // Inline tables
  if (/=\s*\{/.test(code)) {
    b.add('Inline Tables', 'color-syntax-secondary', 'key = { … }',
      'Inline tables pack an entire object onto one line — handy for compact nested config like coordinates or single-record settings.',
    );
  }

  // Date / time
  if (/\d{4}-\d{2}-\d{2}[T ]?\d{2}:\d{2}/.test(code)) {
    b.add('Date/Time', 'color-syntax-value', 'YYYY-MM-DDTHH:MM:SS',
      'TOML has a native datetime type — values that look like ISO 8601 timestamps are parsed as typed dates, not plain strings. No quotes needed.',
    );
  }

  // Comments
  if (/#.+/.test(code)) {
    b.add('Comments', 'color-syntax-muted', '# …',
      '"#" starts a comment. Everything after it on that line is ignored by the parser — a place to explain intent to future readers without affecting behavior.',
    );
  }

  return b.getItems();
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function parseMarkdown(code: string): TranslationItem[] {
  const b = new Builder();

  // Headings
  const headingMatches = [...code.matchAll(/^(#{1,6})\s+(.+)/gm)];
  const headings: string[] = headingMatches.map(m => `${m[1]} ${trunc(m[2], 35)}`);
  if (headings.length > 0) {
    b.add('Headings', 'color-syntax-primary', headings.slice(0, 3).join('\n'),
      `Headings (# through ######) define the document outline. "#" is the largest (title); "##" is a section; "###" is a subsection — like heading levels in a word processor.`,
      headingMatches[0][0],
    );
  }

  // Paragraphs
  const paraCount = (code.match(/\n\n[^#\-*>|`\d]/g) ?? []).length + 1;
  const firstParaMatch = code.match(/^(?!#|[-*+>]|```|\||\d+\.)(.{4,})/m);
  if (paraCount > 0 && !/^#{1,6}\s/.test(code.trim())) {
    b.add('Paragraphs', 'color-syntax-value', `${paraCount} paragraph block${paraCount > 1 ? 's' : ''}`,
      'Plain text blocks separated by blank lines become paragraphs. Markdown renders them as standard readable text — no special markup needed.',
      firstParaMatch?.[0].slice(0, 40),
    );
  }

  // Bold / italic
  const boldMatch   = code.match(/\*\*.+?\*\*|__.+?__/);
  const italicMatch = code.match(/(?<!\*)\*(?!\*).+?\*(?!\*)|\b_[^_]+_\b/);
  if (boldMatch || italicMatch) {
    b.add('Emphasis', 'color-syntax-accent',
      [boldMatch && '**bold**', italicMatch && '*italic*'].filter(Boolean).join('  '),
      '"**text**" renders as bold; "*text*" renders as italic. Double asterisks add strong importance; single asterisks add stress — like underlining or italicizing in a document.',
      (boldMatch ?? italicMatch)![0],
    );
  }

  // Links
  const linkMatches = [...code.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
  const links: string[] = linkMatches.map(m => `[${m[1]}](${trunc(m[2], 25)})`);
  if (links.length > 0) {
    b.add('Links', 'color-syntax-accent', links.slice(0, 2).join('  '),
      '"[text](url)" creates a clickable hyperlink. The text inside [] is what users see; the URL inside () is where the link goes — like a signpost with a label and a destination.',
      linkMatches[0][0],
    );
  }

  // Images
  const imageMatch = code.match(/!\[.*?\]\(.+?\)/);
  if (imageMatch) {
    b.add('Images', 'color-syntax-accent', '![alt](url)',
      '"![alt text](image-url)" embeds an image. The "!" differentiates it from a regular link; the alt text describes the image for screen readers and when the image fails to load.',
      imageMatch[0],
    );
  }

  // Unordered lists
  const bulletMatches = code.match(/^\s*[-*+]\s+.+/gm) ?? [];
  if (bulletMatches.length > 0) {
    b.add('Unordered List', 'color-syntax-secondary', `- item  (${bulletMatches.length} items)`,
      `"- ", "* ", or "+ " start bullet list items. Each is a discrete entry in an unordered list — like a shopping list where sequence doesn't matter.`,
      bulletMatches[0]?.trim(),
    );
  }

  // Ordered lists
  const orderedMatches = code.match(/^\s*\d+\.\s+.+/gm) ?? [];
  if (orderedMatches.length > 0) {
    b.add('Ordered List', 'color-syntax-secondary', `1. item  (${orderedMatches.length} items)`,
      'Numbers followed by "." create ordered (numbered) lists. Use these when sequence matters — like step-by-step instructions.',
      orderedMatches[0]?.trim(),
    );
  }

  // Code blocks
  const codeBlockMatches = code.match(/^```[\s\S]*?^```/gm) ?? [];
  const inlineCodeMatches = code.match(/`[^`\n]+`/g) ?? [];
  if (codeBlockMatches.length > 0 || inlineCodeMatches.length > 0) {
    b.add('Code', 'color-syntax-value',
      [codeBlockMatches.length > 0 && '``` … ```', inlineCodeMatches.length > 0 && '`inline`'].filter(Boolean).join('  '),
      'Backticks mark code. Triple backticks (```) create fenced code blocks, often with a language label for syntax highlighting. Single backticks create inline code — useful for variable names or commands within prose.',
      codeBlockMatches[0]?.slice(0, 3) ?? inlineCodeMatches[0],
    );
  }

  // Blockquotes
  const blockquoteMatch = code.match(/^>\s+.+/m);
  if (blockquoteMatch) {
    b.add('Blockquotes', 'color-syntax-muted', '> quoted text',
      '">" at the start of a line creates a blockquote — indented quoted content, typically used for pull-quotes or callouts. Like a visual indent for something worth highlighting.',
      blockquoteMatch[0],
    );
  }

  // Tables
  const tableRowMatch = code.match(/\|.+\|/);
  if (tableRowMatch && /\|-+/.test(code)) {
    b.add('Table', 'color-syntax-secondary', '| col | col |\n|-----|-----|',
      'Markdown tables use "|" to separate columns and "---" to separate the header row from the data rows. Like a simple spreadsheet embedded in plain text.',
      tableRowMatch[0],
    );
  }

  // Horizontal rule
  if (/^(?:---|\*\*\*|___)\s*$/m.test(code)) {
    b.add('Horizontal Rule', 'color-syntax-muted', '---',
      '"---" (three or more dashes) inserts a horizontal dividing line — a visual separator between document sections.',
      '---',
    );
  }

  // Front matter
  if (/^---[\s\S]+?^---/m.test(code)) {
    b.add('Front Matter', 'color-syntax-accent', '---\nkey: value\n---',
      'YAML front matter between "---" delimiters stores document metadata (title, date, tags) at the top. Tools like Jekyll and Hugo use this to configure how the document is processed.',
    );
  }

  return b.getItems();
}

// ─── XML ──────────────────────────────────────────────────────────────────────

function parseXML(code: string): TranslationItem[] {
  const b = new Builder();

  if (/^<\?xml\s/i.test(code.trim())) {
    b.add('XML Declaration', 'color-syntax-muted', '<?xml version="…" ?>',
      'The XML declaration tells parsers the version of XML and optionally the character encoding. It\'s not a tag — it\'s a processing instruction that must appear on the first line.',
    );
  }

  // Processing instructions (other than xml decl)
  for (const m of code.matchAll(/<\?(\w+)[^?]*\?>/g)) {
    if (m[1].toLowerCase() !== 'xml') {
      b.add('Processing Instruction', 'color-syntax-muted', `<?${m[1]} … ?>`,
        `"<?${m[1]}" is a processing instruction — a directive aimed at specific applications rather than the document content itself. Like a sticky note attached to the document addressed to the reader's tools.`,
      );
    }
  }

  // Root element
  const rootMatch = code.match(/<([A-Za-z][A-Za-z0-9_:-]*)[\s>]/);
  if (rootMatch && rootMatch[1].toLowerCase() !== '?xml') {
    b.add('Root Element', 'color-syntax-primary', `<${rootMatch[1]}>`,
      `"<${rootMatch[1]}>" is the root element — the single outermost tag that wraps the entire document. Every valid XML document must have exactly one root element, like the outer shell of a nested set of boxes.`,
    );
  }

  // Child elements
  const childTags = new Set<string>();
  for (const m of code.matchAll(/<([A-Za-z][A-Za-z0-9_:-]*)[\s>/]/g)) {
    const tag = m[1];
    if (tag !== rootMatch?.[1] && tag.toLowerCase() !== '?xml') childTags.add(tag);
  }
  if (childTags.size > 0) {
    const list = [...childTags].slice(0, 5);
    b.add('Child Elements', 'color-syntax-secondary', list.map(t => `<${t}>`).join(', '),
      `Tags like <${list.slice(0, 3).join('>, <')}> are child elements nested inside their parent. XML structures data as a tree — each element can contain text, attributes, and other elements.`,
    );
  }

  // Attributes
  const xmlAttrs = new Set<string>();
  for (const m of code.matchAll(/\s([A-Za-z][\w:-]*)="[^"]*"/g)) xmlAttrs.add(m[1]);
  if (xmlAttrs.size > 0) {
    const list = [...xmlAttrs].slice(0, 4);
    b.add('Attributes', 'color-syntax-accent', list.map(a => `${a}="…"`).join('  '),
      `Attributes like "${list.join('", "')}" live inside the opening tag and describe or configure that element. Like adjectives — they don't add child elements but modify the element's meaning or behavior.`,
    );
  }

  // Namespaces
  const nsAttrs = new Set<string>();
  for (const m of code.matchAll(/\s(xmlns(?::\w+)?)=/g)) nsAttrs.add(m[1]);
  if (nsAttrs.size > 0) {
    b.add('Namespaces', 'color-syntax-muted', [...nsAttrs].slice(0, 2).map(n => `${n}="…"`).join('  '),
      'Namespaces (xmlns) prevent naming conflicts when combining XML from different sources. Think of them as last names — two elements called "date" from different vocabularies become distinguishable.',
    );
  }

  // CDATA sections
  if (/<!\[CDATA\[/.test(code)) {
    b.add('CDATA Section', 'color-syntax-value', '<![CDATA[ … ]]>',
      '"CDATA" sections contain raw text that the XML parser ignores — useful for embedding characters like < and & without escaping. Like wrapping text in a "do not parse" envelope.',
    );
  }

  // Comments
  if (/<!--/.test(code)) {
    b.add('Comments', 'color-syntax-muted', '<!-- … -->',
      'XML comments are wrapped in "<!-- -->". Their content is ignored by parsers — notes for human readers describing the document structure or intent.',
    );
  }

  // Text content
  const textContent = code.match(/>([A-Za-z][^<]{3,50})</g) ?? [];
  const firstText = textContent[0];
  if (firstText) {
    const sample = firstText.replace(/^>/, '').replace(/<$/, '').trim();
    b.add('Text Content', 'color-syntax-value', `"${trunc(sample, 40)}"`,
      'Text content between tags is the actual data the XML encodes — not structure or configuration, but the real information being represented.',
    );
  }

  return b.getItems();
}

// ─── Bash / Shell ─────────────────────────────────────────────────────────────

function parseBash(code: string): TranslationItem[] {
  const b = new Builder();

  // Shebang
  const shebangMatch = code.match(/^#!(\/\S+)/);
  if (shebangMatch) {
    b.add('Shebang', 'color-syntax-muted', `#!${shebangMatch[1]}`,
      `The shebang line tells the OS which interpreter to use when running this file directly. "#!${shebangMatch[1]}" means "run this script with ${shebangMatch[1].split('/').pop()}".`,
    );
  }

  // set options
  const setOpts = code.match(/^set\s+-[\w]+/m);
  if (setOpts) {
    b.add('Set Options', 'color-syntax-accent', setOpts[0],
      '"set -e" (exit on error), "set -u" (error on undefined var), and "set -x" (trace execution) are safety flags. Like turning on strict mode — the script stops or reports rather than silently misbehaving.',
    );
  }

  // Variable assignments
  const bashVars: string[] = [];
  for (const m of code.matchAll(/^([A-Z_][A-Z0-9_]*)=(.+)/gm)) bashVars.push(`${m[1]}="${trunc(m[2], 20)}"`);
  for (const m of code.matchAll(/^([a-z_]\w*)=(.+)/gm)) bashVars.push(`${m[1]}="${trunc(m[2], 20)}"`);
  if (bashVars.length > 0) {
    const shown = [...new Set(bashVars)].slice(0, 3);
    b.add('Variables', 'color-syntax-secondary', shown.join('\n'),
      'Shell variables are set with "name=value" (no spaces around "="). Uppercase names are a convention for environment/global variables. Reference them later with "$NAME" or "${NAME}".',
    );
  }

  // Environment variable exports
  const exports: string[] = [];
  for (const m of code.matchAll(/\bexport\s+(\w+)/g)) exports.push(m[1]);
  if (exports.length > 0) {
    b.add('Export', 'color-syntax-accent', `export ${exports.slice(0, 3).join(', ')}`,
      `"export" makes a variable available to child processes — like posting it on a public notice board so other programs can read it. Unexported variables are private to the current shell.`,
    );
  }

  // Functions
  for (const m of code.matchAll(/^(?:function\s+)?(\w+)\s*\(\s*\)\s*\{/gm)) {
    b.add('Function', 'color-syntax-primary', `${m[1]}() { … }`,
      `"${m[1]}" is a shell function — a named, reusable block of commands. Call it by typing its name just like any other command. Arguments are accessed via $1, $2, etc.`,
    );
  }

  // Conditionals
  if (/\bif\s+[[({]/.test(code) || /\bif\s+\w/.test(code)) {
    b.add('Conditional', 'color-syntax-accent', 'if [ … ]; then … fi',
      '"if/then/fi" runs commands only when a condition is true. "[[ ]]" is the modern test syntax. Like checking a condition before deciding which path to take.',
    );
  }

  // For loops
  const forMatch = code.match(/\bfor\s+(\w+)\s+in\s+(.+?);?\s*do/);
  if (forMatch) {
    b.add('For Loop', 'color-syntax-accent', `for ${forMatch[1]} in ${trunc(forMatch[2], 25)}; do`,
      'A "for" loop iterates over a list of values. Each iteration assigns the next item to the loop variable and runs the commands between "do" and "done".',
    );
  }

  // While loops
  if (/\bwhile\s+/.test(code)) {
    b.add('While Loop', 'color-syntax-accent', 'while [ … ]; do … done',
      '"while" keeps looping as long as the condition is true — like "keep checking until this is done". Common for polling, retrying, or reading line by line.',
    );
  }

  // Command substitution $() or backticks
  if (/\$\(/.test(code) || /`[^`]+`/.test(code)) {
    b.add('Command Substitution', 'color-syntax-value', '$(command)  or  `command`',
      '"$(command)" runs a command and substitutes its output in place — like asking a calculator for a result and using that number in your next sentence.',
    );
  }

  // Pipes
  if (/\|\s*\w/.test(code)) {
    b.add('Pipes', 'color-syntax-secondary', 'cmd1 | cmd2',
      'The pipe "|" feeds the output of one command directly into the next — like an assembly line where each station processes what the previous one produced.',
    );
  }

  // Redirects
  if (/[><]{1,2}/.test(code)) {
    b.add('Redirects', 'color-syntax-muted', '> file  /  >> file  /  < file',
      '">" writes output to a file (overwriting); ">>" appends; "<" reads input from a file. Like routing water through different pipes instead of letting it flow to the default destination.',
    );
  }

  // Common commands
  const cmds = new Set<string>();
  for (const m of code.matchAll(/^\s*(?:sudo\s+)?(cd|ls|cp|mv|rm|mkdir|echo|cat|grep|sed|awk|curl|wget|git|docker|npm|yarn|pip|chmod|chown)\b/gm)) {
    cmds.add(m[1]);
  }
  if (cmds.size > 0) {
    const list = [...cmds].slice(0, 5);
    b.add('Commands', 'color-syntax-value', list.join(', '),
      `Commands like "${list.join('", "')}" are the actual actions being performed. Each is a program installed on the system — running a command is like calling a tool by name to do a specific job.`,
    );
  }

  // Comments
  if (/#(?![!]).+/.test(code)) {
    b.add('Comments', 'color-syntax-muted', '# …',
      '"#" starts a comment (except on the shebang line). Comments are notes for humans — they document intent, explain tricky parts, or temporarily disable commands.',
    );
  }

  return b.getItems();
}

// ─── GraphQL ──────────────────────────────────────────────────────────────────

function parseGraphQL(code: string): TranslationItem[] {
  const b = new Builder();

  // Schema definitions
  for (const m of code.matchAll(/\btype\s+(\w+)\s*(?:implements\s+[\w&\s]+)?\s*\{/g)) {
    b.add('Type Definition', 'color-syntax-primary', `type ${m[1]} { … }`,
      `"type ${m[1]}" defines the shape of an object in the GraphQL schema — listing all fields and their types. Like a form template specifying what data is required and in what format.`,
      m[1],
    );
  }

  for (const m of code.matchAll(/\binterface\s+(\w+)\s*\{/g)) {
    b.add('Interface', 'color-syntax-primary', `interface ${m[1]} { … }`,
      `"interface ${m[1]}" is a shared contract — any type that implements it must provide these fields. Like a checklist every implementing type must satisfy.`,
      m[1],
    );
  }

  for (const m of code.matchAll(/\bunion\s+(\w+)\s*=/g)) {
    b.add('Union', 'color-syntax-secondary', `union ${m[1]} = …`,
      `"union ${m[1]}" means a field can return any one of several types. Like a container that could hold a book, a magazine, or a newspaper — you check which one you got before reading it.`,
      m[1],
    );
  }

  for (const m of code.matchAll(/\benum\s+(\w+)\s*\{/g)) {
    b.add('Enum', 'color-syntax-secondary', `enum ${m[1]} { … }`,
      `"enum ${m[1]}" defines a fixed set of allowed values. Like a dropdown menu — the field can only be one of the listed options, nothing else.`,
      m[1],
    );
  }

  // Operations
  for (const m of code.matchAll(/\b(query|mutation|subscription)\s+(\w+)/g)) {
    const opType = m[1];
    b.add(`${opType.charAt(0).toUpperCase() + opType.slice(1)}`, 'color-syntax-primary',
      `${opType} ${m[2]} { … }`,
      opType === 'query'
        ? `"query ${m[2]}" fetches data from the server — like a read-only GET request. It specifies exactly which fields to return, so you only receive what you asked for.`
        : opType === 'mutation'
          ? `"mutation ${m[2]}" changes data on the server — create, update, or delete. Like a form submission that modifies the server's state and returns the updated result.`
          : `"subscription ${m[2]}" keeps a live connection open for real-time updates — like subscribing to a news feed that pushes new items as they arrive.`,
      m[2],
    );
  }

  // Anonymous queries / mutations
  if (/^(?:query|mutation|subscription)\s*\{/m.test(code)) {
    b.add('Anonymous Operation', 'color-syntax-primary', '{ … }',
      'An unnamed operation without an explicit "query" keyword. Shorthand for simple queries — allowed when there\'s only one operation in the document.',
    );
  }

  // Fields
  const fields: string[] = [];
  for (const m of code.matchAll(/^\s{2,}(\w+)(?:\s*\(|:|\s*\{|\s*$)/gm)) fields.push(m[1]);
  if (fields.length > 0) {
    const uniq = [...new Set(fields)].slice(0, 5);
    b.add('Fields', 'color-syntax-secondary', uniq.join(', '),
      `Fields like "${uniq.join('", "')}" are the individual pieces of data requested or defined. In a query, only listed fields are returned — no extras. In a schema, they define what data each type exposes.`,
    );
  }

  // Arguments
  const args: string[] = [];
  for (const m of code.matchAll(/\(([^)]+)\)/g)) {
    for (const a of m[1].split(',')) {
      const name = a.trim().match(/^\$?(\w+)/);
      if (name) args.push(name[1]);
    }
  }
  if (args.length > 0) {
    const uniq = [...new Set(args)].slice(0, 4);
    b.add('Arguments', 'color-syntax-accent', uniq.map(a => `(${a}: …)`).join('  '),
      `Arguments like "${uniq.join('", "')}" pass parameters to fields — filtering, sorting, or configuring what data is returned. Like search filters: "give me users where id = 42".`,
    );
  }

  // Variables
  const vars: string[] = [];
  for (const m of code.matchAll(/\$(\w+):\s*(\w+[!]?)/g)) vars.push(`$${m[1]}: ${m[2]}`);
  if (vars.length > 0) {
    b.add('Variables', 'color-syntax-value', vars.slice(0, 3).join(', '),
      'GraphQL variables (prefixed with "$") inject dynamic values into operations at runtime — like function parameters. They keep queries reusable and prevent injection attacks.',
    );
  }

  // Directives
  const dirs = new Set<string>();
  for (const m of code.matchAll(/@(\w+)/g)) dirs.add(`@${m[1]}`);
  if (dirs.size > 0) {
    b.add('Directives', 'color-syntax-accent', [...dirs].slice(0, 3).join(', '),
      `Directives like "${[...dirs].slice(0, 3).join('", "')}" conditionally modify execution or schema behavior. "@include" and "@skip" control whether a field is fetched; "@deprecated" marks schema fields as obsolete.`,
    );
  }

  // Fragments
  for (const m of code.matchAll(/\bfragment\s+(\w+)\s+on\s+(\w+)/g)) {
    b.add('Fragment', 'color-syntax-secondary', `fragment ${m[1]} on ${m[2]}`,
      `"fragment ${m[1]}" is a reusable selection of fields on type "${m[2]}". Spread it anywhere with "...${m[1]}" to avoid repeating the same field list — like a named group of checkboxes you can include wholesale.`,
    );
  }

  return b.getItems();
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function parseGeneric(code: string, language: string): TranslationItem[] {
  const b = new Builder();
  const lines = code.split('\n').filter(l => l.trim()).length;

  const strings = [...new Set(code.match(/["'][^"'\n]{3,50}["']/g) ?? [])];
  if (strings.length > 0) {
    b.add('String Values', 'color-syntax-value', strings.slice(0, 3).join(', '),
      'Strings are text values enclosed in quotes — names, messages, identifiers, or any human-readable data the code works with.',
    );
  }

  const nums = [...new Set(code.match(/\b\d+(?:\.\d+)?\b/g) ?? [])];
  if (nums.length > 0) {
    b.add('Numeric Values', 'color-syntax-value', nums.slice(0, 5).join(', '),
      'Numeric literals are hardcoded numbers — counts, sizes, thresholds, or identifiers used in calculations or comparisons.',
    );
  }

  b.add(`${language} Code`, 'color-syntax-primary', `${lines}-line snippet`,
    `This ${lines}-line ${language} snippet could not be fully parsed locally. For a detailed semantic breakdown, select a cloud AI provider (Gemini, OpenAI, or Claude) from the Model dropdown and add your API key.`,
  );

  return b.getItems();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function translateLocally(code: string): TranslationResult {
  const language = detectLanguage(code);
  const lang = language.toLowerCase();

  let items: TranslationItem[];
  if (lang.includes('javascript') || lang.includes('typescript')) {
    items = parseJSTS(code);
  } else if (lang === 'python') {
    items = parsePython(code);
  } else if (lang === 'html') {
    items = parseHTML(code);
  } else if (lang === 'css') {
    items = parseCSS(code);
  } else if (lang === 'sql') {
    items = parseSQL(code);
  } else if (lang === 'json') {
    items = parseJSON(code);
  } else if (lang === 'yaml') {
    items = parseYAML(code);
  } else if (lang === 'toml') {
    items = parseTOML(code);
  } else if (lang === 'markdown') {
    items = parseMarkdown(code);
  } else if (lang === 'xml') {
    items = parseXML(code);
  } else if (lang === 'bash') {
    items = parseBash(code);
  } else if (lang === 'graphql') {
    items = parseGraphQL(code);
  } else {
    items = parseGeneric(code, language);
  }

  return {
    language,
    items: items.length > 0 ? items : parseGeneric(code, language),
  };
}
