import { onMounted, ref, watch, type Ref } from 'vue';

// Uneven steps, like the bytes of a real download arriving in bursts.
const STEPS = [0.03, 0.08, 0.01, 0.12, 0.05, 0, 0.09, 0.02, 0.15, 0.04, 0.07, 0, 0.11, 0.06];

/**
 * A value that climbs to 1 in uneven steps every 400 ms while `active`, rests at 1 for a moment and
 * starts over. The value stays writable, for a slider.
 */
export function useSimulatedDownload(active: Ref<boolean>, start = 0.4) {
  const value = ref(start);
  let timer: ReturnType<typeof setInterval> | undefined;
  let step = 0;
  let hold = 0;

  function tick() {
    if (value.value >= 1) {
      if (++hold < 4) return;
      hold = 0;
      value.value = 0;
      return;
    }
    value.value = Math.min(1, value.value + STEPS[step++ % STEPS.length]!);
  }

  function stop() {
    if (timer === undefined) return;
    clearInterval(timer);
    timer = undefined;
  }

  function update() {
    if (active.value && timer === undefined) timer = setInterval(tick, 400);
    if (!active.value) stop();
  }

  // The timer only runs in the browser.
  onMounted(() => {
    update();
    watch(active, update);
  });

  return { value, stop };
}
