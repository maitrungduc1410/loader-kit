<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useStrings } from '../lib/i18n.ts';
import LoaderKitPreview from './LoaderKitPreview.vue';

const props = withDefaults(defineProps<{ indicator?: string }>(), { indicator: 'BallSpinFadeLoader' });

const { t } = useStrings();
const id = useId();

const animating = ref(true);
const speed = ref(1);
const hidesWhenStopped = ref(true);
const freeze = ref(false);
const progress = ref(0.25);
const respectsReduceMotion = ref(true);
const reduceMotion = ref(false);

// The view reads the real media query; the simulation draws what an engine draws when it matches.
const cycleProgress = computed(() =>
  freeze.value ? progress.value : reduceMotion.value && respectsReduceMotion.value ? 0 : null,
);
const hidden = computed(() => !animating.value && hidesWhenStopped.value);

const options = computed(() =>
  JSON.stringify(
    {
      indicator: props.indicator,
      animating: animating.value,
      speed: speed.value,
      hidesWhenStopped: hidesWhenStopped.value,
      cycleProgress: freeze.value ? progress.value : null,
      respectsReduceMotion: respectsReduceMotion.value,
    },
    null,
    2,
  ),
);

function reset() {
  animating.value = true;
  speed.value = 1;
  hidesWhenStopped.value = true;
  freeze.value = false;
  progress.value = 0.25;
  respectsReduceMotion.value = true;
  reduceMotion.value = false;
}
</script>

<template>
  <div class="lk-card lk-playback">
    <div class="lk-playback-stage">
      <div class="lk-stage">
        <LoaderKitPreview
          :indicator="indicator"
          :size="96"
          :speed="speed"
          :animating="animating"
          :hides-when-stopped="hidesWhenStopped"
          :cycle-progress="cycleProgress"
          :respects-reduce-motion="respectsReduceMotion"
        />
        <span v-if="hidden" class="lk-stage-note">{{ t('hiddenNote') }}</span>
      </div>
      <button type="button" class="lk-button lk-button-brand" :aria-pressed="animating" @click="animating = !animating">
        <svg v-if="animating" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" />
        </svg>
        <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
        </svg>
        {{ animating ? t('stop') : t('play') }}
      </button>
    </div>

    <form class="lk-form" @submit.prevent>
      <div class="lk-field">
        <label :for="`${id}-speed`"><code>speed</code></label>
        <input :id="`${id}-speed`" v-model.number="speed" type="range" min="-0.5" max="3" step="0.05" />
        <output :for="`${id}-speed`">{{ speed.toFixed(2) }}</output>
      </div>
      <p class="lk-muted lk-note">{{ t('speedNote') }}</p>

      <label class="lk-check">
        <input v-model="hidesWhenStopped" type="checkbox" />
        <code>hidesWhenStopped</code>
      </label>

      <label class="lk-check">
        <input v-model="freeze" type="checkbox" />
        {{ t('freeze') }} (<code>cycleProgress</code>)
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

      <label class="lk-check">
        <input v-model="respectsReduceMotion" type="checkbox" />
        <code>respectsReduceMotion</code>
      </label>
      <label class="lk-check">
        <input v-model="reduceMotion" type="checkbox" />
        {{ t('reduceMotion') }}
      </label>
      <p class="lk-muted lk-note">{{ t('reduceMotionNote') }}</p>

      <button type="button" class="lk-button" @click="reset">{{ t('reset') }}</button>
    </form>

    <div class="lk-playback-options">
      <div class="lk-label">{{ t('options') }}</div>
      <pre class="lk-pre"><code>{{ options }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.lk-playback {
  display: grid;
  gap: 20px;
}

@media (min-width: 720px) {
  .lk-playback {
    grid-template-columns: 176px 1fr;
  }

  .lk-playback-options {
    grid-column: 1 / -1;
  }
}

.lk-playback-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.lk-stage {
  position: relative;
  display: grid;
  place-items: center;
  width: 176px;
  height: 176px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--lk-stage-bg);
}

.lk-stage-note {
  position: absolute;
  inset: auto 8px 8px;
  font-size: 12px;
  line-height: 1.3;
  text-align: center;
  color: var(--vp-c-text-2);
}
</style>
