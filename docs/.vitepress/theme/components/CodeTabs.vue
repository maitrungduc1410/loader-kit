<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useStrings } from '../lib/i18n.ts';
import type { Snippet } from '../lib/snippets.ts';
import { useCopy } from '../lib/copy.ts';

const props = defineProps<{ tabs: readonly Snippet[]; label: string }>();

const { t } = useStrings();
const id = useId();
const selected = ref(props.tabs[0]?.id ?? '');
const current = computed(() => props.tabs.find((tab) => tab.id === selected.value) ?? props.tabs[0]);
const buttons = ref<HTMLButtonElement[]>([]);
const { copied, copy } = useCopy();

function onKeydown(event: KeyboardEvent, index: number) {
  const count = props.tabs.length;
  const next =
    event.key === 'ArrowRight' ? (index + 1) % count
    : event.key === 'ArrowLeft' ? (index - 1 + count) % count
    : event.key === 'Home' ? 0
    : event.key === 'End' ? count - 1
    : -1;
  if (next < 0) return;
  event.preventDefault();
  selected.value = props.tabs[next]!.id;
  buttons.value[next]?.focus();
}
</script>

<template>
  <div class="lk-code">
    <div class="lk-code-bar">
      <div class="lk-code-tabs" role="tablist" :aria-label="label">
        <button
          v-for="(tab, index) in tabs"
          :id="`${id}-tab-${tab.id}`"
          :key="tab.id"
          ref="buttons"
          type="button"
          role="tab"
          class="lk-code-tab"
          :aria-selected="tab.id === current?.id"
          :aria-controls="`${id}-panel`"
          :tabindex="tab.id === current?.id ? 0 : -1"
          @click="selected = tab.id"
          @keydown="onKeydown($event, index)"
        >
          {{ tab.label }}
        </button>
      </div>
      <button type="button" class="lk-code-copy" :aria-label="t('copyCode')" @click="current && copy(current.code)">
        {{ copied ? t('copied') : t('copy') }}
      </button>
    </div>
    <div
      :id="`${id}-panel`"
      class="lk-code-panel"
      role="tabpanel"
      :aria-labelledby="`${id}-tab-${current?.id}`"
      tabindex="0"
    >
      <pre><code :class="`language-${current?.lang}`">{{ current?.code }}</code></pre>
    </div>
    <span class="visually-hidden" aria-live="polite">{{ copied ? t('copied') : '' }}</span>
  </div>
</template>

<style scoped>
.lk-code {
  border-radius: 8px;
  background: var(--vp-code-block-bg);
  overflow: hidden;
  min-width: 0;
}

.lk-code-bar {
  display: flex;
  align-items: stretch;
  gap: 8px;
  border-bottom: 1px solid var(--vp-code-tab-divider);
}

.lk-code-tabs {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.lk-code-tab {
  flex: none;
  padding: 0 12px;
  height: 40px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-code-tab-text-color);
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.2s;
}

.lk-code-tab:hover {
  color: var(--vp-code-tab-hover-text-color);
}

.lk-code-tab[aria-selected='true'] {
  color: var(--vp-code-tab-active-text-color);
  border-bottom-color: var(--vp-code-tab-active-bar-color);
}

.lk-code-tab:focus-visible,
.lk-code-copy:focus-visible,
.lk-code-panel:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}

.lk-code-copy {
  flex: none;
  margin: 6px 8px 6px 0;
  padding: 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
}

.lk-code-copy:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
}

.lk-code-panel {
  overflow-x: auto;
}

.lk-code-panel pre {
  margin: 0;
  padding: 16px 20px;
  font-family: var(--vp-font-family-mono);
  font-size: var(--vp-code-font-size);
  line-height: var(--vp-code-line-height);
  color: var(--vp-c-text-1);
  background: transparent;
}

.lk-code-panel code {
  font-size: inherit;
  padding: 0;
  background: none;
  color: inherit;
}
</style>
