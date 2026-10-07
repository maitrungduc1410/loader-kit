<script setup lang="ts">
import { type IndicatorSpec, type PreparedIndicator, prepareIndicator, sampleTrack } from '@loader-kit/spec';
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { exampleSpec } from '../lib/examples.ts';
import { useStrings } from '../lib/i18n.ts';
import { builtinSpec } from '../lib/params.ts';
import LoaderKitPreview from './LoaderKitPreview.vue';

const props = defineProps<{ indicator?: string; example?: string }>();

const W = 300;
const H = 140;
const PALETTE = 6;

const { t } = useStrings();
const id = useId();

const spec = computed((): IndicatorSpec | null =>
  props.example ? exampleSpec(props.example) : (builtinSpec(props.indicator ?? 'BallPulse') ?? null),
);
const prepared = computed((): PreparedIndicator | null => {
  if (!spec.value) return null;
  try {
    return prepareIndicator(spec.value);
  } catch {
    return null;
  }
});

interface Option {
  value: string;
  label: string;
  part: number;
  group: boolean;
  index: number;
}

const options = computed((): Option[] =>
  (prepared.value?.parts ?? []).flatMap((part, p) => [
    ...(part.part.tracks ?? []).map((track, index) => ({ value: `${p}:t${index}`, label: track.property, part: p, group: false, index })),
    ...(part.part.groupTracks ?? []).map((track, index) => ({
      value: `${p}:g${index}`,
      label: `groupTracks: ${track.property}`,
      part: p,
      group: true,
      index,
    })),
  ]),
);
const multipart = computed(() => (prepared.value?.parts.length ?? 0) > 1);
const selected = ref('');
watch(options, (list) => (selected.value = list[0]?.value ?? ''), { immediate: true });
const option = computed(() => options.value.find((o) => o.value === selected.value) ?? null);

const duration = computed(() => spec.value?.duration ?? 1);
const start = computed(() => prepared.value?.timeForCycleProgress(0) ?? 0);

const series = computed(() => {
  const ready = prepared.value;
  const chosen = option.value;
  if (!ready || !chosen) return [];
  const part = ready.parts[chosen.part]!;
  const track = chosen.group ? part.part.groupTracks![chosen.index]! : part.part.tracks![chosen.index]!;
  const rest = chosen.group ? (track.property === 'opacity' || track.property.startsWith('scale') ? 1 : 0) : part.rest[track.property];
  const lines = chosen.group
    ? [{ offset: 0, cycle: part.duration, index: -1 }]
    : part.elements.map((_, i) => ({ offset: part.offsets[i]!, cycle: part.durations[i]!, index: part.firstIndex + i }));
  return lines.map((line) => {
    const values = Array.from({ length: 121 }, (_, k) => {
      const time = start.value + (k / 120) * duration.value;
      const local = time - line.offset;
      return local < 0 ? rest : sampleTrack(track, (local % line.cycle) / line.cycle, ready.params);
    });
    return { ...line, values };
  });
});

const range = computed(() => {
  const all = series.value.flatMap((line) => line.values);
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (!Number.isFinite(min)) return { min: 0, max: 1 };
  if (max - min < 1e-6) {
    min -= 0.5;
    max += 0.5;
  }
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
});

const y = (value: number) => H - ((value - range.value.min) / (range.value.max - range.value.min)) * H;
const paths = computed(() =>
  series.value.map((line) => ({
    ...line,
    d: `M${line.values.map((value, k) => `${((k / 120) * W).toFixed(1)},${y(value).toFixed(1)}`).join('L')}`,
  })),
);
const tick = (value: number) => Number(value.toFixed(2));

// ----- playhead -----

const progress = ref(0);
const playing = ref(true);
let frame = 0;
let origin = 0;

function loop(now: number) {
  progress.value = (((now - origin) / 1000) % duration.value) / duration.value;
  frame = requestAnimationFrame(loop);
}

function play() {
  cancelAnimationFrame(frame);
  origin = performance.now() - progress.value * duration.value * 1000;
  frame = requestAnimationFrame(loop);
}

watch(playing, (value) => (value ? play() : cancelAnimationFrame(frame)));
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) playing.value = false;
  else play();
});
onBeforeUnmount(() => cancelAnimationFrame(frame));

