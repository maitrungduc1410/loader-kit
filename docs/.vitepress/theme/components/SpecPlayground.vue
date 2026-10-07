<script setup lang="ts">
import { BUILTIN_INDICATORS, BUILTIN_INDICATOR_NAMES, type IndicatorSpec, InvalidIndicatorError, validate } from '@loader-kit/spec';
import { prepare } from '@loader-kit/web';
import type { EditorView } from '@codemirror/view';
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, useId, watch } from 'vue';
import type { SpecProblems } from '../lib/editor.ts';
import { EXAMPLES, EXAMPLE_IDS, exampleName } from '../lib/examples.ts';
import { formatJson } from '../lib/format-json.ts';
import { useStrings } from '../lib/i18n.ts';
import type { SchemaIndex } from '../lib/json-schema.ts';
import { paramControls } from '../lib/params.ts';
import { decodeHash, encodeSpecHash, ShareLinkError } from '../lib/share.ts';
import { useCopy } from '../lib/copy.ts';
import LoaderKitPreview from './LoaderKitPreview.vue';

const SCHEMA_URL = 'https://maitrungduc1410.github.io/loader-kit/schema/v1.json';
const STORAGE_KEY = 'loader-kit:playground';
const DEFAULT_SOURCE = 'builtin:BallPulse';

const { t } = useStrings();
const id = useId();

// ----- sources -----

function builtinText(name: string): string {
  const spec = BUILTIN_INDICATORS[name as keyof typeof BUILTIN_INDICATORS];
  return `${formatJson({ $schema: SCHEMA_URL, ...spec })}\n`;
}

function sourceText(source: string): string | null {
  const [kind, name = ''] = source.split(/:(.*)/s);
  if (kind === 'builtin' && (BUILTIN_INDICATOR_NAMES as readonly string[]).includes(name)) return builtinText(name);
  if (kind === 'example' && EXAMPLES[name] !== undefined) return EXAMPLES[name]!;
  return null;
}

// ----- analysis -----

let cache: { text: string; problems: SpecProblems } | null = null;

function analyze(text: string): SpecProblems {
  if (cache?.text === text) return cache.problems;
  let problems: SpecProblems;
  let value: unknown = null;
  try {
    value = JSON.parse(text);
  } catch (error) {
    problems = { value: null, syntaxError: (error as Error).message, errors: [] };
    cache = { text, problems };
    return problems;
  }
  const errors = validate(value);
  if (errors.length === 0) {
    try {
      prepare({ spec: value as IndicatorSpec });
    } catch (error) {
      errors.push(...(error instanceof InvalidIndicatorError ? error.errors : [(error as Error).message]));
    }
  }
  problems = { value, syntaxError: null, errors };
  cache = { text, problems };
  return problems;
}

const text = ref('');
const source = ref(DEFAULT_SOURCE);
const problems = computed(() => analyze(text.value));
const problemCount = computed(() => (problems.value.syntaxError ? 1 : problems.value.errors.length));

/** The last spec that passed, so the preview keeps playing while the text is being edited. */
const previewSpec = shallowRef<IndicatorSpec | null>(null);
let previewKey = '';
watch(
  problems,
  (value) => {
    if (value.syntaxError || value.errors.length > 0) return;
    const key = JSON.stringify(value.value);
    if (key === previewKey) return;
    previewKey = key;
    previewSpec.value = value.value as IndicatorSpec;
  },
  { immediate: true },
);
const stale = computed(() => problemCount.value > 0 && previewSpec.value !== null);
const previewError = ref<string | null>(null);

// ----- editor -----

const editorHost = ref<HTMLElement>();
const editor = shallowRef<EditorView | null>(null);
const schema = shallowRef<SchemaIndex | null>(null);
const schemaMissing = ref(false);
let editorLib: typeof import('../lib/editor.ts') | null = null;

interface ListedProblem {
  message: string;
  from: number;
  line: number;
  severity: 'error' | 'warning' | 'info' | 'hint';
}
const listed = shallowRef<ListedProblem[]>([]);

function refreshList() {
  const view = editor.value;
  if (!view || !editorLib) return;
  listed.value = editorLib.diagnostics(view.state, problems.value, schema.value).map((d) => ({
    message: d.message,
    from: d.from,
    line: view.state.doc.lineAt(d.from).number,
    severity: d.severity,
  }));
}

let listTimer: ReturnType<typeof setTimeout> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let loadedFromHash = false;

function onEditorChange(value: string) {
  text.value = value;
  clearTimeout(listTimer);
  listTimer = setTimeout(refreshList, 250);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Private mode or a full quota: the draft is just not kept.
    }
  }, 400);
  if (loadedFromHash) {
    loadedFromHash = false;
    history.replaceState(history.state, '', location.pathname + location.search);
  }
}

