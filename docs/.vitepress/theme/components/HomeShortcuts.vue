<script setup lang="ts">
import { BUILTIN_INDICATOR_NAMES } from '@loader-kit/spec';
import { LoaderKitProgress } from '@loader-kit/web/vue';
import { useRouter, withBase } from 'vitepress';
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import { useSimulatedDownload } from '../lib/download.ts';
import { useStrings } from '../lib/i18n.ts';
import { PROGRESS_DESIGNS } from '../lib/progress.ts';
import LoaderKitPreview from './LoaderKitPreview.vue';

const { t, prefix } = useStrings();
const router = useRouter();
const id = useId();

const SAMPLES = ['BallSpinFadeLoader', 'LineScale', 'Pacman', 'BallGridPulse', 'Orbit', 'TripleArcSpin'] as const;

const builtinQuery = ref('');
const progressQuery = ref('');
const builtinPage = computed(() => withBase(`/${prefix.value}guide/indicators`));
const progressPage = computed(() => withBase(`/${prefix.value}guide/progress`));

const download = useSimulatedDownload(ref(true), 0.2);
onBeforeUnmount(download.stop);

function search(page: string, query: string) {
  const q = query.trim();
  router.go(q ? `${page}?q=${encodeURIComponent(q)}` : page);
}
</script>

<template>
  <div class="lk-shortcuts">
    <section class="lk-shortcut" :aria-labelledby="`${id}-builtin`">
      <h3 :id="`${id}-builtin`" class="lk-shortcut-title">
        <a :href="builtinPage">{{ t('homeBuiltinTitle') }}</a>
      </h3>
      <p class="lk-shortcut-text">{{ t('homeBuiltinText') }}</p>
      <div class="lk-shortcut-stage" aria-hidden="true">
        <LoaderKitPreview v-for="name in SAMPLES" :key="name" :indicator="name" :size="36" />
      </div>
      <form class="lk-shortcut-search" role="search" @submit.prevent="search(builtinPage, builtinQuery)">
        <input
          v-model="builtinQuery"
          class="lk-input"
          type="search"
          :aria-label="t('homeSearchBuiltin')"
          :placeholder="t('homeSearchBuiltin')"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="submit" class="lk-button">{{ t('homeSearch') }}</button>
      </form>
      <a class="lk-button lk-button-brand lk-shortcut-browse" :href="builtinPage">
        {{ t('homeBrowseBuiltin', { count: BUILTIN_INDICATOR_NAMES.length }) }}
      </a>
    </section>

    <section class="lk-shortcut" :aria-labelledby="`${id}-progress`">
      <h3 :id="`${id}-progress`" class="lk-shortcut-title">
        <a :href="progressPage">{{ t('homeProgressTitle') }}</a>
      </h3>
      <p class="lk-shortcut-text">{{ t('homeProgressText') }}</p>
      <div class="lk-shortcut-stage lk-shortcut-progress" aria-hidden="true">
        <LoaderKitProgress class="lk-shortcut-linear" type="linear" variant="wavy" :value="download.value.value" />
        <LoaderKitProgress :value="download.value.value" :size="36" />
        <LoaderKitProgress type="gauge" :value="download.value.value" :size="40" />
        <LoaderKitProgress type="battery" :value="download.value.value" :size="40" />
        <LoaderKitProgress type="circular" variant="ticks" :size="36" />
      </div>
      <form class="lk-shortcut-search" role="search" @submit.prevent="search(progressPage, progressQuery)">
        <input
          v-model="progressQuery"
          class="lk-input"
          type="search"
          :aria-label="t('homeSearchProgress')"
          :placeholder="t('homeSearchProgress')"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="submit" class="lk-button">{{ t('homeSearch') }}</button>
      </form>
      <a class="lk-button lk-button-brand lk-shortcut-browse" :href="progressPage">
        {{ t('homeBrowseProgress', { count: PROGRESS_DESIGNS.length }) }}
      </a>
    </section>
  </div>
  <p class="lk-shortcuts-steps">{{ t('homeSteps') }}</p>
</template>

<style scoped>
.lk-shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin: 16px 0 0;
}

.lk-shortcut {
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.2s;
}

.lk-shortcut:hover,
.lk-shortcut:focus-within {
  border-color: var(--vp-c-brand-1);
}

.vp-doc .lk-shortcut-title {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.vp-doc .lk-shortcut-title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.vp-doc .lk-shortcut-title a:hover {
  color: var(--vp-c-brand-1);
}

.vp-doc .lk-shortcut-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.lk-shortcut-stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-around;
  gap: 16px;
  min-height: 88px;
  padding: 16px;
  border-radius: 12px;
  background: var(--vp-c-bg);
  color: var(--lk-indicator);
}

.lk-shortcut-linear {
  flex: 1 1 100%;
}

.lk-shortcut-search {
  display: flex;
  gap: 8px;
}

.lk-shortcut-search .lk-input {
  flex: 1;
  min-width: 0;
}

.vp-doc .lk-shortcut-browse,
.vp-doc .lk-shortcut-browse:hover {
  justify-self: start;
  color: var(--vp-button-brand-text);
  text-decoration: none;
}

.vp-doc .lk-shortcuts-steps {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
</style>
