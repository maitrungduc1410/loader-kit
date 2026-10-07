<script setup lang="ts">
import { type BezierEasing, NAMED_EASINGS, type NamedEasing, cubicBezier } from '@loader-kit/spec';
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useStrings } from '../lib/i18n.ts';

const NAMES = Object.keys(NAMED_EASINGS) as NamedEasing[];
// Plot units: time 0..1 spans W, progress 0..1 spans H, with room above and below for overshoot.
const W = 140;
const H = 100;
const Y_MIN = -0.35;
const Y_MAX = 1.35;

const { t } = useStrings();
const id = useId();
const choice = ref<NamedEasing | 'custom'>('easeInOut');
const points = ref<[number, number, number, number]>([...NAMED_EASINGS.easeInOut]);
const playing = ref(true);
const progress = ref(0.5);

watch(choice, (value) => {
  if (value !== 'custom') points.value = [...NAMED_EASINGS[value]];
});

function setPoint(index: number, value: number) {
  const next = [...points.value] as [number, number, number, number];
  next[index] = index % 2 === 0 ? clamp(value, 0, 1) : clamp(value, Y_MIN, Y_MAX);
  points.value = next;
  const named = NAMES.find((name) => NAMED_EASINGS[name].every((v, i) => Math.abs(v - next[i]!) < 1e-9));
  choice.value = named ?? 'custom';
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Number(value.toFixed(2));
const px = (x: number) => x * W;
const py = (y: number) => (1 - y) * H;

const curve = computed(() => {
  const bezier = points.value as BezierEasing;
  const samples = Array.from({ length: 81 }, (_, i) => {
    const x = i / 80;
    return `${px(x).toFixed(2)},${py(cubicBezier(bezier, x)).toFixed(2)}`;
  });
  return `M${samples.join('L')}`;
});

const dot = computed(() => {
  const x = progress.value;
  return { x: px(x), y: py(cubicBezier(points.value as BezierEasing, x)) };
});
const eased = computed(() => clamp(cubicBezier(points.value as BezierEasing, progress.value), Y_MIN, Y_MAX));

const json = computed(() =>
  choice.value === 'custom' ? `"easing": [${points.value.map(round).join(', ')}]` : `"easing": "${choice.value}"`,
);

// ----- dragging the handles -----

const svg = ref<SVGSVGElement>();
let dragging: 0 | 2 | null = null;

function toPlot(event: PointerEvent) {
  const matrix = svg.value?.getScreenCTM();
  if (!svg.value || !matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return { x: point.x / W, y: 1 - point.y / H };
}

function onPointerDown(event: PointerEvent, handle: 0 | 2) {
  dragging = handle;
  (event.currentTarget as Element).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (dragging === null) return;
  const point = toPlot(event);
  if (!point) return;
  setPoint(dragging, round(point.x));
  setPoint(dragging + 1, round(point.y));
}

function onHandleKey(event: KeyboardEvent, handle: 0 | 2) {
  const step = event.shiftKey ? 0.1 : 0.01;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  setPoint(handle, round(points.value[handle] + move[0]));
  setPoint(handle + 1, round(points.value[handle + 1]! + move[1]));
}

// ----- the moving dot -----

const CYCLE = 1.6;
const HOLD = 0.4;
let frame = 0;
let start = 0;

function tick(now: number) {
  const elapsed = ((now - start) / 1000) % (CYCLE + HOLD);
  progress.value = Math.min(1, elapsed / CYCLE);
  frame = requestAnimationFrame(tick);
}

function play() {
  cancelAnimationFrame(frame);
  start = performance.now() - progress.value * CYCLE * 1000;
  frame = requestAnimationFrame(tick);
}

watch(playing, (value) => (value ? play() : cancelAnimationFrame(frame)));

onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) playing.value = false;
  else play();
});
onBeforeUnmount(() => cancelAnimationFrame(frame));

const LABELS = ['x1', 'y1', 'x2', 'y2'];
</script>

