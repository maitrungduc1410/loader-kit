import { computed, defineComponent, h, shallowRef } from 'vue';
import type { PropType } from 'vue';
import type { ProgressStrokeCap, ProgressType, ProgressVariant } from '@loader-kit/spec';
import { progressAttributes } from './progress-attributes.ts';
import type { LoaderKitProgressElementApi } from './progress-element.ts';
import './progress-element.ts';

const optionalNumber = { type: Number as PropType<number | null>, default: null };
const optionalString = { type: String as PropType<string | null>, default: null };
/** Vue turns a missing Boolean prop without a default into false; null keeps the element's default. */
const optionalFlag = { type: Boolean as PropType<boolean | null>, default: null };

/**
 * A progress indicator. Renders a `<loader-kit-progress>` element, so it works with server-side
 * rendering; the default slot is centered over circular, pie and gauge, and framed by border. The
 * exposed `element` is the `<loader-kit-progress>` element.
 */
export const LoaderKitProgress = defineComponent({
  name: 'LoaderKitProgress',
  props: {
    value: optionalNumber,
    buffer: optionalNumber,
    smooth: { type: Boolean, default: true },
    type: { type: String as PropType<ProgressType | null>, default: null },
    variant: { type: String as PropType<ProgressVariant | null>, default: null },
    thickness: optionalNumber,
    trackGap: optionalNumber,
    segments: optionalNumber,
    showLabel: optionalFlag,
    stopIndicator: optionalFlag,
    strokeCap: { type: String as PropType<ProgressStrokeCap | null>, default: null },
    amplitude: optionalNumber,
    wavelength: optionalNumber,
    waveSpeed: optionalNumber,
    sweepAngle: optionalNumber,
    cornerRadius: optionalNumber,
    speed: optionalNumber,
    size: optionalNumber,
    color: optionalString,
    trackColor: optionalString,
    labelColor: optionalString,
    respectsReduceMotion: { type: Boolean, default: true },
    accessibilityLabel: optionalString,
  },
  setup(props, { slots, expose }) {
    const element = shallowRef<LoaderKitProgressElementApi | null>(null);
    expose({ element });
    // `^` makes Vue write attributes: as DOM properties, a number prop going back to null would be set to 0.
    const attributes = computed(() =>
      Object.fromEntries(Object.entries(progressAttributes(props)).map(([name, value]) => [`^${name}`, value])),
    );
    return () => h('loader-kit-progress', { ...attributes.value, ref: element }, slots.default?.());
  },
});
