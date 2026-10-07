import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  completionKeymap,
  insertCompletionText,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { type Diagnostic, linter, lintGutter, lintKeymap } from '@codemirror/lint';
import { EditorState, type Extension, type Text } from '@codemirror/state';
import {
  EditorView,
  type Tooltip,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  hoverTooltip,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import type { PathStep, SchemaIndex } from './json-schema.ts';

type SyntaxNode = ReturnType<ReturnType<typeof syntaxTree>['resolveInner']>;

// ----- paths in the syntax tree -----

const VALUE_NODES = new Set(['Object', 'Array', 'String', 'Number', 'True', 'False', 'Null', '⚠']);

const unquote = (doc: Text, node: SyntaxNode) => {
  const raw = doc.sliceString(node.from, node.to);
  try {
    return JSON.parse(raw) as string;
  } catch {
    return raw.replace(/^"|"$/g, '');
  }
};

/** The `type` string of an Object node, used to pick the layout or shape variant. */
function discriminatorOf(doc: Text, object: SyntaxNode): string | undefined {
  for (let child = object.firstChild; child; child = child.nextSibling) {
    if (child.name !== 'Property') continue;
    const name = child.getChild('PropertyName');
    const value = name?.nextSibling?.nextSibling;
    if (name && unquote(doc, name) === 'type' && value?.name === 'String') return unquote(doc, value);
  }
  return undefined;
}

/** Steps from the document root to `node`, which is a value node. */
export function pathOf(doc: Text, node: SyntaxNode): PathStep[] {
  const steps: PathStep[] = [];
  let current: SyntaxNode | null = node;
  while (current?.parent) {
    const parent: SyntaxNode = current.parent;
    if (parent.name === 'Property') {
      const name = parent.getChild('PropertyName');
      const object = parent.parent;
      if (name && object) {
        steps.unshift({ key: unquote(doc, name), discriminator: discriminatorOf(doc, object) });
      }
      current = object;
      continue;
    }
    if (parent.name === 'Array') {
      let index = 0;
      for (let child = parent.firstChild; child && child.from < current.from; child = child.nextSibling) {
        if (VALUE_NODES.has(child.name) && child.name !== '⚠') index++;
      }
      steps.unshift({ key: index });
    }
    current = parent;
  }
  return steps;
}

function containerAt(state: EditorState, pos: number): SyntaxNode | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
  while (node && node.name !== 'Object' && node.name !== 'Array') node = node.parent;
  return node;
}

/** Node of a dotted path such as `parts[0].tracks[1].keyTimes`, or the deepest node that exists. */
export function locate(state: EditorState, path: string): { from: number; to: number } {
  const tree = syntaxTree(state);
  const root = tree.topNode.getChild('Object') ?? tree.topNode.getChild('Array');
  if (!root) return { from: 0, to: Math.min(1, state.doc.length) };
  const steps = [...path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map((m) => (m[2] !== undefined ? Number(m[2]) : m[1]!));
  let node: SyntaxNode = root;
  let range = { from: root.from, to: root.from + 1 };
  for (const step of steps) {
    let found: SyntaxNode | null = null;
    if (typeof step === 'string' && node.name === 'Object') {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        const name = child.name === 'Property' ? child.getChild('PropertyName') : null;
        if (name && unquote(state.doc, name) === step) {
          range = { from: name.from, to: name.to };
          found = name.nextSibling?.nextSibling ?? null;
          break;
        }
      }
    } else if (typeof step === 'number' && node.name === 'Array') {
      let index = 0;
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (!VALUE_NODES.has(child.name) || child.name === '⚠') continue;
        if (index++ === step) {
          range = { from: child.from, to: child.to };
          found = child;
          break;
        }
      }
    }
    if (!found) break;
    node = found;
  }
  return range;
}

// ----- lint -----

/** Where a `JSON.parse` error points, from the message (V8, SpiderMonkey, JavaScriptCore) or the tree. */
export function syntaxErrorPosition(state: EditorState, message: string): number {
  const position = /at position (\d+)/.exec(message);
  if (position) return Math.min(Number(position[1]), state.doc.length);
  const lineColumn = /line (\d+) column (\d+)/.exec(message);
  if (lineColumn) {
    const line = state.doc.line(Math.min(Number(lineColumn[1]), state.doc.lines));
    return Math.min(line.from + Number(lineColumn[2]) - 1, line.to);
  }
  let error = state.doc.length;
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.type.isError && node.from < error) error = node.from;
    },
  });
  return error;
}

export interface SpecProblems {
  /** null when the text is not JSON. */
  value: unknown;
  syntaxError: string | null;
  /** Messages of `validate()` and of preparing the spec. */
  errors: readonly string[];
}

const PATH_PREFIX = /^([A-Za-z_$][\w$]*(?:\[\d+\]|\.[A-Za-z_$][\w$]*)*)/;