<template>
  <div class="lk-card lk-easing">
    <div class="lk-easing-main">
      <figure class="lk-easing-figure">
        <svg
          ref="svg"
          :viewBox="`-12 ${py(Y_MAX)} ${W + 24} ${py(Y_MIN) - py(Y_MAX)}`"
          role="img"
          :aria-label="t('curveDiagram')"
          @pointermove="onPointerMove"
          @pointerup="dragging = null"
          @pointercancel="dragging = null"
        >
          <rect class="plot" x="0" :y="py(1)" :width="W" :height="H" />
          <path class="linear" :d="`M0 ${py(0)}L${W} ${py(1)}`" />
          <path class="arm" :d="`M0 ${py(0)}L${px(points[0])} ${py(points[1])}`" />
          <path class="arm" :d="`M${W} ${py(1)}L${px(points[2])} ${py(points[3])}`" />
          <path class="curve" :d="curve" />
          <line class="playhead" :x1="dot.x" :x2="dot.x" :y1="py(Y_MAX)" :y2="py(Y_MIN)" />
          <circle class="dot" :cx="dot.x" :cy="dot.y" r="3.2" />
          <circle
            v-for="handle in [0, 2] as const"
            :key="handle"
            class="handle"
            :cx="px(points[handle])"
            :cy="py(points[handle + 1]!)"
            r="5"
            tabindex="0"
            role="button"
            :aria-label="`${LABELS[handle]}, ${LABELS[handle + 1]}: ${points[handle]}, ${points[handle + 1]}`"
            @pointerdown="onPointerDown($event, handle)"
            @keydown="onHandleKey($event, handle)"
          />
        </svg>
        <div class="lk-easing-track" aria-hidden="true">
          <span class="lk-easing-ball" :style="{ left: `calc(${eased * 100}% - ${eased * 20}px)` }" />
        </div>
        <figcaption class="lk-muted">{{ t('linearReference') }} {{ t('dragHint') }}</figcaption>
      </figure>

      <form class="lk-form" @submit.prevent>
        <div class="lk-field">
          <label :for="`${id}-name`">{{ t('easing') }}</label>
          <select :id="`${id}-name`" v-model="choice" class="lk-input">
            <option v-for="name in NAMES" :key="name" :value="name">{{ name }}</option>
            <option value="custom">{{ t('customBezier') }}</option>
          </select>
        </div>
        <div v-for="(label, index) in LABELS" :key="label" class="lk-field">
          <label :for="`${id}-${label}`"><code>{{ label }}</code></label>
          <input
            :id="`${id}-${label}`"
            type="range"
            :min="index % 2 === 0 ? 0 : -0.3"
            :max="index % 2 === 0 ? 1 : 1.3"
            step="0.01"
            :value="points[index]"
            @input="setPoint(index, Number(($event.target as HTMLInputElement).value))"
          />
          <output :for="`${id}-${label}`">{{ points[index]!.toFixed(2) }}</output>
        </div>
        <button type="button" class="lk-button" :aria-pressed="playing" @click="playing = !playing">
          {{ playing ? t('pause') : t('play') }}
        </button>
      </form>
    </div>
    <pre class="lk-pre"><code>{{ json }}</code></pre>
  </div>
</template>

<style scoped>
.lk-easing {
  display: grid;
  gap: 16px;
}

.lk-easing-main {
  display: grid;
  gap: 20px;
}

@media (min-width: 640px) {
  .lk-easing-main {
    grid-template-columns: minmax(0, 300px) 1fr;
    align-items: start;
  }
}

.lk-easing-figure {
  margin: 0;
}

.lk-easing-figure svg {
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  overflow: visible;
  touch-action: none;
}

.lk-easing-figure figcaption {
  margin-top: 8px;
  font-size: 13px;
  text-align: center;
}

.plot {
  fill: var(--lk-stage-bg);
  stroke: var(--vp-c-divider);
  stroke-width: 0.6;
}

.linear {
  stroke: var(--vp-c-text-3);
  stroke-width: 0.8;
  stroke-dasharray: 3 3;
}

.arm {
  stroke: var(--vp-c-text-3);
  stroke-width: 0.8;
}

.curve {
  fill: none;
  stroke: var(--vp-c-brand-1);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.playhead {
  stroke: var(--vp-c-divider);
  stroke-width: 0.6;
}

.dot {
  fill: var(--lk-accent);
}

.handle {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  cursor: grab;
}

.handle:hover,
.handle:focus-visible {
  fill: var(--vp-c-brand-1);
  outline: none;
}

.lk-easing-track {
  position: relative;
  max-width: 300px;
  height: 20px;
  margin: 12px auto 0;
  border-radius: 10px;
  background: var(--lk-stage-bg);
  border: 1px solid var(--vp-c-divider);
}

.lk-easing-ball {
  position: absolute;
  top: -1px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
}
</style>
