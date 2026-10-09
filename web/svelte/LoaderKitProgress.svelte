<!--
  A progress indicator. Renders a <loader-kit-progress> element; the default slot is centered over
  circular, pie and gauge, and framed by border. Written without runes so it compiles with Svelte 4 and 5.
-->
<script>
  import '../dist/esm/progress-element.js';
  import { progressAttributes, setProgressProperties } from '../dist/esm/progress-attributes.js';

  /** @type {number | null} */
  export let value = null;
  /** @type {number | null} */
  export let buffer = null;
  export let smooth = true;
  /** @type {import('./index.js').LoaderKitProgressSvelteProps['type']} */
  export let type = null;
  /** @type {import('./index.js').LoaderKitProgressSvelteProps['variant']} */
  export let variant = null;
  /** @type {number | null} */
  export let thickness = null;
  /** @type {number | null} */
  export let trackGap = null;
  /** @type {number | null} */
  export let segments = null;
  /** @type {boolean | null} */
  export let showLabel = null;
  /** @type {boolean | null} */
  export let stopIndicator = null;
  /** @type {import('./index.js').LoaderKitProgressSvelteProps['strokeCap']} */
  export let strokeCap = null;
  /** @type {number | null} */
  export let amplitude = null;
  /** @type {number | null} */
  export let wavelength = null;
  /** @type {number | null} */
  export let waveSpeed = null;
  /** @type {number | null} */
  export let sweepAngle = null;
  /** @type {number | null} */
  export let cornerRadius = null;
  /** @type {number | null} */
  export let speed = null;
  /** @type {number | null} */
  export let size = null;
  /** @type {string | null} */
  export let color = null;
  /** @type {string | null} */
  export let trackColor = null;
  /** @type {string | null} */
  export let labelColor = null;
  export let respectsReduceMotion = true;
  /** @type {string | null} */
  export let accessibilityLabel = null;
  /** The `<loader-kit-progress>` element, for `bind:element`. */
  export let element = undefined;

  $: props = {
    value,
    buffer,
    smooth,
    type,
    variant,
    thickness,
    trackGap,
    segments,
    showLabel,
    stopIndicator,
    strokeCap,
    amplitude,
    wavelength,
    waveSpeed,
    sweepAngle,
    cornerRadius,
    speed,
    size,
    color,
    trackColor,
    labelColor,
    respectsReduceMotion,
  };
  $: attributes = progressAttributes({ ...props, accessibilityLabel });
  // Svelte 4 only removes the attribute of a prop that goes back to null, which the element would miss.
  $: if (element) setProgressProperties(element, props);
</script>

<loader-kit-progress bind:this={element} {...attributes} {...$$restProps}><slot /></loader-kit-progress>