/** Diagnostics for the editor: syntax errors, spec errors, and unknown fields the schema rejects. */
export function diagnostics(state: EditorState, problems: SpecProblems, schema: SchemaIndex | null): Diagnostic[] {
  if (problems.syntaxError !== null) {
    const from = syntaxErrorPosition(state, problems.syntaxError);
    return [{ from, to: Math.min(from + 1, state.doc.length), severity: 'error', message: problems.syntaxError }];
  }
  const result: Diagnostic[] = problems.errors.map((message) => {
    const path = PATH_PREFIX.exec(message)?.[1] ?? '';
    return { ...locate(state, path), severity: 'error', message };
  });
  if (schema) {
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name !== 'PropertyName' || !node.node.parent?.parent) return;
        const object = node.node.parent.parent;
        const path = pathOf(state.doc, object);
        const discriminator = discriminatorOf(state.doc, object);
        const known = schema.properties(path, discriminator);
        if (known.size === 0 || schema.allowsAnyProperty(path)) return;
        const name = unquote(state.doc, node.node);
        if (!known.has(name)) {
          result.push({ from: node.from, to: node.to, severity: 'warning', message: `"${name}" is not a field here; engines ignore it.` });
        }
      },
    });
  }
  return result;
}

// ----- completion and hover -----

function paramNames(state: EditorState): string[] {
  const root = syntaxTree(state).topNode.getChild('Object');
  if (!root) return [];
  for (let child = root.firstChild; child; child = child.nextSibling) {
    const name = child.name === 'Property' ? child.getChild('PropertyName') : null;
    const value = name?.nextSibling?.nextSibling;
    if (name && unquote(state.doc, name) === 'params' && value?.name === 'Object') {
      return value.getChildren('Property').flatMap((property) => {
        const key = property.getChild('PropertyName');
        return key ? [unquote(state.doc, key)] : [];
      });
    }
  }
  return [];
}

export function schemaCompletion(schema: SchemaIndex) {
  return (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context;
    const doc = state.doc;
    const before = doc.sliceString(Math.max(0, pos - 2000), pos);
    const token = /"?[\w$]*$/.exec(before)![0];
    const from = pos - token.length;
    const lead = before.slice(0, before.length - token.length).trimEnd();
    const previous = lead.at(-1);
    const to = doc.sliceString(pos, pos + 1) === '"' && token.startsWith('"') ? pos + 1 : pos;
    const container = containerAt(state, from);
    if (!container || (!context.explicit && token === '' && previous !== ':' && previous !== '[')) return null;
    const path = pathOf(doc, container);

    if (container.name === 'Object' && (previous === '{' || previous === ',')) {
      const present = new Set(
        container.getChildren('Property').flatMap((property) => {
          const key = property.getChild('PropertyName');
          return key && !(key.from <= pos && key.to >= from) ? [unquote(doc, key)] : [];
        }),
      );
      const quoted = token.startsWith('"');
      const options: Completion[] = [];
      for (const [name, property] of schema.properties(path, discriminatorOf(doc, container))) {
        if (present.has(name)) continue;
        const schemas = [schema.resolve(property)];
        const insert = quoted ? `${name}": ` : `"${name}": `;
        options.push({
          label: name,
          type: 'property',
          detail: schema.summary(schemas),
          info: schema.description(schemas),
          apply: (view, _completion, start, end) => {
            const closing = view.state.sliceDoc(end, end + 1) === '"' ? end + 1 : end;
            view.dispatch(insertCompletionText(view.state, insert, start, closing));
          },
        });
      }
      // The filter text is the range itself, so it must exclude both quotes to match the bare labels.
      return options.length > 0 ? { from: quoted ? from + 1 : from, to: pos, options, validFor: /^[\w$]*$/ } : null;
    }

    let valuePath: PathStep[] | null = null;
    if (container.name === 'Object' && previous === ':') {
      const key = /"((?:[^"\\]|\\.)*)"\s*$/.exec(lead.slice(0, -1))?.[1];
      if (key === undefined) return null;
      if (key === '$param') {
        const options = paramNames(state).map((name): Completion => ({ label: JSON.stringify(name), type: 'variable' }));
        return options.length > 0 ? { from, to, options } : null;
      }
      valuePath = [...path, { key, discriminator: discriminatorOf(doc, container) }];
    } else if (container.name === 'Array' && (previous === '[' || previous === ',')) {
      let index = 0;
      for (let child = container.firstChild; child && child.to <= from; child = child.nextSibling) {
        if (VALUE_NODES.has(child.name) && child.name !== '⚠') index++;
      }
      valuePath = [...path, { key: index }];
    }
    if (!valuePath) return null;
    const options = schema.values(valuePath).map(
      (hint): Completion => ({ label: hint.label, apply: hint.insert, detail: hint.detail, type: 'constant' }),
    );
    return options.length > 0 ? { from, to, options, validFor: /^"?[\w$]*"?$/ } : null;
  };
}