function load(value: string) {
  text.value = value;
  if (editor.value && editorLib) editorLib.setText(editor.value, value);
  refreshList();
}

function jumpTo(problem: ListedProblem) {
  const view = editor.value;
  if (!view) return;
  view.dispatch({ selection: { anchor: problem.from }, scrollIntoView: true });
  view.focus();
}

// ----- toolbar -----

const status = ref('');
let statusTimer: ReturnType<typeof setTimeout> | undefined;
function announce(message: string) {
  status.value = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.value = ''), 4000);
}

function onSourceChange() {
  const value = sourceText(source.value);
  if (value !== null) load(value);
}

function format() {
  const { value, syntaxError } = problems.value;
  if (syntaxError === null) load(`${formatJson(value)}\n`);
}

function reset() {
  load(sourceText(source.value) ?? builtinText('BallPulse'));
}

const { copy } = useCopy();

async function copyJson() {
  announce((await copy(text.value)) ? t('copied') : t('copyFailed'));
}

function download() {
  const name = (problems.value.value as { name?: unknown } | null)?.name;
  const file = `${typeof name === 'string' && /^[\w-]+$/.test(name) ? name : 'indicator'}.json`;
  const url = URL.createObjectURL(new Blob([text.value], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: file });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function share() {
  const hash = await encodeSpecHash(text.value);
  history.replaceState(history.state, '', `${location.pathname}${location.search}#${hash}`);
  loadedFromHash = true;
  announce((await copy(location.href)) ? t('linkCopied') : t('copyFailed'));
}

async function openHash(): Promise<boolean> {
  if (!location.hash) return false;
  try {
    const target = await decodeHash(location.hash);
    if (!target) return false;
    if (target.kind === 'spec') {
      source.value = '';
      load(target.json);
    } else if (target.kind === 'example') {
      if (EXAMPLES[target.id] === undefined) {
        announce(t('missingExample', { id: target.id }));
        return false;
      }
      source.value = `example:${target.id}`;
      load(EXAMPLES[target.id]!);
    } else {
      if (!(BUILTIN_INDICATOR_NAMES as readonly string[]).includes(target.name)) {
        announce(t('unknownIndicator', { name: target.name }));
        return false;
      }
      source.value = `builtin:${target.name}`;
      load(builtinText(target.name));
    }
    loadedFromHash = true;
    return true;
  } catch (error) {
    const message =
      error instanceof ShareLinkError
        ? t(error.reason === 'tooLarge' ? 'shareTooLarge' : 'shareNoDecompression')
        : (error as Error).message;
    announce(t('hashError', { message }));
    return false;
  }
}

const onHashChange = () => void openHash();

// ----- preview controls -----

const controls = computed(() => paramControls(previewSpec.value));
const paramValues = reactive<Record<string, number>>({});
watch(
  controls,
  (list, previous) => {
    const same =
      previous !== undefined &&
      list.length === previous.length &&
      list.every((c, i) => c.name === previous[i]!.name && c.default === previous[i]!.default);
    if (same) return;
    for (const key of Object.keys(paramValues)) delete paramValues[key];
    for (const control of list) paramValues[control.name] = control.default;
  },
  { immediate: true },
);
const params = computed(() => ({ ...paramValues }));

const colorMode = ref<'theme' | 'single' | 'multi'>('theme');
const color = ref('#7c3aed');
const colors = ref(['#7c3aed', '#06b6d4', '#f43f5e']);
const speed = ref(1);
const freeze = ref(false);
const progress = ref(0);
const background = ref<'page' | 'light' | 'dark'>('page');

const previewColor = computed(() => {
  if (colorMode.value === 'single') return color.value;
  if (colorMode.value === 'multi') return null;
  return background.value === 'light' ? '#6d28d9' : background.value === 'dark' ? '#c4b5fd' : null;
});
const previewColors = computed(() => (colorMode.value === 'multi' ? colors.value : null));
const cycleProgress = computed(() => (freeze.value ? progress.value : null));
const fixed = (value: number, step: number) => (step >= 1 ? String(value) : value.toFixed(2));

// ----- lifecycle -----

onMounted(async () => {
  window.addEventListener('hashchange', onHashChange);
  const [lib, loadedSchema] = await Promise.all([
    import('../lib/editor.ts'),
    import('../lib/schema-source.ts').then((m) => m.loadSchema()),
  ]);
  editorLib = lib;
  schema.value = loadedSchema;
  schemaMissing.value = loadedSchema === null;

  if (!(await openHash())) {
    let draft: string | null = null;
    try {
      draft = localStorage.getItem(STORAGE_KEY);
    } catch {
      draft = null;
    }
    if (draft?.trim() && draft !== builtinText('BallPulse')) {
      source.value = '';
      if (!status.value) announce(t('restored'));
      text.value = draft;
    } else {
      text.value = builtinText('BallPulse');
    }
  }
  const initial = text.value;
  if (!editorHost.value) return;
  editor.value = lib.createEditor(editorHost.value, {
    doc: initial,
    label: t('editorLabel'),
    describedBy: `${id}-editor-hint`,
    placeholderText: t('editorPlaceholder'),
    schema: loadedSchema,
    problems: analyze,
    onChange: onEditorChange,
  });
  refreshList();
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange);
  editor.value?.destroy();
  clearTimeout(listTimer);
  clearTimeout(saveTimer);
  clearTimeout(statusTimer);
});
</script>

