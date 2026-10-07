<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue';
import { useStrings } from '../lib/i18n.ts';
import { builtinSpec, changedParams, paramControls } from '../lib/params.ts';
import { snippets } from '../lib/snippets.ts';
import CodeTabs from './CodeTabs.vue';
import LoaderKitPreview from './LoaderKitPreview.vue';

const props = defineProps<{ indicator: string }>();

const DEFAULT_COLORS = ['#7c3aed', '#06b6d4', '#f43f5e'];

const { t } = useStrings();
const id = useId();

const controls = computed(() => paramControls(builtinSpec(props.indicator)));
const values = reactive<Record<string, number>>({});
const colorMode = ref<'theme' | 'single' | 'multi'>('theme');
const color = ref('#7c3aed');
const colors = ref([...DEFAULT_COLORS]);
const speed = ref(1);
const size = ref(64);

function reset() {
  for (const key of Object.keys(values)) delete values[key];
  for (const control of controls.value) values[control.name] = control.default;
  colorMode.value = 'theme';
  color.value = '#7c3aed';
  colors.value = [...DEFAULT_COLORS];
  speed.value = 1;
  size.value = 64;
}
watch(() => props.indicator, reset, { immediate: true });

const previewColor = computed(() => (colorMode.value === 'single' ? color.value : null));
const previewColors = computed(() => (colorMode.value === 'multi' ? colors.value : null));
const params = computed(() => ({ ...values }));

const code = computed(() =>
  snippets({
    indicator: props.indicator,
    params: changedParams(controls.value, values),
    color: previewColor.value,
    colors: previewColors.value ?? [],
    speed: speed.value,
    size: size.value,
  }),
);

const fixed = (value: number, step: number) => (step >= 1 ? String(value) : value.toFixed(2));
</script>

<template>
  <div class="lk-controls">
    <div class="lk-controls-main">
      <div class="lk-stage">
        <LoaderKitPreview
          :indicator="indicator"
          :params="params"
          :color="previewColor"
          :colors="previewColors"
          :speed="speed"
          :size="size"
        />
      </div>

      <form class="lk-form" @submit.prevent>
        <fieldset class="lk-fieldset">
          <legend>{{ t('params') }}</legend>
          <p v-if="controls.length === 0" class="lk-muted">{{ t('noParams') }}</p>
          <div v-for="control in controls" :key="control.name" class="lk-field">
            <label :for="`${id}-param-${control.name}`"><code>{{ control.name }}</code></label>
            <input
              :id="`${id}-param-${control.name}`"
              v-model.number="values[control.name]"
              type="range"
              :min="control.min"
              :max="control.max"
              :step="control.step"
            />
            <output :for="`${id}-param-${control.name}`">{{ fixed(values[control.name] ?? control.default, control.step) }}</output>
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
        <div class="lk-field">
          <label :for="`${id}-size`">{{ t('size') }}</label>
          <input :id="`${id}-size`" v-model.number="size" type="range" min="24" max="128" step="4" />
          <output :for="`${id}-size`">{{ size }}px</output>
        </div>

        <button type="button" class="lk-button" @click="reset">{{ t('reset') }}</button>
      </form>
    </div>

    <CodeTabs :tabs="code" :label="t('code')" />
  </div>
</template>

<style scoped>
.lk-controls {
  display: grid;
  gap: 20px;
}

.lk-controls-main {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .lk-controls-main {
    grid-template-columns: 176px 1fr;
    align-items: start;
  }
}

.lk-stage {
  display: grid;
  place-items: center;
  width: 176px;
  height: 176px;
  margin: 0 auto;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--lk-stage-bg);
}
</style>
