import { onBeforeUnmount, ref } from 'vue';

/** Copies text to the clipboard; `copied` stays true for a moment so the button can say so. */
export function useCopy() {
  const copied = ref(false);
  const failed = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy(text: string): Promise<boolean> {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(text);
      copied.value = true;
      failed.value = false;
    } catch {
      copied.value = false;
      failed.value = true;
    }
    timer = setTimeout(() => {
      copied.value = false;
      failed.value = false;
    }, 2000);
    return copied.value;
  }

  onBeforeUnmount(() => clearTimeout(timer));
  return { copied, failed, copy };
}
