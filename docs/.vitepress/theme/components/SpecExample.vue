<script setup lang="ts">
import { withBase } from 'vitepress';
import { computed, ref, useId } from 'vue';
import { exampleSpec } from '../lib/examples.ts';
import { useStrings } from '../lib/i18n.ts';
import LoaderKitPreview from './LoaderKitPreview.vue';

const props = withDefaults(defineProps<{ id: string; size?: number }>(), { size: 96 });

const { t, prefix } = useStrings();
const uid = useId();
const spec = computed(() => exampleSpec(props.id));
const freeze = ref(false);
const progress = ref(0);
const error = ref<string | null>(null);
const playground = computed(() => `${withBase(`/${prefix.value}tools/playground`)}#example=${encodeURIComponent(props.id)}`);
</script>

<template>
  <div class="lk-card lk-example">
    <p v-if="!spec" class="lk-error" role="alert">{{ t('missingExample', { id }) }}</p>
    <template v-else>
      <div class="lk-stage" :style="{ minHeight: `${size + 32}px` }">
        <LoaderKitPreview :spec="spec" :size="size" :cycle-progress="freeze ? progress : null" @error="error = $event" />
      </div>
      <div class="lk-example-side">
        <div class="lk-example-title">
          <code>{{ spec.name }}</code>
          <a class="lk-link" :href="playground">{{ t('openInPlayground') }} <span aria-hidden="true">→</span></a>
        </div>
        <label class="lk-check">
          <input v-model="freeze" type="checkbox" />
          {{ t('freeze') }}
        </label>
        <div class="lk-field">
          <label :for="`${uid}-progress`"><code>cycleProgress</code></label>
          <input
            :id="`${uid}-progress`"
            v-model.number="progress"
            type="range"
            min="0"
            max="1"
            step="0.01"
            @input="freeze = true"
          />
          <output :for="`${uid}-progress`">{{ freeze ? progress.toFixed(2) : 'null' }}</output>
        </div>
        <p v-if="error" class="lk-error" role="alert">{{ t('cannotDraw') }} {{ error }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.lk-example {
  display: grid;
  gap: 16px;
  align-items: center;
}

@media (min-width: 560px) {
  .lk-example {
    grid-template-columns: 160px 1fr;
  }
}

.lk-stage {
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--lk-stage-bg);
}

.lk-example-side {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.lk-example-title {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
</style>
