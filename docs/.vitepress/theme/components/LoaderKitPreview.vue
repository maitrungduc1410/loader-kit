<script setup lang="ts">
import type { IndicatorSpec, Params } from '@loader-kit/spec';
import { LoaderKit } from '@loader-kit/web/vue';
import { computed } from 'vue';
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

const name = computed(() => {
  if (props.label) return props.label;
  const spec = props.spec;
  if (spec && typeof spec === 'object' && typeof spec.name === 'string') return spec.name;
  return props.indicator;
});
</script>

<template>
  <LoaderKit
    class="lk-preview"
    role="img"
    :aria-label="t('indicatorPreview', { name })"
    :indicator="indicator"
    :spec="spec"
    :params="params"
    :color="color"
    :colors="colors"
    :speed="speed"
    :cycle-progress="cycleProgress"
    :size="size"
    :animating="animating"
    :hides-when-stopped="hidesWhenStopped"
    :respects-reduce-motion="respectsReduceMotion"
    @error="emit('error', $event)"
  />
</template>

<style scoped>
.lk-preview {
  flex: none;
  color: var(--lk-indicator);
  vertical-align: middle;
}
</style>
