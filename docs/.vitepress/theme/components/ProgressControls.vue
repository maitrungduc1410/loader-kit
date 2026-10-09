<script setup lang="ts">
import { PROGRESS_DEFAULT_SIZE, resolveProgress } from '@loader-kit/spec';
import { LoaderKitProgress } from '@loader-kit/web/vue';
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useStrings } from '../lib/i18n.ts';
import { type ProgressConfig, type ProgressDesign, designTitle, progressSnippets } from '../lib/progress.ts';
import { useSimulatedDownload } from '../lib/download.ts';
import CodeTabs from './CodeTabs.vue';

const props = defineProps<{ design: ProgressDesign }>();

type Mode = 'download' | 'manual' | 'indeterminate';

const { t } = useStrings();
const id = useId();

const mode = ref<Mode>('download');
const smooth = ref(true);
const showLabel = ref(false);
const thickness = ref(4);
const size = ref(PROGRESS_DEFAULT_SIZE);
const colorMode = ref<'theme' | 'single'>('theme');
const color = ref('#7c3aed');

const sized = computed(() => props.design.type !== 'linear' && props.design.type !== 'border');
/** The thickness of the type and variant when the design does not set one. */
const baseThickness = computed(() => resolveProgress({ type: props.design.type, variant: props.design.variant }).thickness);

function reset() {
  mode.value = props.design.indeterminate ? 'indeterminate' : 'download';
  smooth.value = true;
  showLabel.value = props.design.showLabel === true;
  thickness.value = props.design.thickness ?? baseThickness.value;
  size.value = props.design.size ?? PROGRESS_DEFAULT_SIZE;
  colorMode.value = 'theme';
  color.value = '#7c3aed';
}
watch(() => props.design, reset, { immediate: true });

const download = useSimulatedDownload(computed(() => mode.value === 'download'));
onBeforeUnmount(download.stop);

const value = computed(() => (mode.value === 'indeterminate' ? null : download.value.value));
const buffer = computed(() => (props.design.buffer && value.value !== null ? Math.min(1, value.value + 0.25) : null));
const previewColor = computed(() => (colorMode.value === 'single' ? color.value : null));

const config = computed<ProgressConfig>(() => ({
  ...props.design,
  indeterminate: mode.value === 'indeterminate',
  showLabel: showLabel.value,
  smooth: smooth.value,
  thickness: thickness.value === baseThickness.value ? undefined : thickness.value,
  size: sized.value && size.value !== PROGRESS_DEFAULT_SIZE ? size.value : undefined,
  color: previewColor.value,
}));
const code = computed(() => progressSnippets(config.value));
</script>

<template>
  <div class="lk-pcontrols">
    <div class="lk-pcontrols-main">
      <div class="lk-pcontrols-stage">
        <LoaderKitProgress
          :class="{ 'lk-pcontrols-linear': design.type === 'linear' }"
          :value="value"
          :buffer="buffer"
          :smooth="smooth"
          :type="design.type"
          :variant="design.variant ?? null"
          :thickness="thickness"
          :segments="design.segments ?? null"
          :show-label="showLabel"
          :size="sized ? size : null"
          :color="previewColor"
          :accessibility-label="designTitle(design)"
        >
          <span v-if="design.child === 'stop'" class="lk-pgal-stop" aria-hidden="true" />
          <span v-else-if="design.child === 'button'" class="lk-pgal-chip">{{ t('progressUpload') }}</span>
        </LoaderKitProgress>
      </div>

      <form class="lk-form" @submit.prevent>
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
          <output :for="`${id}-value`">{{ value === null ? 'null' : value.toFixed(2) }}</output>
        </div>
        <div class="lk-field">
          <label :for="`${id}-thickness`"><code>thickness</code></label>
          <input :id="`${id}-thickness`" v-model.number="thickness" type="range" min="1" max="24" step="1" />
          <output :for="`${id}-thickness`">{{ thickness }}</output>
        </div>
        <div v-if="sized" class="lk-field">
          <label :for="`${id}-size`"><code>size</code></label>
          <input :id="`${id}-size`" v-model.number="size" type="range" min="24" max="128" step="4" />
          <output :for="`${id}-size`">{{ size }}px</output>
        </div>
        <div class="lk-radios">
          <label class="lk-check"><input v-model="showLabel" type="checkbox" /> <code>showLabel</code></label>
          <label class="lk-check"><input v-model="smooth" type="checkbox" /> <code>smooth</code></label>
        </div>

        <fieldset class="lk-fieldset">
          <legend>{{ t('color') }}</legend>
          <div class="lk-radios">
            <label><input v-model="colorMode" type="radio" value="theme" :name="`${id}-color`" /> {{ t('themeColor') }}</label>
            <label><input v-model="colorMode" type="radio" value="single" :name="`${id}-color`" /> {{ t('color') }}</label>
          </div>
          <div v-if="colorMode === 'single'" class="lk-swatches">
            <input v-model="color" type="color" :aria-label="t('color')" />
            <code>{{ color }}</code>
          </div>
        </fieldset>

        <button type="button" class="lk-button" @click="reset">{{ t('reset') }}</button>
      </form>
    </div>

    <CodeTabs :tabs="code" :label="t('code')" />
  </div>
</template>

<style scoped>
.lk-pcontrols {
  display: grid;
  gap: 20px;
}

.lk-pcontrols-main {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .lk-pcontrols-main {
    grid-template-columns: 240px 1fr;
    align-items: start;
  }
}

.lk-pcontrols-stage {
  display: grid;
  place-items: center;
  width: 100%;
  max-width: 240px;
  height: 200px;
  margin: 0 auto;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--lk-stage-bg);
  color: var(--lk-indicator);
}

.lk-pcontrols-linear {
  width: 100%;
}
</style>