function scrub(event: Event) {
  playing.value = false;
  progress.value = Number((event.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="lk-card lk-timeline">
    <p v-if="!spec || options.length === 0" class="lk-muted">{{ t('noTracks') }}</p>
    <template v-else>
      <div class="lk-timeline-top">
        <div class="lk-stage">
          <LoaderKitPreview :spec="spec" :size="72" :cycle-progress="progress" />
        </div>
        <form class="lk-form" @submit.prevent>
          <div class="lk-field">
            <label :for="`${id}-track`">{{ multipart ? `${t('part')} / ${t('track')}` : t('track') }}</label>
            <select :id="`${id}-track`" v-model="selected" class="lk-input">
              <option v-for="o in options" :key="o.value" :value="o.value">
                {{ multipart ? `${t('part')} ${o.part}: ` : '' }}{{ o.label }}
              </option>
            </select>
          </div>
          <div class="lk-field">
            <label :for="`${id}-progress`"><code>cycleProgress</code></label>
            <input :id="`${id}-progress`" type="range" min="0" max="1" step="0.005" :value="progress" @input="scrub" />
            <output :for="`${id}-progress`">{{ progress.toFixed(2) }}</output>
          </div>
          <button type="button" class="lk-button" :aria-pressed="playing" @click="playing = !playing">
            {{ playing ? t('pause') : t('play') }}
          </button>
        </form>
      </div>

      <figure class="lk-timeline-figure">
        <svg :viewBox="`-34 -8 ${W + 44} ${H + 30}`" role="img" :aria-label="t('timelineDiagram', { property: option?.label ?? '' })">
          <rect class="plot" x="0" y="0" :width="W" :height="H" />
          <line v-if="range.min < 0 && range.max > 0" class="zero" x1="0" :x2="W" :y1="y(0)" :y2="y(0)" />
          <path v-for="(line, k) in paths" :key="k" class="series" :class="`c${(line.index < 0 ? 0 : line.index) % PALETTE}`" :d="line.d" />
          <line class="playhead" :x1="progress * W" :x2="progress * W" y1="0" :y2="H" />
          <text class="axis end" x="-6" :y="y(range.max) + 4">{{ tick(range.max) }}</text>
          <text class="axis end" x="-6" :y="y(range.min)">{{ tick(range.min) }}</text>
          <text class="axis" x="0" :y="H + 14">0</text>
          <text class="axis middle" :x="W / 2" :y="H + 14">{{ tick(duration / 2) }}</text>
          <text class="axis end" :x="W" :y="H + 14">{{ tick(duration) }}</text>
          <text class="axis middle muted" :x="W / 2" :y="H + 26">{{ t('time') }}</text>
        </svg>
        <figcaption>
          <ul class="lk-legend">
            <li v-for="(line, k) in paths" :key="k">
              <span class="swatch" :class="`c${(line.index < 0 ? 0 : line.index) % PALETTE}`" aria-hidden="true" />
              <template v-if="line.index >= 0">
                {{ t('elementN', { index: line.index }) }}, {{ t('startsAt', { offset: tick(line.offset) }) }}
              </template>
              <template v-else><code>groupTracks</code></template>
            </li>
          </ul>
        </figcaption>
      </figure>
    </template>
  </div>
</template>

<style scoped>
.lk-timeline {
  display: grid;
  gap: 16px;
}

.lk-timeline-top {
  display: grid;
  gap: 16px;
  align-items: center;
}

@media (min-width: 560px) {
  .lk-timeline-top {
    grid-template-columns: 120px 1fr;
  }
}

.lk-stage {
  display: grid;
  place-items: center;
  width: 120px;
  height: 120px;
  margin: 0 auto;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--lk-stage-bg);
}

.lk-timeline-figure {
  margin: 0;
}

.lk-timeline-figure svg {
  display: block;
  width: 100%;
}

.plot {
  fill: var(--lk-stage-bg);
  stroke: var(--vp-c-divider);
  stroke-width: 0.8;
}

.zero {
  stroke: var(--vp-c-divider);
  stroke-dasharray: 3 3;
}

.series {
  fill: none;
  stroke-width: 1.8;
  stroke-linejoin: round;
  opacity: 0.9;
}

.playhead {
  stroke: var(--vp-c-text-1);
  stroke-width: 1;
}

.axis {
  fill: var(--vp-c-text-2);
  font-size: 10px;
  font-family: var(--vp-font-family-mono);
}

.axis.end {
  text-anchor: end;
}

.axis.middle {
  text-anchor: middle;
}

.axis.muted {
  fill: var(--vp-c-text-3);
  font-family: var(--vp-font-family-base);
}

.lk-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.vp-doc .lk-legend li + li {
  margin-top: 0;
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  border-radius: 2px;
  vertical-align: -1px;
}

.c0 { stroke: var(--lk-series-0); background: var(--lk-series-0); }
.c1 { stroke: var(--lk-series-1); background: var(--lk-series-1); }
.c2 { stroke: var(--lk-series-2); background: var(--lk-series-2); }
.c3 { stroke: var(--lk-series-3); background: var(--lk-series-3); }
.c4 { stroke: var(--lk-series-4); background: var(--lk-series-4); }
.c5 { stroke: var(--lk-series-5); background: var(--lk-series-5); }
</style>
