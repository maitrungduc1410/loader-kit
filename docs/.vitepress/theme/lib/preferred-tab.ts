import { ref } from 'vue';

const KEY = 'loaderkit-code-tab';

/** The platform last picked in any code panel, shared by every panel and kept across visits. */
const preferred = ref<string | null>(null);
let restored = false;

export function usePreferredTab() {
  // Read on the client only, after mount, so the server render and hydration agree.
  function restore() {
    if (restored) return;
    restored = true;
    try {
      preferred.value = localStorage.getItem(KEY);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); the choice then lasts the visit.
    }
  }

  function prefer(id: string) {
    preferred.value = id;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // See restore().
    }
  }

  return { preferred, restore, prefer };
}