<template>
  <div class="lk-playground">
    <div class="lk-pg-toolbar" role="toolbar" :aria-label="t('options')">
      <div class="lk-pg-source">
        <label :for="`${id}-source`">{{ t('startFrom') }}</label>
        <select :id="`${id}-source`" v-model="source" class="lk-input" @change="onSourceChange">
          <option value="" disabled>{{ t('draft') }}</option>
          <optgroup :label="t('builtins')">
            <option v-for="name in BUILTIN_INDICATOR_NAMES" :key="name" :value="`builtin:${name}`">{{ name }}</option>
          </optgroup>
          <optgroup v-if="EXAMPLE_IDS.length > 0" :label="t('examples')">
            <option v-for="example in EXAMPLE_IDS" :key="example" :value="`example:${example}`">
              {{ exampleName(example) }} ({{ example }})
            </option>
          </optgroup>
        </select>
      </div>
      <div class="lk-pg-actions">
        <button type="button" class="lk-button" :disabled="problems.syntaxError !== null" @click="format">{{ t('format') }}</button>
        <button type="button" class="lk-button" @click="copyJson">{{ t('copyJson') }}</button>
        <button type="button" class="lk-button" @click="download">{{ t('download') }}</button>
        <button type="button" class="lk-button lk-button-brand" @click="share">{{ t('share') }}</button>
        <button type="button" class="lk-button" @click="reset">{{ t('reset') }}</button>
      </div>
    </div>
    <p class="lk-pg-status" role="status" aria-live="polite">{{ status }}</p>

    <div class="lk-pg-main">
      <section class="lk-pg-editor-pane" :aria-labelledby="`${id}-editor-title`">
        <div class="lk-pg-pane-head">
          <h2 :id="`${id}-editor-title`" class="lk-pg-title">{{ t('editorLabel') }}</h2>
          <span
            class="lk-badge"
            :class="problemCount === 0 ? 'ok' : 'bad'"
          >{{ problemCount === 0 ? t('valid') : problems.syntaxError ? t('jsonError') : problemCount === 1 ? t('oneProblem') : t('problems', { count: problemCount }) }}</span>
        </div>
        <div ref="editorHost" class="lk-pg-editor">
          <p v-if="!editor" class="lk-pg-loading">{{ t('loadingEditor') }}</p>
        </div>
        <p :id="`${id}-editor-hint`" class="lk-muted lk-note">{{ t('editorHint') }}<template v-if="schemaMissing"> {{ t('noSchema') }}</template></p>
        <ul v-if="listed.length > 0" class="lk-pg-problems">
          <li v-for="(problem, index) in listed" :key="index" :class="problem.severity">
            <button type="button" @click="jumpTo(problem)">
              <span class="line">{{ problem.line }}</span>
              <span>{{ problem.message }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section class="lk-pg-preview-pane" :aria-labelledby="`${id}-preview-title`">
        <div class="lk-pg-pane-head">
          <h2 :id="`${id}-preview-title`" class="lk-pg-title">{{ t('preview') }}</h2>
          <div class="lk-segmented" role="radiogroup" :aria-label="t('background')">
            <label v-for="bg in (['page', 'light', 'dark'] as const)" :key="bg">
              <input v-model="background" type="radio" :name="`${id}-bg`" :value="bg" />
              <span>{{ bg === 'page' ? t('backgroundPage') : bg === 'light' ? t('backgroundLight') : t('backgroundDark') }}</span>
            </label>
          </div>
        </div>

        <div class="lk-pg-stage" :class="[`bg-${background}`, { stale }]">
          <template v-if="previewSpec">
            <LoaderKitPreview
              :spec="previewSpec"
              :params="params"
              :color="previewColor"
              :colors="previewColors"
              :speed="speed"
              :cycle-progress="cycleProgress"
              :size="160"
              @error="previewError = $event"
            />
            <div class="lk-pg-small" :aria-label="t('smallSizes')" role="group">
              <LoaderKitPreview
                v-for="small in [48, 24]"
                :key="small"
                :spec="previewSpec"
                :params="params"
                :color="previewColor"
                :colors="previewColors"
                :speed="speed"
                :cycle-progress="cycleProgress"
                :size="small"
              />
            </div>
          </template>
        </div>
        <p v-if="previewError" class="lk-error" role="alert">{{ t('cannotDraw') }} {{ previewError }}</p>

        <form class="lk-form" @submit.prevent>
          <fieldset v-if="controls.length > 0" class="lk-fieldset">
            <legend>{{ t('params') }}</legend>
            <div v-for="control in controls" :key="control.name" class="lk-field">
              <label :for="`${id}-param-${control.name}`"><code>{{ control.name }}</code></label>
              <input
                :id="`${id}-param-${control.name}`"
                v-model.number="paramValues[control.name]"
                type="range"
                :min="control.min"
                :max="control.max"
                :step="control.step"
              />
              <output :for="`${id}-param-${control.name}`">{{ fixed(paramValues[control.name] ?? control.default, control.step) }}</output>
            </div>
          </fieldset>

          <fieldset class="lk-fieldset">
            <legend>{{ t('color') }}</legend>
            <div class="lk-radios">
              <label><input v-model="colorMode" type="radio" value="theme" :name="`${id}-mode`" /> {{ t('themeColor') }}</label>
              <label><input v-model="colorMode" type="radio" value="single" :name="`${id}-mode`" /> {{ t('color') }}</label>
              <label><input v-model="colorMode" type="radio" value="multi" :name="`${id}-mode`" /> {{ t('perElementColors') }}</label>
            </div>
            <div v-if="colorMode === 'single'" class="lk-swatches">
              <input v-model="color" type="color" :aria-label="t('color')" />
              <code>{{ color }}</code>
            </div>
            <div v-else-if="colorMode === 'multi'" class="lk-swatches">
              <input
                v-for="(_, index) in colors"
                :key="index"
                v-model="colors[index]"
                type="color"
                :aria-label="`${t('colors')} ${index + 1}`"
              />
            </div>
          </fieldset>

          <div class="lk-field">
            <label :for="`${id}-speed`">{{ t('speed') }}</label>
            <input :id="`${id}-speed`" v-model.number="speed" type="range" min="0" max="3" step="0.05" />
            <output :for="`${id}-speed`">{{ speed.toFixed(2) }}×</output>
          </div>
          <label class="lk-check">
            <input v-model="freeze" type="checkbox" />
            {{ t('freeze') }}
          </label>
          <div class="lk-field">
            <label :for="`${id}-progress`"><code>cycleProgress</code></label>
            <input
              :id="`${id}-progress`"
              v-model.number="progress"
              type="range"
              min="0"
              max="1"
              step="0.01"
              @input="freeze = true"
            />
            <output :for="`${id}-progress`">{{ freeze ? progress.toFixed(2) : 'null' }}</output>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.lk-playground {
  max-width: 1376px;
  margin: 0 auto;
  padding: 24px 24px 64px;
}

@media (max-width: 640px) {
  .lk-playground {
    padding: 16px 12px 48px;
  }
}

.lk-pg-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lk-pg-source {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
}

.lk-pg-source select {
  max-width: 60vw;
}

.lk-pg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lk-pg-status {
  min-height: 20px;
  margin: 8px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.lk-pg-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}

@media (min-width: 960px) {
  .lk-pg-main {
    grid-template-columns: minmax(0, 1.25fr) minmax(320px, 1fr);
    align-items: start;
  }

  .lk-pg-preview-pane {
    position: sticky;
    top: calc(var(--vp-nav-height) + 16px);
  }
}

.lk-pg-pane-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.lk-pg-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.lk-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.lk-badge.ok {
  color: var(--vp-c-success-1);
  background: var(--vp-c-success-soft);
}

.lk-badge.bad {
  color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
}

.lk-pg-editor {
  height: min(560px, 64vh);
  min-height: 320px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--vp-code-block-bg);
}

.lk-pg-loading {
  margin: 0;
  padding: 16px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.lk-pg-problems {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  max-height: 200px;
  overflow: auto;
}

.lk-pg-problems button {
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  text-align: left;
  font-size: 13px;
  line-height: 1.45;
  color: var(--vp-c-text-1);
  background: var(--vp-c-danger-soft);
}

.lk-pg-problems li.warning button {
  background: var(--vp-c-warning-soft);
}

.lk-pg-problems button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
}

.lk-pg-problems .line {
  flex: none;
  min-width: 2.5em;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
}

.lk-pg-stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: 220px;
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--lk-stage-bg);
  transition: opacity 0.2s;
}

.lk-pg-stage.bg-light {
  background: #ffffff;
}

.lk-pg-stage.bg-dark {
  background: #111114;
}

.lk-pg-stage.stale {
  opacity: 0.55;
}

.lk-pg-small {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lk-pg-preview-pane .lk-form {
  margin-top: 16px;
}
</style>