function renderInline(text: string, into: HTMLElement) {
  text.split(/(`[^`]+`)/).forEach((chunk) => {
    if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 1) {
      const code = document.createElement('code');
      code.textContent = chunk.slice(1, -1);
      into.append(code);
    } else into.append(chunk);
  });
}

export function schemaHover(schema: SchemaIndex) {
  return hoverTooltip((view, pos, side): Tooltip | null => {
    const node = syntaxTree(view.state).resolveInner(pos, side);
    if (node.name !== 'PropertyName' || !node.parent?.parent) return null;
    const object = node.parent.parent;
    const key = unquote(view.state.doc, node);
    const schemas = schema.at([...pathOf(view.state.doc, object), { key, discriminator: discriminatorOf(view.state.doc, object) }]);
    const description = schema.description(schemas);
    if (!description) return null;
    return {
      pos: node.from,
      end: node.to,
      above: true,
      create: () => {
        const dom = document.createElement('div');
        dom.className = 'lk-hover';
        const title = document.createElement('div');
        title.className = 'lk-hover-title';
        const name = document.createElement('code');
        name.textContent = key;
        title.append(name);
        const summary = schema.summary(schemas);
        if (summary) {
          const type = document.createElement('span');
          type.textContent = summary;
          title.append(' ', type);
        }
        const body = document.createElement('p');
        renderInline(description, body);
        dom.append(title, body);
        return { dom };
      },
    };
  });
}

// ----- editor -----

const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--lk-code-key)' },
  { tag: tags.string, color: 'var(--lk-code-string)' },
  { tag: tags.number, color: 'var(--lk-code-number)' },
  { tag: [tags.bool, tags.null], color: 'var(--lk-code-atom)' },
  { tag: [tags.brace, tags.squareBracket, tags.separator], color: 'var(--vp-c-text-2)' },
]);

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13.5px', color: 'var(--vp-c-text-1)', backgroundColor: 'var(--vp-code-block-bg)' },
  '&.cm-focused': { outline: '2px solid var(--vp-c-brand-1)', outlineOffset: '-2px' },
  '.cm-scroller': { fontFamily: 'var(--vp-font-family-mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--vp-c-brand-1)', padding: '12px 0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--vp-c-brand-1)' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--vp-c-text-3)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--lk-active-line)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--lk-selection) !important',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--vp-c-brand-soft)', outline: '1px solid var(--vp-c-brand-2)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--vp-c-bg-elv)',
    color: 'var(--vp-c-text-1)',
    border: '1px solid var(--vp-c-divider)',
    borderRadius: '8px',
    boxShadow: 'var(--vp-shadow-3)',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--vp-c-brand-soft)',
    color: 'var(--vp-c-text-1)',
  },
  '.cm-completionDetail': { color: 'var(--vp-c-text-2)', fontStyle: 'normal', marginLeft: '1em' },
  '.cm-completionInfo': { padding: '8px 10px', maxWidth: '320px', lineHeight: '1.5' },
  '.cm-diagnostic': { padding: '6px 10px' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--vp-c-danger-1)' },
  '.cm-diagnostic-warning': { borderLeftColor: 'var(--vp-c-warning-1)' },
  '.cm-placeholder': { color: 'var(--vp-c-text-3)' },
});

export interface EditorOptions {
  doc: string;
  label: string;
  /** Id of the element with the usage hint, announced with the label. */
  describedBy?: string;
  placeholderText: string;
  schema: SchemaIndex | null;
  /** Problems of the current text, computed by the caller (which also drives the preview). */
  problems: (text: string) => SpecProblems;
  onChange: (text: string) => void;
}

export function editorExtensions(options: EditorOptions): Extension[] {
  const { schema } = options;
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    foldGutter(),
    lintGutter(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    placeholder(options.placeholderText),
    json(),
    syntaxHighlighting(highlight),
    EditorState.tabSize.of(2),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...lintKeymap, indentWithTab]),
    linter((view) => diagnostics(view.state, options.problems(view.state.doc.toString()), schema), { delay: 250 }),
    ...(schema ? [autocompletion({ override: [schemaCompletion(schema)], icons: false }), schemaHover(schema)] : []),
    EditorView.contentAttributes.of({
      'aria-label': options.label,
      ...(options.describedBy ? { 'aria-describedby': options.describedBy } : {}),
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange(update.state.doc.toString());
    }),
    theme,
  ];
}

export function createEditor(parent: HTMLElement, options: EditorOptions): EditorView {
  return new EditorView({ parent, state: EditorState.create({ doc: options.doc, extensions: editorExtensions(options) }) });
}

/** Replaces the whole text as one undoable change. */
export function setText(view: EditorView, text: string) {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}
