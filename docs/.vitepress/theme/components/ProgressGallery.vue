<script setup lang="ts">
import { LoaderKitProgress } from '@loader-kit/web/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { useBackdropClose } from '../lib/dialog.ts';
import { useSimulatedDownload } from '../lib/download.ts';
import { useStrings } from '../lib/i18n.ts';
import { PROGRESS_DESIGNS, type ProgressDesign, designTitle } from '../lib/progress.ts';
import { queryFromUrl } from '../lib/query.ts';
import ProgressControls from './ProgressControls.vue';

type Mode = 'download' | 'manual' | 'indeterminate';

const { t } = useStrings();
const id = useId();

const mode = ref<Mode>('download');
const smooth = ref(true);
const query = ref('');
const selected = ref<ProgressDesign | null>(null);
const dialog = ref<HTMLDialogElement>();

const download = useSimulatedDownload(computed(() => mode.value === 'download'));
onBeforeUnmount(download.stop);
onMounted(() => {
  query.value = queryFromUrl() ?? '';
});

const designs = computed(() => {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return PROGRESS_DESIGNS.map((design, index) => ({ design, index, title: designTitle(design) }))
    .filter((item) => words.every((word) => item.title.includes(word)))
    .map((item) => {
      const indeterminate = item.design.indeterminate || mode.value === 'indeterminate';
      return {
        ...item,
        value: indeterminate ? null : download.value.value,
        buffer: item.design.buffer && !indeterminate ? Math.min(1, download.value.value + 0.25) : null,
      };
    });
});

async function open(design: ProgressDesign) {
  selected.value = design;
  await nextTick();
  dialog.value?.showModal();
}

function close() {
  dialog.value?.close();
}

const backdrop = useBackdropClose(dialog, close);
</script>

<template>
  <div class="lk-pgal">
    <div class="lk-gallery-bar">
      <label class="visually-hidden" :for="`${id}-filter`">{{ t('filterProgress') }}</label>
      <input
        :id="`${id}-filter`"
        v-model="query"
        class="lk-input lk-gallery-filter"
        type="search"
        :placeholder="t('filterProgress')"
        autocomplete="off"
        spellcheck="false"
      />
      <span class="lk-muted" aria-live="polite">{{ t('shown', { count: designs.length, total: PROGRESS_DESIGNS.length }) }}</span>
    </div>

    <form class="lk-form lk-pgal-controls" @submit.prevent>
      <div class="lk-segmented" role="radiogroup" :aria-label="t('progressMode')">
        <label v-for="option in (['download', 'manual', 'indeterminate'] as const)" :key="option">
          <input v-model="mode" type="radio" :name="`${id}-mode`" :value="option" />
          <span>{{ t(option === 'download' ? 'progressDownload' : option === 'manual' ? 'progressManual' : 'progressIndeterminate') }}</span>
        </label>
      </div>
      <div class="lk-field">
        <label :for="`${id}-value`"><code>value</code></label>
        <input
          :id="`${id}-value`"
          v-model.number="download.value.value"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :disabled="mode === 'indeterminate'"
          @input="mode = 'manual'"
        />
        <output :for="`${id}-value`">{{ mode === 'indeterminate' ? 'null' : download.value.value.toFixed(2) }}</output>
      </div>
      <label class="lk-check">
        <input v-model="smooth" type="checkbox" />
        <code>smooth</code>
      </label>
    </form>
    <p class="lk-gallery-hint">{{ t('progressHint') }}</p>

    <ol class="lk-pgal-grid">
      <li v-for="item in designs" :key="item.index" :class="{ 'lk-pgal-wide': item.design.type === 'linear' }">
        <button type="button" class="lk-pgal-item" aria-haspopup="dialog" @click="open(item.design)">
          <span class="lk-pgal-stage">
            <LoaderKitProgress
              class="lk-pgal-progress"
              :class="`lk-pgal-${item.design.type}`"
              :value="item.value"
              :buffer="item.buffer"
              :smooth="smooth"
              :type="item.design.type"
              :variant="item.design.variant ?? null"
              :thickness="item.design.thickness ?? null"
              :segments="item.design.segments ?? null"
              :show-label="item.design.showLabel ?? null"
              :size="item.design.size ?? null"
              aria-hidden="true"
            >
              <span v-if="item.design.child === 'stop'" class="lk-pgal-stop" />
              <span v-else-if="item.design.child === 'button'" class="lk-pgal-chip">{{ t('progressUpload') }}</span>
            </LoaderKitProgress>
          </span>
          <span class="lk-pgal-name">
            <span class="lk-pgal-number">#{{ item.index + 1 }}</span>
            <code>{{ item.title }}</code>
          </span>
        </button>
      </li>
    </ol>
    <p v-if="designs.length === 0" class="lk-muted">{{ t('noMatchProgress', { query }) }}</p>

    <dialog
      ref="dialog"
      class="lk-dialog"
      :aria-labelledby="`${id}-title`"
      @pointerdown="backdrop.onPointerdown"
      @click="backdrop.onClick"
      @close="selected = null"
    >
      <div v-if="selected" class="lk-dialog-body">
        <header class="lk-dialog-header">
          <h2 :id="`${id}-title`">{{ t('customize', { name: designTitle(selected) }) }}</h2>
          <button type="button" class="lk-icon-button" :aria-label="t('close')" @click="close">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <ProgressControls :design="selected" />
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.lk-pgal {
  display: grid;
  gap: 16px;
  margin: 24px 0;
}

.lk-pgal-controls {
  justify-items: start;
}

.lk-pgal-controls .lk-field {
  width: min(100%, 420px);
}

.lk-gallery-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.lk-gallery-filter {
  flex: 1 1 220px;
  max-width: 320px;
}

.lk-gallery-hint {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.lk-pgal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.vp-doc .lk-pgal-grid > li {
  margin: 0;
}

.lk-pgal-wide {
  grid-column: span 2;
}

@media (max-width: 400px) {
  .lk-pgal-wide {
    grid-column: auto;
  }
}

.lk-pgal-item {
  display: grid;
  grid-template-rows: 112px auto;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--lk-stage-bg);
  overflow: hidden;
  text-align: left;
  transition: border-color 0.2s;
}

.lk-pgal-item:hover {
  border-color: var(--vp-c-brand-1);
}

.lk-pgal-item:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.lk-pgal-stage {
  display: grid;
  place-items: center;
  padding: 12px 16px;
  color: var(--lk-indicator);
}

.lk-pgal-linear {
  width: 100%;
}

.lk-pgal-name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 13px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.lk-pgal-number {
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
}

.lk-pgal-name code {
  font-size: 12px;
}
</style>
