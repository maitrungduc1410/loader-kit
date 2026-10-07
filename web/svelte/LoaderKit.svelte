<!--
  A LoaderKit indicator. Renders a <loader-kit> element, 40px by 40px unless `size` or CSS sizes it.
  Written without runes so it compiles with Svelte 4 and 5.
-->
<script>
  import { onMount } from 'svelte';
  import '../dist/esm/element.js';
  import { loaderKitAttributes, sizeLength, toJson } from '../dist/esm/attributes.js';

  /** @type {import('./index.js').LoaderKitSvelteProps['indicator']} */
  export let indicator = undefined;
  /** @type {import('./index.js').LoaderKitSvelteProps['spec']} */
  export let spec = null;
  /** @type {import('./index.js').LoaderKitSvelteProps['params']} */
  export let params = null;
  /** @type {import('./index.js').LoaderKitSvelteProps['color']} */
  export let color = null;
  /** @type {import('./index.js').LoaderKitSvelteProps['colors']} */
  export let colors = null;
  export let speed = 1;
  export let animating = true;
  export let hidesWhenStopped = true;
  /** @type {number | null} */
  export let cycleProgress = null;
  export let respectsReduceMotion = true;
  /** @type {number | string | null} */
  export let size = null;
  /** @type {((message: string | null) => void) | null} */
  export let onError = null;
  /** The `<loader-kit>` element, for `bind:element`. */
  export let element = undefined;

  $: specText = toJson(spec);
  $: paramsText = toJson(params);
  $: attributes = loaderKitAttributes({
    indicator,
    spec: specText,
    params: paramsText,
    color,
    colors,
    speed,
    animating,
    hidesWhenStopped,
    cycleProgress,
    respectsReduceMotion,
  });
  $: length = sizeLength(size);
  $: style = [length === null ? '' : `width: ${length}; height: ${length}`, $$restProps.style ?? '']
    .filter(Boolean)
    .join('; ');

  /** @type {string | null} */
  let reported = null;
  /** @param {string | null} message */
  function deliver(message) {
    if (message === reported) return;
    reported = message;
    if (onError) onError(message);
  }
  /** @param {CustomEvent<{ message: string | null }>} event */
  function report(event) {
    deliver(event.detail.message);
  }
  // Svelte 4 listens only after the element connects, which is when it reports a problem first.
  onMount(() => {
    if (element && typeof element.specError === 'string') deliver(element.specError);
  });
</script>

<loader-kit
  bind:this={element}
  {...attributes}
  {...$$restProps}
  style={style || undefined}
  on:loaderkit-error={report}
></loader-kit>
