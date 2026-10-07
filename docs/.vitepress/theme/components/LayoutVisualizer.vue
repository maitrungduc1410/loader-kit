<script setup lang="ts">
import { type Layout, layoutElements } from '@loader-kit/spec';
import { computed, reactive, ref, useId } from 'vue';
import { useStrings } from '../lib/i18n.ts';

type Kind = Layout['type'];

interface Field {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  optional?: boolean;
}

const FIELDS: Record<Kind, Field[]> = {
  single: [
    { name: 'size', min: 0.1, max: 1, step: 0.01, value: 0.6 },
    { name: 'width', min: 0.05, max: 1, step: 0.01, value: 0.8, optional: true },
    { name: 'height', min: 0.05, max: 1, step: 0.01, value: 0.3, optional: true },
    { name: 'x', min: 0, max: 1, step: 0.01, value: 0.5, optional: true },
    { name: 'y', min: 0, max: 1, step: 0.01, value: 0.5, optional: true },
  ],
  stack: [
    { name: 'count', min: 1, max: 6, step: 1, value: 3 },
    { name: 'size', min: 0.1, max: 1, step: 0.01, value: 0.6, optional: true },
    { name: 'x', min: 0, max: 1, step: 0.01, value: 0.5, optional: true },
    { name: 'y', min: 0, max: 1, step: 0.01, value: 0.5, optional: true },
  ],
  row: [
    { name: 'count', min: 1, max: 8, step: 1, value: 3 },
    { name: 'gap', min: 0, max: 0.3, step: 0.01, value: 0.05 },
    { name: 'itemWidth', min: 0.02, max: 0.5, step: 0.01, value: 0.12, optional: true },
    { name: 'itemHeight', min: 0.02, max: 1, step: 0.01, value: 0.5, optional: true },
  ],
  grid: [
    { name: 'columns', min: 1, max: 6, step: 1, value: 3 },
    { name: 'rows', min: 1, max: 6, step: 1, value: 3 },
    { name: 'gap', min: 0, max: 0.2, step: 0.01, value: 0.05 },
  ],
  ring: [
    { name: 'count', min: 1, max: 16, step: 1, value: 8 },
    { name: 'itemSize', min: 0.04, max: 0.5, step: 0.01, value: 0.2 },
    { name: 'itemWidth', min: 0.02, max: 0.5, step: 0.01, value: 0.08, optional: true },
    { name: 'itemHeight', min: 0.02, max: 0.5, step: 0.01, value: 0.2, optional: true },
    { name: 'startAngle', min: -3.1416, max: 3.1416, step: 0.01, value: -1.5708, optional: true },
  ],
};

const KINDS = Object.keys(FIELDS) as Kind[];

const { t } = useStrings();
const id = useId();
const kind = ref<Kind>('row');
const values = reactive<Record<Kind, Record<string, number>>>(
  Object.fromEntries(KINDS.map((k) => [k, Object.fromEntries(FIELDS[k].map((f) => [f.name, f.value]))])) as Record<
    Kind,
    Record<string, number>
  >,
);
const enabled = reactive<Record<Kind, Record<string, boolean>>>(
  Object.fromEntries(KINDS.map((k) => [k, Object.fromEntries(FIELDS[k].map((f) => [f.name, !f.optional]))])) as Record<
    Kind,
    Record<string, boolean>
  >,
);
const orient = ref(false);

const round = (value: number) => Number(value.toFixed(3));

const layout = computed((): Layout => {
  const fields: Record<string, number | boolean> = {};
  for (const field of FIELDS[kind.value]) {
    if (enabled[kind.value][field.name]) fields[field.name] = round(values[kind.value][field.name]!);
  }
  if (kind.value === 'ring' && orient.value) fields.orient = true;
  return { type: kind.value, ...fields } as Layout;
});

const elements = computed(() => {
  try {
    return layoutElements(layout.value, {});
  } catch {
    return [];
  }
});

const stacked = computed(() => kind.value === 'stack');
const json = computed(() => `"layout": ${JSON.stringify(layout.value)}`);
const label = (index: number) => (stacked.value ? `0-${elements.value.length - 1}` : String(index));
const boxes = computed(() =>
  (stacked.value ? elements.value.slice(0, 1) : elements.value).map((element) => ({
    cx: element.cx * 100,
    cy: element.cy * 100,
    w: element.width * 100,
    h: element.height * 100,
    deg: (element.rotate * 180) / Math.PI,
    font: Math.min(7, Math.max(2.8, Math.min(element.width, element.height) * 42)),
  })),
);
const setField = computed(() => t('setField').split('{field}'));
const fixed = (field: Field, value: number) => (field.step >= 1 ? String(value) : value.toFixed(2));
</script>

