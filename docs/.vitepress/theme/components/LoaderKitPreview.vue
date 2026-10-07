<script setup lang="ts">
import type { IndicatorSpec, Params } from '@loader-kit/spec';
import type { LoaderKitView } from '@loader-kit/web';
import { useData } from 'vitepress';
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import { useStrings } from '../lib/i18n.ts';

const props = withDefaults(
  defineProps<{
    indicator?: string;
    spec?: IndicatorSpec | string | null;
    params?: Params | null;
    color?: string | null;
    colors?: readonly string[] | null;
    speed?: number;
    cycleProgress?: number | null;
    size?: number;
    animating?: boolean;
    hidesWhenStopped?: boolean;
    respectsReduceMotion?: boolean;
    /** Accessible name; defaults to the indicator or spec name. */
    label?: string;
  }>(),
  {
    indicator: 'BallPulse',
    spec: null,
    params: null,
    color: null,
    colors: null,
    speed: 1,
    cycleProgress: null,
    size: 64,
    animating: true,
    hidesWhenStopped: true,
    respectsReduceMotion: true,
    label: undefined,
  },
);

const emit = defineEmits<{ error: [message: string | null] }>();

const { t } = useStrings();
const { isDark } = useData();
const host = ref<HTMLElement>();
let view: LoaderKitView | null = null;
let unmounted = false;

const name = computed(() => {
  if (props.label) return props.label;
  const spec = props.spec;
  if (spec && typeof spec === 'object' && typeof spec.name === 'string') return spec.name;
  return props.indicator;
});

const raw = <T,>(value: T): T => (value && typeof value === 'object' ? toRaw(value) : value);
const colorsOrNull = () => (props.colors && props.colors.length > 0 ? [...props.colors] : null);

onMounted(async () => {
  const { LoaderKitView } = await import('@loader-kit/web');
  if (unmounted || !host.value) return;
  view = new LoaderKitView(host.value, {
    indicator: props.indicator,
    spec: raw(props.spec),
    params: props.params ? { ...props.params } : null,
    color: props.color,
    colors: colorsOrNull(),
    speed: props.speed,
    cycleProgress: props.cycleProgress,
    animating: props.animating,
    hidesWhenStopped: props.hidesWhenStopped,
    respectsReduceMotion: props.respectsReduceMotion,
    onError: (message) => emit('error', message),
  });
  emit('error', view.specError);
});

onBeforeUnmount(() => {
  unmounted = true;
  view?.destroy();
  view = null;
});

watch(
  () => props.indicator,
  (value) => view && (view.indicator = value),
);
watch(
  () => props.spec,
  (value) => view && (view.spec = raw(value)),
);
watch(
  () => (props.params ? { ...props.params } : null),
  (value) => view && (view.params = value),
  { deep: true },
);
watch(
  () => props.color,
  (value) => view && (view.color = value),
);
watch(
  () => props.colors,
  () => view && (view.colors = colorsOrNull()),
  { deep: true },
);
watch(
  () => props.speed,
  (value) => view && (view.speed = value),
);
watch(
  () => props.cycleProgress,
  (value) => view && (view.cycleProgress = value),
);
watch(
  () => props.animating,
  (value) => view && (view.animating = value),
);
watch(
  () => props.hidesWhenStopped,
  (value) => view && (view.hidesWhenStopped = value),
);
watch(
  () => props.respectsReduceMotion,
  (value) => view && (view.respectsReduceMotion = value),
);
// The default color is the CSS `color` of the host, read when it is set; re-read it after a theme switch.
watch(isDark, () => requestAnimationFrame(() => view && props.color === null && (view.color = null)));
</script>

<template>
  <span
    ref="host"
    class="lk-preview"
    role="img"
    :aria-label="t('indicatorPreview', { name })"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>

<style scoped>
.lk-preview {
  display: inline-block;
  flex: none;
  color: var(--lk-indicator);
  vertical-align: middle;
}
</style>
