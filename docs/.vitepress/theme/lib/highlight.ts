import type { HighlighterCore } from 'shiki/core';

/** The languages of the generated snippets, by the `lang` of each snippet. */
const LANGS = {
  tsx: () => import('shiki/langs/tsx.mjs'),
  ts: () => import('shiki/langs/typescript.mjs'),
  vue: () => import('shiki/langs/vue.mjs'),
  svelte: () => import('shiki/langs/svelte.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'),
  swift: () => import('shiki/langs/swift.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  csharp: () => import('shiki/langs/csharp.mjs'),
} as const;

type Lang = keyof typeof LANGS;

let highlighter: Promise<HighlighterCore> | undefined;
const languages = new Map<Lang, Promise<void>>();

// Loaded on first use, and each grammar only when a tab needs it, so pages without generated code
// download nothing. Same engine and themes as the code blocks VitePress highlights at build time.
function load(): Promise<HighlighterCore> {
  highlighter ??= Promise.all([import('shiki/core'), import('shiki/engine/oniguruma')]).then(
    ([{ createHighlighterCore }, { createOnigurumaEngine }]) =>
      createHighlighterCore({
        engine: createOnigurumaEngine(import('shiki/wasm')),
        themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
        langs: [],
      }),
  );
  return highlighter;
}

function loadLanguage(shiki: HighlighterCore, lang: Lang): Promise<void> {
  let loading = languages.get(lang);
  if (!loading) {
    loading = shiki.loadLanguage(LANGS[lang]());
    languages.set(lang, loading);
  }
  return loading;
}

/**
 * The code as highlighted HTML (`<pre class="shiki">`), with the colors of both themes as CSS
 * variables; null for a language it does not know.
 */
export async function highlight(code: string, lang: string): Promise<string | null> {
  if (!(lang in LANGS)) return null;
  const shiki = await load();
  await loadLanguage(shiki, lang as Lang);
  return shiki.codeToHtml(code, {
    lang: lang === 'ts' ? 'typescript' : lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
}
