<script setup lang="ts">
import { BUILTIN_INDICATOR_NAMES } from '@loader-kit/spec';
import { computed, nextTick, ref, useId } from 'vue';
import { useStrings } from '../lib/i18n.ts';
import IndicatorControls from './IndicatorControls.vue';
import LoaderKitPreview from './LoaderKitPreview.vue';

const { t } = useStrings();
const id = useId();
const query = ref('');
const selected = ref<string | null>(null);
const dialog = ref<HTMLDialogElement>();

const names = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? BUILTIN_INDICATOR_NAMES.filter((name) => name.toLowerCase().includes(q)) : BUILTIN_INDICATOR_NAMES;
});

async function open(name: string) {
  selected.value = name;
  await nextTick();
  dialog.value?.showModal();
}

function close() {
  dialog.value?.close();
}

function onDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) close();
}
</script>

<template>
  <div class="lk-gallery">
    <div class="lk-gallery-bar">
      <label class="visually-hidden" :for="`${id}-filter`">{{ t('filter') }}</label>
      <input
        :id="`${id}-filter`"
        v-model="query"
        class="lk-input lk-gallery-filter"
        type="search"
        :placeholder="t('filter')"
        autocomplete="off"
        spellcheck="false"
      />
      <span class="lk-muted" aria-live="polite">{{ t('shown', { count: names.length, total: BUILTIN_INDICATOR_NAMES.length }) }}</span>
    </div>
    <p class="lk-gallery-hint">{{ t('galleryHint') }}</p>

    <ul class="lk-gallery-grid">
      <li v-for="name in names" :key="name">
        <button type="button" class="lk-tile" :aria-haspopup="'dialog'" @click="open(name)">
          <LoaderKitPreview :indicator="name" :size="44" :label="name" aria-hidden="true" />
          <span class="lk-tile-name">{{ name }}</span>
        </button>
      </li>
    </ul>
    <p v-if="names.length === 0" class="lk-muted">{{ t('noMatch', { query }) }}</p>

    <dialog
      ref="dialog"
      class="lk-dialog"
      :aria-labelledby="`${id}-title`"
      @click="onDialogClick"
      @close="selected = null"
    >
      <div v-if="selected" class="lk-dialog-body">
        <header class="lk-dialog-header">
          <h2 :id="`${id}-title`">{{ t('customize', { name: selected }) }}</h2>
          <button type="button" class="lk-icon-button" :aria-label="t('close')" @click="close">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <IndicatorControls :indicator="selected" />
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.lk-gallery {
  margin: 24px 0;
}

.lk-gallery-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.lk-gallery-filter {
  flex: 1 1 220px;
  max-width: 320px;
}

.lk-gallery-hint {
  margin: 8px 0 16px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.lk-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.vp-doc .lk-gallery-grid li + li {
  margin-top: 0;
}

.lk-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 112px;
  padding: 12px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--lk-stage-bg);
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.lk-tile:hover {
  border-color: var(--vp-c-brand-1);
}

.lk-tile:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.lk-tile-name {
  max-width: 100%;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
  text-align: center;
}
</style>
