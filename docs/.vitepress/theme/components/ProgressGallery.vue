<script setup lang="ts">
import { LoaderKitProgress } from '@loader-kit/web/vue';
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useStrings } from '../lib/i18n.ts';
import { PROGRESS_DESIGNS, designTitle, progressSnippets } from '../lib/progress.ts';
import CodeTabs from './CodeTabs.vue';

type Mode = 'download' | 'manual' | 'indeterminate';

const { t } = useStrings();
const id = useId();

const mode = ref<Mode>('download');
const value = ref(0.4);
const smooth = ref(true);
const selected = ref(0);

// Uneven steps, like the bytes of a real download arriving in bursts.
const STEPS = [0.03, 0.08, 0.01, 0.12, 0.05, 0, 0.09, 0.02, 0.15, 0.04, 0.07, 0, 0.11, 0.06];
let timer: ReturnType<typeof setInterval> | undefined;
let step = 0;
let hold = 0;

function tick() {
  if (value.value >= 1) {
    if (++hold < 4) return;
    hold = 0;
    value.value = 0;
    return;
  }
  value.value = Math.min(1, value.value + STEPS[step++ % STEPS.length]!);
}

function updateTimer() {
  const run = mode.value === 'download';
  if (run && timer === undefined) timer = setInterval(tick, 400);
  if (!run && timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}

onMounted(updateTimer);
watch(mode, updateTimer);
onBeforeUnmount(() => {
  if (timer !== undefined) clearInterval(timer);
});

const designs = computed(() =>
  PROGRESS_DESIGNS.map((design, index) => {
    const indeterminate = design.indeterminate || mode.value === 'indeterminate';
    return {
      design,
      index,
      title: designTitle(design),
      value: indeterminate ? null : value.value,
      buffer: design.buffer && !indeterminate ? Math.min(1, value.value + 0.25) : null,
    };
  }),
);

const current = computed(() => PROGRESS_DESIGNS[selected.value] ?? PROGRESS_DESIGNS[0]!);
const code = computed(() => progressSnippets(current.value));
</script>

<template>
  <div class="lk-card lk-pgal">
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
          v-model.number="value"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :disabled="mode === 'indeterminate'"
          @input="mode = 'manual'"
        />
        <output :for="`${id}-value`">{{ mode === 'indeterminate' ? 'null' : value.toFixed(2) }}</output>
      </div>
      <label class="lk-check">
        <input v-model="smooth" type="checkbox" />
        <code>smooth</code>
      </label>
      <p class="lk-muted lk-note">{{ t('progressHint') }}</p>
    </form>

    <ol class="lk-pgal-grid">
      <li
        v-for="item in designs"
        :key="item.index"
        class="lk-pgal-item"
        :class="{ 'lk-pgal-selected': item.index === selected, 'lk-pgal-wide': item.design.type === 'linear' }"
        @click="selected = item.index"
      >
        <div class="lk-pgal-stage">
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
            :accessibility-label="item.title"
          >
            <span v-if="item.design.child === 'stop'" class="lk-pgal-stop" aria-hidden="true" />
            <span v-else-if="item.design.child === 'button'" class="lk-pgal-chip">{{ t('progressUpload') }}</span>
          </LoaderKitProgress>
        </div>
        <button type="button" class="lk-pgal-name" :aria-pressed="item.index === selected" @click.stop="selected = item.index">
          <span class="lk-pgal-number">#{{ item.index + 1 }}</span>
          <code>{{ item.title }}</code>
          <span v-if="item.design.indeterminate" class="lk-pgal-tag">{{ t('progressIndeterminate') }}</span>
        </button>
      </li>
    </ol>

    <div>
      <div class="lk-label">{{ t('progressCode', { index: selected + 1, name: designTitle(current) }) }}</div>
      <CodeTabs :tabs="code" :label="t('code')" />
    </div>
  </div>
</template>

<style scoped>
.lk-pgal {
  display: grid;
  gap: 20px;
}

.lk-pgal-controls {
  justify-items: start;
}

.lk-pgal-controls .lk-field {
  width: min(100%, 420px);
}

.lk-pgal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lk-pgal-grid > li {
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
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--lk-stage-bg);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
}

.lk-pgal-item:hover {
  border-color: var(--vp-c-brand-2);
}

.lk-pgal-selected {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
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
  text-align: left;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.lk-pgal-name:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}

.lk-pgal-number {
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
}

.lk-pgal-name code {
  font-size: 12px;
}

.lk-pgal-tag {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.lk-pgal-stop {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: currentColor;
}

.lk-pgal-chip {
  display: block;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}
</style>