<template>
  <div class="lk-card lk-layouts">
    <div class="lk-layouts-main">
      <figure class="lk-layouts-figure">
        <svg viewBox="-6 -6 112 112" role="img" :aria-label="t('layoutDiagram', { type: kind })">
          <rect class="box" x="0" y="0" width="100" height="100" />
          <path class="guide" d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" />
          <g v-for="(box, index) in boxes" :key="index">
            <g :transform="`rotate(${box.deg} ${box.cx} ${box.cy})`">
              <rect class="element" :x="box.cx - box.w / 2" :y="box.cy - box.h / 2" :width="box.w" :height="box.h" />
              <ellipse class="shape" :cx="box.cx" :cy="box.cy" :rx="box.w / 2" :ry="box.h / 2" />
              <path v-if="kind === 'ring' && orient" class="up" :d="`M${box.cx} ${box.cy - box.h / 2}v${box.h * 0.3}`" />
            </g>
            <text class="index" :x="box.cx" :y="box.cy" :font-size="box.font">{{ label(index) }}</text>
          </g>
          <text class="corner" x="0" y="-1.5">(0, 0)</text>
          <text class="corner end" x="100" y="104.5">(1, 1)</text>
        </svg>
        <figcaption class="lk-muted">{{ t('unitBox') }}</figcaption>
      </figure>

      <form class="lk-form" @submit.prevent>
        <div class="lk-field">
          <label :for="`${id}-kind`">{{ t('layoutType') }}</label>
          <select :id="`${id}-kind`" v-model="kind" class="lk-input">
            <option v-for="k in KINDS" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
        <template v-for="field in FIELDS[kind]" :key="`${kind}-${field.name}`">
          <label v-if="field.optional" class="lk-check">
            <input v-model="enabled[kind][field.name]" type="checkbox" />
            {{ setField[0] }}<code>{{ field.name }}</code>{{ setField[1] }}
          </label>
          <div v-if="enabled[kind][field.name]" class="lk-field">
            <label :for="`${id}-${field.name}`"><code>{{ field.name }}</code></label>
            <input
              :id="`${id}-${field.name}`"
              v-model.number="values[kind][field.name]"
              type="range"
              :min="field.min"
              :max="field.max"
              :step="field.step"
            />
            <output :for="`${id}-${field.name}`">{{ fixed(field, values[kind][field.name]!) }}</output>
          </div>
        </template>
        <label v-if="kind === 'ring'" class="lk-check">
          <input v-model="orient" type="checkbox" />
          <code>orient</code>
        </label>
        <p class="lk-muted lk-note">{{ t('elements', { count: elements.length }) }}</p>
      </form>
    </div>
    <pre class="lk-pre"><code>{{ json }}</code></pre>
  </div>
</template>

<style scoped>
.lk-layouts {
  display: grid;
  gap: 16px;
}

.lk-layouts-main {
  display: grid;
  gap: 20px;
}

@media (min-width: 640px) {
  .lk-layouts-main {
    grid-template-columns: minmax(0, 300px) 1fr;
    align-items: start;
  }
}

.lk-layouts-figure {
  margin: 0;
}

.lk-layouts-figure svg {
  display: block;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
  margin: 0 auto;
}

.lk-layouts-figure figcaption {
  margin-top: 8px;
  font-size: 13px;
  text-align: center;
}

.box {
  fill: var(--lk-stage-bg);
  stroke: var(--vp-c-text-3);
  stroke-width: 0.6;
}

.guide {
  fill: none;
  stroke: var(--vp-c-divider);
  stroke-width: 0.3;
  stroke-dasharray: 1 1;
}

.element {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
  stroke-width: 0.5;
}

.shape {
  fill: none;
  stroke: var(--vp-c-brand-2);
  stroke-width: 0.3;
  opacity: 0.6;
}

.up {
  stroke: var(--vp-c-brand-1);
  stroke-width: 0.8;
  stroke-linecap: round;
}

.index {
  fill: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
}

.corner {
  fill: var(--vp-c-text-3);
  font-size: 3.5px;
  font-family: var(--vp-font-family-mono);
}

.corner.end {
  text-anchor: end;
}
</style>
