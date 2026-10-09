import { computed, defineComponent, h, onMounted, shallowRef } from 'vue';
import type { PropType } from 'vue';
import type { BuiltinIndicatorName, IndicatorSpec, Params, ProgressStrokeCap, ProgressType, ProgressVariant } from '@loader-kit/spec';
import { loaderKitAttributes, sizeLength, toJson } from './attributes.ts';
import type { LoaderKitElementApi } from './element.ts';
import { progressAttributes } from './progress-attributes.ts';
import type { LoaderKitProgressElementApi } from './progress-element.ts';
import './element.ts';
import './progress-element.ts';

export type { LoaderKitProps } from './attributes.ts';
export type { LoaderKitElementApi } from './element.ts';
export type { LoaderKitProgressProps } from './progress-attributes.ts';
export type { LoaderKitProgressElementApi } from './progress-element.ts';
export type { BuiltinIndicatorName, IndicatorSpec, Params, ProgressStrokeCap, ProgressType, ProgressVariant } from '@loader-kit/spec';

/**
 * A LoaderKit indicator. Renders a `<loader-kit>` element, 40px by 40px unless `size` or CSS sizes
 * it, so it works with server-side rendering. Emits `error` with the message when the spec cannot
 * be drawn, and with null when it recovers. The exposed `element` is the `<loader-kit>` element.
 */
export const LoaderKit = defineComponent({
  name: 'LoaderKit',
  props: {
    indicator: { type: String as PropType<BuiltinIndicatorName | (string & {})>, default: undefined },
    spec: { type: [Object, String] as PropType<IndicatorSpec | string | null>, default: null },
    params: { type: [Object, String] as PropType<Params | string | null>, default: null },
    color: { type: String as PropType<string | null>, default: null },
    colors: { type: Array as PropType<readonly string[] | null>, default: null },
    speed: { type: Number, default: 1 },
    animating: { type: Boolean, default: true },
    hidesWhenStopped: { type: Boolean, default: true },
    cycleProgress: { type: Number as PropType<number | null>, default: null },
    respectsReduceMotion: { type: Boolean, default: true },
    size: { type: [Number, String] as PropType<number | string | null>, default: null },
  },
  emits: {
    error: (message: string | null) => message === null || typeof message === 'string',
  },
  setup(props, { emit, expose }) {
    const element = shallowRef<LoaderKitElementApi | null>(null);
    expose({ element });
    const specText = computed(() => toJson(props.spec));
    const paramsText = computed(() => toJson(props.params));
    let reported: string | null = null;
    const deliver = (message: string | null) => {
      if (message === reported) return;
      reported = message;
      emit('error', message);
    };
    const onError = (event: Event) => deliver((event as CustomEvent<{ message: string | null }>).detail.message);
    // A server-rendered element reports a problem when it upgrades, before hydration listens.
    onMounted(() => {
      const node = element.value;
      if (node && typeof node.specError === 'string') deliver(node.specError);
    });

    return () => {
      const length = sizeLength(props.size);
      return h('loader-kit', {
        ...loaderKitAttributes({ ...props, spec: specText.value, params: paramsText.value }),
        style: length === null ? undefined : { width: length, height: length },
        ref: element,
        onLoaderkitError: onError,
      });
    };
  },
});

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

export default LoaderKit;
